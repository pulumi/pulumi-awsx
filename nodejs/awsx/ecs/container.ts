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

import * as utils from "../utils";

/** @internal */
export function computeContainerDefinition(
    parent: pulumi.Resource,
    name: string,
    containerName: string,
    container: Container,
    logGroup: aws.cloudwatch.LogGroup): pulumi.Output<aws.ecs.ContainerDefinition> {

    const image = isContainerImageProvider(container.image)
        ? container.image.image(name, parent)
        : container.image;

    const environment = isContainerImageProvider(container.image)
        ? utils.combineArrays(container.environment, container.image.environment(name, parent))
        : container.environment;

    const portMappings = getPortMappings(name, container, parent);

    return pulumi.all([container, logGroup.id, image, environment, portMappings])
                 .apply(([container, logGroupId, image, environment, portMappings]) => {
        const containerDefinition = {
            ...container,
            image,
            environment,
            portMappings,
            name: containerName,
            // todo(cyrusn): mount points.
            // mountPoints: (container.volumes || []).map(v => ({
            //     containerPath: v.containerPath,
            //     sourceVolume: (v.sourceVolume as Volume).getVolumeName(),
            // })),
            logConfiguration: container.logConfiguration || {
                logDriver: "awslogs",
                options: {
                    "awslogs-group": logGroupId,
                    "awslogs-region": aws.config.requireRegion(),
                    "awslogs-stream-prefix": containerName,
                },
            },
        };

        return containerDefinition;
    });
}

function getPortMappings(name: string, container: Container, parent: pulumi.Resource) {
    if (!container.portMappings) {
        return undefined;
    }

    const result: pulumi.Output<aws.ecs.PortMapping>[] = [];

    if (container.portMappings) {
        for (const obj of container.portMappings) {
            const portMapping = pulumi.output(isContainerPortMappingProvider(obj)
                ? obj.containerPortMapping(name, parent)
                : obj);
            result.push(pulumi.output(portMapping));
        }
    }

    return pulumi.all(result).apply(mappings => convertMappings(mappings));
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
    containerPortMapping(name: string, parent: pulumi.Resource): pulumi.Wrap<aws.ecs.PortMapping>;
}

export interface ContainerLoadBalancer {
    containerPort: number;
    elbName?: string;
    targetGroupArn?: string;
}

export interface ContainerLoadBalancerProvider {
    containerLoadBalancer(name: string, parent: pulumi.Resource): pulumi.Wrap<ContainerLoadBalancer>;
}

/** @internal */
export function isContainerPortMappingProvider(obj: any): obj is ContainerPortMappingProvider {
    return obj && !!(<ContainerPortMappingProvider>obj).containerPortMapping;
}

/** @internal */
export function isContainerLoadBalancerProvider(obj: any): obj is ContainerLoadBalancerProvider {
    return obj && !!(<ContainerLoadBalancerProvider>obj).containerLoadBalancer;
}

// The shape we want for ContainerDefinitions.  We don't export this as 'Overwrite' types are not
// pleasant to work with. However, they internally allow us to succinctly express the shape we're
// trying to provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<aws.ecs.ContainerDefinition, {
    name?: never;

    image: string | ContainerImageProvider;
    portMappings?: (aws.ecs.PortMapping | ContainerPortMappingProvider)[];
    environment?: aws.ecs.KeyValuePair[];
}>;

export interface Container {
    name?: never;

    // Properties from aws.ecs.ContainerDefinition
    command?: string[];
    cpu?: number;
    disableNetworking?: boolean;
    dnsSearchDomains?: string[];
    dnsServers?: string[];
    dockerLabels?: { [label: string]: string; };
    dockerSecurityOptions?: string[];
    entryPoint?: string[];
    environment?: aws.ecs.KeyValuePair[];
    essential?: boolean;
    extraHosts?: aws.ecs.HostEntry[];
    hostname?: string;
    links?: string[];
    linuxParameters?: aws.ecs.LinuxParameters;
    logConfiguration?: aws.ecs.LogConfiguration;
    memory?: number;
    memoryReservation?: number;
    mountPoints?: aws.ecs.MountPoint[];
    privileged?: boolean;
    readonlyRootFilesystem?: boolean;
    ulimits?: aws.ecs.Ulimit[];
    user?: string;
    volumesFrom?: aws.ecs.VolumeFrom[];
    workingDirectory?: string;

    // Changes made to core args type

    /**
     * The image id to use for the container.  If this is provided then the image with this idq will
     * be pulled from Docker Hub.  To provide customized image retrieval, provide [imageProvide]
     * which can do whatever custom work is necessary.  See [Image] for common ways to create an
     * image from a local docker build.
     */
    image: string | ContainerImageProvider;

    portMappings?: (aws.ecs.PortMapping | ContainerPortMappingProvider)[];
}

export interface ContainerImageProvider {
    image(name: string, parent: pulumi.Resource): pulumi.Wrap<string>;
    environment(name: string, parent: pulumi.Resource): pulumi.Wrap<aws.ecs.KeyValuePair[]>;
}

/** @internal */
export function isContainerImageProvider(obj: any): obj is ContainerImageProvider {
    return obj && !!(<ContainerImageProvider>obj).image && !!(<ContainerImageProvider>obj).environment;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteShape, Container>();
