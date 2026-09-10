// Copyright 2016-2026, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as pulumi from '@pulumi/pulumi';

/**
 * Controls whether Amazon ECS resolves the container image tag to an image digest.
 */
export enum ContainerDefinitionVersionConsistency {
  /**
   * Resolve the image tag to an image digest.
   */
  ENABLED = 'enabled',
  /**
   * Keep the original image URI without resolving the tag to a digest.
   */
  DISABLED = 'disabled',
}

/**
 * Settings for a container in an ECS task definition.
 *
 * For more information, see [ECS container
 * definitions](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html).
 */
export interface ContainerDefinitionArgs {
  /**
   * The command passed to the container. Use a separate array item for each argument.
   *
   * For more information, see
   * [command](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-command).
   */
  command?: Array<pulumi.Input<string>>;
  /**
   * The CPU units reserved for the container. There are 1,024 CPU units per vCPU.
   *
   * On Linux, this controls relative CPU shares, not a hard limit. On Windows, it is a hard limit.
   * For Fargate, the total container CPU reservation must be below the task CPU value.
   *
   * For more information, see
   * [cpu](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-cpu).
   */
  cpu?: number;
  /**
   * Credential specifications for Active Directory authentication. Specify at most one entry.
   *
   * Use `credentialspec:ARN` or `credentialspecdomainless:ARN`, with an SSM or S3 ARN. Prefer this
   * property to `dockerSecurityOptions` for credential specifications.
   *
   * For more information, see
   * [credentialSpecs](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-credentialSpecs).
   */
  credentialSpecs?: Array<pulumi.Input<string>>;
  /**
   * Dependencies on other containers in the task that control startup order.
   *
   * ECS reverses the dependency order during shutdown.
   *
   * For more information, see [container
   * dependencies](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDependency.html).
   */
  dependsOn?: Array<pulumi.Input<ContainerDependency>>;
  /**
   * Whether to disable networking in the container. Not supported for Windows containers.
   *
   * For more information, see
   * [disableNetworking](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-disableNetworking).
   */
  disableNetworking?: boolean;
  /**
   * DNS search domains for the container. Not supported for Windows containers.
   *
   * For more information, see
   * [dnsSearchDomains](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-dnsSearchDomains).
   */
  dnsSearchDomains?: string[];
  /**
   * DNS servers for the container. Not supported for Windows containers.
   *
   * For more information, see
   * [dnsServers](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-dnsServers).
   */
  dnsServers?: string[];
  /**
   * Labels to add to the container.
   *
   * For more information, see
   * [dockerLabels](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-dockerLabels).
   */
  dockerLabels?: Record<string, pulumi.Input<string>>;
  /**
   * Security options for the container, such as SELinux labels or an AppArmor profile.
   *
   * Not supported for Fargate tasks. The container instance must support the selected security
   * system. Use `credentialSpecs` for Active Directory authentication.
   *
   * For more information, see
   * [dockerSecurityOptions](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-dockerSecurityOptions).
   */
  dockerSecurityOptions?: string[];
  /**
   * The entry point passed to the container.
   *
   * For more information, see
   * [entryPoint](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-entryPoint).
   */
  entryPoint?: string[];
  /**
   * Environment variables passed to the container. Use `secrets` for sensitive values.
   *
   * For more information, see [environment
   * variables](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/taskdef-envfiles.html).
   */
  environment?: Array<pulumi.Input<KeyValuePair>>;
  /**
   * S3 environment files passed to the container. Specify at most ten `.env` files.
   *
   * Values in `environment` take precedence over file values. Files are processed in list order;
   * the first value for a variable takes precedence over values in later files. Not supported for
   * Windows containers.
   *
   * For more information, see [environment
   * files](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/use-environment-file.html).
   */
  environmentFiles?: Array<pulumi.Input<ContainerDefinitionEnvironmentFile>>;
  /**
   * Whether the container is essential to the task.
   *
   * If an essential container stops, ECS stops all other containers in the task. Each task must
   * have at least one essential container.
   *
   * Default - `true` in ECS.
   *
   * For more information, see
   * [essential](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-essential).
   */
  essential?: boolean;
  /**
   * Hostname and IP address mappings to add to the container's `/etc/hosts` file.
   *
   * Not supported for Windows containers or the `awsvpc` network mode.
   *
   * For more information, see
   * [extraHosts](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-extraHosts).
   */
  extraHosts?: Array<pulumi.Input<HostEntry>>;
  /**
   * FireLens log router settings for the container.
   *
   * For more information, see [custom log
   * routing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html).
   */
  firelensConfiguration?: FirelensConfiguration;
  /**
   * The health check command and settings for the container.
   *
   * ECS only monitors health checks specified in the task definition, not checks configured only in
   * the container image.
   *
   * For more information, see [container health
   * checks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html).
   */
  healthCheck?: HealthCheck;
  /**
   * The container hostname. Not supported with the `awsvpc` network mode.
   *
   * For more information, see
   * [hostname](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-hostname).
   */
  hostname?: string;
  /**
   * The image used to start the container, specified by name, tag, or digest.
   *
   * For private registries, include the registry address, such as `registry/repository:tag` or
   * `registry/repository@sha256:digest`. Image updates do not update already running tasks.
   *
   * For more information, see
   * [image](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-image).
   */
  image: pulumi.Input<string>;
  /**
   * Whether to keep standard input open for the container.
   *
   * For more information, see
   * [interactive](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-interactive).
   */
  interactive?: boolean;
  /**
   * Links to other containers, specified as a container name or `name:alias`.
   *
   * Supported only with the `bridge` network mode and not for Windows containers. Links do not
   * provide network isolation.
   *
   * For more information, see
   * [links](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-links).
   */
  links?: string[];
  /**
   * Linux-specific container settings, such as kernel capabilities and devices.
   *
   * Not supported for Windows containers.
   *
   * For more information, see [Linux
   * parameters](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LinuxParameters.html).
   */
  linuxParameters?: LinuxParameters;
  /**
   * The log driver and its settings for the container.
   *
   * On EC2, the driver must be available and configured on the container instance.
   *
   * For more information, see [log
   * configuration](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html).
   */
  logConfiguration?: pulumi.Input<LogConfiguration>;
  /**
   * The hard memory limit, in MiB. The container is killed if it exceeds this limit.
   *
   * Must be greater than `memoryReservation` when both are set. On EC2, specify memory at the task
   * or container level. Total container memory reservations must be below the task memory value, if
   * set. Container-level memory is optional on Fargate.
   *
   * For more information, see
   * [memory](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-memory).
   */
  memory?: number;
  /**
   * The soft memory limit, in MiB, reserved for the container during placement.
   *
   * The container can use more memory, up to `memory` or the available instance memory. If both
   * limits are set, `memory` must be greater. Without task-level memory, set a nonzero `memory` or
   * `memoryReservation` value.
   *
   * For more information, see
   * [memoryReservation](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-memoryReservation).
   */
  memoryReservation?: number;
  /**
   * Data volumes to mount in the container.
   *
   * Windows mounts must use directories on the same drive as `$env:ProgramData`.
   *
   * For more information, see
   * [mountPoints](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-mountPoints).
   */
  mountPoints?: MountPoint[];
  /**
   * The container name, used by other containers to reference it.
   *
   * Use up to 255 letters, numbers, underscores, or hyphens.
   *
   * For more information, see
   * [name](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-name).
   */
  name: string;
  /**
   * Ports to expose from the container.
   *
   * With `awsvpc` or `host` networking, omit `hostPort` or match it to `containerPort`. Port
   * mappings are not supported with the `none` network mode.
   *
   * For more information, see [port
   * mappings](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html).
   */
  portMappings?: PortMapping[];
  /**
   * Whether to give the container elevated privileges on the host.
   *
   * Not supported for Windows containers or Fargate tasks.
   *
   * For more information, see
   * [privileged](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-privileged).
   */
  privileged?: boolean;
  /**
   * Whether to allocate a TTY for the container.
   *
   * For more information, see
   * [pseudoTerminal](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-pseudoTerminal).
   */
  pseudoTerminal?: boolean;
  /**
   * Whether the container has read-only access to its root file system.
   *
   * Not supported for Windows containers.
   *
   * For more information, see
   * [readonlyRootFilesystem](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-readonlyRootFilesystem).
   */
  readonlyRootFilesystem?: boolean;
  /**
   * Credentials for authentication to a private image registry.
   *
   * For more information, see [repository
   * credentials](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_RepositoryCredentials.html).
   */
  repositoryCredentials?: RepositoryCredentials;
  /**
   * Specialized resources to assign to the container, such as GPUs or Neuron devices.
   *
   * For more information, see [resource
   * requirements](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ResourceRequirement.html).
   */
  resourceRequirements?: ResourceRequirement[];
  /**
   * Settings that let ECS restart the container without replacing the task.
   *
   * For more information, see [container restart
   * policies](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-restart-policy.html).
   */
  restartPolicy?: ContainerRestartPolicy;
  /**
   * Secrets to pass to the container as environment variables.
   *
   * For more information, see [sensitive
   * data](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html).
   */
  secrets?: pulumi.Input<ContainerDefinitionSecret>[];
  /**
   * The time, in seconds, allowed for this container to satisfy another container's dependency.
   *
   * If the required condition is not met in time, the dependent container does not start and the
   * task stops. Fargate accepts 2 through 120 seconds. The agent's `ECS_CONTAINER_START_TIMEOUT`
   * setting is enforced independently.
   *
   * For more information, see
   * [startTimeout](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-startTimeout).
   */
  startTimeout?: number;
  /**
   * The time, in seconds, to wait for the container to stop before it is forcibly killed.
   *
   * Fargate accepts 2 through 120 seconds.
   *
   * Default - 30 seconds on Fargate. On EC2, the agent's `ECS_CONTAINER_STOP_TIMEOUT` setting, or
   * 30 seconds if that setting is absent.
   *
   * For more information, see
   * [stopTimeout](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-stopTimeout).
   */
  stopTimeout?: number;
  /**
   * Namespaced kernel parameters to set in the container.
   *
   * Settings can affect other containers that share the same namespace. Not supported for Windows
   * containers.
   *
   * For more information, see [system
   * controls](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_SystemControl.html).
   */
  systemControls?: SystemControl[];
  /**
   * Operating-system resource limits for the container. Not supported for Windows containers.
   *
   * For more information, see
   * [ulimits](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Ulimit.html).
   */
  ulimits?: Ulimit[];
  /**
   * The user that runs commands inside the container, as a name, ID, or user and group pair.
   *
   * Use a non-root user, especially with `host` networking. Not supported for Windows containers.
   *
   * For more information, see
   * [user](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-user).
   */
  user?: string;
  /**
   * Whether ECS resolves the image tag to a digest. When disabled, ECS uses the original image URI.
   *
   * Default - `enabled` in ECS.
   *
   * For more information, see [container image
   * resolution](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html#deployment-container-image-stability).
   */
  versionConsistency?: ContainerDefinitionVersionConsistency;
  /**
   * Data volumes to mount from another container in the same task.
   *
   * For more information, see [volumes from other
   * containers](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_VolumeFrom.html).
   */
  volumesFrom?: VolumeFrom[];
  /**
   * The working directory in which commands run inside the container.
   *
   * For more information, see
   * [workingDirectory](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-workingDirectory).
   */
  workingDirectory?: string;
}

