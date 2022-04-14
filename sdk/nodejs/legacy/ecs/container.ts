// Copyright 2016-2018, Pulumi Corporation.
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

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as ecs from ".";
import * as x from "..";

import * as utils from "../utils";

/** @internal */
export function computeContainerDefinition(
    parent: pulumi.Resource,
    name: string,
    vpc: x.ec2.Vpc | undefined,
    containerName: string,
    container: Container,
    applicationListeners: Record<string, x.lb.ApplicationListener>,
    networkListeners: Record<string, x.lb.NetworkListener>,
    logGroup: aws.cloudwatch.LogGroup | undefined | null) {

    const image = isContainerImageProvider(container.image)
        ? container.image.image(name, parent)
        : container.image;

    const environment = isContainerImageProvider(container.image)
        ? utils.combineArrays(container.environment, container.image.environment(name, parent))
        : container.environment;

    const portMappings = getPortMappings(parent, name, vpc, container, containerName, applicationListeners, networkListeners);
    const region = utils.getRegion(parent);

    const logGroupId = logGroup ? logGroup.id : undefined;
    const containerDefinition = pulumi.all([container, logGroupId, image, environment, portMappings, region])
        .apply(([container, logGroupId, image, environment, portMappings, region]) => {
            const containerDefinition: aws.ecs.ContainerDefinition = {
                ...container,
                image,
                environment,
                portMappings,
                name: containerName,
            };

            if (containerDefinition.logConfiguration === undefined && logGroupId !== undefined) {
                containerDefinition.logConfiguration = {
                    logDriver: "awslogs",
                    options: {
                        "awslogs-group": logGroupId,
                        "awslogs-region": region,
                        "awslogs-stream-prefix": containerName,
                    },
                };
            }

            return containerDefinition;
        });

    return containerDefinition;
}

function getPortMappings(
    parent: pulumi.Resource,
    name: string,
    vpc: x.ec2.Vpc | undefined,
    container: Container,
    containerName: string,
    applicationListeners: Record<string, x.lb.ApplicationListener>,
    networkListeners: Record<string, x.lb.NetworkListener>) {

    if (container.applicationListener && container.networkListener) {
        throw new pulumi.ResourceError(`Container '${name}' supplied [applicationListener] and [networkListener]`, parent);
    }

    const hasLoadBalancerInfo = !!container.applicationListener || !!container.networkListener;
    if (!container.portMappings && !hasLoadBalancerInfo) {
        return undefined;
    }

    if (container.portMappings && hasLoadBalancerInfo) {
        throw new pulumi.ResourceError(`Container '${name}' supplied [portMappings] and a listener`, parent);
    }

    const result: pulumi.Output<aws.ecs.PortMapping>[] = [];

    let possibleListener: any;

    if (container.portMappings) {
        for (const obj of container.portMappings) {
            const portMapping = pulumi.output(isContainerPortMappingProvider(obj)
                ? obj.containerPortMapping(name, parent)
                : obj);
            result.push(pulumi.output(portMapping));

            possibleListener = obj;
        }
    }
    else {
        const listener = createListener();
        possibleListener = listener;
        result.push(pulumi.output(listener.containerPortMapping(name, parent)));
    }

    if (x.lb.ApplicationListener.isApplicationListenerInstance(possibleListener)) {
        applicationListeners[containerName] = possibleListener;
    }
    else if (x.lb.NetworkListener.isNetworkListenerInstance(possibleListener)) {
        networkListeners[containerName] = possibleListener;
    }

    return pulumi.all(result).apply(mappings => convertMappings(mappings));

    function createListener() {
        const opts = { parent };

        const errorMessage = `[vpc] must be supplied to task definition in order to create a listener for container ${name}`;
        if (container.applicationListener) {
            if (pulumi.Resource.isInstance(container.applicationListener)) {
                return container.applicationListener;
            }

            if (!vpc) {
                throw new pulumi.ResourceError(errorMessage, parent);
            }

            return new x.lb.ApplicationListener(name, {
                ...container.applicationListener,
                vpc,
            }, opts);
        }
        else if (container.networkListener) {
            if (pulumi.Resource.isInstance(container.networkListener)) {
                return container.networkListener;
            }

            if (!vpc) {
                throw new pulumi.ResourceError(errorMessage, parent);
            }

            return new x.lb.NetworkListener(name, {
                ...container.networkListener,
                vpc,
            }, opts);
        }
        else {
            throw new Error("Unreachable");
        }
    }
}

