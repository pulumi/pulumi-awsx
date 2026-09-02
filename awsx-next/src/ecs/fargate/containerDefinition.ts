import type * as pulumi from '@pulumi/pulumi';
import type {
  AwsLogsLogDriverBase,
  ContainerDefinitionCommonProperties,
  ContainerDefinitionOptionsBase,
  ContainerDefinitionVersionConsistency,
  ContainerDependency,
  Ulimit,
} from '../base/containerDefinition';

/**
 * The transport protocol used for a Fargate port mapping.
 */
export enum PortMappingProtocol {
  TCP = 'tcp',
  UDP = 'udp',
}

/**
 * The application protocol used by ECS Service Connect.
 */
export enum PortMappingAppProtocol {
  HTTP = 'http',
  HTTP2 = 'http2',
  GRPC = 'grpc',
}

/**
 * Linux capabilities supported by containers in Fargate task definitions.
 */
export interface FargateKernelCapabilities {
  /**
   * Linux capabilities to add to the container.
   *
   * Fargate supports adding only `SYS_PTRACE`.
   */
  readonly add?: string[];

  /**
   * Linux capabilities to remove from the container.
   */
  readonly drop?: string[];
}

/**
 * Linux-specific options supported by containers in Fargate task definitions.
 */
export interface FargateLinuxParameters {
  /**
   * Linux capabilities to add to or remove from the container.
   */
  readonly capabilities?: FargateKernelCapabilities;

  /**
   * Run an init process that forwards signals and reaps processes.
   */
  readonly initProcessEnabled?: boolean;
}

/**
 * A port mapping for a container in a Fargate task.
 *
 * Fargate tasks use the `awsvpc` network mode. ECS maps each host port to the same port on the
 * container, so this type does not expose `hostPort`.
 */
export interface FargatePortMapping {
  /**
   * The port number exposed by the container.
   *
   * Do not set this property when `containerPortRange` is set.
   */
  readonly containerPort?: number;

  /**
   * The protocol used for the port mapping.
   *
   * Default - 'tcp'
   */
  readonly protocol?: PortMappingProtocol;

  /**
   * The name used by ECS Service Connect and VPC Lattice.
   */
  readonly name?: string;

  /**
   * The application protocol used by ECS Service Connect.
   */
  readonly appProtocol?: PortMappingAppProtocol;

  /**
   * A range of container ports, in the form `start-end`.
   *
   * Do not set this property when `containerPort` is set. For Fargate, ECS maps the host port range
   * to the same container port range.
   */
  readonly containerPortRange?: ContainerPortRange;
}

export interface ContainerPortRange {
  start: number;
  end: number;
}

/**
 * Properties supported by containers in Fargate task definitions.
 */
export interface FargateContainerDefinitionProperties extends ContainerDefinitionCommonProperties {
  /**
   * The minimum number of CPU units reserved for the container.
   *
   * The total CPU reserved by all containers must not exceed the task-level CPU value.
   *
   * Default - No minimum CPU reservation.
   */
  readonly cpu?: number;

  /**
   * The dependencies that control the container startup and shutdown order.
   *
   * ECS applies startup dependencies in reverse order during shutdown.
   *
   * Default - No container dependencies.
   */
  readonly dependsOn?: Array<pulumi.Input<ContainerDependency>>;

  /**
   * The hard memory limit for the container, in MiB.
   *
   * ECS stops the container if it uses more than this limit. Container-level memory is optional
   * because Fargate requires a task-level memory value.
   *
   * If you set both container-level memory values, `memory` must be greater than
   * `memoryReservation`.
   *
   * Default - No container-level hard memory limit.
   */
  readonly memory?: number;

  /**
   * The soft memory limit reserved for the container, in MiB.
   *
   * The container can use more memory when it is available, up to its hard memory limit. This
   * property is not supported for Windows containers.
   *
   * If you set both container-level memory values, `memory` must be greater than
   * `memoryReservation`.
   *
   * Default - No container-level soft memory reservation.
   */
  readonly memoryReservation?: number;

  /**
   * The time, in seconds, to wait for this container's startup dependencies to become ready.
   *
   * Valid values are from 2 through 120 seconds.
   *
   * Default - No container-specific startup timeout.
   */
  readonly startTimeout?: number;

  /**
   * The time, in seconds, to wait before ECS forcefully stops the container after it does not exit
   * normally.
   *
   * Valid values are from 2 through 120 seconds.
   *
   * Default - 30 seconds.
   */
  readonly stopTimeout?: number;

  /**
   * Resource limits to set for the container.
   *
   * This property is supported for Linux containers, but not Windows containers. Fargate uses the
   * operating system defaults except for `nofile`, for which both the soft and hard limits default
   * to 65,535.
   */
  readonly ulimits?: Ulimit[];

  /**
   * Whether ECS resolves the image tag to an image digest.
   *
   * Digest resolution makes deployments use a consistent image version.
   *
   * Default - `enabled`.
   */
  readonly versionConsistency?: ContainerDefinitionVersionConsistency;

  /**
   * Port mappings exposed by the container.
   */
  readonly portMappings?: FargatePortMapping[];

  /**
   * Linux-specific options applied to the container.
   *
   * This property is not supported for Windows containers.
   */
  readonly linuxParameters?: FargateLinuxParameters;
}

/**
 * CloudWatch Logs configuration for a Fargate container.
 */
export interface FargateAwsLogsLogDriver extends AwsLogsLogDriverBase {
  /**
   * Prefix used for the container's log streams.
   */
  readonly streamPrefix: pulumi.Input<string>;
}

/**
 * Log-driver configuration for a Fargate container.
 */
export interface FargateLogDriver {
  readonly cloudwatch: FargateAwsLogsLogDriver;
}

/**
 * Higher-level options for a container in a Fargate task definition.
 */
export interface FargateContainerDefinitionOptions
  extends ContainerDefinitionOptionsBase, FargateContainerDefinitionProperties {
  readonly logging?: FargateLogDriver;
}