/**
 * The condition that another container must satisfy before this container can start.
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
 * A dependency on another container in the same task. Shutdown uses the reverse startup order.
 *
 * For more information, see [container
 * dependencies](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDependency.html).
 */
export interface ContainerDependency {
  /**
   * The condition that the other container must satisfy before this container starts.
   */
  condition: ContainerDependencyCondition;
  /**
   * The name of the other container in the task.
   */
  containerName: string;
}

/**
 * A permission granted to a container for a host device.
 */
export enum DevicePermissions {
  /**
   * Allow the container to read from the device.
   */
  READ = 'read',
  /**
   * Allow the container to write to the device.
   */
  WRITE = 'write',
  /**
   * Allow the container to create device special files for the device.
   */
  MKNOD = 'mknod',
}

/**
 * A host device to expose to a container.
 *
 * For more information, see
 * [devices](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Device.html).
 */
export interface Device {
  /**
   * The path inside the container at which to expose the host device.
   */
  containerPath?: string;
  /**
   * The device path on the host container instance.
   */
  hostPath?: string;
  /**
   * The permissions to grant the container for the device.
   *
   * Default - `read`, `write`, and `mknod` in ECS.
   */
  permissions?: Array<DevicePermissions>;
}

/**
 * An S3 object containing environment variables in `VARIABLE=VALUE` format.
 *
 * Use a UTF-8 `.env` file. Lines that start with `#` are ignored. Values in the container's
 * `environment` property take precedence over file values. The task execution role needs permission
 * to read the S3 object. Not supported for Windows containers.
 *
 * For more information, see [environment
 * files](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/use-environment-file.html).
 */
