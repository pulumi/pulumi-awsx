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
 * The ``ContainerDefinition`` property specifies a container definition. Container definitions are
 * used in task definitions to describe the different containers that are launched as part of a
 * task.
 */
export interface ContainerDefinitionArgs {
  /**
   * The command that's passed to the container. This parameter maps to ``Cmd`` in the docker
   * container create command and the ``COMMAND`` parameter to docker run. If there are multiple
   * arguments, each argument is a separated string in the array.
   */
  command?: Array<pulumi.Input<string>>;
  /**
   * The number of `cpu` units reserved for the container. This parameter maps to `CpuShares` in the
   * docker container create command and the `--cpu-shares` option to docker run. This field is
   * optional for tasks using the Fargate launch type, and the only requirement is that the total
   * amount of CPU reserved for all containers within a task be lower than the task-level `cpu`
   * value. You can determine the number of CPU units that are available per EC2 instance type by
   * multiplying the vCPUs listed for that instance type on the [Amazon EC2
   * Instances](https://docs.aws.amazon.com/ec2/instance-types/) detail page by 1,024. Linux
   * containers share unallocated CPU units with other containers on the container instance with the
   * same ratio as their allocated amount. For example, if you run a single-container task on a
   * single-core instance type with 512 CPU units specified for that container, and that's the only
   * task running on the container instance, that container could use the full 1,024 CPU unit share
   * at any given time. However, if you launched another copy of the same task on that container
   * instance, each task is guaranteed a minimum of 512 CPU units when needed. Moreover, each
   * container could float to higher CPU usage if the other container was not using it. If both
   * tasks were 100% active all of the time, they would be limited to 512 CPU units. On Linux
   * container instances, the Docker daemon on the container instance uses the CPU value to
   * calculate the relative CPU share ratios for running containers. The minimum valid CPU share
   * value that the Linux kernel allows is 2, and the maximum valid CPU share value that the Linux
   * kernel allows is 262144. However, the CPU parameter isn't required, and you can use CPU values
   * below 2 or above 262144 in your container definitions. For CPU values below 2 (including null)
   * or above 262144, the behavior varies based on your Amazon ECS container agent version: + _Agent
   * versions less than or equal to 1.1.0:_ Null and zero CPU values are passed to Docker as 0,
   * which Docker then converts to 1,024 CPU shares. CPU values of 1 are passed to Docker as 1,
   * which the Linux kernel converts to two CPU shares.
   *
   * - _Agent versions greater than or equal to 1.2.0:_ Null, zero, and CPU values of 1 are passed to
   *   Docker as 2.
   * - _Agent versions greater than or equal to 1.84.0:_ CPU values greater than 256 vCPU are passed
   *   to Docker as 256, which is equivalent to 262144 CPU shares.
   *
   * On Windows container instances, the CPU limit is enforced as an absolute limit, or a quota.
   * Windows containers only have access to the specified amount of CPU that's described in the task
   * definition. A null or zero CPU value is passed to Docker as `0`, which Windows interprets as 1%
   * of one CPU.
   */
  cpu?: number;
  /**
   * A list of ARNs in SSM or Amazon S3 to a credential spec (`CredSpec`) file that configures the
   * container for Active Directory authentication. We recommend that you use this parameter instead
   * of the `dockerSecurityOptions`. The maximum number of ARNs is 1. There are two formats for each
   * ARN. + credentialspecdomainless:MyARN You use credentialspecdomainless:MyARN to provide a
   * CredSpec with an additional section for a secret in . You provide the login credentials to the
   * domain in the secret. Each task that runs on any container instance can join different domains.
   * You can use this format without joining the container instance to a domain. +
   * credentialspec:MyARN You use credentialspec:MyARN to provide a CredSpec for a single domain.
   * You must join the container instance to the domain before you start any tasks that use this
   * task definition. In both formats, replace `MyARN` with the ARN in SSM or Amazon S3. If you
   * provide a `credentialspecdomainless:MyARN`, the `credspec` must provide a ARN in ASMlong for a
   * secret containing the username, password, and the domain to connect to. For better security,
   * the instance isn't joined to the domain for domainless authentication. Other applications on
   * the instance can't use the domainless credentials. You can use this parameter to run tasks on
   * the same instance, even it the tasks need to join different domains. For more information, see
   * [Using gMSAs for Windows
   * Containers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/windows-gmsa.html) and
   * [Using gMSAs for Linux
   * Containers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/linux-gmsa.html).
   */
  credentialSpecs?: Array<pulumi.Input<string>>;
  /**
   * The dependencies defined for container startup and shutdown. A container can contain multiple
   * dependencies. When a dependency is defined for container startup, for container shutdown it is
   * reversed. For tasks using the EC2 launch type, the container instances require at least version
   * 1.26.0 of the container agent to turn on container dependencies. However, we recommend using
   * the latest container agent version. For information about checking your agent version and
   * updating to the latest version, see [Updating the Amazon ECS Container
   * Agent](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-update.html) in
   * the _Amazon Elastic Container Service Developer Guide_. If you're using an Amazon ECS-optimized
   * Linux AMI, your instance needs at least version 1.26.0-1 of the `ecs-init` package. If your
   * container instances are launched from version `20190301` or later, then they contain the
   * required versions of the container agent and `ecs-init`. For more information, see [Amazon
   * ECS-optimized Linux
   * AMI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html) in the
   * _Amazon Elastic Container Service Developer Guide_. For tasks using the Fargate launch type,
   * the task or service requires the following platforms: + Linux platform version `1.3.0` or
   * later.
   *
   * - Windows platform version `1.0.0` or later.
   *
   * If the task definition is used in a blue/green deployment that uses
   * [AWS::CodeDeploy::DeploymentGroup
   * BlueGreenDeploymentConfiguration](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-codedeploy-deploymentgroup-bluegreendeploymentconfiguration.html),
   * the `dependsOn` parameter is not supported.
   */
  dependsOn?: Array<pulumi.Input<ContainerDependency>>;
  /**
   * When this parameter is true, networking is off within the container. This parameter maps to
   * ``NetworkDisabled`` in the docker container create command. This parameter is not supported for
   * Windows containers.
   */
  disableNetworking?: boolean;
  /**
   * A list of DNS search domains that are presented to the container. This parameter maps to
   * ``DnsSearch`` in the docker container create command and the ``--dns-search`` option to docker
   * run. This parameter is not supported for Windows containers.
   */
  dnsSearchDomains?: string[];
  /**
   * A list of DNS servers that are presented to the container. This parameter maps to ``Dns`` in
   * the docker container create command and the ``--dns`` option to docker run. This parameter is
   * not supported for Windows containers.
   */
  dnsServers?: string[];
  /**
   * A key/value map of labels to add to the container. This parameter maps to ``Labels`` in the
   * docker container create command and the ``--label`` option to docker run. This parameter
   * requires version 1.18 of the Docker Remote API or greater on your container instance. To check
   * the Docker Remote API version on your container instance, log in to your container instance and
   * run the following command: ``sudo docker version --format '{{.Server.APIVersion}}'``
   */
  dockerLabels?: Record<string, pulumi.Input<string>>;
  /**
   * A list of strings to provide custom configuration for multiple security systems. This field
   * isn't valid for containers in tasks using the Fargate launch type. For Linux tasks on EC2, this
   * parameter can be used to reference custom labels for SELinux and AppArmor multi-level security
   * systems. For any tasks on EC2, this parameter can be used to reference a credential spec file
   * that configures a container for Active Directory authentication. For more information, see
   * [Using gMSAs for Windows
   * Containers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/windows-gmsa.html) and
   * [Using gMSAs for Linux
   * Containers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/linux-gmsa.html) in the
   * _Amazon Elastic Container Service Developer Guide_. This parameter maps to `SecurityOpt` in the
   * docker container create command and the `--security-opt` option to docker run. The Amazon ECS
   * container agent running on a container instance must register with the
   * `ECS_SELINUX_CAPABLE=true` or `ECS_APPARMOR_CAPABLE=true` environment variables before
   * containers placed on that instance can use these security options. For more information, see
   * [Amazon ECS Container Agent
   * Configuration](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-config.html)
   * in the _Amazon Elastic Container Service Developer Guide_. Valid values: "no-new-privileges" |
   * "apparmor:PROFILE" | "label:value" | "credentialspec:CredentialSpecFilePath"
   */
  dockerSecurityOptions?: string[];
  /**
   * Early versions of the Amazon ECS container agent don't properly handle ``entryPoint``
   * parameters. If you have problems using ``entryPoint``, update your container agent or enter
   * your commands and arguments as ``command`` array items instead. The entry point that's passed
   * to the container. This parameter maps to ``Entrypoint`` in the docker container create command
   * and the ``--entrypoint`` option to docker run.
   */
  entryPoint?: string[];
  /**
   * The environment variables to pass to a container. This parameter maps to ``Env`` in the docker
   * container create command and the ``--env`` option to docker run. We don't recommend that you
   * use plaintext environment variables for sensitive information, such as credential data.
   */
  environment?: Array<pulumi.Input<KeyValuePair>>;
  /**
   * A list of files containing the environment variables to pass to a container. This parameter
   * maps to the `--env-file` option to docker run. You can specify up to ten environment files. The
   * file must have a `.env` file extension. Each line in an environment file contains an
   * environment variable in `VARIABLE=VALUE` format. Lines beginning with `#` are treated as
   * comments and are ignored. If there are environment variables specified using the `environment`
   * parameter in a container definition, they take precedence over the variables contained within
   * an environment file. If multiple environment files are specified that contain the same
   * variable, they're processed from the top down. We recommend that you use unique variable names.
   * For more information, see [Specifying Environment
   * Variables](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/taskdef-envfiles.html)
   * in the _Amazon Elastic Container Service Developer Guide_.
   */
  environmentFiles?: Array<pulumi.Input<ContainerDefinitionEnvironmentFile>>;
  /**
   * If the `essential` parameter of a container is marked as `true`, and that container fails or
   * stops for any reason, all other containers that are part of the task are stopped. If the
   * `essential` parameter of a container is marked as `false`, its failure doesn't affect the rest
   * of the containers in a task. If this parameter is omitted, a container is assumed to be
   * essential. All tasks must have at least one essential container. If you have an application
   * that's composed of multiple containers, group containers that are used for a common purpose
   * into components, and separate the different components into multiple task definitions. For more
   * information, see [Application
   * Architecture](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/application_architecture.html)
   * in the _Amazon Elastic Container Service Developer Guide_.
   */
  essential?: boolean;
  /**
   * A list of hostnames and IP address mappings to append to the ``/etc/hosts`` file on the
   * container. This parameter maps to ``ExtraHosts`` in the docker container create command and the
   * ``--add-host`` option to docker run. This parameter isn't supported for Windows containers or
   * tasks that use the ``awsvpc`` network mode.
   */
  extraHosts?: Array<pulumi.Input<HostEntry>>;
  /**
   * The FireLens configuration for the container. This is used to specify and configure a log
   * router for container logs. For more information, see [Custom Log
   * Routing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html) in
   * the _Amazon Elastic Container Service Developer Guide_.
   */
  firelensConfiguration?: FirelensConfiguration;
  /**
   * The container health check command and associated configuration parameters for the container.
   * This parameter maps to ``HealthCheck`` in the docker container create command and the
   * ``HEALTHCHECK`` parameter of docker run.
   */
  healthCheck?: HealthCheck;
  /**
   * The hostname to use for your container. This parameter maps to ``Hostname`` in the docker
   * container create command and the ``--hostname`` option to docker run. The ``hostname``
   * parameter is not supported if you're using the ``awsvpc`` network mode.
   */
  hostname?: string;
  /**
   * The image used to start a container. This string is passed directly to the Docker daemon. By
   * default, images in the Docker Hub registry are available. Other repositories are specified with
   * either `repository-url/image:tag` or `repository-url/image@digest`. For images using tags
   * (repository-url/image:tag), up to 255 characters total are allowed, including letters
   * (uppercase and lowercase), numbers, hyphens, underscores, colons, periods, forward slashes, and
   * number signs (#). For images using digests (repository-url/image@digest), the 255 character
   * limit applies only to the repository URL and image name (everything before the @ sign). The
   * only supported hash function is sha256, and the hash value after sha256: must be exactly 64
   * characters (only letters A-F, a-f, and numbers 0-9 are allowed). This parameter maps to `Image`
   * in the docker container create command and the `IMAGE` parameter of docker run. + When a new
   * task starts, the Amazon ECS container agent pulls the latest version of the specified image and
   * tag for the container to use. However, subsequent updates to a repository image aren't
   * propagated to already running tasks.
   *
   * - Images in Amazon ECR repositories can be specified by either using the full
   *   `registry/repository:tag` or `registry/repository@digest`. For example,
   *   `012345678910.dkr.ecr.<region-name>.amazonaws.com/<repository-name>:latest` or
   *   `012345678910.dkr.ecr.<region-name>.amazonaws.com/<repository-name>@sha256:94afd1f2e64d908bc90dbca0035a5b567EXAMPLE`.
   * - Images in official repositories on Docker Hub use a single name (for example, `ubuntu` or
   *   `mongo`).
   * - Images in other repositories on Docker Hub are qualified with an organization name (for
   *   example, `amazon/amazon-ecs-agent`).
   * - Images in other online repositories are qualified further by a domain name (for example,
   *   `quay.io/assemblyline/ubuntu`).
   */
  image: pulumi.Input<string>;
  /**
   * When this parameter is ``true``, you can deploy containerized applications that require
   * ``stdin`` or a ``tty`` to be allocated. This parameter maps to ``OpenStdin`` in the docker
   * container create command and the ``--interactive`` option to docker run.
   */
  interactive?: boolean;
  /**
   * The ``links`` parameter allows containers to communicate with each other without the need for
   * port mappings. This parameter is only supported if the network mode of a task definition is
   * ``bridge``. The ``name:internalName`` construct is analogous to ``name:alias`` in Docker links.
   * Up to 255 letters (uppercase and lowercase), numbers, underscores, and hyphens are allowed..
   * This parameter maps to ``Links`` in the docker container create command and the ``--link``
   * option to docker run. This parameter is not supported for Windows containers. Containers that
   * are collocated on a single container instance may be able to communicate with each other
   * without requiring links or host port mappings. Network isolation is achieved on the container
   * instance using security groups and VPC settings.
   */
  links?: string[];
  /**
   * Linux-specific modifications that are applied to the container, such as Linux kernel
   * capabilities. For more information see
   * [KernelCapabilities](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KernelCapabilities.html).
   * This parameter is not supported for Windows containers.
   */
  linuxParameters?: LinuxParameters;
  /**
   * The log configuration specification for the container. This parameter maps to `LogConfig` in
   * the docker Create a container command and the `--log-driver` option to docker run. By default,
   * containers use the same logging driver that the Docker daemon uses. However, the container may
   * use a different logging driver than the Docker daemon by specifying a log driver with this
   * parameter in the container definition. To use a different logging driver for a container, the
   * log system must be configured properly on the container instance (or on a different log server
   * for remote logging options). For more information on the options for different supported log
   * drivers, see [Configure logging
   * drivers](https://docs.aws.amazon.com/https://docs.docker.com/engine/admin/logging/overview/) in
   * the Docker documentation. Amazon ECS currently supports a subset of the logging drivers
   * available to the Docker daemon (shown in the
   * [LogConfiguration](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html)
   * data type). Additional log drivers may be available in future releases of the Amazon ECS
   * container agent. This parameter requires version 1.18 of the Docker Remote API or greater on
   * your container instance. To check the Docker Remote API version on your container instance, log
   * in to your container instance and run the following command: `sudo docker version --format
   * '{{.Server.APIVersion}}'` The Amazon ECS container agent running on a container instance must
   * register the logging drivers available on that instance with the
   * `ECS_AVAILABLE_LOGGING_DRIVERS` environment variable before containers placed on that instance
   * can use these log configuration options. For more information, see [Container Agent
   * Configuration](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-config.html)
   * in the _Developer Guide_.
   */
  logConfiguration?: pulumi.Input<LogConfiguration>;
  /**
   * The amount (in MiB) of memory to present to the container. If your container attempts to exceed
   * the memory specified here, the container is killed. The total amount of memory reserved for all
   * containers within a task must be lower than the task `memory` value, if one is specified. This
   * parameter maps to `Memory` in the [Create a
   * container](https://docs.aws.amazon.com/https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
   * section of the [Docker Remote
   * API](https://docs.aws.amazon.com/https://docs.docker.com/engine/api/v1.35/) and the `--memory`
   * option to [docker
   * run](https://docs.aws.amazon.com/https://docs.docker.com/engine/reference/run/#security-configuration).
   * If using the Fargate launch type, this parameter is optional. If using the EC2 launch type, you
   * must specify either a task-level memory value or a container-level memory value. If you specify
   * both a container-level `memory` and `memoryReservation` value, `memory` must be greater than
   * `memoryReservation`. If you specify `memoryReservation`, then that value is subtracted from the
   * available memory resources for the container instance where the container is placed. Otherwise,
   * the value of `memory` is used. The Docker 20.10.0 or later daemon reserves a minimum of 6 MiB
   * of memory for a container, so you should not specify fewer than 6 MiB of memory for your
   * containers. The Docker 19.03.13-ce or earlier daemon reserves a minimum of 4 MiB of memory for
   * a container, so you should not specify fewer than 4 MiB of memory for your containers.
   */
  memory?: number;
  /**
   * The soft limit (in MiB) of memory to reserve for the container. When system memory is under
   * heavy contention, Docker attempts to keep the container memory to this soft limit. However,
   * your container can consume more memory when it needs to, up to either the hard limit specified
   * with the ``memory`` parameter (if applicable), or all of the available memory on the container
   * instance, whichever comes first. This parameter maps to ``MemoryReservation`` in the docker
   * container create command and the ``--memory-reservation`` option to docker run. If a task-level
   * memory value is not specified, you must specify a non-zero integer for one or both of
   * ``memory`` or ``memoryReservation`` in a container definition. If you specify both, ``memory``
   * must be greater than ``memoryReservation``. If you specify ``memoryReservation``, then that
   * value is subtracted from the available memory resources for the container instance where the
   * container is placed. Otherwise, the value of ``memory`` is used. For example, if your container
   * normally uses 128 MiB of memory, but occasionally bursts to 256 MiB of memory for short periods
   * of time, you can set a ``memoryReservation`` of 128 MiB, and a ``memory`` hard limit of 300
   * MiB. This configuration would allow the container to only reserve 128 MiB of memory from the
   * remaining resources on the container instance, but also allow the container to consume more
   * memory resources when needed. The Docker 20.10.0 or later daemon reserves a minimum of 6 MiB of
   * memory for a container. So, don't specify less than 6 MiB of memory for your containers. The
   * Docker 19.03.13-ce or earlier daemon reserves a minimum of 4 MiB of memory for a container. So,
   * don't specify less than 4 MiB of memory for your containers.
   */
  memoryReservation?: number;
  /**
   * The mount points for data volumes in your container. This parameter maps to ``Volumes`` in the
   * docker container create command and the ``--volume`` option to docker run. Windows containers
   * can mount whole directories on the same drive as ``$env:ProgramData``. Windows containers can't
   * mount directories on a different drive, and mount point can't be across drives.
   */
  mountPoints?: MountPoint[];
  /**
   * The name of a container. If you're linking multiple containers together in a task definition,
   * the ``name`` of one container can be entered in the ``links`` of another container to connect
   * the containers. Up to 255 letters (uppercase and lowercase), numbers, underscores, and hyphens
   * are allowed. This parameter maps to ``name`` in the docker container create command and the
   * ``--name`` option to docker run.
   */
  name: string;
  /**
   * The list of port mappings for the container. Port mappings allow containers to access ports on
   * the host container instance to send or receive traffic. For task definitions that use the
   * `awsvpc` network mode, you should only specify the `containerPort`. The `hostPort` can be left
   * blank or it must be the same value as the `containerPort`. Port mappings on Windows use the
   * `NetNAT` gateway address rather than `localhost`. There is no loopback for port mappings on
   * Windows, so you cannot access a container's mapped port from the host itself. This parameter
   * maps to `PortBindings` in the [Create a
   * container](https://docs.aws.amazon.com/https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
   * section of the [Docker Remote
   * API](https://docs.aws.amazon.com/https://docs.docker.com/engine/api/v1.35/) and the `--publish`
   * option to [docker
   * run](https://docs.aws.amazon.com/https://docs.docker.com/engine/reference/run/). If the network
   * mode of a task definition is set to `none`, then you can't specify port mappings. If the
   * network mode of a task definition is set to `host`, then host ports must either be undefined or
   * they must match the container port in the port mapping. After a task reaches the `RUNNING`
   * status, manual and automatic host and container port assignments are visible in the _Network
   * Bindings_ section of a container description for a selected task in the Amazon ECS console. The
   * assignments are also visible in the `networkBindings` section
   * [DescribeTasks](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DescribeTasks.html)
   * responses.
   */
  portMappings?: PortMapping[];
  /**
   * When this parameter is true, the container is given elevated privileges on the host container
   * instance (similar to the ``root`` user). This parameter maps to ``Privileged`` in the docker
   * container create command and the ``--privileged`` option to docker run This parameter is not
   * supported for Windows containers or tasks run on FARGATElong.
   */
  privileged?: boolean;
  /**
   * When this parameter is ``true``, a TTY is allocated. This parameter maps to ``Tty`` in the
   * docker container create command and the ``--tty`` option to docker run.
   */
  pseudoTerminal?: boolean;
  /**
   * When this parameter is true, the container is given read-only access to its root file system.
   * This parameter maps to ``ReadonlyRootfs`` in the docker container create command and the
   * ``--read-only`` option to docker run. This parameter is not supported for Windows containers.
   */
  readonlyRootFilesystem?: boolean;
  /**
   * The private repository authentication credentials to use.
   */
  repositoryCredentials?: RepositoryCredentials;
  /**
   * The type and amount of a resource to assign to a container. The supported resources are GPUs
   * and Neuron devices.
   */
  resourceRequirements?: ResourceRequirement[];
  /**
   * The restart policy for a container. When you set up a restart policy, Amazon ECS can restart
   * the container without needing to replace the task. For more information, see [Restart
   * individual containers in Amazon ECS tasks with container restart
   * policies](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-restart-policy.html)
   * in the _Amazon Elastic Container Service Developer Guide_.
   */
  restartPolicy?: ContainerRestartPolicy;
  /**
   * The secrets to pass to the container. For more information, see [Specifying Sensitive
   * Data](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html)
   * in the _Amazon Elastic Container Service Developer Guide_.
   */
  secrets?: pulumi.Input<ContainerDefinitionSecret>[];
  /**
   * Time duration (in seconds) to wait before giving up on resolving dependencies for a container.
   * For example, you specify two containers in a task definition with containerA having a
   * dependency on containerB reaching a `COMPLETE`, `SUCCESS`, or `HEALTHY` status. If a
   * `startTimeout` value is specified for containerB and it doesn't reach the desired status within
   * that time then containerA gives up and not start. This results in the task transitioning to a
   * `STOPPED` state. When the `ECS_CONTAINER_START_TIMEOUT` container agent configuration variable
   * is used, it's enforced independently from this start timeout value. For tasks using the Fargate
   * launch type, the task or service requires the following platforms: + Linux platform version
   * `1.3.0` or later.
   *
   * - Windows platform version `1.0.0` or later.
   *
   * For tasks using the EC2 launch type, your container instances require at least version `1.26.0`
   * of the container agent to use a container start timeout value. However, we recommend using the
   * latest container agent version. For information about checking your agent version and updating
   * to the latest version, see [Updating the Amazon ECS Container
   * Agent](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-update.html) in
   * the _Amazon Elastic Container Service Developer Guide_. If you're using an Amazon ECS-optimized
   * Linux AMI, your instance needs at least version `1.26.0-1` of the `ecs-init` package. If your
   * container instances are launched from version `20190301` or later, then they contain the
   * required versions of the container agent and `ecs-init`. For more information, see [Amazon
   * ECS-optimized Linux
   * AMI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html) in the
   * _Amazon Elastic Container Service Developer Guide_. The valid values for Fargate are 2-120
   * seconds.
   */
  startTimeout?: number;
  /**
   * Time duration (in seconds) to wait before the container is forcefully killed if it doesn't exit
   * normally on its own. For tasks using the Fargate launch type, the task or service requires the
   * following platforms: + Linux platform version `1.3.0` or later.
   *
   * - Windows platform version `1.0.0` or later.
   *
   * For tasks that use the Fargate launch type, the max stop timeout value is 120 seconds and if
   * the parameter is not specified, the default value of 30 seconds is used. For tasks that use the
   * EC2 launch type, if the `stopTimeout` parameter isn't specified, the value set for the Amazon
   * ECS container agent configuration variable `ECS_CONTAINER_STOP_TIMEOUT` is used. If neither the
   * `stopTimeout` parameter or the `ECS_CONTAINER_STOP_TIMEOUT` agent configuration variable are
   * set, then the default values of 30 seconds for Linux containers and 30 seconds on Windows
   * containers are used. Your container instances require at least version 1.26.0 of the container
   * agent to use a container stop timeout value. However, we recommend using the latest container
   * agent version. For information about checking your agent version and updating to the latest
   * version, see [Updating the Amazon ECS Container
   * Agent](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-update.html) in
   * the _Amazon Elastic Container Service Developer Guide_. If you're using an Amazon ECS-optimized
   * Linux AMI, your instance needs at least version 1.26.0-1 of the `ecs-init` package. If your
   * container instances are launched from version `20190301` or later, then they contain the
   * required versions of the container agent and `ecs-init`. For more information, see [Amazon
   * ECS-optimized Linux
   * AMI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html) in the
   * _Amazon Elastic Container Service Developer Guide_. The valid values for Fargate are 2-120
   * seconds.
   */
  stopTimeout?: number;
  /**
   * A list of namespaced kernel parameters to set in the container. This parameter maps to
   * `Sysctls` in the docker container create command and the `--sysctl` option to docker run. For
   * example, you can configure `net.ipv4.tcp_keepalive_time` setting to maintain longer lived
   * connections.
   */
  systemControls?: SystemControl[];
  /**
   * A list of `ulimits` to set in the container. This parameter maps to `Ulimits` in the [Create a
   * container](https://docs.aws.amazon.com/https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
   * section of the [Docker Remote
   * API](https://docs.aws.amazon.com/https://docs.docker.com/engine/api/v1.35/) and the `--ulimit`
   * option to [docker
   * run](https://docs.aws.amazon.com/https://docs.docker.com/engine/reference/run/). Valid naming
   * values are displayed in the
   * [Ulimit](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Ulimit.html) data type.
   * This parameter requires version 1.18 of the Docker Remote API or greater on your container
   * instance. To check the Docker Remote API version on your container instance, log in to your
   * container instance and run the following command: `sudo docker version --format
   * '{{.Server.APIVersion}}'` This parameter is not supported for Windows containers.
   */
  ulimits?: Ulimit[];
  /**
   * The user to use inside the container. This parameter maps to `User` in the docker container
   * create command and the `--user` option to docker run. When running tasks using the `host`
   * network mode, don't run containers using the root user (UID 0). We recommend using a non-root
   * user for better security. You can specify the `user` using the following formats. If specifying
   * a UID or GID, you must specify it as a positive integer. + `user` + `user:group`
   *
   * - `uid` + `uid:gid` + `user:gid` + `uid:group`
   *
   * This parameter is not supported for Windows containers.
   */
  user?: string;
  /**
   * Specifies whether Amazon ECS will resolve the container image tag provided in the container
   * definition to an image digest. By default, the value is `enabled`. If you set the value for a
   * container as `disabled`, Amazon ECS will not resolve the provided container image tag to a
   * digest and will use the original image URI specified in the container definition for
   * deployment. For more information about container image resolution, see [Container image
   * resolution](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html#deployment-container-image-stability)
   * in the _Amazon ECS Developer Guide_.
   */
  versionConsistency?: ContainerDefinitionVersionConsistency;
  /**
   * Data volumes to mount from another container. This parameter maps to ``VolumesFrom`` in the
   * docker container create command and the ``--volumes-from`` option to docker run.
   */
  volumesFrom?: VolumeFrom[];
  /**
   * The working directory to run commands inside the container in. This parameter maps to
   * ``WorkingDir`` in the docker container create command and the ``--workdir`` option to docker
   * run.
   */
  workingDirectory?: string;
}

