import type { ContainerDefinitionOptions } from '../base/containerDefinition';

/**
 * Container configuration for Linux, awsvpc tasks on ECS Managed Instances. Traditional ECS on EC2
 * host configuration is outside this API.
 */
export interface EC2ContainerDefinitionOptions extends ContainerDefinitionOptions {
  /**
   * Run with elevated host privileges.
   *
   * Default - false.
   */
  readonly privileged?: boolean;
  /**
   * Positive whole number of physical GPUs reserved for this container.
   *
   * Default - No GPUs.
   */
  readonly gpuCount?: number;
}
