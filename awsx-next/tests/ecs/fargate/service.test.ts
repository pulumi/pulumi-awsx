import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import {
  FargateCapacityProvider,
  FargateServiceV2,
  FargateServiceV2Args,
} from '../../../src/ecs/fargate/service';
import { ServiceLoadBalancer } from '../../../src/ecs/fargate/serviceLoadBalancer';
import * as serviceLoadBalancer from '../../../src/ecs/fargate/serviceLoadBalancer';

import {
  DeploymentFailureAction,
  ServiceDeploymentStrategy,
} from '../../../src/ecs/fargate/serviceDeployment';

test.each([
  {
    name: 'blue-green',
    deploymentStrategy: { blueGreen: { bakeTimeMinutes: 5 } },
    expected: { strategy: 'BLUE_GREEN', bakeTimeInMinutes: '5' },
    timeout: '25m',
  },
  {
    name: 'canary',
    deploymentStrategy: {
      canary: { bakeTimeMinutes: 5, canaryPercent: 20, canaryBakeTimeMinutes: 3 },
    },
    expected: {
      strategy: 'CANARY',
      bakeTimeInMinutes: '5',
      canaryConfiguration: { canaryPercent: 20, canaryBakeTimeInMinutes: '3' },
    },
    timeout: '28m',
  },
  {
    name: 'linear',
    deploymentStrategy: { linear: { bakeTimeMinutes: 5, stepPercent: 50, stepBakeTimeMinutes: 2 } },
    expected: {
      strategy: 'LINEAR',
      bakeTimeInMinutes: '5',
      linearConfiguration: { stepPercent: 50, stepBakeTimeInMinutes: '2' },
    },
    timeout: '27m',
  },
])(
  'wires $name deployment configuration and service readiness',
  async ({ name, deploymentStrategy, expected, timeout }) => {
    const { inputs } = await createService(name, {
      deploymentStrategy: deploymentStrategy as ServiceDeploymentStrategy,
      loadBalancerAttachments: { app: applicationAttachment('listener-public', 3000, 25) },
    });
    expect(inputs.deploymentConfiguration).toEqual(expected);
    const binding = inputs.loadBalancers[0];
    expect(binding.advancedConfiguration).toBeDefined();
    const service = constructions.find((r) => r.type === 'aws:ecs/service:Service')!;
    expect(service.opts.customTimeouts).toEqual({ create: timeout, update: timeout });
    const dependencies = service.opts.dependsOn as pulumi.Resource[];
    expect(await Promise.all(dependencies.map((r) => unwrap(r.urn)))).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`::${name}-app-listener-rule`),
        expect.stringContaining(`::${name}-app-traffic-shift-role-policy`),
      ]),
    );
  },
);

test.each([undefined, {}, { rolling: {} }])(
  'explicitly selects rolling while retaining the provider timeout for %j',
  async (deploymentStrategy) => {
    const { inputs } = await createService('rolling', { deploymentStrategy });
    expect(inputs.deploymentConfiguration).toEqual({ strategy: 'ROLLING' });
    expect(inputs.deploymentCircuitBreaker).toEqual({ enable: true, rollback: true });
    expect(
      constructions.find((r) => r.type === 'aws:ecs/service:Service')!.opts.customTimeouts,
    ).toBeUndefined();
  },
);

test.each(['canary', 'linear'] as const)(
  'rejects %s without traffic-routing attachments before creating children',
  (strategy) => {
    expect(
      () =>
        new FargateServiceV2('missing-routing', {
          clusterArn: 'cluster-arn',
          taskDefinition: 'task-arn',
          vpcSubnetIds: ['subnet-first'],
          deploymentStrategy: { [strategy]: { bakeTimeMinutes: 5 } },
        }),
    ).toThrow(expect.objectContaining({ propertyPath: 'loadBalancerAttachments' }));
    expect(resources.filter((resource) => resource.type.startsWith('aws:'))).toEqual([]);
  },
);

test('honors explicit timeout and failure action for progressive deployments', async () => {
  const { inputs } = await createService('override-progressive', {
    deploymentStrategy: {
      canary: { bakeTimeMinutes: 5, failureAction: DeploymentFailureAction.STOP },
    },
    deploymentTimeout: '2h',
    loadBalancerAttachments: { app: applicationAttachment('listener-public', 3000, 25) },
  });
  expect(inputs.deploymentCircuitBreaker).toEqual({ enable: true, rollback: false });
  expect(
    constructions.find((r) => r.type === 'aws:ecs/service:Service')!.opts.customTimeouts,
  ).toEqual({ create: '2h', update: '2h' });
});

