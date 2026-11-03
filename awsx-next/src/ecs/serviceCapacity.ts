import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

/**
 * Allocation of service tasks to a capacity provider.
 */
export interface CapacityAllocation {
  /**
   * Number of desired tasks allocated here before weights are applied. Only one provider may
   * specify a positive base. Does not increase desiredCount or guarantee healthy capacity.
   *
   * Default - 0.
   */
  readonly base?: number;

  /**
   * Relative share of tasks remaining after the base. Zero allocates only the base tasks. At least
   * one selected provider must have a positive weight. Order does not imply priority.
   *
   * Default - 1.
   */
  readonly weight?: number;
}

/**
 * Fargate-specific service settings and optional On-Demand/Spot allocation.
 */
export interface FargateServiceCapacity {
  /**
   * Allocate tasks to Fargate On-Demand. If neither allocation is specified, use the Fargate launch
   * type without requiring a cluster capacity-provider association.
   *
   * Default - Fargate On-Demand when spot is also omitted, otherwise not selected.
   */
  readonly onDemand?: CapacityAllocation;

  /**
   * Allocate interruption-tolerant tasks to Fargate Spot. Unavailable Spot capacity is not
   * automatically replaced by On-Demand capacity.
   *
   * Default - Not selected.
   */
  readonly spot?: CapacityAllocation;

  /**
   * TODO: Reasses this placement, i'm not sure this belongs here Assign public IPv4 addresses to
   * task ENIs. Only available with explicit Fargate selection.
   *
   * Default - false.
   */
  readonly assignPublicIp?: boolean;
}

/**
 * One existing Managed Instances provider in a service's capacity strategy.
 */
export interface ServiceCapacityProvider extends CapacityAllocation {
  /**
   * ARN of an existing Managed Instances capacity provider in this service's cluster. AWSX reads it
   * without modifying capacity or cluster associations. The provider must be usable in the cluster,
   * with host networking that supports image pulls, secrets, and logs.
   */
  readonly capacityProviderArn: pulumi.Input<string>;
}

/**
 * Select exactly one capacity policy.
 */
export interface ServiceCapacity {
  /**
   * Select Fargate, overriding the cluster default.
   *
   * Default - Not explicitly selected.
   */
  readonly fargate?: FargateServiceCapacity;
  /**
   * Select a nonempty list of existing Managed Instances or EC2 providers. Each must belong to this
   * service's cluster. Duplicate providers are rejected. List order has no priority semantics.
   *
   * Default - Not explicitly selected.
   */
  readonly providers?: ServiceCapacityProvider[];

  /**
   * Uses the cluster's default capacity provider strategy.
   *
   * Cannot be combined with `fargate` or `providers. When neither option is provided, the service
   * uses the `FARGATE` launch type.
   *
   * Default - false
   */
  readonly useClusterDefaultCapacityProviderStrategy?: boolean;
}

// Internal resolved strategy model, separate from the public policy shapes.
export interface ResolvedCapacityProvider {
  capacityProvider: string;
  base?: number;
  weight?: number;
}

export interface ResolvedServiceCapacity {
  launchType?: string;
  strategies?: ResolvedCapacityProvider[];
}

/**
 * Validates policy shape and numeric allocation before declaring reads or children.
 *
 * @param capacity The optional explicit policy.
 */
export function validateServiceCapacity(capacity?: ServiceCapacity): void {
  if (capacity === undefined) return;
  const choices = [
    capacity.fargate,
    capacity.providers,
    capacity.useClusterDefaultCapacityProviderStrategy,
  ];
  if (choices.filter((choice) => choice !== undefined).length !== 1) {
    throw capacityError('Select exactly one of fargate, providers, or clusterDefault.');
  }
  if (capacity.providers !== undefined) {
    validateAllocations(capacity.providers, 'capacity.providers');
  }
  if (capacity.fargate) {
    const allocations = [capacity.fargate.onDemand, capacity.fargate.spot].filter(
      (value): value is CapacityAllocation => value !== undefined,
    );
    if (allocations.length) validateAllocations(allocations, 'capacity.fargate');
  }
}

/**
 * Validates an explicit allocation without resolving provider identifiers.
 *
 * @param allocations The provider allocations.
 * @param path The public policy path.
 */
function validateAllocations(allocations: CapacityAllocation[], path: string): void {
  if (allocations.length === 0 || allocations.length > 20) {
    throw new pulumi.InputPropertyError({
      propertyPath: path,
      reason: 'Select 1 through 20 capacity providers.',
    });
  }
  for (const allocation of allocations) {
    for (const [property, maximum] of [
      ['base', 100000],
      ['weight', 1000],
    ] as const) {
      const value = allocation[property];
      if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > maximum)) {
        throw new pulumi.InputPropertyError({
          propertyPath: path,
          reason: `${property} must be an integer from 0 through ${maximum}.`,
        });
      }
    }
  }
  if (allocations.filter((allocation) => (allocation.base ?? 0) > 0).length > 1) {
    throw new pulumi.InputPropertyError({
      propertyPath: path,
      reason: 'Only one provider may have a positive base.',
    });
  }
  if (!allocations.some((allocation) => (allocation.weight ?? 1) > 0)) {
    throw new pulumi.InputPropertyError({
      propertyPath: path,
      reason: 'At least one provider must have a positive weight.',
    });
  }
}

