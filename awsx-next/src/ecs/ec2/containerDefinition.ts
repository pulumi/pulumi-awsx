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
 * Linux capabilities to add to or remove from an EC2 container.
 */
export interface Ec2KernelCapabilities {
  readonly add?: string[];
  readonly drop?: string[];
}

/**
 * Access granted to a host device.
 */
export enum Ec2DevicePermission {
  READ = 'read',
  WRITE = 'write',
  MKNOD = 'mknod',
}

/**
 * A host device exposed to an EC2 container.
 */
export interface Ec2Device {
  readonly containerPath?: string;
  readonly hostPath: string;
  readonly permissions?: Ec2DevicePermission[];
}

/**
 * A temporary file-system mount for an EC2 container.
 */
export interface Ec2Tmpfs {
  readonly containerPath: string;
  readonly mountOptions?: string[];
  readonly size: number;
}

/**
 * Linux-specific options supported by containers in EC2 task definitions.
 */
export interface Ec2LinuxParameters {
  readonly capabilities?: Ec2KernelCapabilities;
  readonly devices?: Ec2Device[];
  readonly initProcessEnabled?: boolean;
  readonly maxSwap?: number;
  readonly sharedMemorySize?: number;
  readonly swappiness?: number;
  readonly tmpfs?: Ec2Tmpfs[];
}

/**
 * A port mapping for a container in an EC2 task.
 */
export interface Ec2PortMapping {
  /**
   * The port number exposed by the container.
   *
   * Do not set this property when `containerPortRange` is set.
   */
  readonly containerPort?: number;

  /**
   * The port on the container instance to bind to the container port.
   *
   * When the task uses `bridge` networking, omit this property or set it to zero to let ECS select
   * an ephemeral host port. When the task uses `host` or `awsvpc` networking, it must be omitted or
   * equal `containerPort`.
   */
  readonly hostPort?: number;

  /**
   * The protocol used for the port mapping.
   *
   * Default - 'tcp'
   */
  readonly protocol?: 'tcp' | 'udp';

  /**
   * The name used by ECS Service Connect and VPC Lattice.
   */
  readonly name?: string;

  /**
   * The application protocol used by ECS Service Connect.
   */
  readonly appProtocol?: 'http' | 'http2' | 'grpc';

  /**
   * A range of container ports, in the form `start-end`.
   *
   * Do not set this property when `containerPort` is set.
   */
  readonly containerPortRange?: string;
}
/**
 * The type and amount of a resource to assign to a container.
 *
 * The supported resource types are GPUs and Elastic Inference accelerators. For more information,
 * see [Working with GPUs on Amazon
 * ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-gpu.html) or [Working with
 * Amazon Elastic Inference on Amazon
 * ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-inference.html) in the
 * _Amazon Elastic Container Service Developer Guide_
 *
 * @see https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ResourceRequirement.html
 */
export interface ResourceRequirement {
  /**
   * The value for the specified resource type.
   *
   * When the type is `GPU` , the value is the number of physical `GPUs` the Amazon ECS container
   * agent reserves for the container. The number of GPUs that's reserved for all containers in a
   * task can't exceed the number of available GPUs on the container instance that the task is
   * launched on.
   *
   * When the type is `InferenceAccelerator` , the `value` matches the `deviceName` for an
   * [InferenceAccelerator](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_InferenceAccelerator.html)
   * specified in a task definition.
   *
   * @see https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ResourceRequirement.html#ECS-Type-ResourceRequirement-value
   */
  value: string;
  /**
   * The type of resource to assign to a container.
   *
   * @see https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ResourceRequirement.html#ECS-Type-ResourceRequirement-type
   */
  type: 'GPU' | 'InferenceAccelerator' | 'NeuronDevice';
}

export interface Ec2ContainerDefinitionProperties extends ContainerDefinitionCommonProperties {
  /**
   * The number of CPU units reserved for the container.
   *
   * On Linux, this value controls the container's relative CPU share. On Windows, it is an absolute
   * CPU quota.
   *
   * Default - No explicit CPU reservation on Linux. Windows treats an omitted value as one percent
   * of one CPU.
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
   * ECS stops the container if it uses more than this limit. Set a task-level memory value or a
   * non-zero container-level `memory` or `memoryReservation` value.
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
   * The container can use more memory when it is available, up to its hard memory limit or the
   * available memory on the container instance. This property is not supported for Windows
   * containers.
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
   * Default - No container-specific startup timeout. The ECS container agent can enforce a separate
   * startup timeout.
   */
  readonly startTimeout?: number;

