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
import { calculateFargateMemoryAndCPU } from "../ecsx/fargateMemoryAndCpu";
import * as utils from "../utils";

export class FargateTaskDefinition extends ecs.TaskDefinition {
    constructor(name: string,
                args: ecs.FargateTaskDefinitionArgs,
                opts: pulumi.ComponentResourceOptions = {}) {

        if (!args.container && !args.containers) {
            throw new Error("Either [container] or [containers] must be provided");
        }

        const containers = args.containers || { container: args.container! };

        const computedMemoryAndCPU = pulumi.output(Object.values(containers)).apply(calculateFargateMemoryAndCPU);
        const computedMemory = computedMemoryAndCPU.memory;
        const computedCPU = computedMemoryAndCPU.cpu;

        const argsCopy: ecs.TaskDefinitionArgs = {
            ...args,
            containers,
            requiresCompatibilities: ["FARGATE"],
            networkMode: "awsvpc",
            memory: utils.ifUndefined(args.memory, computedMemory),
            cpu: utils.ifUndefined(args.cpu, computedCPU),
        };

        delete (<any>argsCopy).container;

        super("awsx:x:ecs:FargateTaskDefinition", name, /*isFargate:*/ true, argsCopy, opts);

        this.registerOutputs();
    }

    /**
     * Creates a service with this as its task definition.
     */
    public createService(
        name: string, args: ecs.FargateServiceArgs, opts: pulumi.ComponentResourceOptions = {}) {
        if (args.taskDefinition) {
            throw new Error("[args.taskDefinition] should not be provided.");
        }

        if (args.taskDefinitionArgs) {
            throw new Error("[args.taskDefinitionArgs] should not be provided.");
        }

        return new ecs.FargateService(name, {
            ...args,
            taskDefinition: this,
        }, { parent: this, ...opts });
    }
}

export class FargateService extends ecs.Service {
    public readonly taskDefinition: FargateTaskDefinition;

    constructor(name: string,
                args: FargateServiceArgs,
                opts: pulumi.ComponentResourceOptions = {}) {

        if (!args.taskDefinition && !args.taskDefinitionArgs) {
            throw new Error("Either [taskDefinition] or [taskDefinitionArgs] must be provided");
        }

        const cluster = args.cluster || x.ecs.Cluster.getDefault();

        const taskDefinition = args.taskDefinition ||
            new ecs.FargateTaskDefinition(name, {
                ...args.taskDefinitionArgs,
                vpc: cluster.vpc,
            }, opts);

        const assignPublicIp = utils.ifUndefined(args.assignPublicIp, true);
        const securityGroups = x.ec2.getSecurityGroups(
            cluster.vpc, name, args.securityGroups || cluster.securityGroups, opts) || [];
        const subnets = getSubnets(cluster, args.subnets, assignPublicIp);

        super("awsx:x:ecs:FargateService", name, {
            ...args,
            taskDefinition,
            securityGroups,
            launchType: "FARGATE",
            networkConfiguration: {
                subnets,
                assignPublicIp,
                securityGroups: securityGroups.map(g => g.id),
            },
        }, opts);

        this.taskDefinition = taskDefinition;

        this.registerOutputs();
    }
}

/** @internal */
export function getSubnets(
        cluster: ecs.Cluster,
        subnets: pulumi.Input<pulumi.Input<string>[]> | undefined,
        assignPublicIp: pulumi.Output<boolean>) {

    return pulumi.all([cluster.vpc.publicSubnetIds, cluster.vpc.privateSubnetIds, subnets, assignPublicIp])
                 .apply(([publicSubnetIds, privateSubnetIds, subnets, assignPublicIp]) => {
        if (subnets) {
            return subnets;
        }

        return assignPublicIp ? publicSubnetIds : privateSubnetIds;
    });
}

type OverwriteFargateTaskDefinitionArgs = utils.Overwrite<ecs.TaskDefinitionArgs, {
    requiresCompatibilities?: never;
    networkMode?: never;
    container?: ecs.Container;
    containers?: Record<string, ecs.Container>;
}>;

export interface FargateTaskDefinitionArgs {
    // Properties copied from ecs.TaskDefinitionArgs

    /**
     * The vpc that the service for this task will run in.  Does not normally need to be explicitly
     * provided as it will be inferred from the cluster the service is associated with.
     */
    vpc?: x.ec2.Vpc;

    /**
     * A set of placement constraints rules that are taken into consideration during task placement.
     * Maximum number of `placement_constraints` is `10`.
     */
    placementConstraints?: aws.ecs.TaskDefinitionArgs["placementConstraints"];

    /**
     * The proxy configuration details for the App Mesh proxy.
     */
    proxyConfiguration?: aws.ecs.TaskDefinitionArgs["proxyConfiguration"];

    /**
     * A set of volume blocks that containers in your task may use.
     */
    volumes?: aws.ecs.TaskDefinitionArgs["volumes"];

    // Properties we've added/changed.

    /**
     * Log group for logging information related to the service.  If `undefined` a default instance
     * with a one-day retention policy will be created.  If `null` no log group will be created.
     */
    logGroup?: aws.cloudwatch.LogGroup | null;

    /**
     * IAM role that allows your Amazon ECS container task to make calls to other AWS services. If
     * `undefined`, a default will be created for the task.  If `null` no role will be created.
     */
    taskRole?: aws.iam.Role | null;

    /**
     * An optional family name for the Task Definition. If not specified, then a suitable default will be created.
     */
    family?: pulumi.Input<string>;

    /**
     * The execution role that the Amazon ECS container agent and the Docker daemon can assume.
     *
     *  If `undefined`, a default will be created for the task.  If `null` no role will be created.
     */
    executionRole?: aws.iam.Role | null;