export interface ContainerDefinitionEnvironmentFile {
  /**
   * The file source type. The only supported value is `s3`.
   */
  type: string;
  /**
   * The ARN of the S3 object containing the environment file.
   */
  value: pulumi.Input<string>;
}

/**
 * The log router used by a FireLens configuration.
 */
export enum FirelensConfigurationType {
  /**
   * Use Fluentd as the log router.
   */
  FLUENTD = 'fluentd',
  /**
   * Use Fluent Bit as the log router.
   */
  FLUENTBIT = 'fluentbit',
}

/**
 * FireLens log router settings for a container.
 *
 * For more information, see [custom log
 * routing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html).
 */
export interface FirelensConfiguration {
  /**
   * Log router options, such as ECS log metadata and a custom configuration file.
   *
   * Supported keys are `enable-ecs-log-metadata`, `config-file-type`, and `config-file-value`.
   *
   * For more information, see [FireLens
   * options](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_FirelensConfiguration.html#ECS-Type-FirelensConfiguration-options).
   */
  options?: Record<string, pulumi.Input<string>>;
  /**
   * The log router to use.
   */
  type?: FirelensConfigurationType;
}

/**
 * Settings for an ECS container health check. These override health checks in the container image.
 *
 * ECS only monitors checks specified in the task definition. Timing and retry settings apply only
 * when `command` is specified.
 *
 * For more information, see [health
 * checks](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_HealthCheck.html).
 */
