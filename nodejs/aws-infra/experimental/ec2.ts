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

import * as module from ".";

export type EC2TaskDefinitionArgs = utils.Overwrite<module.ClusterTaskDefinitionArgs, {
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
    container?: module.ContainerDefinition;
}>;

export class EC2TaskDefinition extends module.ClusterTaskDefinition {
    protected isFargate: () => false;

    constructor(name: string, cluster: module.Cluster,
                args: EC2TaskDefinitionArgs,
                opts?: pulumi.ComponentResourceOptions) {
        if (!args.container && !args.containers) {
            throw new Error("Either [container] or [containers] must be provided");
        }

        const containers = args.containers || { container: args.container! };

        const baseArgs: module.ClusterTaskDefinitionArgs = {
            ...args,
            containers,
            requiresCompatibilities: ["EC2"],
            networkMode: pulumi.output(args.networkMode).apply(m => m || "awsvpc"),
        };

        super(name, cluster, baseArgs, opts);
    }

    /**
     * Creates a service with this as its task definition.
     */
    public createService(name: string, args: module.EC2ServiceArgs, opts?: pulumi.ResourceOptions) {
        return new module.EC2Service(name, this.cluster, {
            ...args,
            taskDefinition: this,
        }, opts || { parent: this });
    }
}

export type EC2ServiceArgs = utils.Overwrite<module.ClusterServiceArgs, {
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

    launchType: never;
}>;


export class EC2Service extends module.ClusterService {
    public taskDefinitionInstance: EC2TaskDefinition;

    constructor(name: string, cluster: module.Cluster,
                args: EC2ServiceArgs,
                opts?: pulumi.ResourceOptions) {

        if (!args.taskDefinition && !args.taskDefinitionArgs) {
            throw new Error("Either [taskDefinition] or [taskDefinitionArgs] must be provided");
        }

        const taskDefinition = args.taskDefinition ||
            new module.EC2TaskDefinition(name, cluster, args.taskDefinitionArgs!, opts);

        super(name, cluster, {
            ...args,
            taskDefinition,
            launchType: "EC2",
            networkConfiguration: {
                assignPublicIp: false,
                securityGroups: [cluster.instanceSecurityGroup.id],
                subnets: cluster.network.subnetIds,
            },
        }, opts);

        this.taskDefinitionInstance = taskDefinition;
    }
}