/**
 * Resolves automatic or explicit cluster-default selection without changing cluster policy.
 *
 * @param defaults The strategy read from the cluster.
 * @param requireDefault Whether the user explicitly requires a cluster default.
 * @returns The concrete strategy or Fargate launch type.
 */
export function resolveClusterCapacity(
  defaults: ResolvedCapacityProvider[] | undefined,
  requireDefault: boolean,
): ResolvedServiceCapacity {
  if (defaults?.length) return { strategies: defaults };
  if (requireDefault)
    throw capacityError(
      'The cluster has no default capacity-provider strategy. Configure one or explicitly select capacity.fargate or capacity.managedInstances.',
    );
  return { launchType: 'FARGATE' };
}

/**
 * Checks that the task can use the resolved policy and this component's networking.
 *
 * @param capacity The resolved service policy.
 * @param compatibilities Compatibility declarations from the task definition.
 * @param networkMode The task's network mode.
 * @param managedInstances Whether Managed Instances was explicitly selected and validated.
 */
export function validateTaskCapacity(
  capacity: ResolvedServiceCapacity,
  compatibilities: string[],
  networkMode: string,
  managedInstances: boolean,
): void {
  if (networkMode !== 'awsvpc') {
    throw new pulumi.InputPropertyError({
      propertyPath: 'taskDefinitionArn',
      reason:
        'Service requires an awsvpc task definition. Host and bridge networking are not supported.',
    });
  }
  const strategies = capacity.strategies ?? [];
  const fargate =
    capacity.launchType === 'FARGATE' ||
    strategies.some((entry) => ['FARGATE', 'FARGATE_SPOT'].includes(entry.capacityProvider));
  if (
    fargate &&
    strategies.some((entry) => !['FARGATE', 'FARGATE_SPOT'].includes(entry.capacityProvider))
  ) {
    throw capacityError(
      'The cluster default mixes Fargate and custom capacity providers, which ECS does not support.',
    );
  }
  if (
    (fargate && !compatibilities.includes('FARGATE')) ||
    (managedInstances && !compatibilities.includes('MANAGED_INSTANCES'))
  ) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'taskDefinitionArn',
      reason: `The selected capacity requires a task definition registered with ${fargate ? 'FARGATE' : 'MANAGED_INSTANCES'} compatibility. Select compatible capacity or use a compatible task definition.`,
    });
  }
  if (
    !fargate &&
    !managedInstances &&
    compatibilities.length &&
    !compatibilities.some((value) => ['EC2', 'MANAGED_INSTANCES'].includes(value))
  ) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'taskDefinitionArn',
      reason:
        'The cluster default selects custom capacity, but the task definition declares no EC2 or MANAGED_INSTANCES compatibility. Select compatible capacity or change the cluster default.',
    });
  }
}

/**
 * Creates a capacity-policy input error.
 *
 * @param reason The actionable validation message.
 * @returns The input error.
 */
function capacityError(reason: string): pulumi.InputPropertyError {
  return new pulumi.InputPropertyError({ propertyPath: 'capacity', reason });
}

/**
 * Checks that selected providers are unique Managed Instances providers in the service cluster.
 *
 * @param clusterArn The selected service cluster.
 * @param providers Resolved metadata for each explicit provider.
 */
export function validateManagedInstancesProviders(
  clusterArn: string,
  providers: {
    name: string;
    cluster?: string;
    managedInstances?: aws.types.input.ecs.CapacityProviderManagedInstancesProvider;
    autoScaling?: aws.types.input.ecs.CapacityProviderAutoScalingGroupProvider;
  }[],
): void {
  // TODO: Use ARN
  const clusterName = clusterArn.slice(clusterArn.lastIndexOf('/') + 1);
  const names = new Set<string>();
  providers.forEach((provider, index) => {
    if (
      !provider.managedInstances ||
      !provider.autoScaling ||
      (provider.cluster !== clusterArn && provider.cluster !== clusterName)
    ) {
      throw new pulumi.InputPropertyError({
        propertyPath: `capacity.providers[${index}].capacityProviderArn`,
        reason:
          "Select an ECS Managed Instances or AutoScalingGroup capacity provider belonging to this service's cluster.",
      });
    }
    if (names.has(provider.name)) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'capacity.providers',
        reason: 'Each capacity provider may appear only once.',
      });
    }
    names.add(provider.name);
  });
}
