import * as pulumi from '@pulumi/pulumi';

// Keep AWSX-facing configuration independent of Native's generated resource inputs.
// AWSX owns the supported properties, abstractions, documentation, and defaults.

/**
 * The transport protocol used for an ECS port mapping.
 */
export enum PortMappingProtocol {
  /**
   * Use the Transmission Control Protocol.
   */
  TCP = 'tcp',
  /**
   * Use the User Datagram Protocol.
   */
  UDP = 'udp',
}

/**
 * The application protocol used by ECS Service Connect.
 */
export enum PortMappingAppProtocol {
  /**
   * Use HTTP protocol handling and telemetry.
   */
  HTTP = 'http',
  /**
   * Use HTTP/2 protocol handling and telemetry.
   */
  HTTP2 = 'http2',
  /**
   * Use gRPC protocol handling and telemetry.
   */
  GRPC = 'grpc',
}

/**
 * Linux capabilities to add to or remove from a container.
 */
export interface KernelCapabilities {
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
 * Linux capability and init-process settings shared by ECS task definitions.
 */
export interface LinuxParameters {
  /**
   * Linux capabilities to add to or remove from the container.
   */
  readonly capabilities?: KernelCapabilities;

  /**
   * Run an init process that forwards signals and reaps processes.
   */
  readonly initProcessEnabled?: boolean;
}

/**
 * A port mapping for a container using awsvpc networking.
 *
 * ECS maps each host port to the same port on the container, so this type does not expose
 * `hostPort`.
 */
export interface AwsvpcPortMapping {
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
   * A range of container ports with inclusive `start` and `end` values.
   *
   * Do not set this property when `containerPort` is set. ECS maps the host port range to the same
   * container port range.
   */
  readonly containerPortRange?: ContainerPortRange;
}

/**
 * An inclusive range of container ports.
 *
 * For more information, see [container port
 * ranges](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html#ECS-Type-PortMapping-containerPortRange).
 */
export interface ContainerPortRange {
  /**
   * The first port in the range. Must be from 1 through 65535 and less than `end`.
   */
  start: number;

  /**
   * The last port in the range. Must be from 1 through 65535 and greater than `start`.
   */
  end: number;
}

/**
 * Log collection for an ECS container.
 */
export interface ContainerLogDriver {
  /**
   * Settings for sending container logs to CloudWatch Logs with the `awslogs` driver.
   *
   * For more information, see [CloudWatch
   * logging](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html).
   */
  readonly cloudwatch?: AwsLogsLogDriver;

  /**
   * Disable collection of this container's stdout and stderr through the log driver. Cannot be
   * combined with `cloudwatch`.
   *
   * Default - false; logs are sent to CloudWatch Logs.
   */
  readonly disabled?: boolean;
}

/**
 * The condition that a dependent container must satisfy before this container starts.
 */
export enum ContainerDependencyCondition {
  /**
   * Wait until the other container starts.
   */
  START = 'START',
  /**
   * Wait until the other container exits. The other container must not be essential.
   */
  COMPLETE = 'COMPLETE',
  /**
   * Wait until the other container exits with a zero status. It must not be essential.
   */
  SUCCESS = 'SUCCESS',
  /**
   * Wait until the other container passes its configured health check. Checked only at startup.
   */
  HEALTHY = 'HEALTHY',
}

/**
 * A dependency on another container in the same task.
 */
export interface ContainerDependency {
  /**
   * The condition that the other container must satisfy.
   */
  readonly condition: ContainerDependencyCondition;

  /**
   * The name of the other container.
   */
  readonly containerName: string;
}

/**
 * Settings for an ECS container health check.
 */
export interface HealthCheck {
  /**
   * The command that the container runs to determine whether it is healthy.
   *
   * The first value must be `CMD` or `CMD-SHELL`. An exit code of zero indicates success.
   *
   * Example: ["CMD-SHELL", "curl --fail http://localhost/health || exit 1"]
   */
  readonly command: string[];

  /**
   * The time, in seconds, between health checks. Valid values are from 5 through 300.
   *
   * Default - 30 seconds.
   */
  readonly intervalSeconds?: number;

  /**
   * The number of consecutive failures required before the container becomes unhealthy. Valid
   * values are from 1 through 10.
   *
   * Default - 3.
   */
  readonly retries?: number;

