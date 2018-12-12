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

import * as utils from "../../utils";

/** @internal */
export function computeContainerDefinition(
    parent: pulumi.Resource,
    name: string,
    containerName: string,
    container: Container,
    logGroup: aws.cloudwatch.LogGroup): pulumi.Output<aws.ecs.ContainerDefinition> {

    const containerImage = <ContainerImage>container.image;
    const stringImage = <pulumi.Input<string>>container.image;
    const image = containerImage.image
        ? containerImage.image(name, parent)
        : stringImage;

    let environment = container.environment;
    if (containerImage.environment) {
        environment = utils.combineArrays(
            environment, containerImage.environment(name, parent));
    }

    const portMappings = getPortMappings(container);

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

function getPortMappings(container: Container) {

    const containerPortMappings = <ContainerPortMappings>container.portMappings;
    const portMappings = containerPortMappings && containerPortMappings.portMappings
        ? containerPortMappings.portMappings()
        : <pulumi.Input<aws.ecs.PortMapping[]>>container.portMappings;

    return pulumi.output(portMappings)
                 .apply(mappings => convertMappings(mappings));
}

function convertMappings(mappings: aws.ecs.PortMapping[]) {
    if (!mappings) {
        return undefined;
    }

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

export interface ContainerLoadBalancer {
    containerPort: pulumi.Input<number>;
    elbName?: pulumi.Input<string>;
    targetGroupArn?: pulumi.Input<string>;
}

export interface ContainerPortMappings {
    portMappings(): pulumi.Input<pulumi.Input<aws.ecs.PortMapping>[]>;
    loadBalancers(): pulumi.Input<pulumi.Input<ContainerLoadBalancer>[]>;
}

export interface ContainerPortMapping {
    portMapping(): pulumi.Input<aws.ecs.PortMapping>;
    loadBalancer(): pulumi.Input<ContainerLoadBalancer>;
}

type WithoutUndefined<T> = T extends undefined ? never : T;

type MakeInputs<T> = {
    [P in keyof T]?: pulumi.Input<WithoutUndefined<T[P]>>;
};

// The shape we want for ContainerDefinitions.  We don't export this as 'Overwrite' types are not
// pleasant to work with. However, they internally allow us to succinctly express the shape we're
// trying to provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<MakeInputs<aws.ecs.ContainerDefinition>, {
    image: pulumi.Input<string> | ContainerImage;
    portMappings?: pulumi.Input<aws.ecs.PortMapping[]> | ContainerPortMappings;
}>;

export interface Container {
    // Properties from aws.ecs.ContainerDefinition
    command?: pulumi.Input<string[]>;
    cpu?: pulumi.Input<number>;
    disableNetworking?: pulumi.Input<boolean>;
    dnsSearchDomains?: pulumi.Input<string[]>;
    dnsServers?: pulumi.Input<string[]>;
    dockerLabels?: pulumi.Input<{ [label: string]: string; }>;
    dockerSecurityOptions?: pulumi.Input<string[]>;
    entryPoint?: pulumi.Input<string[]>;
    environment?: pulumi.Input<aws.ecs.KeyValuePair[]>;
    essential?: pulumi.Input<boolean>;
    extraHosts?: pulumi.Input<aws.ecs.HostEntry[]>;
    hostname?: pulumi.Input<string>;
    links?: pulumi.Input<string[]>;
    linuxParameters?: pulumi.Input<aws.ecs.LinuxParameters>;
    logConfiguration?: pulumi.Input<aws.ecs.LogConfiguration>;
    memory?: pulumi.Input<number>;
    memoryReservation?: pulumi.Input<number>;
    mountPoints?: pulumi.Input<aws.ecs.MountPoint[]>;
    privileged?: pulumi.Input<boolean>;
    readonlyRootFilesystem?: pulumi.Input<boolean>;
    ulimits?: pulumi.Input<aws.ecs.Ulimit[]>;
    user?: pulumi.Input<string>;
    volumesFrom?: pulumi.Input<aws.ecs.VolumeFrom[]>;
    workingDirectory?: pulumi.Input<string>;

    // Changes made to core args type

    /**
     * The image id to use for the container.  If this is provided then the image with this idq will
     * be pulled from Docker Hub.  To provide customized image retrieval, provide [imageProvide]
     * which can do whatever custom work is necessary.  See [Image] for common ways to create an
     * image from a local docker build.
     */
    image: pulumi.Input<string> | ContainerImage;

    portMappings?: pulumi.Input<aws.ecs.PortMapping[]> | ContainerPortMappings;
}

export interface ContainerImage {
    image(name: string, parent: pulumi.Resource): pulumi.Input<string>;
    environment(name: string, parent: pulumi.Resource): pulumi.Input<aws.ecs.KeyValuePair[]>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteShape, Container>();
