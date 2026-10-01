import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import {
  ApplicationProtocol,
  ApplicationProtocolVersion,
  CreatedApplicationServiceAttachment,
  DeploymentStrategy,
  ServiceLoadBalancer,
  SslPolicy,
  createApplicationServiceAttachment,
} from '../../../src/ecs/fargate/serviceLoadBalancer';
import { FargateServiceV2 } from '../../../src/ecs/fargate/service';

const resources: pulumi.runtime.MockResourceArgs[] = [];
const calls: pulumi.runtime.MockCallArgs[] = [];
const ruleOptions: pulumi.ResourceOptions[] = [];
const attachmentResources: pulumi.Resource[] = [];
const loadBalancerArn =
  'arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/shared/abc';
const listenerArn =
  'arn:aws:elasticloadbalancing:us-west-2:123456789012:listener/app/shared/abc/def';
let provider: aws.Provider;
let sequence = 0;

beforeAll(async () => {
  await pulumi.runtime.setMocks({
    newResource(args) {
      resources.push(args);
      const state: Record<string, unknown> = {
        ...args.inputs,
        name: args.inputs.name ?? args.name,
        arn: args.id || `arn:mock:${args.name}`,
      };
      if (args.type === 'aws:lb/listener:Listener' && args.id) {
        Object.assign(state, {
          loadBalancerArn,
          protocol: ApplicationProtocol.HTTPS,
          port: 443,
          defaultActions: [{ type: 'fixed-response', fixedResponse: { statusCode: '403' } }],
        });
      }
      return { id: args.id || `${args.name}_id`, state };
    },
    call(args) {
      calls.push(args);
      if (args.token === 'aws:lb/getLoadBalancer:getLoadBalancer') {
        return {
          ...args.inputs,
          vpcId: 'vpc-shared',
          loadBalancerType: 'application',
          securityGroups: ['sg-alb'],
        };
      }
      if (args.token === 'aws:ec2/getSubnet:getSubnet') {
        return { ...args.inputs, vpcId: 'vpc-shared' };
      }
      return args.inputs;
    },
  });
  provider = new aws.Provider('attachment-provider', { region: 'us-west-2' });
  await resolve(provider.urn);
});

beforeEach(() => {
  resources.length = 0;
  calls.length = 0;
  ruleOptions.length = 0;
  attachmentResources.length = 0;
});

/**
 * Resolves an output, including resource and invoke dependencies, for assertions.
 *
 * @param value The output to resolve.
 * @returns The resolved value.
 */
function resolve<T>(value: pulumi.Output<T>): Promise<T> {
  return new Promise((done) => value.apply(done));
}

/**
 * Creates a service parent with an explicit AWS provider.
 *
 * @returns The parent used by the attachment under test.
 */
function parent(): pulumi.ComponentResource {
  return new pulumi.ComponentResource(
    'test:index:Service',
    `service-${sequence++}`,
    {},
    {
      providers: { aws: provider },
      transformations: [
        (args) => {
          if (args.type.startsWith('aws:')) {
            attachmentResources.push(args.resource);
          }
          if (args.type === 'aws:lb/listenerRule:ListenerRule') {
            ruleOptions.push(args.opts);
          }
          return undefined;
        },
      ],
    },
  );
}

/**
 * Returns the minimal dedicated-listener configuration.
 *
 * @returns An application attachment to the app container's port 3000.
 */
function configuration(): ServiceLoadBalancer {
  return {
    application: {
      containerName: 'app',
      containerPort: 3000,
      listener: { loadBalancerArn },
    },
  };
}

/**
 * Waits for every attachment resource needed for registration assertions.
 *
 * @param attachment The constructed attachment.
 * @returns The resolved provider ECS load-balancer binding.
 */
async function settle(
  attachment: CreatedApplicationServiceAttachment,
): Promise<pulumi.Unwrap<aws.types.input.ecs.ServiceLoadBalancer>> {
  const [binding] = await Promise.all([
    resolve(pulumi.output(attachment.serviceBinding)),
    resolve(attachment.requiredIngress),
    ...attachment.readyDependencies.map((resource) => resolve(resource.urn)),
    ...attachmentResources.map((resource) => resolve(resource.urn)),
  ]);
  return binding;
}

/**
 * Selects recorded registrations for an AWS resource type.
 *
 * @param type The resource type to select.
 * @returns Matching resource registrations.
 */
function registrations(type: string): pulumi.runtime.MockResourceArgs[] {
  return resources.filter((resource) => resource.type === type);
}