function convertMappings(mappings: aws.ecs.PortMapping[]) {
    const result: aws.ecs.PortMapping[] = [];
    for (const mapping of mappings) {
        const copy = { ...mapping };

        if (copy.hostPort === undefined) {
            // From https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html:
            // > For task definitions that use the awsvpc network mode, you should only specify
            // > the containerPort. The hostPort can be left blank or it must be the same value
            // > as the containerPort.
            //
            // However, if left blank, it will be automatically populated by AWS, potentially
            // leading to dirty diffs even when no changes have been made. Since we are
            // currently always using `awsvpc` mode, we go ahead and populate it with the same
            // value as `containerPort`.
            //
            // See https://github.com/terraform-providers/terraform-provider-aws/issues/3401.
            copy.hostPort = copy.containerPort;
        }

        result.push(copy);
    }

    return result;
}

export interface ContainerPortMappingProvider {
    containerPortMapping(name: string, parent: pulumi.Resource): pulumi.Input<aws.ecs.PortMapping>;
}

export interface ContainerLoadBalancer {
    containerPort: pulumi.Input<number>;
    elbName?: pulumi.Input<string>;
    targetGroupArn?: pulumi.Input<string>;
}

export interface ContainerLoadBalancerProvider {
    containerLoadBalancer(name: string, parent: pulumi.Resource): pulumi.Input<ContainerLoadBalancer>;
}

/** @internal */
export function isContainerPortMappingProvider(obj: any): obj is ContainerPortMappingProvider {
    return obj && (<ContainerPortMappingProvider>obj).containerPortMapping instanceof Function;
}

/** @internal */
export function isContainerLoadBalancerProvider(obj: any): obj is ContainerLoadBalancerProvider {
    return obj && (<ContainerLoadBalancerProvider>obj).containerLoadBalancer instanceof Function;
}

type WithoutUndefined<T> = T extends undefined ? never : T;

type MakeInputs<T> = {
    [P in keyof T]?: pulumi.Input<WithoutUndefined<T[P]>>;
};

// The shape we want for ContainerDefinitions.  We don't export this as 'Overwrite' types are not
// pleasant to work with. However, they internally allow us to succinctly express the shape we're
// trying to provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<MakeInputs<aws.ecs.ContainerDefinition>, {
    image: pulumi.Input<string> | ContainerImageProvider;
    portMappings?: (pulumi.Input<aws.ecs.PortMapping> | ContainerPortMappingProvider)[];
    environment?: pulumi.Input<KeyValuePair[]>;
    // TODO[pulumi/aws#796]: This overwrite is needed until the type of `dependsOn` is fixed in the
    // AWS provider.
    dependsOn?: pulumi.Input<ContainerDependency[]>;

    // Target a more specific shape for `firelensConfiguration` than what `aws` exports.
    firelensConfiguration?: pulumi.Input<FirelensConfiguration>;
}>;

/**
 * See https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KeyValuePair.html
 * for more details.
 */
export interface KeyValuePair {
    /**
     * The name of the key-value pair. For environment variables, this is the name of the
     * environment variable.
     */
    name: pulumi.Input<string>;
    /**
     * The value of the key-value pair. For environment variables, this is the value of the
     * environment variable.
     */
    value: pulumi.Input<string>;
}

/**
 * See https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_EnvironmentFile.html
 * for more details.
 */
export interface EnvironmentFile {
    /**
     * The file type to use. The only supported value is s3.
     */
    type: "s3";
    /**
     * The Amazon Resource Name (ARN) of the Amazon S3 object containing the environment
     * variable file.
     */
    value: string;
}

/**
 * See https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDependency.html
 * for more details.
 */
