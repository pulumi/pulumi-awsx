import * as pulumi from '@pulumi/pulumi';
import type * as aws from '@pulumi/aws';
import { ComponentIdentity } from '../../componentIdentity';
import { TaskDefinitionBuilder } from '../base/taskDefinition';
import { CpuArchitecture, type CommonTaskDefinitionOptions } from '../base/taskDefinitionOptions';
import type { EC2ContainerDefinitionOptions } from './containerDefinition';

/**
 * Configuration for a Linux, awsvpc task definition validated for ECS Managed Instances. No cluster
 * or capacity provider is needed until a service or standalone task uses it.
 */
export interface EC2TaskDefinitionV2Args extends CommonTaskDefinitionOptions {
  /**
   * Optional hard CPU limit shared by all containers in the task, in CPU units. Container CPU
   * reservations control their relative shares under contention within this limit.
   *
   * Default - No task-wide CPU limit.
   */
  readonly cpuUnits?: number;
  /**
   * Optional task-wide memory limit, in MiB. When omitted, every container must specify memoryMiB
   * or memoryReservationMiB.
   */
  readonly memoryMiB?: number;
  /**
   * CPU architecture for every container image in this task. Set this explicitly for
   * single-architecture images. Omitting it does not inspect or convert the images.
   *
   * Default - ECS selects from the capacity provider's available architectures.
   */
  readonly cpuArchitecture?: CpuArchitecture;
  /**
   * Containers keyed by their ECS container names. At least one is required.
   */
  readonly containers: Record<string, EC2ContainerDefinitionOptions>;
}

export const ec2TaskDefinitionStandaloneIdentity: ComponentIdentity = {
  type: 'awsx-next:index:EC2TaskDefinitionV2',
  aliases: [],
};

export const ec2TaskDefinitionAwsxIdentity: ComponentIdentity = {
  type: 'awsx:experimental/ecs:EC2TaskDefinitionV2',
  aliases: [],
};

/**
 * A Linux task definition for ECS Managed Instances, using awsvpc networking.
 *
 * Creates task and execution roles when omitted, scoped execution-role permissions, and CloudWatch
 * logging by default. It does not provision compute, networking, or a service. Traditional EC2
 * compatibility, Windows, and host or bridge networking are not supported.
 */
export class EC2TaskDefinitionV2 extends pulumi.ComponentResource {
  /**
   * The Task Role of the task
   */
  public readonly taskRole!: aws.iam.Role;

  /**
   * The Execution Role of the task
   */
  public readonly executionRole!: aws.iam.Role;

  /**
   * The ARN of the registered task-definition revision. Pass this to an ECS service or task.
   */
  public readonly taskDefinitionArn!: pulumi.Output<string>;

  /**
   * The family of the registered task definition.
   */
  public readonly family!: pulumi.Output<string>;

  /**
   * The revision number assigned by ECS to the registered task definition.
   */
  public readonly revision!: pulumi.Output<number>;

  /**
   * The shared CloudWatch Logs log group created by the component for containers using CloudWatch
   * logging (enabled by default) without specifying `logGroupArn`. This output is undefined when
   * the component does not create a default log group
   */
  public logGroup?: aws.cloudwatch.LogGroup;

  public readonly name!: string;

  public readonly region?: string;

  constructor(
    name: string,
    args: EC2TaskDefinitionV2Args,
    opts: pulumi.ComponentResourceOptions = {},
    /**
     * @internal
     */
    identity: ComponentIdentity = ec2TaskDefinitionStandaloneIdentity,
  ) {
    super(
      identity.type,
      name,
      opts.urn
        ? {
            taskRole: undefined,
            executionRole: undefined,
            taskDefinitionArn: undefined,
            family: undefined,
            revision: undefined,
            logGroup: undefined,
            region: undefined,
            name: undefined,
          }
        : args,
      pulumi.mergeOptions(opts, { aliases: identity.aliases }),
    );
    if (opts.urn) {
      return;
    }
    const containers = Object.entries(args.containers);
    for (const property of ['cpuUnits', 'memoryMiB'] as const) {
      validatePositiveInteger(args[property], property);
    }
    for (const [containerName, container] of containers) {
      const path = `containers.${containerName}`;
      validatePositiveInteger(container.memoryMiB, `${path}.memoryMiB`);
      validatePositiveInteger(container.memoryReservationMiB, `${path}.memoryReservationMiB`);
      validatePositiveInteger(container.gpuCount, `${path}.gpuCount`);
      for (const [property, maximum] of [
        ['startTimeoutSeconds', 600],
        ['stopTimeoutSeconds', 86400],
      ] as const) {
        const value = container[property];
        if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > maximum)) {
          throw new pulumi.InputPropertyError({
            propertyPath: `${path}.${property}`,
            reason: `${property} must be an integer between 0 and ${maximum}; got ${value}`,
          });
        }
      }
      if (
        args.memoryMiB === undefined &&
        container.memoryMiB === undefined &&
        container.memoryReservationMiB === undefined
      ) {
        throw new pulumi.InputPropertyError({
          propertyPath: `${path}.memoryMiB`,
          reason:
            'Specify memoryMiB or memoryReservationMiB for each container when task memoryMiB is omitted',
        });
      }
    }
    const runtimePlatform = {
      operatingSystemFamily: 'LINUX',
      cpuArchitecture: args.cpuArchitecture,
    };
    const task = new TaskDefinitionBuilder(
      this,
      name,
      args,
      {
        compatibility: 'MANAGED_INSTANCES',
        cpu: args.cpuUnits,
        memory: args.memoryMiB,
        runtimePlatform,
      },
      opts,
    );
    this.name = name;
    this.region = args.region;
    this.taskRole = task.taskRole;
    this.executionRole = task.executionRole;
    this.taskDefinitionArn = task.taskDefinitionArn;
    this.family = task.family;
    this.revision = task.revision;
    this.logGroup = task.logGroup;
    this.registerOutputs({
      executionRole: this.executionRole,
      taskRole: this.taskRole,
      taskDefinitionArn: this.taskDefinitionArn,
      family: this.family,
      revision: this.revision,
      logGroup: this.logGroup,
      name: this.name,
      region: this.region,
    });
  }
}

/**
 * Validates an optional positive integer resource requirement.
 *
 * @param value The resource requirement.
 * @param propertyPath The input property path.
 */
function validatePositiveInteger(value: number | undefined, propertyPath: string): void {
  if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
    throw new pulumi.InputPropertyError({
      propertyPath,
      reason: `${propertyPath} must be a positive integer; got ${value}`,
    });
  }
}
