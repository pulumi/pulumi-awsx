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

export type EC2TaskDefinitionArgs = utils.Overwrite<mod.ClusterTaskDefinitionArgs, {
    /** Not provided.  Defaults automatically to ["EC2"] */
    requiresCompatibilities?: never;

    /**
     * Not provided for ec2 task definitions.
     */
    cpu?: never;
    /**
     * Not provided for ec2 task definitions.
     */
    memory?: never;

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

export class EC2TaskDefinition extends mod.ClusterTaskDefinition {
    constructor(name: string, cluster: mod.Cluster,
                args: EC2TaskDefinitionArgs,
                opts?: pulumi.ComponentResourceOptions) {
        if (!args.container && !args.containers) {
            throw new Error("Either [container] or [containers] must be provided");
        }

        const containers = args.containers || { container: args.container! };

        super(name, cluster, {
            ...args,
            containers,
            requiresCompatibilities: ["EC2"],
            networkMode: pulumi.output(args.networkMode).apply(m => m || "awsvpc"),
        }, /*isFargate:*/ false, opts);
    }

    /**
     * Creates a service with this as its task definition.
     */
    public createService(name: string, args: mod.EC2ServiceArgs, opts?: pulumi.ResourceOptions) {
        if (args.taskDefinition) {
            throw new Error("[args.taskDefinition] should not be provided.");
        }

        if (args.taskDefinitionArgs) {
            throw new Error("[args.taskDefinitionArgs] should not be provided.");
        }

        return new mod.EC2Service(name, this.cluster, {
            ...args,
            taskDefinition: this,
        }, opts || { parent: this });
    }
}

(<any>EC2TaskDefinition).doNotCapture = true;
(<any>EC2TaskDefinition.prototype.createService).doNotCapture = true;

export type EC2ServiceArgs = utils.Overwrite<mod.ClusterServiceArgs, {
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

    /**
     * Not provided.  Will automatically be "EC2".
     */
    launchType?: never;
}>;


export class EC2Service extends mod.ClusterService {
    public taskDefinitionInstance: EC2TaskDefinition;

    constructor(name: string, cluster: mod.Cluster,
                args: EC2ServiceArgs,
                opts?: pulumi.ResourceOptions) {

        if (!args.taskDefinition && !args.taskDefinitionArgs) {
            throw new Error("Either [taskDefinition] or [taskDefinitionArgs] must be provided");
        }

        const taskDefinition = args.taskDefinition ||
            new mod.EC2TaskDefinition(name, cluster, args.taskDefinitionArgs!, opts);

        super(name, cluster, {
            ...args,
            taskDefinition,
            launchType: "EC2",
            networkConfiguration: {
                assignPublicIp: false,
                securityGroups: [cluster.instanceSecurityGroup.id],
                subnets: cluster.network.subnetIds,
            },
        }, /*isFargate:*/ false, opts);

        this.taskDefinitionInstance = taskDefinition;
    }
}

(<any>EC2Service).doNotCapture = true;
