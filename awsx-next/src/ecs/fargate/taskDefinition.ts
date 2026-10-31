import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import type { FargateContainerDefinitionOptions } from './containerDefinition';
import { resolveFargateTaskMemoryAndCpu } from './memoryAndCpu';
import { validateFargateContainerOptions } from './validateContainerOptions';
import { ComponentIdentity } from '../../componentIdentity';
import { TaskDefinitionBuilder } from '../base/taskDefinition';
import { CpuArchitecture, type CommonTaskDefinitionOptions } from '../base/taskDefinitionOptions';
export { renderPortMappings, removeEmpty, validateTaskProviders } from '../base/taskDefinition';

export { CpuArchitecture } from '../base/taskDefinitionOptions';

/**
 * The operating system family for the task
 */
export enum OperatingSystemFamily {
  LINUX = 'LINUX',
  WINDOWS_SERVER_2025_FULL = 'WINDOWS_SERVER_2025_FULL',
  WINDOWS_SERVER_2025_CORE = 'WINDOWS_SERVER_2025_CORE',
  WINDOWS_SERVER_2022_FULL = 'WINDOWS_SERVER_2022_FULL',
  WINDOWS_SERVER_2022_CORE = 'WINDOWS_SERVER_2022_CORE',
  WINDOWS_SERVER_2019_FULL = 'WINDOWS_SERVER_2019_FULL',
  WINDOWS_SERVER_2019_CORE = 'WINDOWS_SERVER_2019_CORE',
}

export interface RuntimePlatform {
  /**
   * The CpuArchitecture for Fargate Runtime Platform.
   *
   * Default - AWS default of X86_64.
   */
  readonly cpuArchitecture?: CpuArchitecture;

  /**
   * The operating system for Fargate Runtime Platform.
   *
   * @default - AWS default of LINUX.
   */
  readonly operatingSystemFamily?: OperatingSystemFamily;
}

export interface FargateTaskDefinitionV2Args extends CommonTaskDefinitionOptions {
  /**
   * The number of cpu units used by the task. For tasks using the Fargate launch type, this field
   * is required and you must use one of the following values, which determines your range of valid
   * values for the memory parameter:
   *
   * 256 (.25 vCPU) - Available memory values: 512 (0.5 GB), 1024 (1 GB), 2048 (2 GB)
   *
   * 512 (.5 vCPU) - Available memory values: 1024 (1 GB), 2048 (2 GB), 3072 (3 GB), 4096 (4 GB)
   *
   * 1024 (1 vCPU) - Available memory values: 2048 (2 GB), 3072 (3 GB), 4096 (4 GB), 5120 (5 GB),
   * 6144 (6 GB), 7168 (7 GB), 8192 (8 GB)
   *
   * 2048 (2 vCPU) - Available memory values: Between 4096 (4 GB) and 16384 (16 GB) in increments of
   * 1024 (1 GB)
   *
   * 4096 (4 vCPU) - Available memory values: Between 8192 (8 GB) and 30720 (30 GB) in increments of
   * 1024 (1 GB)
   *
   * 8192 (8 vCPU) - Available memory values: Between 16384 (16 GB) and 61440 (60 GB) in increments
   * of 4096 (4 GB)
   *
   * 16384 (16 vCPU) - Available memory values: Between 32768 (32 GB) and 122880 (120 GB) in
   * increments of 8192 (8 GB)
   *
   * 32768 (32 vCPU) - Available memory values: 61440 (60 GB), 122880 (120 GB), 249856 (244 GB)
   *
   * The 256 and 512 CPU values support Linux tasks only. The 8192, 16384, and 32768 CPU values
   * require Linux platform version 1.4.0 or later. The other CPU values support Linux and Windows
   * tasks.
   *
   * For Windows tasks, the task-level CPU value is not enforced at runtime. It is still required to
   * select the task size.
   *
   * Default - A CPU value will be automatically selected based on the container-level CPU and
   * memory requirements
   */
  readonly cpuUnits?: number;
  /**
   * The amount (in MiB) of memory used by the task. For tasks using the Fargate launch type, this
   * field is required and must be valid for the selected CPU value:
   *
   * 256 CPU units - 512 (0.5 GB), 1024 (1 GB), or 2048 (2 GB)
   *
   * 512 CPU units - Between 1024 (1 GB) and 4096 (4 GB) in increments of 1024 (1 GB)
   *
   * 1024 CPU units - Between 2048 (2 GB) and 8192 (8 GB) in increments of 1024 (1 GB)
   *
   * 2048 CPU units - Between 4096 (4 GB) and 16384 (16 GB) in increments of 1024 (1 GB)
   *
   * 4096 CPU units - Between 8192 (8 GB) and 30720 (30 GB) in increments of 1024 (1 GB)
   *
   * 8192 CPU units - Between 16384 (16 GB) and 61440 (60 GB) in increments of 4096 (4 GB)
   *
   * 16384 CPU units - Between 32768 (32 GB) and 122880 (120 GB) in increments of 8192 (8 GB)
   *
   * 32768 CPU units - 61440 (60 GB), 122880 (120 GB), or 249856 (244 GB)
   *
   * The 256 and 512 CPU values support Linux tasks only. The 8192, 16384, and 32768 CPU values
   * require Linux platform version 1.4.0 or later. The other CPU values support Linux and Windows
   * tasks.
   *
   * For Windows tasks, the task-level memory value is not enforced at runtime. It is still required
   * to select the task size.
   *
   * Default - A memory value will be automatically selected based on the container-level CPU and
   * memory requirements
   */
  readonly memoryMiB?: number;