const resources: pulumi.runtime.MockResourceArgs[] = [];
const calls: pulumi.runtime.MockCallArgs[] = [];
const constructions: pulumi.ResourceTransformationArgs[] = [];
let provider: aws.Provider;

beforeAll(async () => {
  await pulumi.runtime.setMocks({
    newResource(args) {
      resources.push(args);
      return { id: args.id || `${args.name}-id`, state: args.inputs };
    },
    call(args) {
      calls.push(args);
      switch (args.token) {
        case 'aws:ec2/getSubnet:getSubnet':
          return { ...args.inputs, vpcId: `vpc-for-${args.inputs.id}` };
        case 'aws:lb/getListener:getListener':
          return {
            ...args.inputs,
            loadBalancerArn: args.inputs.arn.replace('listener-', 'alb-'),
            protocol: 'HTTP',
          };
        case 'aws:lb/getLoadBalancer:getLoadBalancer':
          return {
            ...args.inputs,
            vpcId: 'vpc-for-subnet-first',
            securityGroups: [args.inputs.arn.replace('alb-', 'sg-')],
          };
        default:
          return args.inputs;
      }
    },
  });
  provider = new aws.Provider('service-provider', { region: 'us-west-2' });
  await unwrap(provider.urn);
});
beforeEach(() => {
  resources.length = 0;
  calls.length = 0;
  constructions.length = 0;
});

/**
 * Resolves a resource output for assertions.
 *
 * @param output The output to resolve.
 * @returns The resolved value.
 */
function unwrap<T>(output: pulumi.Output<T>): Promise<T> {
  return new Promise((resolve) => output.apply(resolve));
}

/**
 * Constructs a service and waits for its child registrations.
 *
 * @param name The component name.
 * @param overrides Explicit service settings.
 * @returns The component and registered ECS inputs.
 */
async function createService(
  name: string,
  overrides: Partial<FargateServiceV2Args> = {},
): Promise<{ component: FargateServiceV2; inputs: Record<string, any> }> {
  const component = new FargateServiceV2(
    name,
    {
      clusterArn: 'cluster-arn',
      taskDefinition: 'task-arn',
      vpcSubnetIds: pulumi.output([pulumi.output('subnet-first'), 'subnet-second']),
      ...overrides,
    },
    {
      providers: { aws: provider },
      transformations: [
        (args): undefined => {
          constructions.push(args);
          return undefined;
        },
      ],
    },
  );
  await unwrap(component.service.urn);
  await Promise.all(constructions.map(({ resource }) => unwrap(resource.urn)));
  const service = resources.find((r) => r.type === 'aws:ecs/service:Service')!;
  return { component, inputs: service.inputs };
}

/**
 * Creates one attachment with statically known application and health-check ports.
 *
 * @param listenerArn The caller-owned listener.
 * @param containerPort The application port.
 * @param priority The forwarding rule priority.
 * @param healthPort The health-check port.
 * @returns The attachment configuration.
 */
function applicationAttachment(
  listenerArn: pulumi.Input<string>,
  containerPort: number,
  priority: number,
  healthPort: number = containerPort,
): ServiceLoadBalancer {
  return {
    application: {
      listenerArn,
      containerName: 'app',
      containerPort,
      priority,
      targetHealthCheck: { port: healthPort },
    },
  };
}

test.each([
  { name: 'launch-type', settings: {}, launchType: 'FARGATE', strategy: undefined },
  {
    name: 'explicit-capacity',
    settings: {
      capacityProviderStrategies: [{ capacityProvider: FargateCapacityProvider.FARGATE_SPOT }],
    },
    launchType: undefined,
    strategy: [{ capacityProvider: 'FARGATE_SPOT', weight: 1 }],
  },
  {
    name: 'cluster-default',
    settings: { useClusterDefaultCapacityProviderStrategy: true },
    launchType: undefined,
    strategy: undefined,
  },
])('selects placement mode: $name', async ({ name, settings, launchType, strategy }) => {
  const { inputs } = await createService(name, settings);
  expect(inputs.launchType).toBe(launchType);
  expect(inputs.capacityProviderStrategies).toEqual(strategy);
});