  /**
   * The startup grace period, in seconds, during which failed checks do not count toward the retry
   * limit. Valid values are from 0 through 300.
   *
   * Default - No startup grace period.
   */
  readonly startPeriodSeconds?: number;

  /**
   * The time, in seconds, to wait for a health check to succeed. Valid values are from 2 through 60.
   *
   * Default - 5 seconds.
   */
  readonly timeoutSeconds?: number;
}

/**
 * A namespaced kernel parameter to set in a container.
 */
export interface SystemControl {
  /**
   * The namespaced kernel parameter name.
   */
  readonly namespace?: string;

  /**
   * The value assigned to the parameter.
   */
  readonly value?: string;
}

/**
 * An operating-system resource limit for a container.
 */
export enum UlimitName {
  /**
   * Limit the size of core dump files.
   */
  CORE = 'core',
  /**
   * Limit CPU time.
   */
  CPU = 'cpu',
  /**
   * Limit the size of the process data segment.
   */
  DATA = 'data',
  /**
   * Limit the size of files that the process can create.
   */
  FSIZE = 'fsize',
  /**
   * Limit the number of file locks.
   */
  LOCKS = 'locks',
  /**
   * Limit the amount of memory that can be locked.
   */
  MEMLOCK = 'memlock',
  /**
   * Limit the number of bytes allocated for POSIX message queues.
   */
  MSGQUEUE = 'msgqueue',
  /**
   * Limit the process nice priority.
   */
  NICE = 'nice',
  /**
   * Limit the number of open file descriptors.
   */
  NOFILE = 'nofile',
  /**
   * Limit the number of processes available to the user.
   */
  NPROC = 'nproc',
  /**
   * Limit the resident set size.
   */
  RSS = 'rss',
  /**
   * Limit the real-time priority.
   */
  RTPRIO = 'rtprio',
  /**
   * Limit CPU time scheduled under a real-time policy.
   */
  RTTIME = 'rttime',
  /**
   * Limit the number of pending signals.
   */
  SIGPENDING = 'sigpending',
  /**
   * Limit the process stack size.
   */
  STACK = 'stack',
}

/**
 * A soft and hard operating-system resource limit for a container.
 */
export interface Ulimit {
  /**
   * The hard limit, in bytes, seconds, or a count, depending on `name`.
   */
  readonly hardLimit: number;
  /**
   * The resource limit to configure.
   */
  readonly name: UlimitName;
  /**
   * The soft limit, in bytes, seconds, or a count, depending on `name`.
   */
  readonly softLimit: number;
}

/**
 * Data volumes inherited from another container in the same task.
 */
export interface VolumeFrom {
  /**
   * Whether this container has read-only access to the volumes.
   *
   * Default - `false`.
   */
  readonly readOnly?: boolean;

  /**
   * The name of the container from which to mount volumes.
   */
  readonly sourceContainer?: string;
}

/**
 * Container configuration shared by Fargate and ECS Managed Instances tasks.
 */
export interface ContainerDefinitionOptions {
  /**
   * The image used to start the container.
   */
  readonly image: pulumi.Input<string>;

  /**
   * Environment variables keyed by name, including ordinary values, Pulumi secret-marked values,
   * and references to existing SSM parameters or Secrets Manager secrets.
   *
   * Default - No environment variables.
   */
  readonly environment?: Record<string, EnvironmentVariable>;

  /**
   * Environment files passed to the container.
   */
  readonly environmentFiles?: EnvironmentFile[];

  /**
   * CPU units reserved for this container. Within a task CPU limit, these control relative shares
   * under contention.
   *
   * Default - No minimum CPU reservation.
   */
  readonly cpuUnits?: number;

  /**
   * Hard memory limit in MiB. ECS stops the container if it exceeds this limit. Must exceed
   * memoryReservationMiB when both are set.
   *
   * Default - No container-level hard memory limit. A task memory limit or container reservation is
   * required.
   */
  readonly memoryMiB?: number;

  /**
   * Soft memory reservation in MiB. The container can grow beyond this reservation when memory is
   * available, up to its hard limit or the task's shared memory limit. Not supported on Windows.
   *
   * Default - No soft memory reservation.
   */
  readonly memoryReservationMiB?: number;

  /**
   * Startup ordering dependencies on other containers. ECS reverses them during shutdown.
   *
   * Default - No dependencies.
   */
  readonly dependsOn?: Array<pulumi.Input<ContainerDependency>>;