export interface ContainerDependency {
    /**
     * The dependency condition of the container. The following are the available conditions and
     *    their behavior: START - This condition emulates the behavior of links and volumes today.
     *    It validates that a dependent container is started before permitting other containers to
     *    start. COMPLETE - This condition validates that a dependent container runs to completion
     *    (exits) before permitting other containers to start. This can be useful for nonessential
     *    containers that run a script and then exit. SUCCESS - This condition is the same as
     *    COMPLETE, but it also requires that the container exits with a zero status. HEALTHY - This
     *    condition validates that the dependent container passes its Docker health check before
     *    permitting other containers to start. This requires that the dependent container has
     *    health checks configured. This condition is confirmed only at task startup.
     */
    condition?: pulumi.Input<"START" | "COMPLETE" | "SUCCESS" | "HEALTHY">;
    /**
     * The name of a container.
     */
    containerName: pulumi.Input<string>;
}

/**
 * See https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_FirelensConfiguration.html
 * for more details
 */
export interface FirelensConfiguration {
    /**
     * The options to use when configuring the log router. This field is optional and can be used to specify a custom
     * configuration file or to add additional metadata, such as the task, task definition, cluster, and container
     * instance details to the log event.
     */
    options?: { [key: string]: string};

    /**
     * The log router to use.
     */
    type: pulumi.Input<"fluentd" | "fluentbit">;
}

/**
 * [Container]s are used in [awsx.ec2.TaskDefinition] to describe the different containers that are
 * launched as part of a task.
 *
 * See https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html for
 * more details.
 */
export interface Container {
    // Properties from aws.ecs.ContainerDefinition

    /**
     * The command that is passed to the container.
     *
     * This parameter maps to `Cmd` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the COMMAND
     * parameter to [docker-run](https://docs.docker.com/engine/reference/run/). For more
     * information, see https://docs.docker.com/engine/reference/builder/#cmd. If there are multiple
     * arguments, each argument should be a separated string in the array.
     */
    command?: pulumi.Input<string[]>;

    /**
     * The number of cpu units reserved for the container. This parameter maps to CpuShares in the
     * Create a container section of the Docker Remote API and the --cpu-shares option to docker
     * run.
     *
     * This parameter maps to `CpuShares` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--cpu-shared` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    cpu?: pulumi.Input<number>;

    /**
     * The dependencies defined for container startup and shutdown. A container can contain multiple
     * dependencies. When a dependency is defined for container startup, for container shutdown it
     * is reversed.
     *
     * For tasks using the EC2 launch type, the container instances require at least version 1.26.0
     * of the container agent to enable container dependencies. However, we recommend using the
     * latest container agent version. For information about checking your agent version and
     * updating to the latest version, see Updating the Amazon ECS Container Agent in the Amazon
     * Elastic Container Service Developer Guide. If you are using an Amazon ECS-optimized Linux
     * AMI, your instance needs at least version 1.26.0-1 of the ecs-init package. If your container
     * instances are launched from version 20190301 or later, then they contain the required
     * versions of the container agent and ecs-init. For more information, see Amazon ECS-optimized
     * Linux AMI in the Amazon Elastic Container Service Developer Guide.
     *
     * For tasks using the Fargate launch type, the task or service requires platform version 1.3.0
     * or later.
     */
    dependsOn?: pulumi.Input<ContainerDependency[]>;

    /**
     * When this parameter is true, networking is disabled within the container.
     *
     * This parameter maps to `NetworkDisabled` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/).
     *
     * Note: This parameter is not supported for Windows containers.
     */
    disableNetworking?: pulumi.Input<boolean>;

    /**
     * A list of DNS search domains that are presented to the container.
     *
     * This parameter maps to `DnsSearch` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--dns-search` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     *
     * Note: This parameter is not supported for Windows containers.
     */
    dnsSearchDomains?: pulumi.Input<string[]>;

    /**
     * A list of DNS servers that are presented to the container.
     *
     * This parameter maps to `Dns` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the `--dns`
     * parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     *
     * Note: This parameter is not supported for Windows containers.
     */
    dnsServers?: pulumi.Input<string[]>;