test('defaults omitted capacity weights without replacing zero or an explicit weight', async () => {
  const { inputs } = await createService('weights', {
    capacityProviderStrategies: [
      { capacityProvider: FargateCapacityProvider.FARGATE, base: 1 },
      { capacityProvider: FargateCapacityProvider.FARGATE_SPOT, weight: 0 },
      { capacityProvider: FargateCapacityProvider.FARGATE_SPOT, weight: 3 },
    ],
  });
  expect(inputs.capacityProviderStrategies).toEqual([
    { capacityProvider: 'FARGATE', base: 1, weight: 1 },
    { capacityProvider: 'FARGATE_SPOT', weight: 0 },
    { capacityProvider: 'FARGATE_SPOT', weight: 3 },
  ]);
});

test('rejects conflicting capacity-provider choices', () => {
  expect(
    () =>
      new FargateServiceV2('invalid-capacity', {
        clusterArn: 'cluster',
        taskDefinition: 'task',
        vpcSubnetIds: ['subnet'],
        useClusterDefaultCapacityProviderStrategy: true,
        capacityProviderStrategies: [{ capacityProvider: FargateCapacityProvider.FARGATE }],
      }),
  ).toThrow(
    new pulumi.InputPropertyError({
      propertyPath: 'capacityProviderStrategies',
      reason:
        'Only one of `capacityProviderStrategies` or `useClusterDefaultCapacityProviderStrategy` can be provided.',
    }),
  );
});

test('discovers the first subnet VPC and wires a managed group with outbound-only access', async () => {
  const { component, inputs } = await createService('managed');
  expect(
    calls.filter((call) => call.token === 'aws:ec2/getSubnet:getSubnet').map((call) => call.inputs),
  ).toEqual([{ id: 'subnet-first' }]);
  const groups = resources.filter((r) => r.type === 'aws:ec2/securityGroup:SecurityGroup');
  expect(groups).toHaveLength(1);
  expect(groups[0]!.name).toBe('managed-security-group');
  expect(groups[0]!.inputs.vpcId).toBe('vpc-for-subnet-first');
  expect(groups[0]!.inputs).toEqual({
    description: 'Managed by Pulumi',
    vpcId: 'vpc-for-subnet-first',
  });
  expect(
    resources.filter((r) => r.type === 'aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule'),
  ).toHaveLength(0);
  expect(
    resources
      .filter((r) => r.type === 'aws:vpc/securityGroupEgressRule:SecurityGroupEgressRule')
      .map(({ name, inputs: ruleInputs }) => ({ name, inputs: ruleInputs })),
  ).toEqual([
    {
      name: 'managed-egress',
      inputs: {
        securityGroupId: 'managed-security-group-id',
        ipProtocol: '-1',
        cidrIpv4: '0.0.0.0/0',
      },
    },
  ]);
  expect(inputs.networkConfiguration.securityGroups).toEqual(['managed-security-group-id']);
  expect(inputs.networkConfiguration.subnets).toEqual(['subnet-first', 'subnet-second']);
  expect(await Promise.all(component.securityGroups.map((group) => unwrap(group.id)))).toEqual([
    'managed-security-group-id',
  ]);
  expect(resources.find((r) => r.type === 'aws:ecs/service:Service')!.name).toBe('managed');
});

test('reads every supplied security group without creating groups or changing egress', async () => {
  const { component, inputs } = await createService('supplied', {
    securityGroupIds: [pulumi.output('sg-first'), 'sg-second'],
  });
  const groups = resources.filter((r) => r.type === 'aws:ec2/securityGroup:SecurityGroup');
  expect(
    groups.map(({ name, id, inputs: groupInputs }) => ({ name, id, inputs: groupInputs })),
  ).toEqual([
    { name: 'supplied-security-group-0', id: 'sg-first', inputs: {} },
    { name: 'supplied-security-group-1', id: 'sg-second', inputs: {} },
  ]);
  expect(inputs.networkConfiguration.securityGroups).toEqual(['sg-first', 'sg-second']);
  expect(await Promise.all(component.securityGroups.map((group) => unwrap(group.id)))).toEqual([
    'sg-first',
    'sg-second',
  ]);
  expect(
    resources.filter((r) => r.type === 'aws:vpc/securityGroupEgressRule:SecurityGroupEgressRule'),
  ).toHaveLength(0);
});

