import * as pulumi from '@pulumi/pulumi';
import type { ecs } from '@pulumi/aws/types/output';

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
}

/**
 * One existing Managed Instances or ASG-backed provider in a service's capacity strategy.
 */
export interface ServiceCapacityProvider extends CapacityAllocation {
  /**
   * ARN of an existing Managed Instances or ASG-backed capacity provider associated with this
   * cluster. The provider must be usable in the cluster, with host networking that supports image
   * pulls, secrets, and logs.
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
  providerFamily?: 'EC2' | 'MANAGED_INSTANCES';
}

/**
 * Validates policy shape and numeric allocation before declaring reads or children.
 *
 * @param capacity The optional explicit policy.
 */
export function validateServiceCapacity(capacity?: ServiceCapacity): void {
  if (capacity === undefined) return;
  if (capacity.fargate !== undefined && capacity.providers !== undefined) {
    throw capacityError('Select at most one of fargate or providers.');
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
 * Resolves the cluster default or falls back to Fargate without changing cluster policy.
 *
 * @param defaults The strategy read from the cluster.
 * @returns The concrete strategy or Fargate launch type.
 */
export function resolveClusterCapacity(
  defaults: ResolvedCapacityProvider[] | undefined,
): ResolvedServiceCapacity {
  if (defaults?.length) return { strategies: defaults };
  return { launchType: 'FARGATE' };
}

/**
 * Checks that the task can use the resolved policy and this component's networking.
 *
 * @param capacity The resolved service policy.
 * @param compatibilities Compatibility declarations from the task definition.
 * @param networkMode The task's network mode.
 * @param settings Top-level service settings that require Fargate.
 * @param settings.assignPublicIp Whether to assign public task IPs.
 * @param settings.operatingSystemFamily The task operating system, defaulting to Linux.
 */
export function validateTaskCapacity(
  capacity: ResolvedServiceCapacity,
  compatibilities: string[],
  networkMode: string,
  settings: {
    assignPublicIp?: boolean;
    operatingSystemFamily?: string;
  } = {},
): void {
  if (settings.operatingSystemFamily && settings.operatingSystemFamily !== 'LINUX') {
    throw new pulumi.InputPropertyError({
      propertyPath: 'taskDefinitionArn',
      reason: 'Service supports only Linux task definitions.',
    });
  }
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
  if (!fargate && settings.assignPublicIp === true) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'assignPublicIp',
      reason: 'assignPublicIp is supported only with Fargate capacity.',
    });
  }
  const requiredCompatibility = fargate ? 'FARGATE' : capacity.providerFamily;
  if (
    requiredCompatibility &&
    !(requiredCompatibility === 'EC2' && compatibilities.length === 0) &&
    !compatibilities.includes(requiredCompatibility)
  ) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'taskDefinitionArn',
      reason: `The selected capacity requires a task definition registered with ${requiredCompatibility} compatibility. Select compatible capacity or use a compatible task definition.`,
    });
  }
  if (
    !fargate &&
    !capacity.providerFamily &&
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
 * Validates provider family, cluster association, and uniqueness.
 *
 * @param clusterArn The selected service cluster.
 * @param clusterName The cluster name parsed from its ARN.
 * @param providers Resolved metadata for each explicit provider.
 * @param associatedProviders Provider names associated with the cluster, required for ASG
 *   providers.
 * @returns The common provider family.
 */
export function validateCapacityProviders(
  clusterArn: string,
  clusterName: string,
  providers: {
    name: string;
    cluster?: string;
    managedInstances?: ecs.CapacityProviderManagedInstancesProvider;
    autoScaling?: ecs.CapacityProviderAutoScalingGroupProvider;
  }[],
  associatedProviders: string[] = [],
): 'EC2' | 'MANAGED_INSTANCES' {
  const names = new Set<string>();
  let family: 'EC2' | 'MANAGED_INSTANCES' | undefined;
  providers.forEach((provider, index) => {
    if (Boolean(provider.managedInstances) === Boolean(provider.autoScaling)) {
      throw capacityError('Select Managed Instances or ASG-backed capacity providers.');
    }
    const currentFamily = provider.managedInstances ? 'MANAGED_INSTANCES' : 'EC2';
    const associated = provider.managedInstances
      ? provider.cluster === clusterArn || provider.cluster === clusterName
      : associatedProviders.includes(provider.name);
    if (!associated) {
      throw new pulumi.InputPropertyError({
        propertyPath: `capacity.providers[${index}].capacityProviderArn`,
        reason: "Select a capacity provider associated with this service's cluster.",
      });
    }
    if (family && family !== currentFamily) {
      throw capacityError('Managed Instances and ASG-backed providers cannot share a strategy.');
    }
    family = currentFamily;
    if (names.has(provider.name)) {
      throw capacityError('Each capacity provider may appear only once.');
    }
    names.add(provider.name);
  });
  if (!family) throw capacityError('Select at least one capacity provider.');
  return family;
}
