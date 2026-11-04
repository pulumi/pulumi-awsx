import {
  resolveClusterCapacity,
  validateCapacityProviders,
  validateServiceCapacity,
  validateTaskCapacity,
} from '../../src/ecs/serviceCapacity';

const cluster = 'arn:aws:ecs:us-west-2:123456789012:cluster/test';
const asg = {
  name: 'asg',
  autoScaling: {
    autoScalingGroupArn: 'arn:aws:autoscaling:us-west-2:123456789012:autoScalingGroup:group',
    managedDraining: 'ENABLED',
    managedTerminationProtection: 'DISABLED',
    managedScaling: {
      instanceWarmupPeriod: 300,
      maximumScalingStepSize: 100,
      minimumScalingStepSize: 1,
      status: 'ENABLED',
      targetCapacity: 100,
    },
  },
};
const managed = {
  name: 'managed',
  cluster: 'test',
  managedInstances: {
    autoRepairConfiguration: { actionsStatus: 'ENABLED' },
    infrastructureRoleArn: 'arn:aws:iam::123456789012:role/infra',
    instanceLaunchTemplate: {
      capacityOptionType: 'ON_DEMAND',
      ec2InstanceProfileArn: 'arn:aws:iam::123456789012:instance-profile/ecs',
      networkConfiguration: { subnets: ['subnet'], securityGroups: ['sg'] },
    },
  },
};

describe('capacity provider selection', () => {
  test('accepts ASG providers through cluster associations without a provider cluster field', () => {
    expect(validateCapacityProviders(cluster, 'test', [asg], ['asg'])).toBe('EC2');
    expect(() => validateCapacityProviders(cluster, 'test', [asg], ['other'])).toThrow(
      'associated',
    );
  });

  test('accepts Managed Instances belonging to the cluster', () => {
    expect(validateCapacityProviders(cluster, 'test', [managed])).toBe('MANAGED_INSTANCES');
    expect(validateCapacityProviders(cluster, 'test', [{ ...managed, cluster }])).toBe(
      'MANAGED_INSTANCES',
    );
    expect(() =>
      validateCapacityProviders(cluster, 'test', [{ ...managed, cluster: 'other' }]),
    ).toThrow('associated');
  });

  test('rejects mixed families, duplicates, and unsupported provider metadata', () => {
    expect(() => validateCapacityProviders(cluster, 'test', [asg, managed], ['asg'])).toThrow(
      'cannot share',
    );
    expect(() => validateCapacityProviders(cluster, 'test', [asg, asg], ['asg'])).toThrow(
      'only once',
    );
    expect(() => validateCapacityProviders(cluster, 'test', [{ name: 'unknown' }])).toThrow(
      'ASG-backed',
    );
  });

  test.each(['EC2', 'MANAGED_INSTANCES'] as const)(
    'validates task compatibility against resolved %s capacity',
    (family) => {
      const capacity = {
        providerFamily: family,
        strategies: [{ capacityProvider: 'custom', weight: 1 }],
      };
      expect(() => validateTaskCapacity(capacity, [family], 'awsvpc')).not.toThrow();
      const other = family === 'EC2' ? 'MANAGED_INSTANCES' : 'EC2';
      expect(() => validateTaskCapacity(capacity, [other], 'awsvpc')).toThrow(
        `registered with ${family}`,
      );
    },
  );

  test('allows external EC2 tasks without registration-time compatibility declarations', () => {
    expect(() => validateTaskCapacity({ providerFamily: 'EC2' }, [], 'awsvpc')).not.toThrow();
    expect(() =>
      validateTaskCapacity({ providerFamily: 'MANAGED_INSTANCES' }, [], 'awsvpc'),
    ).toThrow('MANAGED_INSTANCES');
  });

  test.each(['bridge', 'host'])('rejects %s networking for EC2 tasks', (networkMode) => {
    expect(() => validateTaskCapacity({ providerFamily: 'EC2' }, ['EC2'], networkMode)).toThrow(
      expect.objectContaining({
        propertyPath: 'taskDefinitionArn',
        message:
          'Service requires an awsvpc task definition. Host and bridge networking are not supported.',
      }),
    );
  });

  test('rejects a Fargate-only task placed on inherited custom capacity', () => {
    expect(() =>
      validateTaskCapacity(
        { providerFamily: 'EC2', strategies: [{ capacityProvider: 'asg', weight: 1 }] },
        ['FARGATE'],
        'awsvpc',
      ),
    ).toThrow('registered with EC2');
  });

  test('rejects Windows tasks even when they use awsvpc and declare Fargate compatibility', () => {
    expect(() =>
      validateTaskCapacity({ launchType: 'FARGATE' }, ['FARGATE'], 'awsvpc', {
        operatingSystemFamily: 'WINDOWS_SERVER_2022_CORE',
      }),
    ).toThrow('only Linux');
  });

  test('rejects Fargate settings on EC2 while allowing disabled public IP assignment', () => {
    const capacity = { providerFamily: 'EC2' as const };
    expect(() =>
      validateTaskCapacity(capacity, ['EC2'], 'awsvpc', { assignPublicIp: false }),
    ).not.toThrow();
    expect(() =>
      validateTaskCapacity(capacity, ['EC2'], 'awsvpc', { assignPublicIp: true }),
    ).toThrow('only with Fargate');
    expect(() =>
      validateTaskCapacity({ launchType: 'FARGATE' }, ['FARGATE'], 'awsvpc', {
        assignPublicIp: true,
      }),
    ).not.toThrow();
  });
});