  /**
   * The time, in seconds, to wait before ECS forcefully stops the container after it does not exit
   * normally.
   *
   * Default - The timeout configured by the ECS container agent, or 30 seconds when the agent does
   * not configure one.
   */
  readonly stopTimeout?: number;

  /**
   * Resource limits to set for the container.
   *
   * This property is supported for Linux containers, but not Windows containers.
   *
   * Default - The operating system and Docker resource limits.
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
  readonly portMappings?: Ec2PortMapping[];

  /**
   * Linux-specific options applied to the container.
   *
   * This property is not supported for Windows containers.
   */
  readonly linuxParameters?: Ec2LinuxParameters;

  /**
   * The hostname to use for your container.
   *
   * This parameter maps to `Hostname` in the docker container create command and the `--hostname`
   * option to docker run.
   *
   * > The `hostname` parameter is not supported if you're using the `awsvpc` network mode.
   *
   * @see https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-hostname
   */
  hostname?: string;

  /**
   * When this parameter is true, networking is off within the container.
   *
   * This parameter maps to `NetworkDisabled` in the docker container create command.
   *
   * > This parameter is not supported for Windows containers.
   *
   * @see https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-disableNetworking
   */
  disableNetworking?: boolean;

  /**
   * When this parameter is true, the container is given elevated privileges on the host container
   * instance (similar to the `root` user).
   *
   * This parameter maps to `Privileged` in the docker container create command and the
   * `--privileged` option to docker run
   *
   * > This parameter is not supported for Windows containers or tasks run on AWS Fargate .
   *
   * @see https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-privileged
   */
  privileged?: boolean;

  /**
   * A list of DNS servers that are presented to the container.
   *
   * This parameter maps to `Dns` in the docker container create command and the `--dns` option to
   * docker run.
   *
   * > This parameter is not supported for Windows containers.
   *
   * @see https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-dnsServers
   */
  dnsServers?: string[];

  /**
   * A list of DNS search domains that are presented to the container.
   *
   * This parameter maps to `DnsSearch` in the docker container create command and the
   * `--dns-search` option to docker run.
   *
   * > This parameter is not supported for Windows containers.
   *
   * @see https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-dnsSearchDomains
   */
  dnsSearchDomains?: string[];

  /**
   * A list of strings to provide custom configuration for multiple security systems.
   *
   * This field isn't valid for containers in tasks using the Fargate launch type.
   *
   * For Linux tasks on EC2, this parameter can be used to reference custom labels for SELinux and
   * AppArmor multi-level security systems.
   *
   * For any tasks on EC2, this parameter can be used to reference a credential spec file that
   * configures a container for Active Directory authentication. For more information, see [Using
   * gMSAs for Windows
   * Containers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/windows-gmsa.html) and
   * [Using gMSAs for Linux
   * Containers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/linux-gmsa.html) in the
   * _Amazon Elastic Container Service Developer Guide_ .
   *
   * This parameter maps to `SecurityOpt` in the docker container create command and the
   * `--security-opt` option to docker run.
   *
   * > The Amazon ECS container agent running on a container instance must register with the
   * > `ECS_SELINUX_CAPABLE=true` or `ECS_APPARMOR_CAPABLE=true` environment variables before
   * > containers placed on that instance can use these security options. For more information, see
   * > [Amazon ECS Container Agent
   * > Configuration](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-config.html)
   * > in the _Amazon Elastic Container Service Developer Guide_ .
   *
   * Valid values: "no-new-privileges" | "apparmor:PROFILE" | "label:value" |
   * "credentialspec:CredentialSpecFilePath"
   *
   * @see https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-dockerSecurityOptions
   */
  dockerSecurityOptions?: string[];

  /**
   * The type and amount of a resource to assign to a container.
   *
   * The only supported resource is a GPU.
   *
   * @see https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html#ECS-Type-ContainerDefinition-resourceRequirements
   */
  resourceRequirements?: ResourceRequirement[];
}

/**
 * CloudWatch Logs configuration for an EC2 container.
 */
export interface Ec2AwsLogsLogDriver extends AwsLogsLogDriverBase {
  /**
   * Prefix used for the container's log streams.
   */
  readonly streamPrefix?: pulumi.Input<string>;
}

/**
 * Log-driver configuration for an EC2 container.
 */
export interface Ec2LogDriver {
  readonly cloudwatch: Ec2AwsLogsLogDriver;
}

/**
 * Higher-level options for a container in an EC2 task definition.
 */
export interface Ec2ContainerDefinitionOptions
  extends ContainerDefinitionOptionsBase, Ec2ContainerDefinitionProperties {
  /**
   * Hostname and IP-address entries added to the container's hosts file.
   */
  readonly extraHosts?: Record<string, string>;

  readonly logging?: Ec2LogDriver;
}