    /**
     * The number of cpu units used by the task.  If not provided, a default will be computed
     * based on the cumulative needs specified by [containerDefinitions]
     */
    cpu?: pulumi.Input<string>;

    /**
     * The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
     * based on the cumulative needs specified by [containerDefinitions]
     */
    memory?: pulumi.Input<string>;

    /**
     * Single container to make a TaskDefinition from.  Useful for simple cases where there aren't
     * multiple containers, especially when creating a TaskDefinition to call [run] on.
     *
     * Either [container] or [containers] must be provided.
     */
    container?: ecs.Container;

    /**
     * All the containers to make a TaskDefinition from.  Useful when creating a Service that will
     * contain many containers within.
     *
     * Either [container] or [containers] must be provided.
     */
    containers?: Record<string, ecs.Container>;

    /**
     * Key-value mapping of resource tags
     */
    tags?: pulumi.Input<aws.Tags>;
}

type OverwriteFargateServiceArgs = utils.Overwrite<ecs.ServiceArgs, {
    taskDefinition?: ecs.FargateTaskDefinition;
    taskDefinitionArgs?: FargateTaskDefinitionArgs;
    launchType?: never;
    networkConfiguration?: never;
    capacityProviderStrategies?: never;
    orderedPlacementStrategies?: never;
    securityGroups?: x.ec2.SecurityGroupOrId[];
}>;

export interface FargateServiceArgs {
    // Properties from ecs.ServiceArgs

    /**
     * Configuration block for deployment circuit breaker.
     */
    deploymentCircuitBreaker?: aws.ecs.ServiceArgs["deploymentCircuitBreaker"];

    /**
     * Configuration block containing deployment controller configuration.
     */
    deploymentController?: aws.ecs.ServiceArgs["deploymentController"];

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
     * The number of instances of the task definition to place and keep running. Defaults to 1. Do
     * not specify if using the `DAEMON` scheduling strategy.
     */
    desiredCount?: pulumi.Input<number>;

    /**
     * Specifies whether to enable Amazon ECS managed tags for the tasks within the service.
     */
    enableEcsManagedTags?: pulumi.Input<boolean>;

    /**
     * Specifies whether to enable Amazon ECS Exec for the tasks within the service.
     */
     enableExecuteCommand?: pulumi.Input<boolean>;

    /**
     * Enable to force a new task deployment of the service. This can be used to update tasks to use a newer
     * Docker image with same image/tag combination (e.g. myimage:latest), roll Fargate tasks onto a newer platform
     * version, or immediately deploy orderedPlacementStrategies and placementConstraints updates.
     */
    forceNewDeployment?: pulumi.Input<boolean>;

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
     * Whether or not public IPs should be provided for the instances.
     *
     * Defaults to [true] if unspecified.
     */
    assignPublicIp?: pulumi.Input<boolean>;

    /**
     * The security groups to use for the instances.
     *
     * Defaults to [cluster.securityGroups] if unspecified.
     */
    securityGroups?: x.ec2.SecurityGroupOrId[];

    /**
     * The subnets to connect the instances to.  If unspecified and [assignPublicIp] is true, then
     * these will be the public subnets of the cluster's vpc.  If unspecified and [assignPublicIp]
     * is false, then these will be the private subnets of the cluster's vpc.
     */
    subnets?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * rules that are taken into consideration during task placement. Maximum number of
     * `placement_constraints` is `10`. Defined below.
     */
    placementConstraints?: aws.ecs.ServiceArgs["placementConstraints"];

    /**
     * The platform version on which to run your service. Only applicable for `launchType` set to `FARGATE`.
     * Defaults to `LATEST`. More information about Fargate platform versions can be found in the
     * [AWS ECS User Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/platform_versions.html).
     */
    platformVersion?: pulumi.Input<string>;

    /**
     * The scheduling strategy to use for the service. The valid values are `REPLICA` and `DAEMON`.
     * Defaults to `REPLICA`. Note that [*Fargate tasks do not support the `DAEMON` scheduling
     * strategy*](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/scheduling_tasks.html).
     */
    schedulingStrategy?: pulumi.Input<string>;

    /**
     * Specifies whether to propagate the tags from the task definition or the service
     * to the tasks. The valid values are `SERVICE` and `TASK_DEFINITION`.
     */
    propagateTags?: pulumi.Input<string>;

    /**
     * The service discovery registries for the service. The maximum number of `service_registries` blocks is `1`.
     */
    serviceRegistries?: aws.ecs.ServiceArgs["serviceRegistries"];

    // Changes we made to the core args type.

    /**
     * Cluster this service will run in.  If unspecified, [Cluster.getDefault()] will be used.
     */
    cluster?: ecs.Cluster;

    os?: pulumi.Input<"linux" | "windows">;

    /**
     * Wait for the service to reach a steady state (like [`aws ecs wait
     * services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html))
     * before continuing. Defaults to `true`.
     */
    waitForSteadyState?: pulumi.Input<boolean>;

    // Properties we're adding.

    /**
     * The task definition to create the service from.  Either [taskDefinition] or
     * [taskDefinitionArgs] must be provided.
     */
    taskDefinition?: ecs.FargateTaskDefinition;

    /**
     * The task definition to create the service from.  Either [taskDefinition] or
     * [taskDefinitionArgs] must be provided.
     */
    taskDefinitionArgs?: FargateTaskDefinitionArgs;

    /**
     * Key-value mapping of resource tags
     */
    tags?: pulumi.Input<aws.Tags>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteFargateTaskDefinitionArgs, FargateTaskDefinitionArgs>();
const test2: string = utils.checkCompat<OverwriteFargateServiceArgs, FargateServiceArgs>();
