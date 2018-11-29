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

import * as utils from "./../utils";

import * as mod from ".";

export class FargateTaskDefinition extends mod.TaskDefinition {
    constructor(name: string,
                args: mod.FargateTaskDefinitionArgs,
                opts?: pulumi.ComponentResourceOptions) {

        if (!args.container && !args.containers) {
            throw new Error("Either [container] or [containers] must be provided");
        }

        const containers = args.containers || { container: args.container! };

        const computedMemoryAndCPU = computeFargateMemoryAndCPU(containers);
        const computedMemory = computedMemoryAndCPU.apply(x => x.memory);
        const computedCPU = computedMemoryAndCPU.apply(x => x.cpu);

        const argsCopy: mod.TaskDefinitionArgs = {
            ...args,
            requiresCompatibilities: ["FARGATE"],
            networkMode: "awsvpc",
            memory: utils.ifUndefined(args.memory, computedMemory),
            cpu: utils.ifUndefined(args.cpu, computedCPU),
        };

        delete (<any>argsCopy).container;
        delete (<any>argsCopy).containers;

        super("aws-infra:x:FargateTaskDefinition", name, containers, /*isFargate:*/ true, argsCopy, opts);
    }

    /**
     * Creates a service with this as its task definition.
     */
    public createService(
            name: string, args: mod.FargateServiceArgs, opts?: pulumi.ResourceOptions) {
        if (args.taskDefinition) {
            throw new Error("[args.taskDefinition] should not be provided.");
        }

        if (args.taskDefinitionArgs) {
            throw new Error("[args.taskDefinitionArgs] should not be provided.");
        }

        return new mod.FargateService(name, {
            ...args,
            taskDefinition: this,
        }, opts || { parent: this });
    }
}

(<any>FargateTaskDefinition).doNotCapture = true;

function computeFargateMemoryAndCPU(containers: Record<string, mod.ContainerDefinition>) {
    return pulumi.output(containers).apply(containers => {
        // Sum the requested memory and CPU for each container in the task.
        let minTaskMemory = 0;
        let minTaskCPU = 0;
        for (const containerName of Object.keys(containers)) {
            const containerDef = containers[containerName];

            if (containerDef.memoryReservation) {
                minTaskMemory += containerDef.memoryReservation;
            } else if (containerDef.memory) {
                minTaskMemory += containerDef.memory;
            }

            if (containerDef.cpu) {
                minTaskCPU += containerDef.cpu;
            }
        }

        // Compute the smallest allowed Fargate memory value compatible with the requested minimum memory.
        let taskMemory: number;
        let taskMemoryString: string;
        if (minTaskMemory <= 512) {
            taskMemory = 512;
            taskMemoryString = "0.5GB";
        } else {
            const taskMemGB = minTaskMemory / 1024;
            const taskMemWholeGB = Math.ceil(taskMemGB);
            taskMemory = taskMemWholeGB * 1024;
            taskMemoryString = `${taskMemWholeGB}GB`;
        }

        // Allowed CPU values are powers of 2 between 256 and 4096.  We just ensure it's a power of 2 that is at least
        // 256. We leave the error case for requiring more CPU than is supported to ECS.
        let taskCPU = Math.pow(2, Math.ceil(Math.log2(Math.max(minTaskCPU, 256))));

        // Make sure we select an allowed CPU value for the specified memory.
        if (taskMemory > 16384) {
            taskCPU = Math.max(taskCPU, 4096);
        } else if (taskMemory > 8192) {
            taskCPU = Math.max(taskCPU, 2048);
        } else if (taskMemory > 4096) {
            taskCPU = Math.max(taskCPU, 1024);
        } else if (taskMemory > 2048) {
            taskCPU = Math.max(taskCPU, 512);
        }

        // Return the computed task memory and CPU values
        return {
            memory: taskMemoryString,
            cpu: `${taskCPU}`,
        };
    });
}

export class FargateService extends mod.ClusterService {
    constructor(name: string,
                args: FargateServiceArgs,
                opts?: pulumi.ResourceOptions) {

        if (!args.taskDefinition && !args.taskDefinitionArgs) {
            throw new Error("Either [taskDefinition] or [taskDefinitionArgs] must be provided");
        }

        const taskDefinition = args.taskDefinition ||
            new mod.FargateTaskDefinition(name, args.taskDefinitionArgs!, opts);

        const cluster = args.cluster;
        super("aws-infra:x:FargateService", name, {
            ...args,
            taskDefinition,
            launchType: "FARGATE",
            networkConfiguration: {
                assignPublicIp: !cluster.network.usePrivateSubnets,
                securityGroups: cluster.securityGroups.map(g => g.id),
                subnets: cluster.network.subnetIds,
            },
        },  /*isFargate:*/ true, opts);
    }
}

(<any>FargateService).doNotCapture = true;

type OverwriteTaskDefinitionArgs = utils.Overwrite<mod.TaskDefinitionArgs, {
    requiresCompatibilities?: never;
    networkMode?: never;
    container?: mod.ContainerDefinition;
    containers?: Record<string, mod.ContainerDefinition>;
}>;

export interface FargateTaskDefinitionArgs {
    // Properties copied from mod.TaskDefinitionArgs

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
     * Single container to make a ClusterTaskDefinition from.  Useful for simple cases where there
     * aren't multiple containers, especially when creating a ClusterTaskDefinition to call [run]
     * on.
     *
     * Either [container] or [containers] must be provided.
     */
    container?: mod.ContainerDefinition;

    /**
     * All the containers to make a ClusterTaskDefinition from.  Useful when creating a
     * ClusterService that will contain many containers within.
     *
     * Either [container] or [containers] must be provided.
     */
    containers?: Record<string, mod.ContainerDefinition>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
let overwriteShape1: OverwriteTaskDefinitionArgs = undefined!;
let argsShape1: FargateTaskDefinitionArgs = undefined!;
argsShape1 = overwriteShape1;
overwriteShape1 = argsShape1;

type OverwriteFargateServiceArgs = utils.Overwrite<mod.ClusterServiceArgs, {
    taskDefinition?: mod.FargateTaskDefinition;
    taskDefinitionArgs?: FargateTaskDefinitionArgs;
    launchType?: never;
}>;

export interface FargateServiceArgs {
    // Properties from mod.ServiceArgs

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
    loadBalancers?: aws.ecs.ServiceArgs["loadBalancers"];

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
    cluster: mod.Cluster;

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
    taskDefinition?: mod.FargateTaskDefinition;

    /**
     * The task definition to create the service from.  Either [taskDefinition] or
     * [taskDefinitionArgs] must be provided.
     */
    taskDefinitionArgs?: FargateTaskDefinitionArgs;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
let overwriteShape2: OverwriteFargateServiceArgs = undefined!;
let argsShape2: FargateServiceArgs = undefined!;
argsShape2 = overwriteShape2;
overwriteShape2 = argsShape2;