    /**
     * A key/value map of labels to add to the container.
     *
     * This parameter maps to `Labels` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--label` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    dockerLabels?: pulumi.Input<{ [label: string]: string; }>;

    /**
     * A list of strings to provide custom labels for SELinux and AppArmor multi-level security
     * systems. This field is not valid for containers in tasks using the Fargate launch type.
     *
     * This parameter maps to `SecurityOpt` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--security-opt` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    dockerSecurityOptions?: pulumi.Input<string[]>;

    /**
     * The entry point that is passed to the container.
     *
     * This parameter maps to `Entrypoint` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--entrypoint` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     *
     * Important: Early versions of the Amazon ECS container agent do not properly handle entryPoint
     * parameters. If you have problems using entryPoint, update your container agent or enter your
     * commands and arguments as command array items instead.
     */
    entryPoint?: pulumi.Input<string[]>;

    /**
     * The environment variables to pass to a container.
     *
     * This parameter maps to `Env` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the `--env`
     * parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     *
     * Important: We do not recommend using plaintext environment variables for sensitive
     * information, such as credential data.
     */
    environment?: pulumi.Input<KeyValuePair[]>;

    /**
     * A list of files containing the environment variables to pass to a container.
     * This parameter maps to the --env-file option to docker run.
     *
     * You can specify up to ten environment files. The file must have a .env file extension. Each line in
     * an environment file should contain an environment variable in VARIABLE=VALUE format. Lines beginning
     * with # are treated as comments and are ignored. For more information on the environment variable file
     * syntax, see [Declare default environment variables in file](https://docs.docker.com/compose/env-file/).
     *
     * If there are environment variables specified using the environment parameter in a container definition,
     * they take precedence over the variables contained within an environment file. If multiple environment
     * files are specified that contain the same variable, they are processed from the top down. It is
     * recommended to use unique variable names. For more information, see [Specifying Environment
     * Variables](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/taskdef-envfiles.html)
     * in the Amazon Elastic Container Service Developer Guide.
     */
    environmentFiles?: pulumi.Input<EnvironmentFile[]>;

    /**
     * If the essential parameter of a container is marked as true, and that container fails or
     * stops for any reason, all other containers that are part of the task are stopped. If the
     * essential parameter of a container is marked as false, then its failure does not affect the
     * rest of the containers in a task. If this parameter is omitted, a container is assumed to be
     * essential.
     *
     * All tasks must have at least one essential container. If you have an application that is
     * composed of multiple containers, you should group containers that are used for a common
     * purpose into components, and separate the different components into multiple task
     * definitions. For more information, see
     * [Application-Architecture](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/application_architecture.html)
     * in the Amazon Elastic Container Service Developer Guide.
     */
    essential?: pulumi.Input<boolean>;

    /**
     * A list of hostnames and IP address mappings to append to the /etc/hosts file on the
     * container.
     *
     * This parameter maps to `ExtraHosts` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--add-host` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     *
     * Note: This parameter is not supported for Windows containers or tasks that use the awsvpc
     * network mode.
     */
    extraHosts?: pulumi.Input<aws.ecs.HostEntry[]>;

    /**
     * The FireLens configuration for the container. This is used to specify and configure a log router for container
     * logs. For more information, see [Custom Route Logging](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html)
     * in the Amazon Elastic Container Service Developer Guide.
     */
    firelensConfiguration?: pulumi.Input<FirelensConfiguration>;

    /**
     * The health check command and associated configuration parameters for the container. This
     * parameter maps to `HealthCheck` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `HEALTHCHECK` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    healthCheck?: pulumi.Input<aws.ecs.HealthCheck>;

    /**
     * The hostname to use for your container. container.
     *
     * This parameter maps to `Hostname` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--hostname` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    hostname?: pulumi.Input<string>;

    /**
     * When this parameter is true, this allows you to deploy containerized applications that
     * require stdin or a tty to be allocated. This parameter maps to OpenStdin in the Create a
     * container section of the Docker Remote API and the --interactive option to docker run.
     */
    interactive?: pulumi.Input<boolean>;

    /**
     * The links parameter allows containers to communicate with each other without the need for
     * port mappings. This parameter is only supported if the network mode of a task definition is
     * bridge. The name:internalName construct is analogous to name:alias in Docker links. Up to 255
     * letters (uppercase and lowercase), numbers, and hyphens are allowed. For more information
     * about linking Docker containers, go to Legacy container links in the Docker documentation.
     *
     * This parameter maps to `Links` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--link` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     *
     * Note: This parameter is not supported for Windows containers.
     *
     * Important: Containers that are collocated on a single container instance may be able to
     * communicate with each other without requiring links or host port mappings. Network isolation
     * is achieved on the container instance using security groups and VPC settings.
     */
    links?: pulumi.Input<string[]>;