it('keeps client TLS, backend port, health checks, and SNI certificates independent', async () => {
  const attachment = createApplicationServiceAttachment(
    'service',
    'public',
    {
      containerName: 'app',
      containerPort: 3000,
      listener: {
        loadBalancerArn,
        certificateArns: ['arn:certificate:primary', 'arn:certificate:secondary'],
      },
      targetHealthCheck: {
        path: '/health',
        port: 3001,
        intervalSeconds: 15,
        timeoutSeconds: 4,
        healthyHttpCodes: '200-299',
      },
    },
    { parent: parent(), strategy: DeploymentStrategy.ROLLING },
  );
  const binding = await settle(attachment);

  expect(binding).toEqual({
    containerName: 'app',
    containerPort: 3000,
    targetGroupArn: 'arn:mock:service-public-target-main',
  });
  expect(await resolve(attachment.requiredIngress)).toEqual([
    { sourceGroupId: 'sg-alb', port: 3000 },
    { sourceGroupId: 'sg-alb', port: 3001 },
  ]);
  expect(registrations('aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule')).toHaveLength(
    0,
  );
  expect(registrations('aws:lb/targetGroup:TargetGroup')).toHaveLength(1);
  expect(registrations('aws:lb/targetGroup:TargetGroup')[0]!.inputs).toEqual({
    vpcId: 'vpc-shared',
    targetType: 'ip',
    port: 3000,
    protocol: 'HTTP',
    healthCheck: { path: '/health', port: '3001', interval: 15, timeout: 4, matcher: '200-299' },
  });
  expect(registrations('aws:lb/listener:Listener')[0]!.inputs).toEqual({
    loadBalancerArn,
    port: 443,
    protocol: 'HTTPS',
    certificateArn: 'arn:certificate:primary',
    sslPolicy: SslPolicy.RECOMMENDED,
    defaultActions: [
      {
        type: 'forward',
        forward: { targetGroups: [{ arn: binding.targetGroupArn }] },
      },
    ],
  });
  expect(registrations('aws:lb/listenerCertificate:ListenerCertificate')[0]!.inputs).toEqual({
    listenerArn: 'arn:mock:service-public-listener',
    certificateArn: 'arn:certificate:secondary',
  });
  expect(registrations('aws:lb/listenerRule:ListenerRule')).toHaveLength(0);
  expect(registrations('aws:iam/role:Role')).toHaveLength(0);
});

it.each([DeploymentStrategy.BLUE_GREEN, DeploymentStrategy.CANARY, DeploymentStrategy.LINEAR])(
  '%s prepares production and test routing, scoped IAM, and service readiness',
  async (strategy) => {
    const attachment = createApplicationServiceAttachment(
      'service',
      'public',
      {
        ...configuration().application!,
        testTraffic: {
          match: { headers: [{ name: 'X-Deployment-Test', values: ['true'] }] },
        },
      },
      { parent: parent(), strategy },
    );
    const binding = await settle(attachment);
    const targets = [
      { arn: 'arn:mock:service-public-target-main', weight: 1 },
      { arn: 'arn:mock:service-public-target-alt', weight: 0 },
    ];

    expect(registrations('aws:lb/targetGroup:TargetGroup')).toHaveLength(2);
    const [primary, alternate] = registrations('aws:lb/targetGroup:TargetGroup');
    expect(primary!.inputs).toEqual(alternate!.inputs);
    expect(registrations('aws:lb/listenerRule:ListenerRule').map((rule) => rule.inputs)).toEqual([
      {
        listenerArn: 'arn:mock:service-public-listener',
        priority: 200,
        conditions: [{ pathPattern: { values: ['/*'] } }],
        actions: [{ type: 'forward', forward: { targetGroups: targets } }],
      },
      {
        listenerArn: 'arn:mock:service-public-listener',
        priority: 100,
        conditions: [{ httpHeader: { httpHeaderName: 'X-Deployment-Test', values: ['true'] } }],
        actions: [{ type: 'forward', forward: { targetGroups: targets } }],
      },
    ]);
    expect(binding.advancedConfiguration).toEqual({
      alternateTargetGroupArn: targets[1]!.arn,
      productionListenerRule: 'arn:mock:service-public-listener-rule',
      testListenerRule: 'arn:mock:service-public-listener-rule-test',
      roleArn: 'arn:mock:service-public-traffic-shift-role',
    });
    expect(ruleOptions.map((opts) => opts.ignoreChanges)).toEqual([
      ['actions[*].forward.targetGroups[*].weight'],
      ['actions[*].forward.targetGroups[*].weight'],
    ]);
    expect(registrations('aws:iam/role:Role')).toHaveLength(1);
    const policy = registrations('aws:iam/rolePolicy:RolePolicy')[0]!.inputs.policy;
    expect(policy.Statement).toEqual([
      {
        Effect: 'Allow',
        Action: [
          'elasticloadbalancing:DescribeListeners',
          'elasticloadbalancing:DescribeRules',
          'elasticloadbalancing:DescribeTargetGroups',
          'elasticloadbalancing:DescribeTargetHealth',
        ],
        Resource: '*',
      },
      {
        Effect: 'Allow',
        Action: ['elasticloadbalancing:RegisterTargets', 'elasticloadbalancing:DeregisterTargets'],
        Resource: targets.map((target) => target.arn),
      },
      {
        Effect: 'Allow',
        Action: 'elasticloadbalancing:ModifyRule',
        Resource: [
          'arn:mock:service-public-listener-rule',
          'arn:mock:service-public-listener-rule-test',
        ],
      },
    ]);
    expect(
      await Promise.all(attachment.readyDependencies.map((resource) => resolve(resource.urn))),
    ).toEqual([
      expect.stringContaining('aws:lb/listener:Listener::service-public-listener'),
      expect.stringContaining('aws:lb/listenerRule:ListenerRule::service-public-listener-rule'),
      expect.stringContaining(
        'aws:lb/listenerRule:ListenerRule::service-public-listener-rule-test',
      ),
      expect.stringContaining(
        'aws:iam/rolePolicy:RolePolicy::service-public-traffic-shift-role-policy',
      ),
    ]);
  },
);