export interface HealthCheck {
  /**
   * The command that determines whether the container is healthy.
   *
   * Start with `CMD` to run arguments directly or `CMD-SHELL` to use the container's default shell.
   * An exit code of zero indicates success; any other code indicates failure.
   *
   * Example: `["CMD-SHELL", "curl --fail http://localhost/health || exit 1"]`.
   */
  command?: string[];
  /**
   * The time, in seconds, between health checks. Valid values are from 5 through 300.
   *
   * Default - 30 seconds in ECS.
   */
  interval?: number;
  /**
   * The number of failed checks before the container is unhealthy. Valid values are from 1 through 10.
   *
   * Default - 3 in ECS.
   */
  retries?: number;
  /**
   * The startup grace period, in seconds, before failed checks count toward the retry limit.
   *
   * Valid values are from 0 through 300. If a check succeeds during this period, subsequent
   * failures count toward the retry limit.
   *
   * Default - No startup grace period in ECS.
   */
  startPeriod?: number;
  /**
   * The time, in seconds, allowed for a health check to succeed. Valid values are from 2 through 60.
   *
   * Default - 5 seconds in ECS.
   */
  timeout?: number;
}

/**
 * A hostname and IP address mapping to add to the container's `/etc/hosts` file.
 *
 * For more information, see [host
 * entries](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_HostEntry.html).
 */
export interface HostEntry {
  /**
   * The hostname for the `/etc/hosts` entry.
   */
  hostname: pulumi.Input<string>;
  /**
   * The IP address for the `/etc/hosts` entry.
   */
  ipAddress: pulumi.Input<string>;
}

/**
 * Linux capabilities to add to or remove from the container's default Docker configuration.
 *
 * For more information, see [kernel
 * capabilities](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KernelCapabilities.html).
 */
