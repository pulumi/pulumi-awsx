import { spawnSync } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import {
  ApplicationProtocol,
  ApplicationProtocolVersion,
  CreatedApplicationServiceAttachment,
  ServiceLoadBalancer,
  SslPolicy,
  createApplicationServiceAttachment,
} from '../../../src/ecs/fargate/serviceLoadBalancer';
import { FargateServiceV2 } from '../../../src/ecs/fargate/service';

const resources: pulumi.runtime.MockResourceArgs[] = [];
const calls: pulumi.runtime.MockCallArgs[] = [];
const loadBalancerGroups = new Map<string, string[]>();
const loadBalancerAddressTypes = new Map<string, string>();
const constructions: pulumi.ResourceTransformationArgs[] = [];
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
          ipAddressType: loadBalancerAddressTypes.get(args.inputs.arn) ?? 'ipv4',
          securityGroups: loadBalancerGroups.get(args.inputs.arn) ?? ['sg-alb'],
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
  loadBalancerGroups.clear();
  loadBalancerAddressTypes.clear();
  constructions.length = 0;
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
          constructions.push(args);
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
    { parent: parent() },
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
    },
    { parent: owner },
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

it.each([false, true])(
  'wires dedicated routing and all ECS readiness dependencies with match=%s',
  async (matched) => {
    const name = `routing-${sequence++}`;
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
              listener: {
                loadBalancerArn,
                certificateArns: ['arn:certificate:primary', 'arn:certificate:secondary'],
                match: matched ? { methods: ['GET'] } : undefined,
              },
            },
          },
          shared: {
            application: {
              containerName: 'app',
              containerPort: 3000,
              existingListener: {
                listenerArn,
                priority: 25,
                match: { methods: ['POST'] },
              },
            },
          },
        },
      },
      {
        providers: { aws: provider },
        transformations: [
          (args): undefined => {
            constructions.push(args);
            if (args.type.startsWith('aws:')) attachmentResources.push(args.resource);
            return undefined;
          },
        ],
      },
    );
    await resolve(service.service.urn);
    await Promise.all(attachmentResources.map((resource) => resolve(resource.urn)));

    const ecs = constructions.find((args) => args.type === 'aws:ecs/service:Service')!;
    const dependencies = ecs.opts.dependsOn as pulumi.Resource[];
    expect(dependencies).toEqual(
      constructions
        .filter((args) =>
          [
            'aws:lb/listener:Listener',
            'aws:lb/listenerCertificate:ListenerCertificate',
            'aws:lb/listenerRule:ListenerRule',
          ].includes(args.type),
        )
        .map((args) => args.resource),
    );
    expect(
      await Promise.all(
        dependencies.map(async (resource) => (await resolve(resource.urn)).split('::').at(-1)),
      ),
    ).toEqual([
      `${name}-public-listener`,
      `${name}-public-certificate-0`,
      ...(matched ? [`${name}-public-listener-rule`] : []),
      `${name}-shared-existing-listener`,
      `${name}-shared-listener-rule`,
    ]);

    const dedicated = registrations('aws:lb/listener:Listener').find((resource) => !resource.id)!;
    expect(dedicated.inputs.defaultActions).toEqual(
      matched
        ? [
            {
              type: 'fixed-response',
              fixedResponse: {
                statusCode: '404',
                contentType: 'text/plain',
                messageBody: 'Not found',
              },
            },
          ]
        : [
            {
              type: 'forward',
              forward: { targetGroups: [{ arn: `arn:mock:${name}-public-target-main` }] },
            },
          ],
    );
    expect(
      registrations('aws:lb/listenerRule:ListenerRule').map(({ name: ruleName, inputs }) => ({
        name: ruleName,
        inputs,
      })),
    ).toEqual([
      ...(matched
        ? [
            {
              name: `${name}-public-listener-rule`,
              inputs: {
                listenerArn: `arn:mock:${name}-public-listener`,
                priority: 200,
                conditions: [{ httpRequestMethod: { values: ['GET'] } }],
                actions: [
                  {
                    type: 'forward',
                    forward: { targetGroups: [{ arn: `arn:mock:${name}-public-target-main` }] },
                  },
                ],
              },
            },
          ]
        : []),
      {
        name: `${name}-shared-listener-rule`,
        inputs: {
          listenerArn,
          priority: 25,
          conditions: [{ httpRequestMethod: { values: ['POST'] } }],
          actions: [
            {
              type: 'forward',
              forward: { targetGroups: [{ arn: `arn:mock:${name}-shared-target-main` }] },
            },
          ],
        },
      },
    ]);
  },
);