it('reads a shared listener and creates only its own rules, using its ALB VPC and provider', async () => {
  const owner = parent();
  const attachment = createApplicationServiceAttachment(
    'service',
    'shared',
    {
      containerName: 'app',
      containerPort: 3000,
      existingListener: {
        listenerArn,
        priority: 25,
        match: { hostnames: { regexValues: ['^api\\.example\\.com$'] } },
      },
      targetProtocolVersion: ApplicationProtocolVersion.HTTP_2,
      testTraffic: { match: { pathPatterns: { values: ['/test/*'] } } },
    },
    { parent: owner, strategy: DeploymentStrategy.BLUE_GREEN },
  );
  await settle(attachment);

  const listeners = registrations('aws:lb/listener:Listener');
  expect(listeners).toHaveLength(1);
  expect(listeners[0]!.id).toBe(listenerArn);
  const listener = attachment.readyDependencies[0] as aws.lb.Listener;
  expect(await resolve(listener.defaultActions)).toEqual([
    { type: 'fixed-response', fixedResponse: { statusCode: '403' } },
  ]);
  expect(registrations('aws:lb/listenerCertificate:ListenerCertificate')).toHaveLength(0);
  expect(
    registrations('aws:lb/listenerRule:ListenerRule').map((rule) => ({
      priority: rule.inputs.priority,
      listenerArn: rule.inputs.listenerArn,
      conditions: rule.inputs.conditions,
    })),
  ).toEqual([
    {
      priority: 25,
      listenerArn,
      conditions: [{ hostHeader: { regexValues: ['^api\\.example\\.com$'] } }],
    },
    { priority: 24, listenerArn, conditions: [{ pathPattern: { values: ['/test/*'] } }] },
  ]);
  expect(calls).toHaveLength(1);
  expect(calls[0]!.inputs.arn).toBe(loadBalancerArn);
  const providerReference = `${await resolve(provider.urn)}::${await resolve(provider.id)}`;
  expect(calls[0]!.provider).toBe(providerReference);
  for (const resource of resources.filter((entry) => entry.type.startsWith('aws:'))) {
    expect(resource.provider).toBe(providerReference);
  }
  expect(await resolve(attachment.requiredIngress)).toEqual([
    { sourceGroupId: 'sg-alb', port: 3000 },
  ]);
});

it('gives two attachments to the same container and port distinct resource identities', async () => {
  const owner = parent();
  const publicAttachment = createApplicationServiceAttachment(
    'service',
    'public',
    configuration().application!,
    {
      parent: owner,
      strategy: DeploymentStrategy.ROLLING,
    },
  );
  const internalAttachment = createApplicationServiceAttachment(
    'service',
    'internal',
    configuration().application!,
    {
      parent: owner,
      strategy: DeploymentStrategy.ROLLING,
    },
  );
  const [publicBinding, internalBinding] = await Promise.all([
    settle(publicAttachment),
    settle(internalAttachment),
  ]);
  const groups = registrations('aws:lb/targetGroup:TargetGroup');
  expect(groups).toHaveLength(2);
  expect(new Set(groups.map((resource) => resource.name))).toEqual(
    new Set(['service-internal-target-main', 'service-public-target-main']),
  );
  expect(publicBinding.containerName).toBe(internalBinding.containerName);
  expect(publicBinding.containerPort).toBe(internalBinding.containerPort);
  expect(publicBinding.targetGroupArn).not.toBe(internalBinding.targetGroupArn);
});