test('deduplicates shared application and health ports into standalone rules and waits for them', async () => {
  await createService('shared-ingress', {
    loadBalancerAttachments: {
      api: applicationAttachment('listener-shared', 3000, 10, 3001),
      admin: applicationAttachment('listener-shared', 3000, 20, 3001),
      health: applicationAttachment('listener-shared', 3001, 30),
    },
  });
  const ingress = resources.filter(
    (r) => r.type === 'aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule',
  );
  expect(ingress.map(({ name, inputs }) => ({ name, inputs }))).toEqual([
    {
      name: 'shared-ingress-ingress-3000',
      inputs: {
        securityGroupId: 'shared-ingress-security-group-id',
        referencedSecurityGroupId: 'sg-shared',
        ipProtocol: 'tcp',
        fromPort: 3000,
        toPort: 3000,
      },
    },
    {
      name: 'shared-ingress-ingress-3001',
      inputs: {
        securityGroupId: 'shared-ingress-security-group-id',
        referencedSecurityGroupId: 'sg-shared',
        ipProtocol: 'tcp',
        fromPort: 3001,
        toPort: 3001,
      },
    },
  ]);
  const group = resources.find((r) => r.type === 'aws:ec2/securityGroup:SecurityGroup')!;
  expect(group.inputs).toEqual({ description: 'Managed by Pulumi', vpcId: 'vpc-for-subnet-first' });
  const ecs = constructions.find((r) => r.type === 'aws:ecs/service:Service')!;
  const dependencies = (await unwrap(pulumi.output(ecs.opts.dependsOn))) as pulumi.Resource[];
  expect(dependencies).toHaveLength(6);
  expect(
    new Set(
      await Promise.all(dependencies.map(async (r) => (await unwrap(r.urn)).split('::').at(-1))),
    ),
  ).toEqual(
    new Set([
      'shared-ingress-admin-listener-rule',
      'shared-ingress-api-listener-rule',
      'shared-ingress-egress',
      'shared-ingress-health-listener-rule',
      'shared-ingress-ingress-3000',
      'shared-ingress-ingress-3001',
    ]),
  );
});

test('uses the application port for health-check ingress when targetHealthCheck is omitted', async () => {
  await createService('default-health-port', {
    loadBalancerAttachments: {
      app: {
        application: {
          listenerArn: 'listener-shared',
          containerName: 'app',
          containerPort: 3000,
          priority: 10,
        },
      },
    },
  });
  expect(
    resources
      .filter((r) => r.type === 'aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule')
      .map(({ name, inputs }) => ({ name, inputs })),
  ).toEqual([
    {
      name: 'default-health-port-ingress-3000',
      inputs: {
        securityGroupId: 'default-health-port-security-group-id',
        referencedSecurityGroupId: 'sg-shared',
        ipProtocol: 'tcp',
        fromPort: 3000,
        toPort: 3000,
      },
    },
  ]);
});

test('validates resolved listener priorities through the service', async () => {
  const validate = jest.spyOn(serviceLoadBalancer, 'validateListenerRulePriorities');
  try {
    await createService('resolved-priorities', {
      loadBalancerAttachments: {
        api: applicationAttachment(pulumi.output('listener-shared'), 3000, 10),
        admin: applicationAttachment(pulumi.output('listener-shared'), 3000, 20),
      },
    });
    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenCalledWith([
      { attachmentName: 'api', listenerArn: 'listener-shared', priority: 10, testTraffic: false },
      { attachmentName: 'admin', listenerArn: 'listener-shared', priority: 20, testTraffic: false },
    ]);
  } finally {
    validate.mockRestore();
  }
});

test.each([
  { manageIngress: undefined, attached: false },
  { manageIngress: undefined, attached: true },
  { manageIngress: false, attached: false },
  { manageIngress: false, attached: true },
])('rejects empty securityGroupIds before creating children: %j', ({ manageIngress, attached }) => {
  expect(
    () =>
      new FargateServiceV2(`empty-groups-${manageIngress}-${attached}`, {
        clusterArn: 'cluster',
        taskDefinition: 'task',
        vpcSubnetIds: ['subnet'],
        securityGroupIds: [],
        manageIngress,
        loadBalancerAttachments: attached
          ? { app: applicationAttachment('listener-shared', 3000, 10) }
          : undefined,
      }),
  ).toThrow(
    new pulumi.InputPropertyError({
      propertyPath: 'securityGroupIds',
      reason:
        'securityGroupIds must contain at least one security group when provided. Omit it to create a security group automatically.',
    }),
  );
  expect(resources.filter((r) => r.type.startsWith('aws:'))).toHaveLength(0);
  expect(calls).toEqual([]);
});

