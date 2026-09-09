import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import type { CredentialSpec } from '../credentialSpec';
import { LogGroupReference } from '../../cloudwatch/logGroup';

// NOTE:
// ContainerDefinitionCommonProperties includes properties from the API level ContainerDefinitionArgs.
// you would normally just create a common interface and extend that in both places, but we want the
// ability to evolve this public API separately from the low level API types

/**
 * The condition that a dependent container must satisfy before this container starts.
 */
export enum ContainerDependencyCondition {
  START = 'START',
  COMPLETE = 'COMPLETE',
  SUCCESS = 'SUCCESS',
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
  readonly interval?: number;

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
  readonly startPeriod?: number;

  /**
   * The time, in seconds, to wait for a health check to succeed. Valid values are from 2 through 60.
   *
   * Default - 5 seconds.
   */
  readonly timeout?: number;
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
  CORE = 'core',
  CPU = 'cpu',
  DATA = 'data',
  FSIZE = 'fsize',
  LOCKS = 'locks',
  MEMLOCK = 'memlock',
  MSGQUEUE = 'msgqueue',
  NICE = 'nice',
  NOFILE = 'nofile',
  NPROC = 'nproc',
  RSS = 'rss',
  RTPRIO = 'rtprio',
  RTTIME = 'rttime',
  SIGPENDING = 'sigpending',
  STACK = 'stack',
}

/**
 * A soft and hard operating-system resource limit for a container.
 */
export interface Ulimit {
  readonly hardLimit: number;
  readonly name: UlimitName;
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
 * Controls whether ECS resolves an image tag to an image digest.
 */
export enum ContainerDefinitionVersionConsistency {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

/**
 * Direct ECS container properties shared by EC2 and Fargate task definitions.
 */
export interface ContainerDefinitionCommonProperties {
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
   * ECS only monitors health checks specified in the task definition. It does not monitor a health
   * check that is configured only in the container image.
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

export enum AwsLogDriverMode {
  BLOCKING = 'blocking',
  NON_BLOCKING = 'non-blocking',
}

/**
 * Properties shared by EC2 and Fargate awslogs configurations.
 */
export interface AwsLogsLogDriverBase {
  /**
   * The log group to log to.
   *
   * Default - A log group is created automatically.
   */
  readonly logGroup?: LogGroupReference;

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
   * The bucket that contains the environment file.
   */
  readonly bucket: aws.s3.Bucket;

  /**
   * The object key of the environment file.
   */
  readonly key: pulumi.Input<string>;
}

/**
 * A Secrets Manager source for a container secret.
 */
export interface SecretsManagerSecret {
  readonly secret: aws.secretsmanager.Secret;
  readonly jsonKey?: pulumi.Input<string>;
  readonly versionStage?: pulumi.Input<string>;
  readonly versionId?: pulumi.Input<string>;
}

/**
 * A secret environment-variable source.
 */
export interface Secret {
  readonly secretsManager?: SecretsManagerSecret;
  readonly ssmParameter?: aws.ssm.Parameter;
}

/**
 * Higher-level container options shared by EC2 and Fargate task definitions.
 */
export interface ContainerDefinitionOptionsBase {
  /**
   * The image used to start the container.
   */
  readonly image: pulumi.Input<string>;

  /**
   * Credential specifications used for Active Directory authentication.
   */
  readonly credentialSpecs?: CredentialSpec[];

  /**
   * Environment variables passed to the container.
   */
  readonly environment?: Record<string, string>;

  /**
   * Environment files passed to the container.
   */
  readonly environmentFiles?: EnvironmentFile[];

  /**
   * Secret environment variables passed to the container.
   */
  readonly secrets?: Record<string, Secret>;
}
