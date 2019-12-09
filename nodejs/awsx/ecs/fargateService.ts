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

export class FargateTaskDefinition extends ecs.TaskDefinition {
    constructor(name: string,
                args: ecs.FargateTaskDefinitionArgs,
                opts: pulumi.ComponentResourceOptions = {}) {

        if (!args.container && !args.containers) {
            throw new Error("Either [container] or [containers] must be provided");
        }

        const containers = args.containers || { container: args.container! };

        const computedMemoryAndCPU = computeFargateMemoryAndCPU(containers);
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

/**
 * Gets the list of all supported fargate configs.  We'll compute the amount of memory/vcpu
 * needed by the containers and we'll return the cheapest fargate config that supplies at
 * least that much memory/vcpu.
 */
function * getAllFargateConfigs() {
    // from https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
    // Supported task CPU and memory values for Fargate tasks are as follows.

    // CPU value                    Memory value (MiB)

    // .25 vCPU                     0.5GB, 1GB, 2GB
    yield * makeFargateConfigs(.25, [.5, 1, 2]);

    // .5 vCPU                     1GB, 2GB, 3GB, 4GBs
    yield * makeFargateConfigs(.5, makeMemoryConfigs(1, 4));

    // 1 vCPU                     2GB, 3GB, 4GB, 5GB, 6GB, 7GB, 8GB
    yield * makeFargateConfigs(1, makeMemoryConfigs(2, 8));

    // 2 vCPU                     Between 4GB and 16GB in increments of 1GB
    yield * makeFargateConfigs(2, makeMemoryConfigs(4, 16));

    // 4 vCPU                     Between 8GB and 30GB in increments of 1GB
    yield * makeFargateConfigs(4, makeMemoryConfigs(8, 30));

    return;

    function * makeMemoryConfigs(low: number, high: number) {
        if (low < 1) {
            throw new Error(`Invalid low: ${low}`);
        }
        if (high > 30) {
            throw new Error(`Invalid high: ${high}`);
        }

        for (let i = low; i <= high; i++) {
            yield i;
        }
    }

    function * makeFargateConfigs(vcpu: number, memory: Iterable<number>) {
        if (vcpu < .25 || vcpu > 4) {
            throw new Error(`Invalid vcpu: ${vcpu}`);
        }

        for (const mem of memory) {
            yield { vcpu, memGB: mem, cost: 0.04048 * vcpu + 0.004445 * mem };
        }
    }
}

function computeFargateMemoryAndCPU(containers: Record<string, ecs.Container>) {
    return pulumi.output(containers).apply(containers => {
        // First, determine how much VCPU/GB that the user is asking for in their containers.
        let { requestedVCPU, requestedGB } = getRequestedVCPUandMemory();

        // Max CPU that can be requested is only 4.  Don't exceed that.  No need to worry about a
        // min as we're finding the first config that provides *at least* this amount.
        requestedVCPU = Math.min(requestedVCPU, 4);

        // Max memory that can be requested is only 30.  Don't exceed that.  No need to worry about
        // a min as we're finding the first config that provides *at least* this amount.
        requestedGB = Math.min(requestedGB, 30);

        // Get all configs that can at least satisfy this pair of cpu/memory needs.
        const configs = [...getAllFargateConfigs()];
        const validConfigs = configs.filter(c => c.vcpu >= requestedVCPU && c.memGB >= requestedGB);

        if (validConfigs.length === 0) {
            throw new Error(`Could not find fargate config that could satisfy: ${requestedVCPU} vCPU and ${requestedGB}GB.`);
        }

        // Now, find the cheapest config that satisfies both mem and cpu.
        const sorted = validConfigs.sort((c1, c2) => c1.cost - c2.cost);
        const config = sorted[0];

        // Want to return docker CPU units, not vCPU values. From AWS:
        //
        // You can determine the number of CPU units that are available per Amazon EC2 instance type by multiplying the
        // number of vCPUs listed for that instance type on the Amazon EC2 Instances detail page by 1,024.
        //
        // We return `memory` in MB units because that appears to be how AWS normalized these internally so this avoids
        // refresh issues.
        return { memory: `${config.memGB * 1024}`, cpu: `${config.vcpu * 1024}` };

        // local functions.
        function getRequestedVCPUandMemory() {
            // Sum the requested memory and CPU for each container in the task.
            //
            // Memory is in MB, and CPU values are in CPU shares.

            let minTaskMemoryMB = 0;
            let minTaskCPUUnits = 0;
            for (const containerName of Object.keys(containers)) {
                const containerDef = containers[containerName];

                if (containerDef.memoryReservation) {
                    minTaskMemoryMB += containerDef.memoryReservation;
                } else if (containerDef.memory) {
                    minTaskMemoryMB += containerDef.memory;
                }

                if (containerDef.cpu) {
                    minTaskCPUUnits += containerDef.cpu;
                }
            }

            // Convert docker cpu units values into vcpu values.  i.e. 256->.25, 4096->4.
            const requestedVCPU = minTaskCPUUnits / 1024;

            // Convert memory into GB values.  i.e. 2048MB -> 2GB.
            const requestedGB = minTaskMemoryMB / 1024;

            return { requestedVCPU, requestedGB };
        }
    });
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

function getSubnets(
        cluster: ecs.Cluster,
        subnets: pulumi.Input<pulumi.Input<string>[]> | undefined,
        assignPublicIp: pulumi.Output<boolean>) {

    return pulumi.all([cluster.vpc, subnets, assignPublicIp])
                 .apply(([vpc, subnets, assignPublicIp]) => {
        if (subnets) {
            return subnets;
        }

        return assignPublicIp ? vpc.publicSubnetIds : vpc.privateSubnetIds;
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
    vpc?: pulumi.Input<x.ec2.Vpc | undefined>;

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
     * Log group for logging information related to the service.  If `undefined` a default instance
     * with a one-day retention policy will be created.  If `null` no log group will be created.
     */
    logGroup?: aws.cloudwatch.LogGroup;

    /**
     * IAM role that allows your Amazon ECS container task to make calls to other AWS services. If
     * `undefined`, a default will be created for the task.  If `null` no role will be created.
     */
    taskRole?: aws.iam.Role;

    /**
     * An optional family name for the Task Definition. If not specified, then a suitable default will be created.
     */
    family?: pulumi.Input<string>;

    /**
     * The execution role that the Amazon ECS container agent and the Docker daemon can assume.
     *
     *  If `undefined`, a default will be created for the task.  If `null` no role will be created.
     */
    executionRole?: aws.iam.Role;

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
    securityGroups?: x.ec2.SecurityGroupOrId[];
}>;

export interface FargateServiceArgs {
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

    // Changes we made to the core args type.

    /**
     * Cluster this service will run in.  If unspecified, [Cluster.getDefault()] will be used.
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
