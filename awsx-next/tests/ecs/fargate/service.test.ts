import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import {
  FargateCapacityProvider,
  FargateServiceV2,
  FargateServiceV2Args,
} from '../../../src/ecs/fargate/service';

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
      return args.token === 'aws:ec2/getSubnet:getSubnet'
        ? { ...args.inputs, vpcId: `vpc-for-${args.inputs.id}` }
        : args.inputs;
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
  await Promise.all(component.securityGroups.map((group) => unwrap(group.urn)));
  const service = resources.find((r) => r.type === 'aws:ecs/service:Service')!;
  return { component, inputs: service.inputs };
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
  expect(groups[0]!.inputs.egress).toEqual([
    { protocol: '-1', cidrBlocks: ['0.0.0.0/0'], fromPort: 0, toPort: 0 },
  ]);
  expect(inputs.networkConfiguration.securityGroups).toEqual(['managed-security-group-id']);
  expect(inputs.networkConfiguration.subnets).toEqual(['subnet-first', 'subnet-second']);
  expect(await Promise.all(component.securityGroups.map((group) => unwrap(group.id)))).toEqual([
    'managed-security-group-id',
  ]);
  expect(resources.find((r) => r.type === 'aws:ecs/service:Service')!.name).toBe('managed');
});

test('reads every supplied security group without creating a group or managing rules', async () => {
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
  await createService('cross-region', { region: 'eu-west-1' });
  expect(calls.find((call) => call.token === 'aws:ec2/getSubnet:getSubnet')!.inputs).toEqual({
    id: 'subnet-first',
    region: 'eu-west-1',
  });
  expect(
    resources.find((r) => r.type === 'aws:ec2/securityGroup:SecurityGroup')!.inputs.region,
  ).toBe('eu-west-1');
  expect(resources.find((r) => r.type === 'aws:ecs/service:Service')!.inputs.region).toBe(
    'eu-west-1',
  );
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
  await createService('provider-flow');
  const ecs = resources.find((r) => r.type === 'aws:ecs/service:Service')!;
  expect(ecs.provider).toContain('service-provider');
  expect(resources.find((r) => r.type === 'aws:ec2/securityGroup:SecurityGroup')!.provider).toBe(
    ecs.provider,
  );
  expect(calls.find((call) => call.token === 'aws:ec2/getSubnet:getSubnet')!.provider).toBe(
    ecs.provider,
  );
});