export interface KernelCapabilities {
  /**
   * Linux capabilities to add. Fargate supports adding only `SYS_PTRACE`.
   *
   * For supported names, see
   * [add](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KernelCapabilities.html#ECS-Type-KernelCapabilities-add).
   */
  add?: string[];
  /**
   * Linux capabilities to remove. Use `ALL` to remove all default capabilities.
   *
   * For supported names, see
   * [drop](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KernelCapabilities.html#ECS-Type-KernelCapabilities-drop).
   */
  drop?: string[];
}

/**
 * A name and value pair, such as an environment variable.
 *
 * For more information, see [key-value
 * pairs](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KeyValuePair.html).
 */
export interface KeyValuePair {
  /**
   * The name, such as an environment variable name.
   */
  name: string;
  /**
   * The value assigned to the name.
   */
  value?: pulumi.Input<string>;
}

/**
 * Linux-specific container settings.
 *
 * For more information, see [Linux
 * parameters](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LinuxParameters.html).
 */
export interface LinuxParameters {
  /**
   * Linux capabilities to add to or remove from the default Docker configuration.
   *
   * For more information, see [kernel
   * capabilities](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KernelCapabilities.html).
   */
  capabilities?: KernelCapabilities;
  /**
   * Host devices to expose to the container. Not supported for Fargate tasks.
   */
  devices?: Device[];
  /**
   * Whether to run an init process that forwards signals and removes exited child processes.
   */
  initProcessEnabled?: boolean;
  /**
   * The maximum swap memory, in MiB. Set to `0` to disable swap.
   *
   * Required for `swappiness` to take effect. Not supported for Fargate tasks.
   *
   * Default - The container instance's swap configuration.
   */
  maxSwap?: number;
  /**
   * The size, in MiB, of `/dev/shm`. Not supported for Fargate tasks.
   */
  sharedMemorySize?: number;
  /**
   * How aggressively the container swaps memory, from 0 (only when necessary) through 100.
   *
   * Ignored unless `maxSwap` is set. Not supported for Fargate tasks or Amazon Linux 2023.
   *
   * Default - 60 in ECS.
   */
  swappiness?: number;
  /**
   * In-memory file systems to mount in the container.
   *
   * For more information, see [tmpfs
   * mounts](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Tmpfs.html).
   */
  tmpfs?: Tmpfs[];
}

/**
 * The log driver used by a container. Supported drivers depend on the task launch type.
 */
export enum LogConfigurationLogDriver {
  /**
   * Write logs as JSON files on the container host.
   */
  JSON_FILE = 'json-file',
  /**
   * Send logs to the host syslog service.
   */
  SYSLOG = 'syslog',
  /**
   * Send logs to the host systemd journal.
   */
  JOURNALD = 'journald',
  /**
   * Send logs using the Graylog Extended Log Format.
   */
  GELF = 'gelf',
  /**
   * Send logs to a Fluentd collector.
   */
  FLUENTD = 'fluentd',
  /**
   * Send logs to Amazon CloudWatch Logs.
   */
  AWSLOGS = 'awslogs',
  /**
   * Send logs to Splunk.
   */
  SPLUNK = 'splunk',
  /**
   * Route logs through FireLens.
   */
  AWSFIRELENS = 'awsfirelens',
}

/**
 * The log driver and settings used to collect container logs.
 *
 * For more information, see [log
 * configuration](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html).
 */
export interface LogConfiguration {
  /**
   * The log driver to use. Fargate supports `awslogs`, `splunk`, and `awsfirelens`.
   *
   * For more information, see
   * [logDriver](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html#ECS-Type-LogConfiguration-logDriver).
   */
  logDriver: LogConfigurationLogDriver;
  /**
   * Driver-specific configuration options.
   *
   * For `awslogs`, specify `awslogs-region` and `awslogs-group`. Fargate also requires
   * `awslogs-stream-prefix`. Creating a log group requires `logs:CreateLogGroup` permission.
   *
   * The `mode` option controls delivery: `blocking` can block application writes when logging
   * fails; `non-blocking` can lose logs when its buffer fills.
   *
   * For supported options and defaults, see [log
   * options](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html#ECS-Type-LogConfiguration-options).
   */
  options?: Record<string, pulumi.Input<string>>;
  /**
   * Secrets to pass as log driver options instead of plaintext values.
   *
   * For more information, see [sensitive
   * data](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html).
   */
  secretOptions?: ContainerDefinitionSecret[];
}

