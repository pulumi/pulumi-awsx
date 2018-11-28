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

import * as utils from "./../utils";

export abstract class ClusterService extends pulumi.ComponentResource {
    public readonly instance: aws.ecs.Service;
    public readonly clusterInstance: mod.Cluster;
    public readonly taskDefinitionInstance: mod.TaskDefinition;

    /**
     * Optional auto-scaling group for the cluster.
     */
    public readonly autoScalingGroup?: mod.ClusterAutoScalingGroup;

    constructor(type: string, name: string,
                args: ClusterServiceArgs, isFargate: boolean,
                opts: pulumi.ResourceOptions = {}) {
        super(type, name, args, opts);

        // If the cluster has an autoscaling group, ensure the service depends on it being created.
        // TODO(cyrusn): this isn't necessary if resource creation automatically makes 'deps' for
        // the opts passed in. Investigate.
        const dependsOn: pulumi.Resource[] = [];
        if (args.autoScalingGroup) {
            dependsOn.push(args.autoScalingGroup);
        }

        const parentOpts = { parent: this, dependsOn };

        const loadBalancers = getLoadBalancers(this, name, args);

        const clusterInstance = args.cluster;
        const instance = new aws.ecs.Service(name, {
            ...args,
            loadBalancers,
            cluster: clusterInstance.instance.arn,
            taskDefinition: args.taskDefinition.instance.arn,
            desiredCount: utils.ifUndefined(args.desiredCount, 1),
            launchType: utils.ifUndefined(args.launchType, "EC2"),
            waitForSteadyState: utils.ifUndefined(args.waitForSteadyState, true),
            placementConstraints: pulumi.output(args.os).apply(os => placementConstraints(isFargate, os)),
        }, parentOpts);

        const taskDefinitionInstance = args.taskDefinition;
        const autoScalingGroup = args.autoScalingGroup;

        this.instance = instance;
        this.clusterInstance = clusterInstance;
        this.taskDefinitionInstance = args.taskDefinition;
        this.autoScalingGroup = args.autoScalingGroup;

        this.registerOutputs({
            instance,
            clusterInstance,
            taskDefinitionInstance,
            autoScalingGroup,
        });
    }
}

(<any>ClusterService).doNotCapture = true;

function placementConstraints(isFargate: boolean, os: mod.HostOperatingSystem | undefined) {
    if (isFargate) {
        return [];
    }

    os = os || "linux";

    return [{
        type: "memberOf",
        expression: `attribute:ecs.os-type == ${os}`,
    }];
}

function getLoadBalancers(service: mod.ClusterService, name: string, args: ClusterServiceArgs) {
    let loadBalancers: mod.LoadBalancers;
    for (const containerName of Object.keys(args.taskDefinition.containers)) {
        const container = args.taskDefinition.containers[containerName];
        if (container.loadBalancerProvider) {
            loadBalancers = utils.combineArrays(
                loadBalancers, container.loadBalancerProvider.loadBalancers(containerName, name, service));
        }
    }

    return loadBalancers;
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

// The shape we want for ClusterFileSystemArgs.  We don't export this as 'Overwrite' types are not pleasant to
// work with. However, they internally allow us to succinctly express the shape we're trying to
// provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<utils.Mutable<aws.ecs.ServiceArgs>, {
    cluster: mod.Cluster;
    taskDefinition: mod.TaskDefinition;
    desiredCount?: pulumi.Input<number>;
    launchType?: pulumi.Input<"EC2" | "FARGATE">;
    os?: pulumi.Input<"linux" | "windows">;
    waitForSteadyState?: pulumi.Input<boolean>;
    autoScalingGroup?: mod.ClusterAutoScalingGroup;
}>;

export interface ClusterServiceArgs {
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
    loadBalancers?: pulumi.Input<pulumi.Input<{
        containerName: pulumi.Input<string>;
        containerPort: pulumi.Input<number>;
        elbName?: pulumi.Input<string>;
        targetGroupArn?: pulumi.Input<string>;
    }>[]>;
    /**
     * The name of the service (up to 255 letters, numbers, hyphens, and underscores)
     */
    name?: pulumi.Input<string>;
    /**
     * The network configuration for the service. This parameter is required for task definitions
     * that use the `awsvpc` network mode to receive their own Elastic Network Interface, and it is
     * not supported for other network modes.
     */
    networkConfiguration?: pulumi.Input<{
        assignPublicIp?: pulumi.Input<boolean>;
        securityGroups?: pulumi.Input<pulumi.Input<string>[]>;
        subnets: pulumi.Input<pulumi.Input<string>[]>;
    }>;
    /**
     * Service level strategy rules that are taken into consideration during task placement. List
     * from top to bottom in order of precedence. The maximum number of `ordered_placement_strategy`
     * blocks is `5`. Defined below.
     */
    orderedPlacementStrategies?: pulumi.Input<pulumi.Input<{
        field?: pulumi.Input<string>;
        type: pulumi.Input<string>;
    }>[]>;
    /**
     * rules that are taken into consideration during task placement. Maximum number of
     * `placement_constraints` is `10`. Defined below.
     */
    placementConstraints?: pulumi.Input<pulumi.Input<{
        expression?: pulumi.Input<string>;
        type: pulumi.Input<string>;
    }>[]>;
    /**
     * **Deprecated**, use `ordered_placement_strategy` instead.
     */
    placementStrategies?: pulumi.Input<pulumi.Input<{
        field?: pulumi.Input<string>;
        type: pulumi.Input<string>;
    }>[]>;
    /**
     * The scheduling strategy to use for the service. The valid values are `REPLICA` and `DAEMON`.
     * Defaults to `REPLICA`. Note that [*Fargate tasks do not support the `DAEMON` scheduling
     * strategy*](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/scheduling_tasks.html).
     */
    schedulingStrategy?: pulumi.Input<string>;
    /**
     * The service discovery registries for the service. The maximum number of `service_registries` blocks is `1`.
     */
    serviceRegistries?: pulumi.Input<{
        containerName?: pulumi.Input<string>;
        containerPort?: pulumi.Input<number>;
        port?: pulumi.Input<number>;
        registryArn: pulumi.Input<string>;
    }>;

    // Changes we made to the core args type.

    /**
     * Cluster this service will run in.
     */
    cluster: mod.Cluster;

    /**
     * The task definition to create the service from.
     */
    taskDefinition: mod.TaskDefinition;

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
     * Optional auto-scaling group for the cluster.
     */
    autoScalingGroup?: mod.ClusterAutoScalingGroup;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
let overwriteShape: OverwriteShape = undefined!;
let argsShape: ClusterServiceArgs = undefined!;
argsShape = overwriteShape;
overwriteShape = argsShape;