  /**
   * Time in seconds to wait for this container's startup dependencies to become ready.
   *
   * Fargate accepts 2 through 120 seconds. Managed Instances accepts 0 through 600 seconds.
   *
   * Default - No container-specific startup timeout.
   */
  readonly startTimeoutSeconds?: number;

  /**
   * Time in seconds to wait before forcefully stopping a container that does not exit normally.
   *
   * Fargate accepts 2 through 120 seconds. Managed Instances accepts 0 through 86400 seconds.
   *
   * Default - 30 seconds.
   */
  readonly stopTimeoutSeconds?: number;

  /**
   * Linux resource limits. Explicit values override runtime defaults.
   *
   * Default - Runtime defaults.
   */
  readonly ulimits?: Ulimit[];

  /**
   * Whether ECS resolves image tags to digests so service tasks use a consistent image version.
   *
   * Default - true.
   */
  readonly versionConsistencyEnabled?: boolean;

  /**
   * Ports exposed on the task's network interface.
   */
  readonly portMappings?: AwsvpcPortMapping[];

  /**
   * Linux capability and init-process settings. Not supported on Windows. Fargate permits adding
   * only SYS_PTRACE.
   */
  readonly linuxParameters?: LinuxParameters;

  /**
   * Log collection. AWSX grants the execution role access to the configured log group.
   *
   * Default - CloudWatch logging with a shared log group created by this component.
   */
  readonly logging?: ContainerLogDriver;

  /**
   * The command passed to the container.
   *
   * Default - The command configured in the container image.
   */
  readonly command?: Array<pulumi.Input<string>>;

  /**
   * Labels to add to the container.
   *
   * Default - No labels.
   */
  readonly dockerLabels?: Record<string, pulumi.Input<string>>;

  /**
   * The entry point passed to the container.
   *
   * Default - The entry point configured in the container image.
   *
   * For more information, see [Dockerfile
   * ENTRYPOINT](https://docs.docker.com/reference/dockerfile/#entrypoint).
   */
  readonly entryPoint?: string[];

  /**
   * Whether the container is essential to the task.
   *
   * If an essential container stops, ECS stops all other containers in the task. Each task must
   * have at least one essential container.
   *
   * Default - `true`.
   */
  readonly essential?: boolean;

  /**
   * The health check command and settings for the container.
   *
   * Use a health check when the container can remain running while the application is unhealthy,
   * such as an unresponsive server or a worker that has stopped processing jobs. A health check is
   * not required merely to validate startup configuration if the application exits when that
   * validation fails.
   *
   * ECS services can replace tasks with unhealthy essential containers. A health check does not
   * provide automatic replacement for standalone tasks.
   *
   * ECS only monitors health checks specified in the task definition. It does not monitor a health
   * check configured only in the container image.
   *
   * Default - No ECS container health check.
   *
   * For more information, see [Determine Amazon ECS task health using container health
   * checks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html).
   */
  readonly healthCheck?: HealthCheck;

  /**
   * Whether to keep standard input open for the container when no client is attached.
   *
   * Default - `false`.
   */
  readonly interactive?: boolean;

  /**
   * Whether to allocate a TTY for the container.
   *
   * Default - `false`.
   */
  readonly pseudoTerminal?: boolean;

  /**
   * Whether the container has read-only access to its root file system.
   *
   * Default - `false`.
   */
  readonly readonlyRootFilesystem?: boolean;

  /**
   * Namespaced kernel parameters to set in the container.
   *
   * Default - No system controls.
   *
   * For more information, see [System
   * controls](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#container_definition_systemcontrols).
   */
  readonly systemControls?: SystemControl[];

  /**
   * The user that runs commands inside the container.
   *
   * The value can be a user name, user ID, or a user and group pair supported by the container
   * operating system. This property is not supported for Windows containers.
   *
   * Default - The user configured in the container image, or the root user if the image does not
   * configure one.
   */
  readonly user?: string;

  /**
   * Data volumes to mount from another container in the same task.
   *
   * Each entry identifies the source container and whether this container has read-only access to
   * its volumes.
   *
   * Default - No inherited volumes.
   */
  readonly volumesFrom?: VolumeFrom[];