test('automatically adds ingress only to the first supplied group and leaves egress alone', async () => {
  const { inputs } = await createService('supplied-ingress', {
    securityGroupIds: [pulumi.output('sg-first'), 'sg-second'],
    loadBalancerAttachments: { app: applicationAttachment('listener-shared', 3000, 10) },
  });
  expect(inputs.networkConfiguration.securityGroups).toEqual(['sg-first', 'sg-second']);
  expect(
    resources
      .filter((r) => r.type === 'aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule')
      .map((r) => r.inputs),
  ).toEqual([
    {
      securityGroupId: 'sg-first',
      referencedSecurityGroupId: 'sg-shared',
      ipProtocol: 'tcp',
      fromPort: 3000,
      toPort: 3000,
    },
  ]);
  expect(
    resources.filter((r) => r.type === 'aws:vpc/securityGroupEgressRule:SecurityGroupEgressRule'),
  ).toHaveLength(0);
  expect(
    resources.filter((r) => r.type === 'aws:ec2/securityGroup:SecurityGroup').map((r) => r.inputs),
  ).toEqual([{}, {}]);
});

test.each([undefined, []])(
  'rejects manual load-balancer ingress without a supplied group (%j) before creating children',
  (securityGroupIds) => {
    expect(
      () =>
        new FargateServiceV2(
          `invalid-manual-${securityGroupIds === undefined ? 'omitted' : 'empty'}`,
          {
            clusterArn: 'cluster',
            taskDefinition: 'task',
            vpcSubnetIds: ['subnet'],
            manageIngress: false,
            securityGroupIds,
            loadBalancerAttachments: { app: applicationAttachment('listener-shared', 3000, 10) },
          },
        ),
    ).toThrow();
    expect(resources.filter((r) => r.type.startsWith('aws:'))).toHaveLength(0);
    expect(calls).toEqual([]);
  },
);

test('manual ingress skips rules and conflicting-source validation but still waits for steady state', async () => {
  const { inputs } = await createService('manual', {
    manageIngress: false,
    securityGroupIds: [pulumi.output('sg-existing')],
    loadBalancerAttachments: {
      public: applicationAttachment('listener-shared', 3000, 10),
      private: applicationAttachment('listener-other', 3000, 10),
    },
  });
  expect(
    resources.filter((r) => r.type === 'aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule'),
  ).toHaveLength(0);
  expect(
    resources.filter((r) => r.type === 'aws:vpc/securityGroupEgressRule:SecurityGroupEgressRule'),
  ).toHaveLength(0);
  expect(inputs.loadBalancers).toHaveLength(2);
  expect(inputs.waitForSteadyState).toBe(true);
  expect(inputs.networkConfiguration.securityGroups).toEqual(['sg-existing']);
  expect(
    resources
      .filter((r) => r.type === 'aws:ec2/securityGroup:SecurityGroup')
      .map((r) => ({ id: r.id, inputs: r.inputs })),
  ).toEqual([{ id: 'sg-existing', inputs: {} }]);
});

test.each([undefined, {}])(
  'manual ingress can create a group without load-balancer attachments (%j)',
  async (loadBalancerAttachments) => {
    const { inputs } = await createService(
      `manual-unattached-${loadBalancerAttachments === undefined ? 'omitted' : 'empty'}`,
      {
        manageIngress: false,
        loadBalancerAttachments,
      },
    );
    expect(
      resources.filter(
        (r) => r.type === 'aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule',
      ),
    ).toHaveLength(0);
    expect(
      resources.filter((r) => r.type === 'aws:vpc/securityGroupEgressRule:SecurityGroupEgressRule'),
    ).toHaveLength(1);
    expect(inputs.waitForSteadyState).toBe(true);
  },
);

test('allows different ALB source groups when their required task ports do not overlap', async () => {
  await createService('separate-ports', {
    loadBalancerAttachments: {
      ui: applicationAttachment('listener-shared', 3000, 10),
      api: applicationAttachment('listener-other', 8080, 10),
    },
  });
  expect(
    resources
      .filter((r) => r.type === 'aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule')
      .map((r) => ({ source: r.inputs.referencedSecurityGroupId, port: r.inputs.fromPort })),
  ).toEqual([
    { source: 'sg-shared', port: 3000 },
    { source: 'sg-other', port: 8080 },
  ]);
});