describe('cluster defaults', () => {
  test('allows omission and rejects conflicting explicit selections', () => {
    expect(() => validateServiceCapacity()).not.toThrow();
    expect(() => validateServiceCapacity({})).not.toThrow();
    expect(() =>
      validateServiceCapacity({ fargate: {}, providers: [{ capacityProviderArn: 'provider' }] }),
    ).toThrow('at most one');
  });

  test.each([
    { name: 'empty selection', allocations: [], reason: 'Select 1 through 20 capacity providers.' },
    {
      name: 'too many providers',
      allocations: Array.from({ length: 21 }, () => ({})),
      reason: 'Select 1 through 20 capacity providers.',
    },
    {
      name: 'multiple baselines',
      allocations: [{ base: 1 }, { base: 2 }],
      reason: 'Only one provider may have a positive base.',
    },
    {
      name: 'no weighted provider',
      allocations: [{ base: 2, weight: 0 }, { weight: 0 }],
      reason: 'At least one provider must have a positive weight.',
    },
    {
      name: 'negative weight',
      allocations: [{ weight: -1 }],
      reason: 'weight must be an integer from 0 through 1000.',
    },
    {
      name: 'weight above AWS limit',
      allocations: [{ weight: 1001 }],
      reason: 'weight must be an integer from 0 through 1000.',
    },
    {
      name: 'fractional baseline',
      allocations: [{ base: 0.5 }],
      reason: 'base must be an integer from 0 through 100000.',
    },
    {
      name: 'baseline above AWS limit',
      allocations: [{ base: 100001 }],
      reason: 'base must be an integer from 0 through 100000.',
    },
  ])('rejects provider allocation: $name', ({ allocations, reason }) => {
    expect(() =>
      validateServiceCapacity({
        providers: allocations.map((allocation, index) => ({
          ...allocation,
          capacityProviderArn: `provider-${index}`,
        })),
      }),
    ).toThrow(expect.objectContaining({ propertyPath: 'capacity.providers', message: reason }));
  });

  test('reports the Fargate policy path for conflicting baselines', () => {
    expect(() =>
      validateServiceCapacity({ fargate: { onDemand: { base: 2 }, spot: { base: 1 } } }),
    ).toThrow(
      expect.objectContaining({
        propertyPath: 'capacity.fargate',
        message: 'Only one provider may have a positive base.',
      }),
    );
  });

  test('adopts defaults automatically and falls back when absent or empty', () => {
    const defaults = [{ capacityProvider: 'asg', weight: 1 }];
    expect(resolveClusterCapacity(defaults)).toEqual({ strategies: defaults });
    expect(resolveClusterCapacity(undefined)).toEqual({ launchType: 'FARGATE' });
    expect(resolveClusterCapacity([])).toEqual({ launchType: 'FARGATE' });
  });
});