    /**
     * Linux-specific modifications that are applied to the container, such as Linux kernel
     * capabilities. For more information see
     * [KernelCapabilities](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KernelCapabilities.html).
     *
     */
    linuxParameters?: pulumi.Input<aws.ecs.LinuxParameters>;

    /**
     * The log configuration specification for the container. By default, containers use the same
     * logging driver that the Docker daemon uses. However the container may use a different logging
     * driver than the Docker daemon by specifying a log driver with this parameter in the container
     * definition. To use a different logging driver for a container, the log system must be
     * configured properly on the container instance (or on a different log server for remote
     * logging options). For more information on the options for different supported log drivers,
     * see [Configure-logging-drivers](https://docs.docker.com/engine/admin/logging/overview/) in
     * the Docker documentation.
     *
     * This parameter maps to `LogConfig` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--log-driver` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    logConfiguration?: pulumi.Input<aws.ecs.LogConfiguration>;

    /**
     * The amount (in MiB) of memory to present to the container. If your container attempts to
     * exceed the memory specified here, the container is killed. The total amount of memory
     * reserved for all containers within a task must be lower than the task memory value, if one is
     * specified.
     *
     * If using the Fargate launch type, this parameter is optional.
     *
     * If using the EC2 launch type, you must specify either a task-level memory value or a
     * container-level memory value. If you specify both a container-level memory and
     * memoryReservation value, memory must be greater than memoryReservation. If you specify
     * memoryReservation, then that value is subtracted from the available memory resources for the
     * container instance on which the container is placed. Otherwise, the value of memory is used.
     *
     * The Docker daemon reserves a minimum of 4 MiB of memory for a container, so you should not
     * specify fewer than 4 MiB of memory for your containers.
     *
     * This parameter maps to `Memory` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--memory` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    memory?: pulumi.Input<number>;

    /**
     * The soft limit (in MiB) of memory to reserve for the container. When system memory is under
     * heavy contention, Docker attempts to keep the container memory to this soft limit. However,
     * your container can consume more memory when it needs to, up to either the hard limit
     * specified with the memory parameter (if applicable), or all of the available memory on the
     * container instance, whichever comes first.
     *
     * If a task-level memory value is not specified, you must specify a non-zero integer for one or
     * both of memory or memoryReservation in a container definition. If you specify both, memory
     * must be greater than memoryReservation. If you specify memoryReservation, then that value is
     * subtracted from the available memory resources for the container instance on which the
     * container is placed. Otherwise, the value of memory is used.
     *
     * For example, if your container normally uses 128 MiB of memory, but occasionally bursts to
     * 256 MiB of memory for short periods of time, you can set a memoryReservation of 128 MiB, and
     * a memory hard limit of 300 MiB. This configuration would allow the container to only reserve
     * 128 MiB of memory from the remaining resources on the container instance, but also allow the
     * container to consume more memory resources when needed.
     *
     * The Docker daemon reserves a minimum of 4 MiB of memory for a container, so you should not
     * specify fewer than 4 MiB of memory for your containers.
     *
     * This parameter maps to `MemoryReservation` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--memory-reservation` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    memoryReservation?: pulumi.Input<number>;

    /**
     * The mount points for data volumes in your container.
     *
     * This parameter maps to `Volumes` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--volume` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    mountPoints?: pulumi.Input<aws.ecs.MountPoint[]>;

    /**
     * When this parameter is true, the container is given elevated privileges on the host container
     * instance (similar to the root user).
     *
     * This parameter maps to `Privileged` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--privileged` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     *
     * Note: This parameter is not supported for Windows containers or tasks using the Fargate
     * launch type.
     */
    privileged?: pulumi.Input<boolean>;

    /**
     * When this parameter is true, a TTY is allocated. This parameter maps to `Tty` in the [Create
     * a container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate) section of
     * the [Docker Remote API](https://docs.docker.com/engine/api/v1.35/) and the `--tty` option to
     * [docker run](https://docs.docker.com/engine/reference/run/).
     */
    pseudoTerminal?: pulumi.Input<boolean>;

