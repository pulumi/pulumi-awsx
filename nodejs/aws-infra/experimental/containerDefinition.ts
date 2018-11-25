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

import * as mod from ".";

import * as utils from "../utils";

export type WrappedEndpoints = Record<string, Record<number, pulumi.Output<aws.apigateway.x.Endpoint>>>;

/** @internal */
export function computeContainerDefinition(
    parent: pulumi.Resource,
    name: string,
    containerName: string,
    container: ContainerDefinition,
    logGroup: aws.cloudwatch.LogGroup): pulumi.Output<aws.ecs.ContainerDefinition> {

    if (container.image === undefined && container.imageProvider === undefined) {
        throw new Error("container requires either [image] or [imageProvider] to be set.");
    }

    const imageProvider = container.imageProvider;
    const loadBalancerProvider = container.loadBalancerProvider;

    let image = container.image;
    let environment = container.environment;
    let portMappings = container.portMappings;

    if (imageProvider) {
        image = imageProvider.image(name, parent);
        environment = utils.combineArrays(
            environment, imageProvider.environment(name, parent));
    }

    if (loadBalancerProvider) {
        portMappings = utils.combineArrays(
            portMappings, loadBalancerProvider.portMappings(containerName, name, parent));
    }

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

type WithoutUndefined<T> = T extends undefined ? never : T;

type MakeInputs<T> = {
    [P in keyof T]?: pulumi.Input<WithoutUndefined<T[P]>>;
};

// The shape we want for ContainerDefinitions.  We don't export this as 'Overwrite' types are not
// pleasant to work with. However, they internally allow us to succinctly express the shape we're
// trying to provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<MakeInputs<aws.ecs.ContainerDefinition>, {
    image?: pulumi.Input<string>
    imageProvider?: mod.IImageProvider;
    loadBalancerProvider?: mod.LoadBalancerProvider;
}>;

export interface ContainerDefinition {
    // Properties from aws.ecs.ContainerDefinition
    command?: pulumi.Input<string[]>;
    cpu?: pulumi.Input<number>;
    disableNetworking?: pulumi.Input<boolean>;
    dnsSearchDomains?: pulumi.Input<string[]>;
    dnsServers?: pulumi.Input<string[]>;
    dockerLabels?: pulumi.Input<{
        [label: string]: string;
    }>;
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
    portMappings?: pulumi.Input<aws.ecs.PortMapping[]>;
    privileged?: pulumi.Input<boolean>;
    readonlyRootFilesystem?: pulumi.Input<boolean>;
    ulimits?: pulumi.Input<aws.ecs.Ulimit[]>;
    user?: pulumi.Input<string>;
    volumesFrom?: pulumi.Input<aws.ecs.VolumeFrom[]>;
    workingDirectory?: pulumi.Input<string>;

    // Changes made to core args type

    /**
     * The image to use for the container.  If this is just a string, then the image will be pulled
     * from the Docker Hub.  To provide customized image retrieval, provide [imageProvider] which
     * can do whatever custom work is necessary and which should then update this
     * ContainerDefinition appropriately.  See [ImageProvider] for common ways to create an image
     * from a local docker build.
     */
    image?: pulumi.Input<string>;

    /**
     * Provider that can produce the [image] and [environment] properties for this definition on
     * demand.
     */
    imageProvider?: mod.IImageProvider;

    /**
     * Provider that can produce a load balancer for this container.
     */
    loadBalancerProvider?: mod.LoadBalancerProvider;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
let overwriteShape: OverwriteShape = undefined!;
let argsShape: ContainerDefinition = undefined!;
argsShape = overwriteShape;
overwriteShape = argsShape;