  /**
   * The amount (in GiB) of ephemeral storage to be allocated to the task.
   *
   * Only supported in Fargate platform version 1.4.0 or later.
   *
   * Default - Undefined, in which case, the task will receive 20GiB ephemeral storage.
   */
  readonly ephemeralStorageGiB?: number;

  /**
   * Containers in the task, keyed by container name.
   *
   * AWSX uses each map key as the corresponding ECS container name.
   */
  containers: Record<string, FargateContainerDefinitionOptions>;

  /**
   * The operating system that your task definitions are running on.
   *
   * Default - AWS default of X86_64 Linux
   */
  runtimePlatform?: RuntimePlatform;
}

export const fargateTaskDefinitionStandaloneIdentity: ComponentIdentity = {
  type: 'awsx-next:index:FargateTaskDefinitionV2',
  aliases: [],
};

export const fargateTaskDefinitionAwsxIdentity: ComponentIdentity = {
  type: 'awsx:experimental/ecs:FargateTaskDefinitionV2',
  aliases: [],
};

export class FargateTaskDefinitionV2 extends pulumi.ComponentResource {
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
  // Preserve the existing inferred output, even though this cache is private.
  private providerRegion?: pulumi.Output<string>;

  constructor(
    name: string,
    args: FargateTaskDefinitionV2Args,
    opts: pulumi.ComponentResourceOptions = {},
    /**
     * @internal
     */
    identity: ComponentIdentity = fargateTaskDefinitionStandaloneIdentity,
  ) {
    // Declare outputs for resource-reference hydration without constructing children.
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
    if (
      args.ephemeralStorageGiB !== undefined &&
      (!Number.isInteger(args.ephemeralStorageGiB) ||
        args.ephemeralStorageGiB < 21 ||
        args.ephemeralStorageGiB > 200)
    ) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'ephemeralStorageGiB',
        reason: 'ephemeralStorageGiB must be an integer between 21 and 200',
      });
    }
    const { cpu, memory } = resolveFargateTaskMemoryAndCpu(
      containers.map(([, container]) => container),
      args.cpuUnits,
      args.memoryMiB,
      args.runtimePlatform?.operatingSystemFamily,
    );
    for (const [containerName, container] of containers) {
      validateFargateContainerOptions(container, `containers.${containerName}`);
      for (const property of ['startTimeoutSeconds', 'stopTimeoutSeconds'] as const) {
        const value = container[property];
        if (value !== undefined && (!Number.isInteger(value) || value < 2 || value > 120)) {
          throw new pulumi.InputPropertyError({
            propertyPath: `containers.${containerName}.${property}`,
            reason: `${property} must be an integer between 2 and 120; got ${value}`,
          });
        }
      }
    }
    const task = new TaskDefinitionBuilder(
      this,
      name,
      args,
      {
        compatibility: 'FARGATE',
        cpu,
        memory,
        runtimePlatform: args.runtimePlatform,
        getProviderRegion: (): pulumi.Output<string> =>
          (this.providerRegion ??= aws.getRegionOutput(undefined, { parent: this }).region),
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