test('preserves explicit zero and false values instead of applying defaults', async () => {
  const { inputs } = await createService('explicit-falsy', {
    desiredCount: 0,
    deploymentMinHealthyPercent: 0,
    enableEcsManagedTags: false,
  });
  expect(inputs.desiredCount).toBe(0);
  expect(inputs.deploymentMinimumHealthyPercent).toBe(0);
  expect(inputs.enableEcsManagedTags).toBe(false);
});

test.each([undefined, '2h'])(
  'waits for rolling steady state with timeout %s on ECS only',
  async (timeout) => {
    const { inputs } = await createService(`wait-${timeout ?? 'default'}`, {
      deploymentTimeout: timeout,
    });
    expect(inputs.deploymentCircuitBreaker).toEqual({ enable: true, rollback: true });
    expect(inputs.waitForSteadyState).toBe(true);
    const ecs = constructions.find((args) => args.type === 'aws:ecs/service:Service')!;
    if (timeout !== undefined) {
      expect(ecs.opts.customTimeouts).toEqual({ create: timeout, update: timeout });
    }
    expect(
      constructions.filter(
        (args) => args.type !== 'aws:ecs/service:Service' && args.opts.customTimeouts !== undefined,
      ),
    ).toHaveLength(0);
  },
);

test('uses the selected region for subnet discovery and newly created children', async () => {
  await createService('cross-region', {
    region: 'eu-west-1',
    loadBalancerAttachments: { app: applicationAttachment('listener-shared', 3000, 10) },
  });
  expect(calls.find((call) => call.token === 'aws:ec2/getSubnet:getSubnet')!.inputs).toEqual({
    id: 'subnet-first',
    region: 'eu-west-1',
  });
  const regionalResources = resources
    .filter((r) => r.type.startsWith('aws:'))
    .map(({ type, inputs }) => ({ type, region: inputs.region }));
  expect(regionalResources).toHaveLength(6);
  expect(regionalResources).toEqual(
    expect.arrayContaining(
      [
        'aws:ec2/securityGroup:SecurityGroup',
        'aws:ecs/service:Service',
        'aws:lb/listenerRule:ListenerRule',
        'aws:lb/targetGroup:TargetGroup',
        'aws:vpc/securityGroupEgressRule:SecurityGroupEgressRule',
        'aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule',
      ].map((type) => ({ type, region: 'eu-west-1' })),
    ),
  );
  expect(
    calls
      .filter((call) => call.token.startsWith('aws:lb/'))
      .map(({ token, inputs }) => ({ token, inputs })),
  ).toEqual([
    {
      token: 'aws:lb/getListener:getListener',
      inputs: { arn: 'listener-shared', region: 'eu-west-1' },
    },
    {
      token: 'aws:lb/getLoadBalancer:getLoadBalancer',
      inputs: { arn: 'alb-shared', region: 'eu-west-1' },
    },
  ]);
});

test('resolves Output security-group IDs before adding the selected region', async () => {
  await createService('regional-group', {
    region: 'eu-west-1',
    securityGroupIds: [pulumi.output('sg-existing')],
  });
  const groups = resources.filter((r) => r.type === 'aws:ec2/securityGroup:SecurityGroup');
  expect(groups).toHaveLength(1);
  expect(groups[0]!.id).toBe('sg-existing@eu-west-1');
});

test('rehydrates a reference without constructor args or new children', async () => {
  const { component: original } = await createService('hydrated');
  const urn = await unwrap(original.urn);
  resources.length = 0;
  calls.length = 0;
  const component = new FargateServiceV2('hydrated', undefined as unknown as FargateServiceV2Args, {
    urn,
  });
  expect(await unwrap(component.urn)).toBe(urn);
  expect(Object.prototype.hasOwnProperty.call(component, 'service')).toBe(true);
  expect(Object.prototype.hasOwnProperty.call(component, 'securityGroups')).toBe(true);
  expect(resources).toEqual([]);
  expect(calls).toEqual([]);
});

test('uses the component provider for subnet discovery and child resources', async () => {
  await createService('provider-flow', {
    loadBalancerAttachments: { app: applicationAttachment('listener-shared', 3000, 10) },
  });
  const ecs = resources.find((r) => r.type === 'aws:ecs/service:Service')!;
  expect(ecs.provider).toContain('service-provider');
  expect(resources.filter((r) => r.type.startsWith('aws:')).map((r) => r.provider)).toEqual(
    resources.filter((r) => r.type.startsWith('aws:')).map(() => ecs.provider),
  );
  expect(calls.find((call) => call.token === 'aws:ec2/getSubnet:getSubnet')!.provider).toBe(
    ecs.provider,
  );
});
