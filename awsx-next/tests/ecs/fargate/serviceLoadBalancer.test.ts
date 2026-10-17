import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import {
  ApplicationProtocol,
  ApplicationProtocolVersion,
  ApplicationServiceLoadBalancer,
  CreatedApplicationServiceAttachment,
  createApplicationServiceAttachment,
} from '../../../src/ecs/fargate/serviceLoadBalancer';

const resources: pulumi.runtime.MockResourceArgs[] = [];
const calls: pulumi.runtime.MockCallArgs[] = [];
const children: pulumi.Resource[] = [];
const loadBalancerArn = 'arn:mock:load-balancer';
const listenerArn = 'arn:mock:listener';
let provider: aws.Provider;
let sequence = 0;

beforeAll(async () => {
  await pulumi.runtime.setMocks({
    newResource(args) {
      resources.push(args);
      return {
        id: `${args.name}_id`,
        state: { ...args.inputs, arn: `arn:mock:${args.name}` },
      };
    },
    call(args) {
      calls.push(args);
      if (args.token === 'aws:lb/getListener:getListener') {
        return { ...args.inputs, loadBalancerArn, protocol: 'HTTPS', port: 443 };
      }
      return {
        ...args.inputs,
        vpcId: 'vpc-shared',
        loadBalancerType: 'application',
        securityGroups: ['sg-alb'],
      };
    },
  });
  provider = new aws.Provider('attachment-provider', { region: 'us-west-2' });
  await resolve(provider.urn);
});

beforeEach(() => {
  resources.length = 0;
  calls.length = 0;
  children.length = 0;
});

/**
 * Resolves an output for assertions.
 *
 * @param value The output to resolve.
 * @returns The resolved value.
 */
function resolve<T>(value: pulumi.Output<T>): Promise<T> {
  return new Promise((done) => value.apply(done));
}

/**
 * Creates the attachment's owner with an explicit provider and child capture.
 *
 * @returns The test parent.
 */
function parent(): pulumi.ComponentResource {
  return new pulumi.ComponentResource(
    'test:index:Service',
    `service-${sequence++}`,
    {},
    {
      providers: { aws: provider },
      transformations: [
        (args): undefined => {
          if (args.type.startsWith('aws:')) children.push(args.resource);
          return undefined;
        },
      ],
    },
  );
}

/**
 * Returns a minimal attachment to a caller-owned listener.
 *
 * @returns The application attachment configuration.
 */
function configuration(): ApplicationServiceLoadBalancer {
  return {
    containerName: 'app',
    containerPort: 3000,
    listenerArn,
    priority: 25,
    match: { methods: ['GET'] },
  };
}

/**
 * Waits for attachment registrations and resolves its ECS binding.
 *
 * @param attachment The attachment under test.
 * @returns The resolved ECS binding.
 */
async function settle(
  attachment: CreatedApplicationServiceAttachment,
): Promise<pulumi.Unwrap<aws.types.input.ecs.ServiceLoadBalancer>> {
  const [binding] = await Promise.all([
    resolve(pulumi.output(attachment.serviceBinding)),
    resolve(pulumi.output(attachment.requiredIngress)),
    ...children.map((child) => resolve(child.urn)),
  ]);
  return binding;
}

it('creates only backend resources, keeping health-check and application ports independent', async () => {
  const attachment = createApplicationServiceAttachment(
    'service',
    'public',
    {
      ...configuration(),
      targetHealthCheck: {
        path: '/health',
        port: 3001,
        intervalSeconds: 15,
        timeoutSeconds: 4,
        healthyHttpCodes: '200-299',
        protocol: ApplicationProtocol.HTTPS,
        healthyThreshold: 6,
        unhealthyThreshold: 4,
      },
    },
    { parent: parent() },
  );
  const binding = await settle(attachment);
  expect(binding).toEqual({
    containerName: 'app',
    containerPort: 3000,
    targetGroupArn: 'arn:mock:service-public-target-main',
  });
  expect(await resolve(pulumi.output(attachment.requiredIngress))).toEqual([
    { sourceGroupId: 'sg-alb', port: 3000 },
    { sourceGroupId: 'sg-alb', port: 3001 },
  ]);
  expect(
    resources
      .filter((resource) => resource.type.startsWith('aws:'))
      .map(({ type, name, id }) => ({ type, name, id: id || undefined })),
  ).toEqual([
    { type: 'aws:lb/targetGroup:TargetGroup', name: 'service-public-target-main', id: undefined },
    {
      type: 'aws:lb/listenerRule:ListenerRule',
      name: 'service-public-listener-rule',
      id: undefined,
    },
  ]);
  expect(
    resources.find((resource) => resource.type === 'aws:lb/targetGroup:TargetGroup')!.inputs,
  ).toEqual({
    namePrefix: 'tg-',
    tags: { Name: 'service-public-target-main' },
    vpcId: 'vpc-shared',
    targetType: 'ip',
    port: 3000,
    protocol: 'HTTP',
    healthCheck: {
      protocol: 'HTTPS',
      path: '/health',
      port: '3001',
      interval: 15,
      timeout: 4,
      matcher: '200-299',
      healthyThreshold: 6,
      unhealthyThreshold: 4,
    },
  });
  expect(
    resources.find((resource) => resource.type === 'aws:lb/listenerRule:ListenerRule')!.inputs,
  ).toEqual({
    listenerArn,
    priority: 25,
    conditions: [{ httpRequestMethod: { values: ['GET'] } }],
    actions: [{ type: 'forward', forward: { targetGroups: [{ arn: binding.targetGroupArn }] } }],
  });
  expect(
    await Promise.all(
      attachment.readyDependencies.map(async (child) =>
        (await resolve(child.urn)).split('::').at(-1),
      ),
    ),
  ).toEqual(['service-public-listener-rule']);
});