/**
 * The condition that a dependent container must satisfy before this container can start.
 */
export enum ContainerDependencyCondition {
  /**
   * Wait until the dependent container starts.
   */
  START = 'START',
  /**
   * Wait until the dependent container exits. This condition cannot be used with an essential
   * container.
   */
  COMPLETE = 'COMPLETE',
  /**
   * Wait until the dependent container exits with a zero status. This condition cannot be used with
   * an essential container.
   */
  SUCCESS = 'SUCCESS',
  /**
   * Wait until the dependent container passes its configured health check.
   */
  HEALTHY = 'HEALTHY',
}

/**
 * The `ContainerDependency` property specifies the dependencies defined for container startup and
 * shutdown. A container can contain multiple dependencies. When a dependency is defined for
 * container startup, for container shutdown it is reversed. Your Amazon ECS container instances
 * require at least version 1.26.0 of the container agent to enable container dependencies. However,
 * we recommend using the latest container agent version. For information about checking your agent
 * version and updating to the latest version, see [Updating the Amazon ECS Container
 * Agent](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-update.html) in the
 * _Amazon Elastic Container Service Developer Guide_. If you are using an Amazon ECS-optimized
 * Linux AMI, your instance needs at least version 1.26.0-1 of the `ecs-init` package. If your
 * container instances are launched from version `20190301` or later, then they contain the required
 * versions of the container agent and `ecs-init`. For more information, see [Amazon ECS-optimized
 * Linux AMI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html) in
 * the _Amazon Elastic Container Service Developer Guide_. For tasks using the Fargate launch type,
 * this parameter requires that the task or service uses platform version 1.3.0 or later.
 */