/**
 * A task volume to mount in the container.
 *
 * For more information, see [mount
 * points](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_MountPoint.html).
 */
export interface MountPoint {
  /**
   * The path inside the container at which to mount the volume.
   */
  containerPath?: string;
  /**
   * Whether the container has read-only access to the volume.
   *
   * Default - `false` in ECS.
   */
  readOnly?: boolean;
  /**
   * The name of a volume declared in the task definition.
   */
  sourceVolume?: string;
}

/**
 * The application protocol that Service Connect uses for protocol-specific handling and telemetry.
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
 * The transport protocol used for a port mapping.
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
 * A container port or port range to expose through the task's network configuration.
 *
 * For more information, see [port
 * mappings](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html).
 */
export interface PortMapping {
  /**
   * The application protocol for Service Connect handling and telemetry.
   *
   * Changing this value requires deleting and redeploying the Service Connect service.
   *
   * Default - TCP handling without protocol-specific telemetry in ECS.
   *
   * For more information, see
   * [appProtocol](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html#ECS-Type-PortMapping-appProtocol).
   */
  appProtocol?: PortMappingAppProtocol;
  /**
   * The port to expose on the container.
   *
   * With `bridge` networking, omitting `hostPort` lets ECS assign an available host port.
   *
   * For more information, see
   * [containerPort](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html#ECS-Type-PortMapping-containerPort).
   */
  containerPort?: number;
  /**
   * A container port range, such as `8000-8010`, for `bridge` or `awsvpc` networking.
   *
   * Ports must be from 1 through 65535, with the first port below the last. Specify at most 100
   * ranges per container, without overlaps. ECS assigns host ranges automatically; with `awsvpc`,
   * the host and container ranges match.
   *
   * For more information, see
   * [containerPortRange](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html#ECS-Type-PortMapping-containerPortRange).
   */
  containerPortRange?: string;
  /**
   * The host port to bind to the container port.
   *
   * With `awsvpc` or `host` networking, omit this value or match `containerPort`. With `bridge`,
   * omit it or use `0` for automatic assignment. Omit it when using `containerPortRange`.
   *
   * For more information, see
   * [hostPort](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html#ECS-Type-PortMapping-hostPort).
   */
  hostPort?: number;
  /**
   * The port mapping name referenced by Service Connect or VPC Lattice configuration.
   *
   * Use up to 64 lowercase letters, numbers, underscores, or hyphens. Do not start with a hyphen.
   *
   * For more information, see
   * [name](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html#ECS-Type-PortMapping-name).
   */
  name?: string;
  /**
   * The transport protocol. Changing it requires deleting and redeploying the Service Connect
   * service.
   *
   * Default - `tcp` in ECS.
   *
   * For more information, see
   * [protocol](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html#ECS-Type-PortMapping-protocol).
   */
  protocol?: PortMappingProtocol;
}

/**
 * Credentials for authentication to a private image registry.
 *
 * For more information, see [repository
 * credentials](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_RepositoryCredentials.html).
 */
export interface RepositoryCredentials {
  /**
   * The ARN of the secret containing registry credentials. A secret name is also accepted when the
   * secret is in the same Region as the task.
   */
  credentialsParameter?: pulumi.Input<string>;
}

/**
 * The type of specialized resource assigned to a container.
 */
export enum ResourceRequirementType {
  /**
   * Assign physical GPUs to the container.
   */
  GPU = 'GPU',
  /**
   * Assign an Elastic Inference accelerator to the container.
   */
  INFERENCE_ACCELERATOR = 'InferenceAccelerator',
  /**
   * Assign AWS Neuron devices to the container.
   */
  NEURON_DEVICE = 'NeuronDevice',
}

/**
 * A specialized resource allocation for a container.
 *
 * For more information, see [resource
 * requirements](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ResourceRequirement.html).
 */
