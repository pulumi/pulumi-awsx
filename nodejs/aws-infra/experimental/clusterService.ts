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

import * as module from ".";

import * as docker from "@pulumi/docker";
import * as utils from "./../utils";

export type ClusterServiceArgs = utils.Overwrite<aws.ecs.ServiceArgs, {
    /**
     * The task definition to create the service from.
     */
    taskDefinition: module.ClusterTaskDefinition;

    /**
     * The number of instances of the task definition to place and keep running. Defaults to 1. Do
     * not specify if using the `DAEMON` scheduling strategy.
     */
    desiredCount?: pulumi.Input<number>;

    /**
     * The launch type on which to run your service. The valid values are `EC2` and `FARGATE`.
     * Defaults to `EC2`.
     */
    launchType?: pulumi.Input<"EC2" | "FARGATE">;

    os?: pulumi.Input<"linux" | "windows">;

    /**
     * Wait for the service to reach a steady state (like [`aws ecs wait
     * services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html))
     * before continuing. Defaults to `true`.
     */
    waitForSteadyState?: pulumi.Input<boolean>;

    /**
     * Optional auto-scaling group for the cluster.  Can be created with
     * [cluster.createAutoScalingGroup]
     */
    autoScalingGroup?: module.ClusterAutoScalingGroup;
}>;

export interface Endpoint {
    hostname: string;
    port: number;
}

/**
 * A mapping from a container name and it's exposed port, to the hostname/port it can be reached at.
 */
export interface Endpoints {
    [containerName: string]: { [port: number]: Endpoint; };
}

export class ClusterService extends aws.ecs.Service {
    public readonly clusterInstance: module.Cluster;
    public readonly taskDefinitionInstance: module.ClusterTaskDefinition;

    public readonly endpoints: pulumi.Output<Endpoints>;
    public readonly defaultEndpoint: pulumi.Output<Endpoint>;

    public readonly getEndpoint: (containerName?: string, containerPort?: number) => Promise<Endpoint>;

    constructor(name: string, cluster: module.Cluster,
                args: ClusterServiceArgs,
                opts: pulumi.ResourceOptions = {}) {

        const loadBalancers = createLoadBalancers(args.taskDefinition);

        const serviceArgs: aws.ecs.ServiceArgs = {
            ...args,
            cluster: cluster.arn,
            taskDefinition: args.taskDefinition.arn,
            loadBalancers: loadBalancers,
            desiredCount: pulumi.output(args.desiredCount).apply(c => c === undefined ? 1 : c),
            launchType: pulumi.output(args.launchType).apply(t => t || "EC2"),
            waitForSteadyState: pulumi.output(args.waitForSteadyState).apply(w => w !== undefined ? w : true),
            placementConstraints: pulumi.output(args.os).apply(os => module.placementConstraintsForHost(os)),
        };

        // If the cluster has an autoscaling group, ensure the service depends on it being created.
        // TODO(cyrusn): this isn't necessary if resource creation automatically makes 'deps' for
        // the opts passed in. Investigate.
        if (args.autoScalingGroup) {
            const dependsOn = opts.dependsOn
                ? Array.isArray(opts.dependsOn) ? opts.dependsOn : [opts.dependsOn]
                : [];

            dependsOn.push(args.autoScalingGroup);
            opts.dependsOn = dependsOn;
        }

        super(name, serviceArgs, opts);

        this.clusterInstance = cluster;
        this.taskDefinitionInstance = args.taskDefinition;
    }
}

function createLoadBalancers(
        taskDefinition: module.ClusterTaskDefinition): aws.ecs.ServiceArgs["loadBalancers"] {
    const exposedPort = taskDefinition.exposedPort;
    if (!exposedPort) {
        return [];
    }

    const loadBalancerPort = exposedPort.loadBalancerPort;
    return [{
        containerName: exposedPort.containerName,
        containerPort: loadBalancerPort.targetPort || loadBalancerPort.port,
        targetGroupArn: exposedPort.loadBalancer.targetGroup.arn,
    }];
}


// const volumeNames = new Set<string>();

// export interface Volume extends cloud.Volume {
//     getVolumeName(): any;
//     getHostPath(): any;
// }

// // _Note_: In the current EFS-backed model, a Volume is purely virtual - it
// // doesn't actually manage any underlying resource.  It is used just to provide
// // a handle to a folder on the EFS share which can be mounted by container(s).
// // On platforms like ACI, we may be able to actually provision a unique File
// // Share per Volume to keep these independently manageable.  For now, on AWS
// // though, we rely on this File Share having been set up as part of the ECS
// // Cluster outside of @pulumi/cloud, and assume that that data has a lifetime
// // longer than any individual deployment.
// export class SharedVolume extends pulumi.ComponentResource implements Volume, cloud.SharedVolume {
//     public readonly kind: cloud.VolumeKind;
//     public readonly name: string;

//     constructor(name: string, opts?: pulumi.ResourceOptions) {
//         if (volumeNames.has(name)) {
//             throw new Error("Must provide a unique volume name");
//         }
//         super("cloud:volume:Volume", name, {}, opts);
//         this.kind = "SharedVolume";
//         this.name = name;
//         volumeNames.add(name);
//     }

//     getVolumeName() {
//         // Ensure this is unique to avoid conflicts both in EFS and in the
//         // TaskDefinition we pass to ECS.
//         return utils.sha1hash(`${pulumi.getProject()}:${pulumi.getStack()}:${this.kind}:${this.name}`);
//     }

//     getHostPath() {
//         const cluster = getCluster();
//         if (!cluster || !cluster.efsMountPath) {
//             throw new Error(
//                 "Cannot use 'Volume'.  Configured cluster does not support EFS.",
//             );
//         }
//         // Include the unique `getVolumeName` in the EFS host path to ensure this doesn't
//         // clash with other deployments.
//         return `${cluster.efsMountPath}/${this.name}_${this.getVolumeName()}`;
//     }
// }

// export class HostPathVolume implements cloud.HostPathVolume {
//     public readonly kind: cloud.VolumeKind;
//     public readonly path: string;

//     constructor(path: string) {
//         this.kind = "HostPathVolume";
//         this.path = path;
//     }

//     getVolumeName() {
//         return utils.sha1hash(`${this.kind}:${this.path}`);
//     }

//     getHostPath() {
//         return this.path;
//     }
// }