it('opens only the dedicated listener port when public access is requested', async () => {
  const attachment = createApplicationServiceAttachment(
    'service',
    'public',
    {
      ...configuration().application!,
      listener: { loadBalancerArn, listenerPort: 8080, open: true },
    },
    { parent: parent(), strategy: DeploymentStrategy.ROLLING },
  );
  await settle(attachment);

  expect(
    registrations('aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule').map(
      (resource) => resource.inputs,
    ),
  ).toEqual([
    {
      ipProtocol: 'tcp',
      securityGroupId: 'sg-alb',
      fromPort: 8080,
      toPort: 8080,
      cidrIpv4: '0.0.0.0/0',
    },
  ]);
});

it('deduplicates application and health-check ingress across service attachments', async () => {
  const name = `managed-${sequence++}`;
  const service = new FargateServiceV2(
    name,
    {
      clusterArn: 'arn:mock:cluster',
      taskDefinition: 'arn:mock:task',
      vpcSubnetIds: ['subnet-private'],
      loadBalancer: {
        public: {
          application: {
            ...configuration().application!,
            targetHealthCheck: { port: 3001 },
          },
        },
        internal: {
          application: {
            ...configuration().application!,
            existingListener: { listenerArn, priority: 25, match: { methods: ['GET'] } },
            listener: undefined,
            targetHealthCheck: { port: 3001 },
          },
        },
        admin: {
          application: {
            ...configuration().application!,
            containerPort: 3002,
            listener: { loadBalancerArn, listenerPort: 8080 },
            targetHealthCheck: { port: 3001 },
          },
        },
      },
    },
    { providers: { aws: provider } },
  );
  await Promise.all([
    resolve(service.service.urn),
    ...service.securityGroups.map((group) => resolve(group.urn)),
  ]);

  const groups = registrations('aws:ec2/securityGroup:SecurityGroup');
  expect(groups).toHaveLength(1);
  expect(groups[0]!.inputs).toEqual({
    description: 'Managed by Pulumi',
    vpcId: 'vpc-shared',
    ingress: [3000, 3001, 3002].map((port) => ({
      protocol: 'tcp',
      fromPort: port,
      toPort: port,
      securityGroups: ['sg-alb'],
    })),
    egress: [{ protocol: '-1', cidrBlocks: ['0.0.0.0/0'], fromPort: 0, toPort: 0 }],
  });
  expect(registrations('aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule')).toHaveLength(
    0,
  );
  expect(await resolve(service.service.loadBalancers)).toEqual([
    {
      containerName: 'app',
      containerPort: 3000,
      targetGroupArn: `arn:mock:${name}-public-target-main`,
    },
    {
      containerName: 'app',
      containerPort: 3000,
      targetGroupArn: `arn:mock:${name}-internal-target-main`,
    },
    {
      containerName: 'app',
      containerPort: 3002,
      targetGroupArn: `arn:mock:${name}-admin-target-main`,
    },
  ]);
});

it('attaches user-supplied service security groups without managing their rules', async () => {
  const service = new FargateServiceV2(
    `supplied-${sequence++}`,
    {
      clusterArn: 'arn:mock:cluster',
      taskDefinition: 'arn:mock:task',
      vpcSubnetIds: ['subnet-private'],
      securityGroupIds: ['sg-user'],
      loadBalancer: { public: configuration() },
    },
    { providers: { aws: provider } },
  );
  await Promise.all([
    resolve(service.service.urn),
    ...service.securityGroups.map((group) => resolve(group.urn)),
  ]);

  const groups = registrations('aws:ec2/securityGroup:SecurityGroup');
  expect(groups).toHaveLength(1);
  expect(groups[0]!.id).toBe('sg-user');
  expect(groups[0]!.inputs.ingress).toBeUndefined();
  expect(groups[0]!.inputs.egress).toBeUndefined();
  expect(registrations('aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule')).toHaveLength(
    0,
  );
  expect(registrations('aws:vpc/securityGroupEgressRule:SecurityGroupEgressRule')).toHaveLength(0);
  expect((await resolve(service.service.networkConfiguration))?.securityGroups).toEqual([
    'sg-user',
  ]);
});

