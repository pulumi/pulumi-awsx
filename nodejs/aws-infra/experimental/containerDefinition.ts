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

import { MakeInputs, Overwrite, sha1hash } from "../utils";
import { ClusterLoadBalancerPort } from "./clusterLoadBalancer";

export type ContainerDefinition = Overwrite<MakeInputs<aws.ecs.ContainerDefinition>, {
    /**
     * The image to use for the container.  If this is just a string, then the image will be pulled
     * from the Docker Hub.  To provide customized image retrieval, provide [imageProvider] which
     * can do whatever custom work is necessary and which should then update this
     * ContainerDefinition appropriately.  See [ImageProvider] for common ways to create an image
     * from a local docker build.
     */
    image?: pulumi.Input<string>

    imageProvider?: mod.IImageProvider;

    /**
     * Provider that can produce a load balancer for this container.
     */
    loadBalancerProvider?: mod.LoadBalancerProvider;

    // /**
    //  * The port information to create a load balancer for.  At most one container in a service
    //  * can have this set.  Should not be set for containers intended for TaskDeinitions that will
    //  * just be run, and will not be part of an aws.ecs.Service.
    //  */
    // loadBalancerPort?: mod.ClusterLoadBalancerPort;
}>;

export type WrappedEndpoints = Record<string, Record<number, pulumi.Output<aws.apigateway.x.Endpoint>>>;

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

    if (imageProvider) {
        container.image = imageProvider.image(name, parent);
        container.environment = combineEnvironments(
            container.environment, imageProvider.environment(name, parent));
    }

    if (loadBalancerProvider) {
        container.portMappings = combinePortMappings(
            container.portMappings, loadBalancerProvider.portMappings(containerName, name, parent));
    }

    return pulumi.all([container, logGroup.id])
                 .apply(([container, logGroupId]) => {
        const containerDefinition = {
            ...container,
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

function getPortMappings(loadBalancerPort: ClusterLoadBalancerPort | undefined) {
    if (loadBalancerPort === undefined) {
        return [];
    }

    const port = loadBalancerPort.targetPort || loadBalancerPort.port;
    return [{
        containerPort: port,
        // From https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html:
        // > For task definitions that use the awsvpc network mode, you should only specify the containerPort.
        // > The hostPort can be left blank or it must be the same value as the containerPort.
        //
        // However, if left blank, it will be automatically populated by AWS, potentially leading to dirty
        // diffs even when no changes have been made. Since we are currently always using `awsvpc` mode, we
        // go ahead and populate it with the same value as `containerPort`.
        //
        // See https://github.com/terraform-providers/terraform-provider-aws/issues/3401.
        hostPort: port,
    }];
}

function combineEnvironments(
        e1: pulumi.Input<aws.ecs.KeyValuePair[] | undefined>,
        e2: pulumi.Input<aws.ecs.KeyValuePair[] | undefined>): pulumi.Output<aws.ecs.KeyValuePair[]> {
    return pulumi.all([e1, e2]).apply(([e1, e2]) => {
        e1 = e1 || [];
        e2 = e2 || [];
        return [...e1, ...e2];
    });
}

function combinePortMappings(
        e1: pulumi.Input<aws.ecs.PortMapping[] | undefined>,
        e2: pulumi.Input<aws.ecs.PortMapping[] | undefined>): pulumi.Output<aws.ecs.PortMapping[]> {
    return pulumi.all([e1, e2]).apply(([e1, e2]) => {
        e1 = e1 || [];
        e2 = e2 || [];
        return [...e1, ...e2];
    });
}