it('gives two attachments to the same container and port distinct resource identities', async () => {
  const owner = parent();
  const publicAttachment = createApplicationServiceAttachment(
    'service',
    'public',
    configuration().application!,
    {
      parent: owner,
    },
  );
  const internalAttachment = createApplicationServiceAttachment(
    'service',
    'internal',
    configuration().application!,
    {
      parent: owner,
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

it.each(['ipv4', 'dualstack', 'dualstack-without-public-ipv4'])(
  'opens only the dedicated listener port for IPv4 and IPv6 on a %s ALB',
  async (addressType) => {
    loadBalancerAddressTypes.set(loadBalancerArn, addressType);
    const service = new FargateServiceV2(
      `open-${sequence++}`,
      {
        clusterArn: 'arn:mock:cluster',
        taskDefinition: 'arn:mock:task',
        vpcSubnetIds: ['subnet-private'],
        loadBalancer: {
          public: {
            application: {
              ...configuration().application!,
              listener: { loadBalancerArn, listenerPort: 8080, open: true },
            },
          },
        },
      },
      {
        providers: { aws: provider },
        transformations: [
          (args): undefined => {
            if (args.type.startsWith('aws:')) attachmentResources.push(args.resource);
            return undefined;
          },
        ],
      },
    );
    await resolve(service.service.urn);
    await Promise.all(attachmentResources.map((resource) => resolve(resource.urn)));

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
      {
        ipProtocol: 'tcp',
        securityGroupId: 'sg-alb',
        fromPort: 8080,
        toPort: 8080,
        cidrIpv6: '::/0',
      },
    ]);
  },
);

it.each([
  { scenario: 'different security groups', group: 'sg-private', port: 8080, open: true },
  { scenario: 'different ports', group: 'sg-alb', port: 8081, open: true },
  { scenario: 'only one owner', group: 'sg-alb', port: 8080, open: false },
])('allows public ingress with $scenario', async ({ group, port, open }) => {
  const privateAlbArn = `${loadBalancerArn}-private`;
  loadBalancerGroups.set(privateAlbArn, [group]);
  const name = `public-ingress-${sequence++}`;
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
            listener: { loadBalancerArn, listenerPort: 8080, open: true },
          },
        },
        private: {
          application: {
            ...configuration().application!,
            listener: { loadBalancerArn: privateAlbArn, listenerPort: port, open },
          },
        },
      },
    },
    {
      providers: { aws: provider },
      transformations: [
        (args): undefined => {
          if (args.type.startsWith('aws:')) attachmentResources.push(args.resource);
          return undefined;
        },
      ],
    },
  );
  await resolve(service.service.urn);
  await Promise.all(attachmentResources.map((resource) => resolve(resource.urn)));
  expect(
    registrations('aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule').map(
      ({ name: ruleName, inputs }) => ({ name: ruleName, inputs }),
    ),
  ).toEqual([
    {
      name: `${name}-public-alb-ingress-all`,
      inputs: {
        ipProtocol: 'tcp',
        securityGroupId: 'sg-alb',
        fromPort: 8080,
        toPort: 8080,
        cidrIpv4: '0.0.0.0/0',
      },
    },
    {
      name: `${name}-public-alb-ingress-all-ipv6`,
      inputs: {
        ipProtocol: 'tcp',
        securityGroupId: 'sg-alb',
        fromPort: 8080,
        toPort: 8080,
        cidrIpv6: '::/0',
      },
    },
    ...(open
      ? [
          {
            name: `${name}-private-alb-ingress-all`,
            inputs: {
              ipProtocol: 'tcp',
              securityGroupId: group,
              fromPort: port,
              toPort: port,
              cidrIpv4: '0.0.0.0/0',
            },
          },
          {
            name: `${name}-private-alb-ingress-all-ipv6`,
            inputs: {
              ipProtocol: 'tcp',
              securityGroupId: group,
              fromPort: port,
              toPort: port,
              cidrIpv6: '::/0',
            },
          },
        ]
      : []),
  ]);
});