it.each<{
  description: string;
  args: Partial<ApplicationServiceLoadBalancer>;
  expectedHealthCheck: Record<string, unknown>;
}>([
  { description: 'omitted health check', args: {}, expectedHealthCheck: {} },
  { description: 'empty health check', args: { targetHealthCheck: {} }, expectedHealthCheck: {} },
  {
    description: 'path-only health check',
    args: { targetHealthCheck: { path: '/ready' } },
    expectedHealthCheck: { path: '/ready' },
  },
  {
    description: 'gRPC backend',
    args: { targetProtocolVersion: ApplicationProtocolVersion.GRPC },
    expectedHealthCheck: {},
  },
  {
    description: 'HTTPS backend',
    args: { targetProtocol: ApplicationProtocol.HTTPS },
    expectedHealthCheck: {},
  },
])(
  'delegates health-check defaults to the provider for $description',
  async ({ args, expectedHealthCheck }) => {
    const attachment = createApplicationServiceAttachment(
      'service',
      'defaults',
      { ...configuration(), ...args },
      { parent: parent() },
    );
    await settle(attachment);
    expect(
      resources.find((resource) => resource.type === 'aws:lb/targetGroup:TargetGroup')!.inputs
        .healthCheck,
    ).toEqual(expectedHealthCheck);
  },
);

it.each([undefined, 'us-east-2'])(
  'preserves listener reads, provider inheritance, and region %s',
  async (region) => {
    const attachment = createApplicationServiceAttachment(
      'service',
      'shared',
      { ...configuration(), targetProtocolVersion: ApplicationProtocolVersion.HTTP_2 },
      { parent: parent(), region },
    );
    await settle(attachment);
    const reference = `${await resolve(provider.urn)}::${await resolve(provider.id)}`;
    const awsResources = resources.filter((resource) => resource.type.startsWith('aws:'));
    expect(awsResources.map((resource) => resource.provider)).toEqual(
      awsResources.map(() => reference),
    );
    expect(
      calls.map(({ token, provider: callProvider, inputs }) => ({
        token,
        provider: callProvider,
        inputs,
      })),
    ).toEqual([
      {
        token: 'aws:lb/getListener:getListener',
        provider: reference,
        inputs: { arn: listenerArn, ...(region ? { region } : {}) },
      },
      {
        token: 'aws:lb/getLoadBalancer:getLoadBalancer',
        provider: reference,
        inputs: { arn: loadBalancerArn, ...(region ? { region } : {}) },
      },
    ]);
    expect(
      awsResources.filter((resource) => !resource.id).map((resource) => resource.inputs.region),
    ).toEqual([region, region]);
  },
);

it('defaults omitted match to a catch-all path forwarding rule', async () => {
  const attachment = createApplicationServiceAttachment(
    'service',
    'catch-all',
    { ...configuration(), match: undefined },
    { parent: parent() },
  );
  const binding = await settle(attachment);
  expect(
    resources.find((resource) => resource.type === 'aws:lb/listenerRule:ListenerRule')!.inputs,
  ).toEqual({
    listenerArn,
    priority: 25,
    conditions: [{ pathPattern: { values: ['/*'] } }],
    actions: [{ type: 'forward', forward: { targetGroups: [{ arn: binding.targetGroupArn }] } }],
  });
});