  /**
   * The working directory in which commands run inside the container.
   *
   * Default - The working directory configured in the container image, or `/` if the image does not
   * configure one.
   */
  readonly workingDirectory?: string;
}

/**
 * The delivery mode for container log messages.
 *
 * For more information, see [log delivery
 * options](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html#ECS-Type-LogConfiguration-options).
 */
export enum AwsLogDriverMode {
  /**
   * Deliver logs synchronously. Application writes can block when logs cannot be delivered.
   */
  BLOCKING = 'blocking',
  /**
   * Buffer logs in memory so application writes do not block. Logs can be lost when the buffer
   * fills.
   */
  NON_BLOCKING = 'non-blocking',
}

/**
 * Properties shared by EC2 and Fargate awslogs configurations.
 */
export interface AwsLogsLogDriver {
  /**
   * Prefix used for the container's log streams.
   *
   * Default - The task component name.
   */
  readonly streamPrefix?: pulumi.Input<string>;

  /**
   * The ARN of the log group to log to.
   *
   * Default - A log group is created automatically.
   */
  readonly logGroupArn?: pulumi.Input<string>;

  /**
   * A multiline start pattern in Python strftime format.
   */
  readonly datetimeFormat?: string;

  /**
   * A multiline start pattern expressed as a regular expression.
   */
  readonly multilinePattern?: string;

  /**
   * The delivery mode for log messages.
   */
  readonly mode?: AwsLogDriverMode;

  /**
   * Size, in bytes, of the buffer used in non-blocking mode.
   *
   * Default - The AWS default of 10 MiB when mode is non-blocking.
   */
  readonly maxBufferSizeBytes?: number;
}

/**
 * An S3 object containing environment variables for a container.
 */
export interface EnvironmentFile {
  /**
   * The ARN of the bucket that contains the environment file.
   */
  readonly bucketArn: pulumi.Input<string>;

  /**
   * The object key of the environment file.
   */
  readonly key: pulumi.Input<string>;
}

/**
 * A Secrets Manager source for a container secret.
 *
 * For more information, see [Secrets Manager environment
 * variables](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html).
 */
export interface SecretsManagerSecret {
  /**
   * The ARN of the Secrets Manager secret whose value is passed to the container.
   */
  readonly secretArn: pulumi.Input<string>;

  /**
   * The JSON key whose value to extract. The secret must contain JSON when this is set.
   *
   * Default - The full secret contents.
   */
  readonly jsonKey?: pulumi.Input<string>;

  /**
   * The staging label of the secret version to use, such as `AWSPREVIOUS`.
   *
   * Cannot be combined with `versionId`.
   *
   * Default - ECS uses `AWSCURRENT` when neither version selector is set.
   */
  readonly versionStage?: pulumi.Input<string>;

  /**
   * The unique ID of the secret version to use.
   *
   * Cannot be combined with `versionStage`.
   *
   * Default - ECS uses `AWSCURRENT` when neither version selector is set.
   */
  readonly versionId?: pulumi.Input<string>;
}

/**
 * A container environment variable. Supply exactly one source.
 */
export interface EnvironmentVariable {
  /**
   * The value passed to the container.
   *
   * Pulumi secret-marked values are stored in an AWSX-created Secrets Manager secret and referenced
   * by version ID. Changing the value registers a new task-definition revision and deploys services
   * consuming that revision.
   *
   * AWSX retains managed secrets, versions and retrieval permissions when this entry is removed.
   * Retained resources require manual cleanup and continue to incur charges. AWS may
   * garbage-collect old unlabeled versions after its version limit is exceeded.
   *
   * Default - Use the explicit SSM or Secrets Manager source instead.
   */
  readonly value?: pulumi.Input<string>;

  /**
   * An existing Secrets Manager secret. Cannot be combined with `value` or `ssmParameterArn`. AWSX
   * grants retrieval permissions but does not modify or retain the supplied secret.
   *
   * For more information, see [Secrets Manager environment
   * variables](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html).
   */
  readonly secretsManager?: SecretsManagerSecret;

  /**
   * An existing SSM Parameter Store parameter ARN. Cannot be combined with `value` or
   * `secretsManager`. AWSX grants retrieval permissions but does not modify or retain the
   * parameter.
   *
   * For more information, see [SSM Parameter Store environment
   * variables](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-ssm-paramstore.html).
   */
  readonly ssmParameterArn?: pulumi.Input<string>;
}