    /**
     * When this parameter is true, the container is given read-only access to its root file system.
     *
     * This parameter maps to `ReadonlyRootfs` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--read-only` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     *
     * Note: This parameter is not supported for Windows containers.
     */
    readonlyRootFilesystem?: pulumi.Input<boolean>;

    /**
     * The private repository authentication credentials to use.
     */
    repositoryCredentials?: pulumi.Input<aws.ecs.RepositoryCredentials>;

    /**
     * The type and amount of a resource to assign to a container. The only supported resource is a
     * GPU.
     */
    resourceRequirements?: pulumi.Input<aws.ecs.ResourceRequirements[]>;

    /**
     * The secrets to pass to the container. For more information, see
     * [Specifying-Sensitive-Data](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html)
     * in the Amazon Elastic Container Service Developer Guide.
     */
    secrets?: pulumi.Input<aws.ecs.Secret[]>;

    /**
     * Time duration (in seconds) to wait before giving up on resolving dependencies for a
     * container. For example, you specify two containers in a task definition with containerA
     * having a dependency on containerB reaching a `COMPLETE`, `SUCCESS`, or `HEALTHY` status. If a
     * startTimeout value is specified for containerB and it does not reach the desired status
     * within that time then containerA will give up and not start. This results in the task
     * transitioning to a `STOPPED` state.
     *
     * For tasks using the EC2 launch type, the container instances require at least version 1.26.0
     * of the container agent to enable a container start timeout value. However, we recommend using
     * the latest container agent version. For information about checking your agent version and
     * updating to the latest version, see [Updating the Amazon ECS Container
     * Agent](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-update.html) in
     * the Amazon Elastic Container Service Developer Guide. If you are using an Amazon
     * ECS-optimized Linux AMI, your instance needs at least version 1.26.0-1 of the ecs-init
     * package. If your container instances are launched from version 20190301 or later, then they
     * contain the required versions of the container agent and ecs-init. For more information, see
     * [Amazon ECS-optimized Linux
     * AMI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html) in
     * the Amazon Elastic Container Service Developer Guide.
     *
     * For tasks using the Fargate launch type, the task or service requires platform version
     * `1.3.0` or later.
     */
    startTimeout?: pulumi.Input<number>;

    /**
     * Time duration (in seconds) to wait before the container is forcefully killed if it doesn't
     * exit normally on its own.
     *
     * For tasks using the Fargate launch type, the max `stopTimeout` value is 2 minutes and the
     * task or service requires platform version `1.3.0` or later.
     *
     * For tasks using the EC2 launch type, the stop timeout value for the container takes
     * precedence over the `ECS_CONTAINER_STOP_TIMEOUT` container agent configuration parameter, if
     * used. Container instances require at least version 1.26.0 of the container agent to enable a
     * container stop timeout value. However, we recommend using the latest container agent version.
     * For information about checking your agent version and updating to the latest version, see
     * [Updating the Amazon ECS Container
     * Agent](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-update.html) in
     * the Amazon Elastic Container Service Developer Guide. If you are using an Amazon
     * ECS-optimized Linux AMI, your instance needs at least version 1.26.0-1 of the ecs-init
     * package. If your container instances are launched from version 20190301 or later, then they
     * contain the required versions of the container agent and ecs-init. For more information, see
     * [Amazon ECS-optimized Linux
     * AMI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html) in
     * the Amazon Elastic Container Service Developer Guide.
     */
    stopTimeout?: pulumi.Input<number>;

    /**
     * A list of namespaced kernel parameters to set in the container. This parameter maps to
     * `Sysctls` in the [Create a
     * container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate) section of
     * the [Docker Remote API](https://docs.docker.com/engine/api/v1.35/) and the `--sysctl` option
     * to [`docker run`](https://docs.docker.com/engine/reference/run/).
     *
     * *Note*: It is not recommended that you specify network-related `systemControls` parameters
     * for multiple containers in a single task that also uses either the `awsvpc` or `host` network
     * modes. For tasks that use the `awsvpc` network mode, the container that is started last
     * determines which `systemControls` parameters take effect. For tasks that use the host network
     * mode, it changes the container instance's namespaced kernel parameters as well as the
     * containers.
     */
    systemControls?: pulumi.Input<aws.ecs.SystemControl[]>;