it('renders hostname/path alternatives and header, method, and query conditions in one rule', async () => {
  const attachment = createApplicationServiceAttachment(
    'service',
    'conditions',
    {
      ...configuration(),
      priority: 10,
      match: {
        hostnames: { regexValues: ['^api\\.example\\.com$'] },
        pathPatterns: { values: ['/api/*', '/admin/*'] },
        headers: [{ name: 'X-Environment', values: ['staging', 'production'] }],
        methods: ['GET', 'POST'],
        queryStrings: [{ key: 'version', value: '2' }],
      },
    },
    { parent: parent() },
  );
  await settle(attachment);
  expect(
    resources.find((resource) => resource.type === 'aws:lb/listenerRule:ListenerRule')!.inputs
      .conditions,
  ).toEqual([
    { hostHeader: { regexValues: ['^api\\.example\\.com$'] } },
    { pathPattern: { values: ['/api/*', '/admin/*'] } },
    { httpHeader: { httpHeaderName: 'X-Environment', values: ['staging', 'production'] } },
    { httpRequestMethod: { values: ['GET', 'POST'] } },
    { queryStrings: [{ key: 'version', value: '2' }] },
  ]);
});

it('gives attachments to the same backend stable, distinct resource names', async () => {
  const owner = parent();
  const attachments = ['public', 'internal'].map((key, index) =>
    createApplicationServiceAttachment(
      'service',
      key,
      {
        ...configuration(),
        priority: 10 + index,
      },
      { parent: owner },
    ),
  );
  const bindings = await Promise.all(attachments.map(settle));
  const groups = resources.filter((resource) => resource.type === 'aws:lb/targetGroup:TargetGroup');
  expect(groups).toHaveLength(2);
  expect(new Set(groups.map((resource) => resource.name))).toEqual(
    new Set(['service-internal-target-main', 'service-public-target-main']),
  );
  expect(bindings.map((binding) => binding.targetGroupArn)).toEqual([
    'arn:mock:service-public-target-main',
    'arn:mock:service-internal-target-main',
  ]);
  const rules = resources.filter(
    (resource) => resource.type === 'aws:lb/listenerRule:ListenerRule',
  );
  expect(rules).toHaveLength(2);
  expect(new Set(rules.map((resource) => resource.name))).toEqual(
    new Set(['service-internal-listener-rule', 'service-public-listener-rule']),
  );
});

it.each<{ description: string; args: Partial<ApplicationServiceLoadBalancer>; property: string }>([
  {
    description: 'missing listener ARN',
    args: { containerName: 'app', containerPort: 3000 },
    property: 'listenerArn',
  },
  {
    description: 'empty conditions',
    args: { ...configuration(), match: {} },
    property: 'match',
  },
  {
    description: 'invalid priority',
    args: { ...configuration(), priority: 0 },
    property: 'priority',
  },
  {
    description: 'conflicting match modes',
    args: {
      ...configuration(),
      match: { hostnames: { values: ['example.com'], regexValues: ['.*'] } },
    },
    property: 'match.hostnames',
  },
  {
    description: 'empty regex alternatives',
    args: {
      ...configuration(),
      match: { pathPatterns: { regexValues: [] } },
    },
    property: 'match.pathPatterns',
  },
  {
    description: 'HTTP codes with gRPC',
    args: {
      ...configuration(),
      targetProtocolVersion: ApplicationProtocolVersion.GRPC,
      targetHealthCheck: { healthyHttpCodes: '200' },
    },
    property: 'targetHealthCheck.healthyHttpCodes',
  },
  {
    description: 'gRPC codes with HTTP',
    args: { ...configuration(), targetHealthCheck: { healthGrpcCodes: '0' } },
    property: 'targetHealthCheck.healthGrpcCodes',
  },
  {
    description: 'both health code types',
    args: {
      ...configuration(),
      targetHealthCheck: { healthyHttpCodes: '200', healthGrpcCodes: '0' },
    },
    property: 'targetHealthCheck',
  },
])('rejects $description before creating attachment resources', ({ args, property }) => {
  const owner = parent();
  expect(() =>
    createApplicationServiceAttachment(
      'service',
      'invalid',
      args as ApplicationServiceLoadBalancer,
      { parent: owner },
    ),
  ).toThrow(
    expect.objectContaining({
      propertyPath: `loadBalancerAttachments.invalid.application.${property}`,
    }),
  );
  expect(resources.filter((resource) => resource.type.startsWith('aws:'))).toEqual([]);
});