it('rejects a service attachment without application configuration', () => {
  expect(
    () =>
      new FargateServiceV2(`invalid-${sequence++}`, {
        clusterArn: 'arn:mock:cluster',
        taskDefinition: 'arn:mock:task',
        vpcSubnetIds: ['subnet-private'],
        loadBalancer: { invalid: {} },
      }),
  ).toThrow(
    expect.objectContaining({
      propertyPath: 'loadBalancer.invalid.application',
    }),
  );
});

it.each([
  [
    'missing listener',
    { application: { containerName: 'app', containerPort: 3000 } },
    'ROLLING',
    'loadBalancer.invalid.application',
  ],
  [
    'both listener modes',
    {
      application: {
        ...configuration().application!,
        existingListener: { listenerArn, priority: 200, match: { methods: ['GET'] } },
      },
    },
    'ROLLING',
    'loadBalancer.invalid.application',
  ],
  [
    'test traffic with rolling',
    {
      application: {
        ...configuration().application!,
        testTraffic: { match: { methods: ['GET'] } },
      },
    },
    'ROLLING',
    'loadBalancer.invalid.application.testTraffic',
  ],
  [
    'empty test conditions',
    {
      application: { ...configuration().application!, testTraffic: { match: {} } },
    },
    'BLUE_GREEN',
    'loadBalancer.invalid.application.testTraffic.match',
  ],
  [
    'HTTP2 without TLS',
    {
      application: {
        ...configuration().application!,
        targetProtocolVersion: ApplicationProtocolVersion.HTTP_2,
      },
    },
    'ROLLING',
    'loadBalancer.invalid.application.targetProtocolVersion',
  ],
  [
    'TLS policy without TLS',
    {
      application: {
        ...configuration().application!,
        listener: { loadBalancerArn, sslPolicy: SslPolicy.RECOMMENDED },
      },
    },
    'ROLLING',
    'loadBalancer.invalid.application.listener.sslPolicy',
  ],
  [
    'HTTP codes with gRPC',
    {
      application: {
        ...configuration().application!,
        targetProtocolVersion: ApplicationProtocolVersion.GRPC,
        targetHealthCheck: { healthyHttpCodes: '200' },
      },
    },
    'ROLLING',
    'loadBalancer.invalid.application.targetHealthCheck.healthyHttpCodes',
  ],
  [
    'gRPC codes with HTTP',
    {
      application: { ...configuration().application!, targetHealthCheck: { healthGrpcCodes: '0' } },
    },
    'ROLLING',
    'loadBalancer.invalid.application.targetHealthCheck.healthGrpcCodes',
  ],
  [
    'conflicting match modes',
    {
      application: {
        ...configuration().application!,
        listener: {
          loadBalancerArn,
          match: { hostnames: { values: ['example.com'], regexValues: ['.*'] } },
        },
      },
    },
    'ROLLING',
    'loadBalancer.invalid.application.listener.match.hostnames',
  ],
  [
    'empty regex alternatives',
    {
      application: {
        ...configuration().application!,
        listener: { loadBalancerArn, match: { pathPatterns: { regexValues: [] } } },
      },
    },
    'ROLLING',
    'loadBalancer.invalid.application.listener.match.pathPatterns',
  ],
  [
    'shared listener without conditions',
    {
      application: {
        containerName: 'app',
        containerPort: 3000,
        existingListener: { listenerArn, priority: 200, match: {} },
      },
    },
    'ROLLING',
    'loadBalancer.invalid.application.existingListener.match',
  ],
  [
    'no priority available for test traffic',
    {
      application: {
        containerName: 'app',
        containerPort: 3000,
        existingListener: { listenerArn, priority: 1, match: { methods: ['GET'] } },
        testTraffic: { match: { methods: ['POST'] } },
      },
    },
    'BLUE_GREEN',
    'loadBalancer.invalid.application.existingListener.priority',
  ],
] as Array<[string, ServiceLoadBalancer, keyof typeof DeploymentStrategy, string]>)(
  'rejects %s before registering attachment resources',
  (_description, args, strategy, propertyPath) => {
    const owner = parent();
    try {
      createApplicationServiceAttachment('service', 'invalid', args.application!, {
        parent: owner,
        strategy: DeploymentStrategy[strategy],
      });
      throw new Error('Expected input validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(pulumi.InputPropertyError);
      expect((error as pulumi.InputPropertyError).propertyPath).toBe(propertyPath);
    }
    expect(resources.filter((resource) => resource.type.startsWith('aws:'))).toHaveLength(0);
  },
);
