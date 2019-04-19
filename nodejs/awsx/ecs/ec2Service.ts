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
import * as utils from "./../utils";

export class EC2TaskDefinition extends ecs.TaskDefinition {
    constructor(name: string,
                args: EC2TaskDefinitionArgs,
                opts?: pulumi.ComponentResourceOptions) {
        if (!args.container && !args.containers) {
            throw new Error("Either [container] or [containers] must be provided");
        }

        const containers = args.containers || { container: args.container! };

        const argsCopy: ecs.TaskDefinitionArgs = {
            ...args,
            containers,
            requiresCompatibilities: ["EC2"],
            networkMode: utils.ifUndefined(args.networkMode, "awsvpc"),
        };

        delete (<any>argsCopy).container;

        super("awsx:x:ecs:EC2TaskDefinition", name, /*isFargate:*/ false, argsCopy, opts);

        this.registerOutputs();
    }

    /**
     * Creates a service with this as its task definition.
     */
    public createService(name: string, args: ecs.EC2ServiceArgs, opts: pulumi.ComponentResourceOptions = {}) {
        if (args.taskDefinition) {
            throw new Error("[args.taskDefinition] should not be provided.");
        }

        if (args.taskDefinitionArgs) {
            throw new Error("[args.taskDefinitionArgs] should not be provided.");
        }

        return new ecs.EC2Service(name, {
            ...args,
            taskDefinition: this,
        }, { parent: this, ...opts });
    }
}

export class EC2Service extends ecs.Service {
    public readonly taskDefinition: EC2TaskDefinition;

    constructor(name: string,
                args: EC2ServiceArgs,
                opts?: pulumi.ComponentResourceOptions) {

        if (!args.taskDefinition && !args.taskDefinitionArgs) {
            throw new Error("Either [taskDefinition] or [taskDefinitionArgs] must be provided");
        }

        const taskDefinition = args.taskDefinition ||
            new ecs.EC2TaskDefinition(name, args.taskDefinitionArgs!, opts);

        const cluster = args.cluster || x.ecs.Cluster.getDefault();
        const securityGroups = x.ec2.getSecurityGroups(
            cluster.vpc, name, args.securityGroups || cluster.securityGroups, opts) || [];
        const subnets = args.subnets || cluster.vpc.publicSubnetIds;

        super("awsx:x:ecs:EC2Service", name, {
            ...args,
            taskDefinition,
            securityGroups,
            launchType: "EC2",
            networkConfiguration: taskDefinition.taskDefinition.networkMode.apply(n => {
                // The network configuration for the service. This parameter is required for task
                // definitions that use the `awsvpc` network mode to receive their own Elastic
                // Network Interface, and it is not supported for other network modes.
                if (n !== "awsvpc") {
                    return undefined!;
                }

                return {
                    subnets,
                    assignPublicIp: false,
                    securityGroups: securityGroups.map(g => g.id),
                };
            }),
        }, /*isFargate:*/ false, opts);

        this.registerOutputs();
    }
}

type OverwriteEC2TaskDefinitionArgs = utils.Overwrite<ecs.TaskDefinitionArgs, {
    requiresCompatibilities?: never;
    cpu?: never;
    memory?: never;
    container?: ecs.Container;
    containers?: Record<string, ecs.Container>;
}>;

export interface EC2TaskDefinitionArgs {
    // Properties from ecs.TaskDefinitionArgs

    /**
     * A set of placement constraints rules that are taken into consideration during task placement.
     * Maximum number of `placement_constraints` is `10`.
     */
    placementConstraints?: aws.ecs.TaskDefinitionArgs["placementConstraints"];

    /**
     * A set of volume blocks that containers in your task may use.
     */
    volumes?: aws.ecs.TaskDefinitionArgs["volumes"];

    // Properties we've added/changed.

    /**
     * Log group for logging information related to the service.  If not provided a default instance
     * with a one-day retention policy will be created.
     */
    logGroup?: aws.cloudwatch.LogGroup;