export interface ContainerDependency {
  /**
   * The dependency condition of the container. The following are the available conditions and their
   * behavior: + `START` - This condition emulates the behavior of links and volumes today. It
   * validates that a dependent container is started before permitting other containers to start. +
   * `COMPLETE` - This condition validates that a dependent container runs to completion (exits)
   * before permitting other containers to start. This can be useful for nonessential containers
   * that run a script and then exit. This condition can't be set on an essential container. +
   * `SUCCESS` - This condition is the same as `COMPLETE`, but it also requires that the container
   * exits with a `zero` status. This condition can't be set on an essential container.
   *
   * - `HEALTHY` - This condition validates that the dependent container passes its Docker health
   *   check before permitting other containers to start. This requires that the dependent container
   *   has health checks configured. This condition is confirmed only at task startup.
   */
  condition: ContainerDependencyCondition;
  /**
   * The name of a container.
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
 * The ``Device`` property specifies an object representing a container instance host device.
 */
export interface Device {
  /**
   * The path inside the container at which to expose the host device.
   */
  containerPath?: string;
  /**
   * The path for the device on the host container instance.
   */
  hostPath?: string;
  /**
   * The explicit permissions to provide to the container for the device. By default, the container
   * has permissions for ``read``, ``write``, and ``mknod`` for the device.
   */
  permissions?: Array<DevicePermissions>;
}

/**
 * A list of files containing the environment variables to pass to a container. You can specify up
 * to ten environment files. The file must have a `.env` file extension. Each line in an environment
 * file should contain an environment variable in `VARIABLE=VALUE` format. Lines beginning with `#`
 * are treated as comments and are ignored. If there are environment variables specified using the
 * `environment` parameter in a container definition, they take precedence over the variables
 * contained within an environment file. If multiple environment files are specified that contain
 * the same variable, they're processed from the top down. We recommend that you use unique variable
 * names. For more information, see [Use a file to pass environment variables to a
 * container](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/use-environment-file.html)
 * in the _Amazon Elastic Container Service Developer Guide_. Environment variable files are objects
 * in Amazon S3 and all Amazon S3 security considerations apply. You must use the following
 * platforms for the Fargate launch type: + Linux platform version `1.4.0` or later.
 *
 * - Windows platform version `1.0.0` or later.
 *
 * Consider the following when using the Fargate launch type: + The file is handled like a native
 * Docker env-file.
 *
 * - There is no support for shell escape handling.
 * - The container entry point interperts the `VARIABLE` values.
 */
export interface ContainerDefinitionEnvironmentFile {
  /**
   * The file type to use. Environment files are objects in Amazon S3. The only supported value is
   * ``s3``.
   */
  type: string;
  /**
   * The Amazon Resource Name (ARN) of the Amazon S3 object containing the environment variable
   * file.
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
 * The FireLens configuration for the container. This is used to specify and configure a log router
 * for container logs. For more information, see [Custom log
 * routing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html) in the
 * _Amazon Elastic Container Service Developer Guide_.
 */
export interface FirelensConfiguration {
  /**
   * The options to use when configuring the log router. This field is optional and can be used to
   * add additional metadata, such as the task, task definition, cluster, and container instance
   * details to the log event. If specified, valid option keys are: + ``enable-ecs-log-metadata``,
   * which can be ``true`` or ``false`` + ``config-file-type``, which can be ``s3`` or ``file`` +
   * ``config-file-value``, which is either an S3 ARN or a file path
   */
  options?: Record<string, pulumi.Input<string>>;
  /**
   * The log router to use. The valid values are ``fluentd`` or ``fluentbit``.
   */
  type?: FirelensConfigurationType;
}

/**
 * The `HealthCheck` property specifies an object representing a container health check. Health
 * check parameters that are specified in a container definition override any Docker health checks
 * that exist in the container image (such as those specified in a parent image or from the image's
 * Dockerfile). This configuration maps to the `HEALTHCHECK` parameter of docker run. The Amazon ECS
 * container agent only monitors and reports on the health checks specified in the task definition.
 * Amazon ECS does not monitor Docker health checks that are embedded in a container image and not
 * specified in the container definition. Health check parameters that are specified in a container
 * definition override any Docker health checks that exist in the container image. If a task is run
 * manually, and not as part of a service, the task will continue its lifecycle regardless of its
 * health status. For tasks that are part of a service, if the task reports as unhealthy then the
 * task will be stopped and the service scheduler will replace it. The following are notes about
 * container health check support: + Container health checks require version 1.17.0 or greater of
 * the Amazon ECS container agent. For more information, see [Updating the Amazon ECS Container
 * Agent](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-update.html).
 *
 * - Container health checks are supported for Fargate tasks if you are using platform version 1.1.0
 *   or greater. For more information, see [Platform
 *   Versions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/platform_versions.html).
 * - Container health checks are not supported for tasks that are part of a service that is configured
 *   to use a Classic Load Balancer.
 */
export interface HealthCheck {
  /**
   * A string array representing the command that the container runs to determine if it is healthy.
   * The string array must start with ``CMD`` to run the command arguments directly, or
   * ``CMD-SHELL`` to run the command with the container's default shell. When you use the AWS
   * Management Console JSON panel, the CLIlong, or the APIs, enclose the list of commands in double
   * quotes and brackets. ``[ "CMD-SHELL", "curl -f http://localhost/ || exit 1" ]`` You don't
   * include the double quotes and brackets when you use the AWS Management Console. ``CMD-SHELL,
   * curl -f http://localhost/ || exit 1`` An exit code of 0 indicates success, and non-zero exit
   * code indicates failure. For more information, see ``HealthCheck`` in the docker container
   * create command.
   */
  command?: string[];
  /**
   * The time period in seconds between each health check execution. You may specify between 5 and
   * 300 seconds. The default value is 30 seconds. This value applies only when you specify a
   * ``command``.
   */
  interval?: number;
  /**
   * The number of times to retry a failed health check before the container is considered
   * unhealthy. You may specify between 1 and 10 retries. The default value is 3. This value applies
   * only when you specify a ``command``.
   */
  retries?: number;
  /**
   * The optional grace period to provide containers time to bootstrap before failed health checks
   * count towards the maximum number of retries. You can specify between 0 and 300 seconds. By
   * default, the ``startPeriod`` is off. This value applies only when you specify a ``command``. If
   * a health check succeeds within the ``startPeriod``, then the container is considered healthy
   * and any subsequent failures count toward the maximum number of retries.
   */
  startPeriod?: number;
  /**
   * The time period in seconds to wait for a health check to succeed before it is considered a
   * failure. You may specify between 2 and 60 seconds. The default value is 5. This value applies
   * only when you specify a ``command``.
   */
  timeout?: number;
}

/**
 * The ``HostEntry`` property specifies a hostname and an IP address that are added to the
 * ``/etc/hosts`` file of a container through the ``extraHosts`` parameter of its
 * ``ContainerDefinition`` resource.
 */
export interface HostEntry {
  /**
   * The hostname to use in the ``/etc/hosts`` entry.
   */
  hostname: pulumi.Input<string>;
  /**
   * The IP address to use in the ``/etc/hosts`` entry.
   */
  ipAddress: pulumi.Input<string>;
}

/**
 * The Linux capabilities to add or remove from the default Docker configuration for a container
 * defined in the task definition. For more detailed information about these Linux capabilities, see
 * the
 * [capabilities(7)](https://docs.aws.amazon.com/http://man7.org/linux/man-pages/man7/capabilities.7.html)
 * Linux manual page. The following describes how Docker processes the Linux capabilities specified
 * in the `add` and `drop` request parameters. For information about the latest behavior, see
 * [Docker Compose: order of cap_drop and
 * cap_add](https://docs.aws.amazon.com/https://forums.docker.com/t/docker-compose-order-of-cap-drop-and-cap-add/97136/1)
 * in the Docker Community Forum. + When the container is a privleged container, the container
 * capabilities are all of the default Docker capabilities. The capabilities specified in the `add`
 * request parameter, and the `drop` request parameter are ignored.
 *
 * - When the `add` request parameter is set to ALL, the container capabilities are all of the default
 *   Docker capabilities, excluding those specified in the `drop` request parameter.
 * - When the `drop` request parameter is set to ALL, the container capabilities are the capabilities
 *   specified in the `add` request parameter.
 * - When the `add` request parameter and the `drop` request parameter are both empty, the
 *   capabilities the container capabilities are all of the default Docker capabilities.
 * - The default is to first drop the capabilities specified in the `drop` request parameter, and then
 *   add the capabilities specified in the `add` request parameter.
 */
export interface KernelCapabilities {
  /**
   * The Linux capabilities for the container that have been added to the default configuration
   * provided by Docker. This parameter maps to `CapAdd` in the docker container create command and
   * the `--cap-add` option to docker run. Tasks launched on FARGATElong only support adding the
   * `SYS_PTRACE` kernel capability. Valid values: `"ALL" | "AUDIT_CONTROL" | "AUDIT_WRITE" |
   * "BLOCK_SUSPEND" | "CHOWN" | "DAC_OVERRIDE" | "DAC_READ_SEARCH" | "FOWNER" | "FSETID" |
   * "IPC_LOCK" | "IPC_OWNER" | "KILL" | "LEASE" | "LINUX_IMMUTABLE" | "MAC_ADMIN" | "MAC_OVERRIDE"
   *
   * | "MKNOD" | "NET_ADMIN" | "NET_BIND_SERVICE" | "NET_BROADCAST" | "NET_RAW" | "SETFCAP" |
   *
   * "SETGID" | "SETPCAP" | "SETUID" | "SYS_ADMIN" | "SYS_BOOT" | "SYS_CHROOT" | "SYS_MODULE" |
   * "SYS_NICE" | "SYS_PACCT" | "SYS_PTRACE" | "SYS_RAWIO" | "SYS_RESOURCE" | "SYS_TIME" |
   * "SYS_TTY_CONFIG" | "SYSLOG" | "WAKE_ALARM"`
   */
  add?: string[];
  /**
   * The Linux capabilities for the container that have been removed from the default configuration
   * provided by Docker. This parameter maps to `CapDrop` in the docker container create command and
   * the `--cap-drop` option to docker run. Valid values: `"ALL" | "AUDIT_CONTROL" | "AUDIT_WRITE" |
   * "BLOCK_SUSPEND" | "CHOWN" | "DAC_OVERRIDE" | "DAC_READ_SEARCH" | "FOWNER" | "FSETID" |
   * "IPC_LOCK" | "IPC_OWNER" | "KILL" | "LEASE" | "LINUX_IMMUTABLE" | "MAC_ADMIN" | "MAC_OVERRIDE"
   *
   * | "MKNOD" | "NET_ADMIN" | "NET_BIND_SERVICE" | "NET_BROADCAST" | "NET_RAW" | "SETFCAP" |
   *
   * "SETGID" | "SETPCAP" | "SETUID" | "SYS_ADMIN" | "SYS_BOOT" | "SYS_CHROOT" | "SYS_MODULE" |
   * "SYS_NICE" | "SYS_PACCT" | "SYS_PTRACE" | "SYS_RAWIO" | "SYS_RESOURCE" | "SYS_TIME" |
   * "SYS_TTY_CONFIG" | "SYSLOG" | "WAKE_ALARM"`
   */
  drop?: string[];
}

/**
 * A key-value pair object.
 */
export interface KeyValuePair {
  /**
   * The name of the key-value pair. For environment variables, this is the name of the environment
   * variable.
   */
  name: string;
  /**
   * The value of the key-value pair. For environment variables, this is the value of the
   * environment variable.
   */
  value?: pulumi.Input<string>;
}

/**
 * The Linux-specific options that are applied to the container, such as Linux
 * [KernelCapabilities](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KernelCapabilities.html).
 */
export interface LinuxParameters {
  /**
   * The Linux capabilities for the container that are added to or dropped from the default
   * configuration provided by Docker. For tasks that use the Fargate launch type, ``capabilities``
   * is supported for all platform versions but the ``add`` parameter is only supported if using
   * platform version 1.4.0 or later.
   */
  capabilities?: KernelCapabilities;
  /**
   * Any host devices to expose to the container. This parameter maps to ``Devices`` in the docker
   * container create command and the ``--device`` option to docker run. If you're using tasks that
   * use the Fargate launch type, the ``devices`` parameter isn't supported.
   */
  devices?: Device[];
  /**
   * Run an ``init`` process inside the container that forwards signals and reaps processes. This
   * parameter maps to the ``--init`` option to docker run. This parameter requires version 1.25 of
   * the Docker Remote API or greater on your container instance. To check the Docker Remote API
   * version on your container instance, log in to your container instance and run the following
   * command: ``sudo docker version --format '{{.Server.APIVersion}}'``
   */
  initProcessEnabled?: boolean;
  /**
   * The total amount of swap memory (in MiB) a container can use. This parameter will be translated
   * to the ``--memory-swap`` option to docker run where the value would be the sum of the container
   * memory plus the ``maxSwap`` value. If a ``maxSwap`` value of ``0`` is specified, the container
   * will not use swap. Accepted values are ``0`` or any positive integer. If the ``maxSwap``
   * parameter is omitted, the container will use the swap configuration for the container instance
   * it is running on. A ``maxSwap`` value must be set for the ``swappiness`` parameter to be used.
   * If you're using tasks that use the Fargate launch type, the ``maxSwap`` parameter isn't
   * supported. If you're using tasks on Amazon Linux 2023 the ``swappiness`` parameter isn't
   * supported.
   */
  maxSwap?: number;
  /**
   * The value for the size (in MiB) of the ``/dev/shm`` volume. This parameter maps to the
   * ``--shm-size`` option to docker run. If you are using tasks that use the Fargate launch type,
   * the ``sharedMemorySize`` parameter is not supported.
   */
  sharedMemorySize?: number;
  /**
   * This allows you to tune a container's memory swappiness behavior. A ``swappiness`` value of
   * ``0`` will cause swapping to not happen unless absolutely necessary. A ``swappiness`` value of
   * ``100`` will cause pages to be swapped very aggressively. Accepted values are whole numbers
   * between ``0`` and ``100``. If the ``swappiness`` parameter is not specified, a default value of
   * ``60`` is used. If a value is not specified for ``maxSwap`` then this parameter is ignored.
   * This parameter maps to the ``--memory-swappiness`` option to docker run. If you're using tasks
   * that use the Fargate launch type, the ``swappiness`` parameter isn't supported. If you're using
   * tasks on Amazon Linux 2023 the ``swappiness`` parameter isn't supported.
   */
  swappiness?: number;
  /**
   * The container path, mount options, and size (in MiB) of the tmpfs mount. This parameter maps to
   * the ``--tmpfs`` option to docker run.
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
 * The ``LogConfiguration`` property specifies log configuration options to send to a custom log
 * driver for the container.
 */
export interface LogConfiguration {
  /**
   * The log driver to use for the container. For tasks on FARGATElong, the supported log drivers
   * are `awslogs`, `splunk`, and `awsfirelens`. For tasks hosted on Amazon EC2 instances, the
   * supported log drivers are `awslogs`, `fluentd`, `gelf`, `json-file`, `journald`, `syslog`,
   * `splunk`, and `awsfirelens`. For more information about using the `awslogs` log driver, see
   * [Send Amazon ECS logs to
   * CloudWatch](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html) in
   * the _Amazon Elastic Container Service Developer Guide_. For more information about using the
   * `awsfirelens` log driver, see [Send Amazon ECS logs to an service or
   * Partner](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html). If
   * you have a custom driver that isn't listed, you can fork the Amazon ECS container agent project
   * that's [available on
   * GitHub](https://docs.aws.amazon.com/https://github.com/aws/amazon-ecs-agent) and customize it
   * to work with that driver. We encourage you to submit pull requests for changes that you would
   * like to have included. However, we don't currently provide support for running modified copies
   * of this software.
   */
  logDriver: LogConfigurationLogDriver;
  /**
   * The configuration options to send to the log driver. The options you can specify depend on the
   * log driver. Some of the options you can specify when you use the `awslogs` log driver to route
   * logs to Amazon CloudWatch include the following: + awslogs-create-group Required: No Specify
   * whether you want the log group to be created automatically. If this option isn't specified, it
   * defaults to false. Your IAM policy must include the logs:CreateLogGroup permission before you
   * attempt to use awslogs-create-group. + awslogs-region Required: Yes Specify the Region that the
   * awslogs log driver is to send your Docker logs to. You can choose to send all of your logs from
   * clusters in different Regions to a single region in CloudWatch Logs. This is so that they're
   * all visible in one location. Otherwise, you can separate them by Region for more granularity.
   * Make sure that the specified log group exists in the Region that you specify with this option.
   *
   * - Awslogs-group Required: Yes Make sure to specify a log group that the awslogs log driver sends
   *   its log streams to. + awslogs-stream-prefix Required: Yes, when using Fargate.Optional when
   *   using EC2. Use the awslogs-stream-prefix option to associate a log stream with the specified
   *   prefix, the container name, and the ID of the Amazon ECS task that the container belongs to.
   *   If you specify a prefix with this option, then the log stream takes the format
   *   prefix-name/container-name/ecs-task-id. If you don't specify a prefix with this option, then
   *   the log stream is named after the container ID that's assigned by the Docker daemon on the
   *   container instance. Because it's difficult to trace logs back to the container that sent them
   *   with just the Docker container ID (which is only available on the container instance), we
   *   recommend that you specify a prefix with this option. For Amazon ECS services, you can use
   *   the service name as the prefix. Doing so, you can trace log streams to the service that the
   *   container belongs to, the name of the container that sent them, and the ID of the task that
   *   the container belongs to. You must specify a stream-prefix for your logs to have your logs
   *   appear in the Log pane when using the Amazon ECS console. + awslogs-datetime-format Required:
   *   No This option defines a multiline start pattern in Python strftime format. A log message
   *   consists of a line that matches the pattern and any following lines that don’t match the
   *   pattern. The matched line is the delimiter between log messages. One example of a use case
   *   for using this format is for parsing output such as a stack dump, which might otherwise be
   *   logged in multiple entries. The correct pattern allows it to be captured in a single entry.
   *   For more information, see awslogs-datetime-format. You cannot configure both the
   *   awslogs-datetime-format and awslogs-multiline-pattern options. Multiline logging performs
   *   regular expression parsing and matching of all log messages. This might have a negative
   *   impact on logging performance. + awslogs-multiline-pattern Required: No This option defines a
   *   multiline start pattern that uses a regular expression. A log message consists of a line that
   *   matches the pattern and any following lines that don’t match the pattern. The matched line is
   *   the delimiter between log messages. For more information, see awslogs-multiline-pattern. This
   *   option is ignored if awslogs-datetime-format is also configured. You cannot configure both
   *   the awslogs-datetime-format and awslogs-multiline-pattern options. Multiline logging performs
   *   regular expression parsing and matching of all log messages. This might have a negative
   *   impact on logging performance. The following options apply to all supported log drivers. +
   *   mode Required: No Valid values: non-blocking | blocking This option defines the delivery mode
   *   of log messages from the container to the log driver specified using logDriver. The delivery
   *   mode you choose affects application availability when the flow of logs from container is
   *   interrupted. If you use the blocking mode and the flow of logs is interrupted, calls from
   *   container code to write to the stdout and stderr streams will block. The logging thread of
   *   the application will block as a result. This may cause the application to become unresponsive
   *   and lead to container healthcheck failure. If you use the non-blocking mode, the container's
   *   logs are instead stored in an in-memory intermediate buffer configured with the
   *   max-buffer-size option. This prevents the application from becoming unresponsive when logs
   *   cannot be sent. We recommend using this mode if you want to ensure service availability and
   *   are okay with some log loss. For more information, see Preventing log loss with non-blocking
   *   mode in the awslogs container log driver. You can set a default mode for all containers in a
   *   specific Region by using the defaultLogDriverMode account setting. If you don't specify the
   *   mode option or configure the account setting, Amazon ECS will default to the non-blocking
   *   mode. For more information about the account setting, see Default log driver mode in the
   *   Amazon Elastic Container Service Developer Guide. On June 25, 2025, Amazon ECS changed the
   *   default log driver mode from blocking to non-blocking to prioritize task availability over
   *   logging. To continue using the blocking mode after this change, do one of the following: Set
   *   the mode option in your container definition's logConfiguration as blocking. Set the
   *   defaultLogDriverMode account setting to blocking. + max-buffer-size Required: No Default
   *   value: 10m When non-blocking mode is used, the max-buffer-size log option controls the size
   *   of the buffer that's used for intermediate message storage. Make sure to specify an adequate
   *   buffer size based on your application. When the buffer fills up, further logs cannot be
   *   stored. Logs that cannot be stored are lost. To route logs using the `splunk` log router, you
   *   need to specify a `splunk-token` and a `splunk-url`. When you use the `awsfirelens` log
   *   router to route logs to an AWS Service or AWS Partner Network destination for log storage and
   *   analytics, you can set the `log-driver-buffer-limit` option to limit the number of events
   *   that are buffered in memory, before being sent to the log router container. It can help to
   *   resolve potential log loss issue because high throughput might result in memory running out
   *   for the buffer inside of Docker. Other options you can specify when using `awsfirelens` to
   *   route logs depend on the destination. When you export logs to Amazon Data Firehose, you can
   *   specify the AWS Region with `region` and a name for the log stream with `delivery_stream`.
   *   When you export logs to Amazon Kinesis Data Streams, you can specify an AWS Region with
   *   `region` and a data stream name with `stream`. When you export logs to Amazon OpenSearch
   *   Service, you can specify options like `Name`, `Host` (OpenSearch Service endpoint without
   *   protocol), `Port`, `Index`, `Type`, `Aws_auth`, `Aws_region`, `Suppress_Type_Name`, and
   *   `tls`. For more information, see [Under the hood: FireLens for Amazon ECS
   *   Tasks](https://docs.aws.amazon.com/containers/under-the-hood-firelens-for-amazon-ecs-tasks/).
   *   When you export logs to Amazon S3, you can specify the bucket using the `bucket` option. You
   *   can also specify `region`, `total_file_size`, `upload_timeout`, and `use_put_object` as
   *   options. This parameter requires version 1.19 of the Docker Remote API or greater on your
   *   container instance. To check the Docker Remote API version on your container instance, log in
   *   to your container instance and run the following command: `sudo docker version --format
   *   '{{.Server.APIVersion}}'`
   */
  options?: Record<string, pulumi.Input<string>>;
  /**
   * The secrets to pass to the log configuration. For more information, see [Specifying sensitive
   * data](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html)
   * in the _Amazon Elastic Container Service Developer Guide_.
   */
  secretOptions?: ContainerDefinitionSecret[];
}

/**
 * The details for a volume mount point that's used in a container definition.
 */
export interface MountPoint {
  /**
   * The path on the container to mount the host volume at.
   */
  containerPath?: string;
  /**
   * If this value is ``true``, the container has read-only access to the volume. If this value is
   * ``false``, then the container can write to the volume. The default value is ``false``.
   */
  readOnly?: boolean;
  /**
   * The name of the volume to mount. Must be a volume name referenced in the ``name`` parameter of
   * task definition ``volume``.
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
 * The `PortMapping` property specifies a port mapping. Port mappings allow containers to access
 * ports on the host container instance to send or receive traffic. Port mappings are specified as
 * part of the container definition. If you are using containers in a task with the `awsvpc` or
 * `host` network mode, exposed ports should be specified using `containerPort`. The `hostPort` can
 * be left blank or it must be the same value as the `containerPort`. After a task reaches the
 * `RUNNING` status, manual and automatic host and container port assignments are visible in the
 * `networkBindings` section of
 * [DescribeTasks](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DescribeTasks.html)
 * API responses.
 */
export interface PortMapping {
  /**
   * The application protocol that's used for the port mapping. This parameter only applies to
   * Service Connect. We recommend that you set this parameter to be consistent with the protocol
   * that your application uses. If you set this parameter, Amazon ECS adds protocol-specific
   * connection handling to the Service Connect proxy. If you set this parameter, Amazon ECS adds
   * protocol-specific telemetry in the Amazon ECS console and CloudWatch. If you don't set a value
   * for this parameter, then TCP is used. However, Amazon ECS doesn't add protocol-specific
   * telemetry for TCP. `appProtocol` is immutable in a Service Connect service. Updating this field
   * requires a service deletion and redeployment. Tasks that run in a namespace can use short names
   * to connect to services in the namespace. Tasks can connect to services across all of the
   * clusters in the namespace. Tasks connect through a managed proxy container that collects logs
   * and metrics for increased visibility. Only the tasks that Amazon ECS services create are
   * supported with Service Connect. For more information, see [Service
   * Connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html) in
   * the _Amazon Elastic Container Service Developer Guide_.
   */
  appProtocol?: PortMappingAppProtocol;
  /**
   * The port number on the container that's bound to the user-specified or automatically assigned
   * host port. If you use containers in a task with the ``awsvpc`` or ``host`` network mode,
   * specify the exposed ports using ``containerPort``. If you use containers in a task with the
   * ``bridge`` network mode and you specify a container port and not a host port, your container
   * automatically receives a host port in the ephemeral port range. For more information, see
   * ``hostPort``. Port mappings that are automatically assigned in this way do not count toward the
   * 100 reserved ports limit of a container instance.
   */
  containerPort?: number;
  /**
   * The port number range on the container that's bound to the dynamically mapped host port range.
   * The following rules apply when you specify a `containerPortRange`: + You must use either the
   * `bridge` network mode or the `awsvpc` network mode.
   *
   * - This parameter is available for both the EC2 and FARGATElong launch types.
   * - This parameter is available for both the Linux and Windows operating systems.
   * - The container instance must have at least version 1.67.0 of the container agent and at least
   *   version 1.67.0-1 of the `ecs-init` package
   * - You can specify a maximum of 100 port ranges per container.
   * - You do not specify a `hostPortRange`. The value of the `hostPortRange` is set as follows:
   * - For containers in a task with the `awsvpc` network mode, the `hostPortRange` is set to the same
   *   value as the `containerPortRange`. This is a static mapping strategy.
   * - For containers in a task with the `bridge` network mode, the Amazon ECS agent finds open host
   *   ports from the default ephemeral range and passes it to docker to bind them to the container
   *   ports.
   * - The `containerPortRange` valid values are between 1 and 65535.
   * - A port can only be included in one port mapping per container.
   * - You cannot specify overlapping port ranges.
   * - The first port in the range must be less than last port in the range.
   * - Docker recommends that you turn off the docker-proxy in the Docker daemon config file when you
   *   have a large number of ports. For more information, see [Issue
   *   #11185](https://docs.aws.amazon.com/https://github.com/moby/moby/issues/11185) on the Github
   *   website. For information about how to turn off the docker-proxy in the Docker daemon config
   *   file, see [Docker
   *   daemon](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/bootstrap_container_instance.html#bootstrap_docker_daemon)
   *   in the _Amazon ECS Developer Guide_.
   *
   * You can call
   * [DescribeTasks](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DescribeTasks.html)
   * to view the `hostPortRange` which are the host ports that are bound to the container ports.
   */
  containerPortRange?: string;
  /**
   * The port number on the container instance to reserve for your container. If you specify a
   * `containerPortRange`, leave this field empty and the value of the `hostPort` is set as
   * follows:
   *
   * - For containers in a task with the `awsvpc` network mode, the `hostPort` is set to the same
   *   value as the `containerPort`. This is a static mapping strategy.
   * - For containers in a task with the `bridge` network mode, the Amazon ECS agent finds open ports
   *   on the host and automatically binds them to the container ports. This is a dynamic mapping
   *   strategy.
   *
   * If you use containers in a task with the `awsvpc` or `host` network mode, the `hostPort` can
   * either be left blank or set to the same value as the `containerPort`. If you use containers in
   * a task with the `bridge` network mode, you can specify a non-reserved host port for your
   * container port mapping, or you can omit the `hostPort` (or set it to `0`) while specifying a
   * `containerPort` and your container automatically receives a port in the ephemeral port range
   * for your container instance operating system and Docker version. The default ephemeral port
   * range for Docker version 1.6.0 and later is listed on the instance under
   * `/proc/sys/net/ipv4/ip_local_port_range`. If this kernel parameter is unavailable, the default
   * ephemeral port range from 49153 through 65535 (Linux) or 49152 through 65535 (Windows) is used.
   * Do not attempt to specify a host port in the ephemeral port range as these are reserved for
   * automatic assignment. In general, ports below 32768 are outside of the ephemeral port range.
   * The default reserved ports are 22 for SSH, the Docker ports 2375 and 2376, and the Amazon ECS
   * container agent ports 51678-51680. Any host port that was previously specified in a running
   * task is also reserved while the task is running. That is, after a task stops, the host port is
   * released. The current reserved ports are displayed in the `remainingResources` of
   * [DescribeContainerInstances](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DescribeContainerInstances.html)
   * output. A container instance can have up to 100 reserved ports at a time. This number includes
   * the default reserved ports. Automatically assigned ports aren't included in the 100 reserved
   * ports quota.
   */
  hostPort?: number;
  /**
   * The name that's used for the port mapping. This parameter is the name that you use in the
   * `serviceConnectConfiguration` and the `vpcLatticeConfigurations` of a service. The name can
   * include up to 64 characters. The characters can include lowercase letters, numbers, underscores
   * (_), and hyphens (-). The name can't start with a hyphen.
   */
  name?: string;
  /**
   * The protocol used for the port mapping. Valid values are ``tcp`` and ``udp``. The default is
   * ``tcp``. ``protocol`` is immutable in a Service Connect service. Updating this field requires a
   * service deletion and redeployment.
   */
  protocol?: PortMappingProtocol;
}

/**
 * The repository credentials for private registry authentication.
 */
export interface RepositoryCredentials {
  /**
   * The Amazon Resource Name (ARN) of the secret containing the private repository credentials.
   * When you use the Amazon ECS API, CLI, or AWS SDK, if the secret exists in the same Region as
   * the task that you're launching then you can use either the full ARN or the name of the secret.
   * When you use the AWS Management Console, you must specify the full ARN of the secret.
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
 * The type and amount of a resource to assign to a container. The supported resource types are
 * GPUs, Neuron devices, and Elastic Inference accelerators. For more information, see [Working with
 * GPUs on Amazon ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-gpu.html) or
 * [Working with Amazon Elastic Inference on Amazon
 * ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-inference.html) in the
 * _Amazon Elastic Container Service Developer Guide_
 */
export interface ResourceRequirement {
  /**
   * The type of resource to assign to a container.
   */
  type: ResourceRequirementType;
  /**
   * The value for the specified resource type. When the type is `GPU`, the value is the number of
   * physical `GPUs` the Amazon ECS container agent reserves for the container. The number of GPUs
   * that's reserved for all containers in a task can't exceed the number of available GPUs on the
   * container instance that the task is launched on. You can also specify `ALL` to allocate all
   * available GPUs on the instance to the container. When the type is `NeuronDevice`, the value
   * must be `ALL`. This allocates all available Neuron devices on the instance to the container.
   * Only one container in a task can specify `NeuronDevice` resources. This resource type is only
   * supported on Managed Instances. When the type is `InferenceAccelerator`, the `value` matches
   * the `deviceName` for an
   * [InferenceAccelerator](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_InferenceAccelerator.html)
   * specified in a task definition.
   */
  value: string;
}

/**
 * You can enable a restart policy for each container defined in your task definition, to overcome
 * transient failures faster and maintain task availability. When you enable a restart policy for a
 * container, Amazon ECS can restart the container if it exits, without needing to replace the task.
 * For more information, see [Restart individual containers in Amazon ECS tasks with container
 * restart
 * policies](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-restart-policy.html)
 * in the _Amazon Elastic Container Service Developer Guide_.
 */
export interface ContainerRestartPolicy {
  /**
   * Specifies whether a restart policy is enabled for the container.
   */
  enabled?: boolean;
  /**
   * A list of exit codes that Amazon ECS will ignore and not attempt a restart on. You can specify
   * a maximum of 50 container exit codes. By default, Amazon ECS does not ignore any exit codes.
   */
  ignoredExitCodes?: number[];
  /**
   * A period of time (in seconds) that the container must run for before a restart can be
   * attempted. A container can be restarted only once every ``restartAttemptPeriod`` seconds. If a
   * container isn't able to run for this time period and exits early, it will not be restarted. You
   * can set a minimum ``restartAttemptPeriod`` of 60 seconds and a maximum ``restartAttemptPeriod``
   * of 1800 seconds. By default, a container must run for 300 seconds before it can be restarted.
   */
  restartAttemptPeriod?: number;
}

/**
 * An object representing the secret to expose to your container. Secrets can be exposed to a
 * container in the following ways: + To inject sensitive data into your containers as environment
 * variables, use the `secrets` container definition parameter.
 *
 * - To reference sensitive information in the log configuration of a container, use the
 *   `secretOptions` container definition parameter.
 *
 * For more information, see [Specifying sensitive
 * data](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html)
 * in the _Amazon Elastic Container Service Developer Guide_.
 */
export interface ContainerDefinitionSecret {
  /**
   * The name of the secret.
   */
  name: string;
  /**
   * The secret to expose to the container. The supported values are either the full ARN of the
   * ASMlong secret or the full ARN of the parameter in the SSM Parameter Store. For information
   * about the require IAMlong permissions, see [Required IAM permissions for Amazon ECS
   * secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html#secrets-iam)
   * (for Secrets Manager) or [Required IAM permissions for Amazon ECS
   * secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-parameters.html)
   * (for Systems Manager Parameter store) in the _Amazon Elastic Container Service Developer
   * Guide_. If the SSM Parameter Store parameter exists in the same Region as the task you're
   * launching, then you can use either the full ARN or name of the parameter. If the parameter
   * exists in a different Region, then the full ARN must be specified.
   */
  valueFrom: pulumi.Input<string>;
}

/**
 * A list of namespaced kernel parameters to set in the container. This parameter maps to `Sysctls`
 * in the docker container create command and the `--sysctl` option to docker run. For example, you
 * can configure `net.ipv4.tcp_keepalive_time` setting to maintain longer lived connections. We
 * don't recommend that you specify network-related `systemControls` parameters for multiple
 * containers in a single task that also uses either the `awsvpc` or `host` network mode. Doing this
 * has the following disadvantages: + For tasks that use the `awsvpc` network mode including
 * Fargate, if you set `systemControls` for any container, it applies to all containers in the task.
 * If you set different `systemControls` for multiple containers in a single task, the container
 * that's started last determines which `systemControls` take effect.
 *
 * - For tasks that use the `host` network mode, the network namespace `systemControls` aren't
 *   supported.
 *
 * If you're setting an IPC resource namespace to use for the containers in the task, the following
 * conditions apply to your system controls. For more information, see [IPC
 * mode](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#task_definition_ipcmode).
 *
 * - For tasks that use the `host` IPC mode, IPC namespace `systemControls` aren't supported.
 * - For tasks that use the `task` IPC mode, IPC namespace `systemControls` values apply to all
 *   containers within a task.
 *
 * This parameter is not supported for Windows containers. This parameter is only supported for
 * tasks that are hosted on FARGATElong if the tasks are using platform version `1.4.0` or later
 * (Linux). This isn't supported for Windows containers on Fargate.
 */
export interface SystemControl {
  /**
   * The namespaced kernel parameter to set a ``value`` for.
   */
  namespace?: string;
  /**
   * The namespaced kernel parameter to set a `value` for. Valid IPC namespace values:
   * `"kernel.msgmax" | "kernel.msgmnb" | "kernel.msgmni" | "kernel.sem" | "kernel.shmall" |
   * "kernel.shmmax" | "kernel.shmmni" | "kernel.shm_rmid_forced"`, and `Sysctls` that start with
   * `"fs.mqueue.*"` Valid network namespace values: `Sysctls` that start with `"net.*"`. Only
   * namespaced `Sysctls` that exist within the container starting with "net.* are accepted. All of
   * these values are supported by Fargate.
   */
  value?: string;
}

/**
 * The container path, mount options, and size of the tmpfs mount.
 */
export interface Tmpfs {
  /**
   * The absolute file path where the tmpfs volume is to be mounted.
   */
  containerPath?: string;
  /**
   * The list of tmpfs volume mount options. Valid values: `"defaults" | "ro" | "rw" | "suid" |
   * "nosuid" | "dev" | "nodev" | "exec" | "noexec" | "sync" | "async" | "dirsync" | "remount" |
   * "mand" | "nomand" | "atime" | "noatime" | "diratime" | "nodiratime" | "bind" | "rbind" |
   * "unbindable" | "runbindable" | "private" | "rprivate" | "shared" | "rshared" | "slave" |
   * "rslave" | "relatime" | "norelatime" | "strictatime" | "nostrictatime" | "mode" | "uid" | "gid"
   * | "nr_inodes" | "nr_blocks" | "mpol"`
   */
  mountOptions?: string[];
  /**
   * The maximum size (in MiB) of the tmpfs volume.
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
 * The ``ulimit`` settings to pass to the container. Amazon ECS tasks hosted on FARGATElong use the
 * default resource limit values set by the operating system with the exception of the ``nofile``
 * resource limit parameter which FARGATElong overrides. The ``nofile`` resource limit sets a
 * restriction on the number of open files that a container can use. The default ``nofile`` soft
 * limit is ``65535`` and the default hard limit is ``65535``. You can specify the ``ulimit``
 * settings for a container in a task definition.
 */
export interface Ulimit {
  /**
   * The hard limit for the ``ulimit`` type. The value can be specified in bytes, seconds, or as a
   * count, depending on the ``type`` of the ``ulimit``.
   */
  hardLimit: number;
  /**
   * The ``type`` of the ``ulimit``.
   */
  name: UlimitName;
  /**
   * The soft limit for the ``ulimit`` type. The value can be specified in bytes, seconds, or as a
   * count, depending on the ``type`` of the ``ulimit``.
   */
  softLimit: number;
}

/**
 * Details on a data volume from another container in the same task definition.
 */
export interface VolumeFrom {
  /**
   * If this value is ``true``, the container has read-only access to the volume. If this value is
   * ``false``, then the container can write to the volume. The default value is ``false``.
   */
  readOnly?: boolean;
  /**
   * The name of another container within the same task definition to mount volumes from.
   */
  sourceContainer?: string;
}
