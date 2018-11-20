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

import * as utils from "../utils";

import * as mod from ".";

export type FargateTaskDefinitionArgs = utils.Overwrite<mod.ClusterTaskDefinitionArgs, {
    /** Not provided.  Defaults automatically to ["FARGATE"] */
    requiresCompatibilities?: never;

    /** Not provided.  Defaults automatically to "awsvpc" */
    networkMode?: never;

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
}>;

export class FargateTaskDefinition extends mod.ClusterTaskDefinition {
    constructor(name: string, cluster: mod.Cluster,
                args: mod.FargateTaskDefinitionArgs,
                opts?: pulumi.ComponentResourceOptions) {

        if (!args.container && !args.containers) {
            throw new Error("Either [container] or [containers] must be provided");
        }

        const containers = args.containers || { container: args.container! };

        const computedMemoryAndCPU = computeFargateMemoryAndCPU(containers);
        const computedMemory = computedMemoryAndCPU.apply(x => x.memory);
        const computedCPU = computedMemoryAndCPU.apply(x => x.cpu);

        super(name, cluster, {
            ...args,
            containers,
            requiresCompatibilities: ["FARGATE"],
            networkMode: "awsvpc",
            memory: pulumi.output(args.memory).apply(memory => memory || computedMemory),
            cpu: pulumi.output(args.cpu).apply(cpu => cpu || computedCPU),
        }, /*isFargate:*/ false, opts);
    }

    /**
     * Creates a service with this as its task definition.
     */
    public createService(name: string, args: mod.FargateServiceArgs, opts?: pulumi.ResourceOptions) {
        if (args.taskDefinition) {
            throw new Error("[args.taskDefinition] should not be provided.");
        }

        if (args.taskDefinitionArgs) {
            throw new Error("[args.taskDefinitionArgs] should not be provided.");
        }

        return new mod.FargateService(name, this.cluster, {
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

export type FargateServiceArgs = utils.Overwrite<mod.ClusterServiceArgs, {
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

    /**
     * Not provided.  Will automatically be "FARGATE".
     */
    launchType?: never;
}>;

export class FargateService extends mod.ClusterService {
    constructor(name: string, cluster: mod.Cluster,
                args: FargateServiceArgs,
                opts?: pulumi.ResourceOptions) {

        if (!args.taskDefinition && !args.taskDefinitionArgs) {
            throw new Error("Either [taskDefinition] or [taskDefinitionArgs] must be provided");
        }

        const taskDefinition = args.taskDefinition ||
            new mod.FargateTaskDefinition(name, cluster, args.taskDefinitionArgs!, opts);

        super(name, cluster, {
            ...args,
            taskDefinition,
            launchType: "FARGATE",
            networkConfiguration: {
                assignPublicIp: !cluster.network.usePrivateSubnets,
                securityGroups: [cluster.instanceSecurityGroup.id],
                subnets: cluster.network.subnetIds,
            },
        },  /*isFargate:*/ true, opts);
    }
}

(<any>FargateService).doNotCapture = true;
