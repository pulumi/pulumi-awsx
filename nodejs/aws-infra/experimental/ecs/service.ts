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

import * as utils from "./../../utils";

export abstract class Service extends pulumi.ComponentResource {
    public readonly service: aws.ecs.Service;
    public readonly cluster: ecs.Cluster;
    public readonly taskDefinition: ecs.TaskDefinition;

    constructor(type: string, name: string,
                args: ServiceArgs, isFargate: boolean,
                opts: pulumi.ComponentResourceOptions = {}) {
        super(type, name, args, opts);

        // If the cluster has any autoscaling groups, ensure the service depends on it being
        // created.
        const dependsOn: pulumi.Resource[] = [];
        dependsOn.push(...args.cluster.autoScalingGroups);

        const parentOpts = { parent: this, dependsOn };

        const loadBalancers = getLoadBalancers(this, name, args);

        this.cluster = args.cluster;
        this.service = new aws.ecs.Service(name, {
            ...args,
            loadBalancers,
            cluster: this.cluster.cluster.arn,
            taskDefinition: args.taskDefinition.taskDefinition.arn,
            desiredCount: utils.ifUndefined(args.desiredCount, 1),
            launchType: utils.ifUndefined(args.launchType, "EC2"),
            waitForSteadyState: utils.ifUndefined(args.waitForSteadyState, true),
        }, parentOpts);

        this.taskDefinition = args.taskDefinition;

        this.registerOutputs();
    }
}

function getLoadBalancers(service: ecs.Service, name: string, args: ServiceArgs) {
    // Get the initial set of load balancers if specified.
    let allLoadBalancers = x.ecs.isServiceLoadBalancers(args.loadBalancers)
        ? args.loadBalancers.serviceLoadBalancers()
        : <aws.ecs.ServiceArgs["loadBalancers"]>args.loadBalancers;

    // Now walk each container and see if it wants to add load balancer information as well.
    for (const containerName of Object.keys(args.taskDefinition.containers)) {
        const container = args.taskDefinition.containers[containerName];

        if (x.ecs.isContainerPortMappings(container.portMappings)) {
            // Containers don't know their own name.  So we add the name in here on their behalf.
            const computedLoadBalancers =
                pulumi.output(container.portMappings.containerLoadBalancers())
                      .apply(lbs => lbs.map(lb => ({ ...lb, containerName })));

            allLoadBalancers = utils.combineArrays(allLoadBalancers, computedLoadBalancers);
        }
    }

    return allLoadBalancers;
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

//     constructor(name: string, opts?: pulumi.ComponentResourceOptions) {
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

export interface ServiceLoadBalancers {
    serviceLoadBalancers(): aws.ecs.ServiceArgs["loadBalancers"];
}

/** @internal */
export function isServiceLoadBalancers(obj: any): obj is ServiceLoadBalancers {
    return obj && !!(<ServiceLoadBalancers>obj).serviceLoadBalancers;
}

// The shape we want for ClusterFileSystemArgs.  We don't export this as 'Overwrite' types are not pleasant to
// work with. However, they internally allow us to succinctly express the shape we're trying to
// provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<utils.Mutable<aws.ecs.ServiceArgs>, {
    cluster: ecs.Cluster;
    taskDefinition: ecs.TaskDefinition;
    desiredCount?: pulumi.Input<number>;
    launchType?: pulumi.Input<"EC2" | "FARGATE">;
    os?: pulumi.Input<"linux" | "windows">;
    waitForSteadyState?: pulumi.Input<boolean>;
    loadBalancers?: aws.ecs.ServiceArgs["loadBalancers"] | ServiceLoadBalancers;
}>;

export interface ServiceArgs {
    // Properties from aws.ecs.ServiceArgs

    /**
     * The upper limit (as a percentage of the service's desiredCount) of the number of running
     * tasks that can be running in a service during a deployment. Not valid when using the `DAEMON`
     * scheduling strategy.
     */
    deploymentMaximumPercent?: pulumi.Input<number>;

    /**
     * The lower limit (as a percentage of the service's desiredCount) of the number of running
     * tasks that must remain running and healthy in a service during a deployment.
     */
    deploymentMinimumHealthyPercent?: pulumi.Input<number>;

    /**
     * Seconds to ignore failing load balancer health checks on newly instantiated tasks to prevent
     * premature shutdown, up to 7200. Only valid for services configured to use load balancers.
     */
    healthCheckGracePeriodSeconds?: pulumi.Input<number>;

    /**
     * ARN of the IAM role that allows Amazon ECS to make calls to your load balancer on your
     * behalf. This parameter is required if you are using a load balancer with your service, but
     * only if your task definition does not use the `awsvpc` network mode. If using `awsvpc`
     * network mode, do not specify this role. If your account has already created the Amazon ECS
     * service-linked role, that role is used by default for your service unless you specify a role
     * here.
     */
    iamRole?: pulumi.Input<string>;

    /**
     * A load balancer block. Load balancers documented below.
     */
    loadBalancers?: aws.ecs.ServiceArgs["loadBalancers"] | ServiceLoadBalancers;

    /**
     * The name of the service (up to 255 letters, numbers, hyphens, and underscores)
     */
    name?: pulumi.Input<string>;

    /**
     * The network configuration for the service. This parameter is required for task definitions
     * that use the `awsvpc` network mode to receive their own Elastic Network Interface, and it is
     * not supported for other network modes.
     */
    networkConfiguration?: aws.ecs.ServiceArgs["networkConfiguration"];

    /**
     * Service level strategy rules that are taken into consideration during task placement. List
     * from top to bottom in order of precedence. The maximum number of `ordered_placement_strategy`
     * blocks is `5`. Defined below.
     */
    orderedPlacementStrategies?: aws.ecs.ServiceArgs["orderedPlacementStrategies"];

    /**
     * rules that are taken into consideration during task placement. Maximum number of
     * `placement_constraints` is `10`. Defined below.
     */
    placementConstraints?: aws.ecs.ServiceArgs["placementConstraints"];

    /**
     * **Deprecated**, use `ordered_placement_strategy` instead.
     */
    placementStrategies?: aws.ecs.ServiceArgs["placementStrategies"];

    /**
     * The scheduling strategy to use for the service. The valid values are `REPLICA` and `DAEMON`.
     * Defaults to `REPLICA`. Note that [*Fargate tasks do not support the `DAEMON` scheduling
     * strategy*](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/scheduling_tasks.html).
     */
    schedulingStrategy?: pulumi.Input<string>;

    /**
     * The service discovery registries for the service. The maximum number of `service_registries` blocks is `1`.
     */
    serviceRegistries?: aws.ecs.ServiceArgs["serviceRegistries"];

    // Changes we made to the core args type.

    /**
     * Cluster this service will run in.
     */
    cluster: ecs.Cluster;

    /**
     * The task definition to create the service from.
     */
    taskDefinition: ecs.TaskDefinition;

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

    /**
     * Wait for the service to reach a steady state (like [`aws ecs wait
     * services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html))
     * before continuing. Defaults to `true`.
     */
    waitForSteadyState?: pulumi.Input<boolean>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteShape, ServiceArgs>();