// Isolate expected asynchronous Pulumi registration failures and the preview runtime from
// this suite's shared mocks. Compile with the same Babel configuration as the Jest tests.
it.each(['duplicate', 'unknown-preview'])(
  'validates public ingress without hiding declarations: %s',
  (mode) => {
    const result = spawnSync(
      process.execPath,
      [
        '-e',
        `
          require.extensions['.ts'] = (module, filename) => {
            const result = require('@babel/core').transformFileSync(filename);
            module._compile(result.code, filename);
          };
          const pulumi = require('@pulumi/pulumi');
          const { FargateServiceV2 } = require('./src/ecs/fargate/service.ts');
          const preview = process.argv[1] === 'unknown-preview';
          const rules = [];
          const registrations = [];
          // A rejected resource input also rejects internal Pulumi Outputs. Capture those only
          // in this subprocess; the assertions below check every rule's registration failure.
          process.on('unhandledRejection', () => {});
          (async () => {
            await pulumi.runtime.setMocks({
              newResource(args) {
                registrations.push(args);
                return { id: args.name, state: { ...args.inputs, arn: args.name } };
              },
              call(args) {
                return args.token === 'aws:lb/getLoadBalancer:getLoadBalancer'
                  ? { ...args.inputs, vpcId: 'vpc', securityGroups: [
                      preview ? pulumi.runtime.unknownValue : 'sg-shared'
                    ] }
                  : { ...args.inputs, vpcId: 'vpc' };
              },
            }, 'project', 'stack', preview);
            new FargateServiceV2('service', {
              clusterArn: 'cluster', taskDefinition: 'task', vpcSubnetIds: ['subnet'],
              loadBalancer: Object.fromEntries(['public', 'private'].map((name) => [name, {
                application: {
                  containerName: 'app', containerPort: 3000,
                  listener: { loadBalancerArn: name, listenerPort: 8080, open: true },
                },
              }])),
            }, {
              transformations: [(args) => {
                if (args.type === 'aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule') {
                  rules.push(args.resource);
                }
                return undefined;
              }],
            });
            const declaredCount = rules.length;
            const results = await Promise.allSettled(rules.map((rule) => rule.urn.promise()));
            console.log('RESULT:' + JSON.stringify({
              declaredCount,
              registrations: registrations.filter((args) =>
                args.type === 'aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule'
              ).map((args) => args.name),
              errors: results.filter((result) => result.status === 'rejected').map((result) => ({
                inputPropertyError: result.reason instanceof pulumi.InputPropertyError,
                propertyPath: result.reason.propertyPath,
                message: result.reason.message,
              })),
            }));
          })().catch((error) => { console.error(error); process.exitCode = 1; });
        `,
        mode,
      ],
      { cwd: resolvePath(__dirname, '../../..'), encoding: 'utf8', timeout: 20000 },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    const line = result.stdout.split('\n').find((entry) => entry.startsWith('RESULT:'));
    expect(line).toBeDefined();
    const observation = JSON.parse(line!.slice('RESULT:'.length));
    expect(observation.declaredCount).toBe(4);
    if (mode === 'unknown-preview') {
      expect(observation.errors).toEqual([]);
      expect(observation.registrations).toEqual([
        'service-public-alb-ingress-all',
        'service-public-alb-ingress-all-ipv6',
        'service-private-alb-ingress-all',
        'service-private-alb-ingress-all-ipv6',
      ]);
    } else {
      expect(observation.registrations).toEqual([]);
      expect(observation.errors).toHaveLength(4);
      for (const error of observation.errors) {
        expect(error.inputPropertyError).toBe(true);
        expect(error.propertyPath).toBe('loadBalancer.private.application.listener.open');
        expect(error.message).toContain('Attachments "public" and "private"');
        expect(error.message).toContain('security group sg-shared on TCP port 8080');
        expect(error.message).toContain('Set open: true on only one attachment');
      }
    }
  },
);

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

it('passes the service region to attachment children and load-balancer lookups', async () => {
  const service = new FargateServiceV2(
    `regional-${sequence++}`,
    {
      clusterArn: 'arn:mock:cluster',
      taskDefinition: 'arn:mock:task',
      vpcSubnetIds: ['subnet-private'],
      region: 'us-east-2',
      loadBalancer: {
        public: {
          application: {
            ...configuration().application!,
            listener: {
              loadBalancerArn,
              certificateArns: ['arn:certificate:primary', 'arn:certificate:secondary'],
              open: true,
              match: { methods: ['GET'] },
            },
          },
        },
        shared: {
          application: {
            containerName: 'app',
            containerPort: 3000,
            existingListener: { listenerArn, priority: 25, match: { methods: ['POST'] } },
          },
        },
      },
    },
    {
      providers: { aws: provider },
      transformations: [
        (args): undefined => {
          if (args.type.startsWith('aws:')) attachmentResources.push(args.resource);
          return undefined;
        },
      ],
    },
  );
  await resolve(service.service.urn);
  await Promise.all(attachmentResources.map((resource) => resolve(resource.urn)));
  const lookupCalls = calls.filter(
    (call) => call.token === 'aws:lb/getLoadBalancer:getLoadBalancer',
  );
  expect(lookupCalls).toHaveLength(2);
  expect(lookupCalls.map((call) => call.inputs.region)).toEqual(['us-east-2', 'us-east-2']);
  const imported = registrations('aws:lb/listener:Listener').find((resource) => resource.id);
  expect(imported!.id).toBe(`${listenerArn}@us-east-2`);
  const created = resources.filter((resource) => resource.type.startsWith('aws:') && !resource.id);
  expect(created.map((resource) => resource.inputs.region)).toEqual(created.map(() => 'us-east-2'));
  const providerReference = `${await resolve(provider.urn)}::${await resolve(provider.id)}`;
  expect(
    resources
      .filter((resource) => resource.type.startsWith('aws:'))
      .map((resource) => resource.provider),
  ).toEqual(
    resources.filter((resource) => resource.type.startsWith('aws:')).map(() => providerReference),
  );
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
    'loadBalancer.invalid.application',
  ],
  [
    'HTTP2 without TLS',
    {
      application: {
        ...configuration().application!,
        targetProtocolVersion: ApplicationProtocolVersion.HTTP_2,
      },
    },
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
    'loadBalancer.invalid.application.targetHealthCheck.healthyHttpCodes',
  ],
  [
    'gRPC codes with HTTP',
    {
      application: { ...configuration().application!, targetHealthCheck: { healthGrpcCodes: '0' } },
    },
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
    'loadBalancer.invalid.application.existingListener.match',
  ],
] as Array<[string, ServiceLoadBalancer, string]>)(
  'rejects %s before registering attachment resources',
  (_description, args, propertyPath) => {
    const owner = parent();
    try {
      createApplicationServiceAttachment('service', 'invalid', args.application!, {
        parent: owner,
      });
      throw new Error('Expected input validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(pulumi.InputPropertyError);
      expect((error as pulumi.InputPropertyError).propertyPath).toBe(propertyPath);
    }
    expect(resources.filter((resource) => resource.type.startsWith('aws:'))).toHaveLength(0);
  },
);