    /**
     * A list of ulimits to set in the container.
     *
     * This parameter requires version 1.18 of the Docker Remote API or greater on your container
     * instance. To check the Docker Remote API version on your container instance, log in to your
     * container instance and run the following command: sudo docker version --format
     * '{{.Server.APIVersion}}'
     *
     * This parameter maps to `Ulimits` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--ulimit` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     *
     * Note: This parameter is not supported for Windows containers.
     */
    ulimits?: pulumi.Input<aws.ecs.Ulimit[]>;

    /**
     * The user name to use inside the container.
     *
     * This parameter maps to `User` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--user` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    user?: pulumi.Input<string>;

    /**
     * Data volumes to mount from another container.
     *
     * This parameter maps to `VolumesFrom` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--volumes-from` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    volumesFrom?: pulumi.Input<aws.ecs.VolumeFrom[]>;

    /**
     * The working directory in which to run commands inside the container.
     *
     * This parameter maps to `WorkingDir` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--workdir` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    workingDirectory?: pulumi.Input<string>;

    // Changes made to core args type

    /**
     * The image id to use for the container.  If this is provided then the image with this idq will
     * be pulled from Docker Hub.  To provide customized image retrieval, provide [imageProvide]
     * which can do whatever custom work is necessary.  See [Image] for common ways to create an
     * image from a local docker build.
     */
    image: pulumi.Input<string> | ContainerImageProvider;

    /**
     * The list of port mappings for the container. Port mappings allow containers to access ports
     * on the host container instance to send or receive traffic.
     *
     * If this container will be run in an `ecs.Service` that will be hooked up to an
     * `lb.LoadBalancer` (either an ALB or NLB) the appropriate `lb.Listener` or `lb.TargetGroup`
     * can be passed in here instead and the port mapping will be computed from it.
     *
     * Alternatively, to simplify the common case of having to create load balancer listeners solely
     * for this purpose, the information listener can be provided directly in the container
     * definition using `applicationListener` or `networkListener`.  If those properties are
     * provided, then `portMappings` should not be provided.
     *
     * For task definitions that use the awsvpc network mode, you should only specify the
     * containerPort. The hostPort can be left blank or it must be the same value as the
     * containerPort.
     *
     * Port mappings on Windows use the NetNAT gateway address rather than localhost. There is no
     * loopback for port mappings on Windows, so you cannot access a container's mapped port from
     * the host itself.
     *
     * If the network mode of a task definition is set to none, then you can't specify port
     * mappings. If the network mode of a task definition is set to host, then host ports must
     * either be undefined or they must match the container port in the port mapping.
     *
     * This parameter maps to `PortBindings` in the
     * [Create-a-container](https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker-Remote-API](https://docs.docker.com/engine/api/v1.35/) and the
     * `--publish` parameter to [docker-run](https://docs.docker.com/engine/reference/run/).
     */
    portMappings?: (pulumi.Input<aws.ecs.PortMapping> | ContainerPortMappingProvider)[];

    /**
     * Alternative to passing in `portMappings`.  If a listener (or args to create a listener) is
     * passed in, it will be used instead.
     */
    applicationListener?: x.lb.ApplicationListener | x.lb.ApplicationListenerArgs;

    /**
     * Alternative to passing in `portMappings`.  If a listener (or args to create a listener) is
     * passed in, it will be used instead.
     */
    networkListener?: x.lb.NetworkListener | x.lb.NetworkListenerArgs;
}

export interface ContainerImageProvider {
    image(name: string, parent: pulumi.Resource): pulumi.Input<string>;
    environment(name: string, parent: pulumi.Resource): pulumi.Input<KeyValuePair[]>;
}

/** @internal */
export function isContainerImageProvider(obj: any): obj is ContainerImageProvider {
    return obj &&
        (<ContainerImageProvider>obj).image instanceof Function &&
        (<ContainerImageProvider>obj).environment instanceof Function;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteShape, Container>();