export interface ResourceRequirement {
  /**
   * The type of resource to assign.
   */
  type: ResourceRequirementType;
  /**
   * The amount or identifier of the resource to assign.
   *
   * For `GPU`, use the device count or `ALL`; total reservations must fit the instance. For
   * `NeuronDevice`, use `ALL`; only one container per task can request it, on Managed Instances
   * only. For `InferenceAccelerator`, use the task definition's accelerator `deviceName`.
   *
   * For more information, see
   * [value](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ResourceRequirement.html#ECS-Type-ResourceRequirement-value).
   */
  value: string;
}

/**
 * Settings that let ECS restart a container without replacing its task.
 *
 * For more information, see [container restart
 * policies](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-restart-policy.html).
 */
export interface ContainerRestartPolicy {
  /**
   * Whether the restart policy is enabled.
   */
  enabled?: boolean;
  /**
   * Exit codes that do not trigger a restart. Specify at most 50 codes.
   *
   * Default - No ignored exit codes in ECS.
   */
  ignoredExitCodes?: number[];
  /**
   * The minimum time, in seconds, the container must run before it is eligible for a restart.
   *
   * Valid values are from 60 through 1800. A container that exits sooner is not restarted.
   *
   * Default - 300 seconds in ECS.
   */
  restartAttemptPeriod?: number;
}

/**
 * A secret source for a container environment variable or log driver option.
 *
 * For more information, see [sensitive
 * data](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html).
 */
export interface ContainerDefinitionSecret {
  /**
   * The environment variable name, or the log driver option name when used in `secretOptions`.
   */
  name: string;
  /**
   * The ARN of a Secrets Manager secret or SSM Parameter Store parameter.
   *
   * An SSM parameter name is also accepted when it is in the same Region as the task. The task
   * execution role must have permission to read the secret or parameter.
   *
   * For more information, see [secret
   * sources](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Secret.html#ECS-Type-Secret-valueFrom).
   */
  valueFrom: pulumi.Input<string>;
}

/**
 * A namespaced kernel parameter to set in a container. Not supported for Windows containers.
 *
 * Network settings apply to all containers in an `awsvpc` task; if values conflict, the last
 * container started determines the value. Network settings are not supported with `host`
 * networking. IPC settings are shared with `task` IPC mode and unsupported with `host` IPC mode.
 *
 * For more information, see [system
 * controls](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_SystemControl.html).
 */
export interface SystemControl {
  /**
   * The namespaced kernel parameter name, such as `net.ipv4.tcp_keepalive_time`.
   */
  namespace?: string;
  /**
   * The value to assign to the kernel parameter.
   */
  value?: string;
}

/**
 * An in-memory file system to mount in a container.
 *
 * For more information, see [tmpfs
 * mounts](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Tmpfs.html).
 */
export interface Tmpfs {
  /**
   * The absolute path inside the container at which to mount the file system.
   */
  containerPath?: string;
  /**
   * Mount options, such as `ro`, `noexec`, or `nosuid`.
   *
   * For supported values, see
   * [mountOptions](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Tmpfs.html#ECS-Type-Tmpfs-mountOptions).
   */
  mountOptions?: string[];
  /**
   * The maximum file system size, in MiB.
   */
  size: number;
}

/**
 * The operating-system resource limit configured for a container.
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
 *
 * Fargate uses operating-system defaults except for `nofile`, which defaults to 65535 for both
 * limits.
 *
 * For more information, see
 * [ulimits](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Ulimit.html).
 */
export interface Ulimit {
  /**
   * The hard limit, in bytes, seconds, or a count, depending on `name`.
   */
  hardLimit: number;
  /**
   * The resource limit to configure.
   */
  name: UlimitName;
  /**
   * The soft limit, in bytes, seconds, or a count, depending on `name`.
   */
  softLimit: number;
}

/**
 * Data volumes to mount from another container in the same task.
 *
 * For more information, see [volumes from other
 * containers](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_VolumeFrom.html).
 */
export interface VolumeFrom {
  /**
   * Whether this container has read-only access to the volumes.
   *
   * Default - `false` in ECS.
   */
  readOnly?: boolean;
  /**
   * The name of the container from which to mount volumes.
   */
  sourceContainer?: string;
}