    /**
     * IAM role that allows your Amazon ECS container task to make calls to other AWS services.
     * If not provided, a default will be created for the task.
     */
    taskRole?: aws.iam.Role;

    /**
     * The execution role that the Amazon ECS container agent and the Docker daemon can assume.
     *
     * If not provided, a default will be created for the task.
     */
    executionRole?: aws.iam.Role;

    /**
     * The Docker networking mode to use for the containers in the task. The valid values are
     * `none`, `bridge`, `awsvpc`, and `host`.
     */
    networkMode?: pulumi.Input<"none" | "bridge" | "awsvpc" | "host">;

    // Properties we're adding.

    /**
     * Single container to make a TaskDefinition from.  Useful for simple cases where there aren't
     * multiple containers, especially when creating a TaskDefinition to call [run] on.
     *
     * Either [container] or [containers] must be provided.
     */
    container?: ecs.Container;

    /**
     * All the containers to make a TaskDefinition from.  Useful when creating a
     * Service that will contain many containers within.
     *
     * Either [container] or [containers] must be provided.
     */
    containers?: Record<string, ecs.Container>;
}

type OverwriteEC2ServiceArgs = utils.Overwrite<ecs.ServiceArgs, {
    taskDefinition?: EC2TaskDefinition;
    taskDefinitionArgs?: EC2TaskDefinitionArgs;
    launchType?: never;
    networkConfiguration?: never;
    securityGroups?: x.ec2.SecurityGroupOrId[];
}>;

export interface EC2ServiceArgs {
    // Properties from ecs.ServiceArgs

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
    loadBalancers?: (pulumi.Input<x.ecs.ServiceLoadBalancer> | x.ecs.ServiceLoadBalancerProvider)[];

    /**
     * The name of the service (up to 255 letters, numbers, hyphens, and underscores)
     */
    name?: pulumi.Input<string>;

    /**
     * The security groups to use for the instances.
     *
     * Defaults to [cluster.securityGroups] if unspecified.
     */
    securityGroups?: x.ec2.SecurityGroupOrId[];

    /**
     * The subnets to connect the instances to.  If unspecified then these will be the public
     * subnets of the cluster's vpc.
     */
    subnets?: pulumi.Input<pulumi.Input<string>[]>;

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
     * The scheduling strategy to use for the service. The valid values are `REPLICA` and `DAEMON`.
     * Defaults to `REPLICA`. Note that [*Fargate tasks do not support the `DAEMON` scheduling
     * strategy*](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/scheduling_tasks.html).
     */
    schedulingStrategy?: pulumi.Input<string>;

    /**
     * The service discovery registries for the service. The maximum number of `service_registries` blocks is `1`.
     */
    serviceRegistries?: aws.ecs.ServiceArgs["serviceRegistries"];

    /**
     * Cluster this service will run in.
     */
    cluster?: ecs.Cluster;

    /**
     * The number of instances of the task definition to place and keep running. Defaults to 1. Do
     * not specify if using the `DAEMON` scheduling strategy.
     */
    desiredCount?: pulumi.Input<number>;

    os?: pulumi.Input<"linux" | "windows">;

    /**
     * Wait for the service to reach a steady state (like [`aws ecs wait
     * services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html))
     * before continuing. Defaults to `true`.
     */
    waitForSteadyState?: pulumi.Input<boolean>;

    // Properties we add.

    /**
     * The task definition to create the service from.  Either [taskDefinition] or
     * [taskDefinitionArgs] must be provided.
     */
    taskDefinition?: EC2TaskDefinition;

    /**
     * The task definition to create the service from.  Either [taskDefinition] or
     * [taskDefinitionArgs] must be provided.
     */
    taskDefinitionArgs?: EC2TaskDefinitionArgs;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteEC2TaskDefinitionArgs, EC2TaskDefinitionArgs>();
const test2: string = utils.checkCompat<OverwriteEC2ServiceArgs, EC2ServiceArgs>();
