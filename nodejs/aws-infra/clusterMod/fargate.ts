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

export type FargateTaskDefinitionArgs = utils.Overwrite<module.ClusterTaskDefinitionArgs, {
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
    container?: module.ContainerDefinition;
}>;

export type FargateServiceArgs = utils.Overwrite<module.ClusterServiceArgs, {
    /**
     * The task definition to create the service from.  Either [taskDefinition] or
     * [taskDefinitionArgs] must be provided.
     */
    taskDefinition?: module.FargateTaskDefinition;

    /**
     * The task definition to create the service from.  Either [taskDefinition] or
     * [taskDefinitionArgs] must be provided.
     */
    taskDefinitionArgs?: FargateTaskDefinitionArgs;

    launchType: never;
}>;

export class FargateService extends module.ClusterService {
    constructor(name: string, cluster: module.Cluster2,
                args: FargateServiceArgs,
                opts?: pulumi.ResourceOptions) {

        if (!args.taskDefinition && !args.taskDefinitionArgs) {
            throw new Error("Either [taskDefinition] or [taskDefinitionArgs] must be provided");
        }

        const taskDefinition = args.taskDefinition ||
            new module.FargateTaskDefinition(name, cluster, args.taskDefinitionArgs!, opts);

        const serviceArgs: module.ClusterServiceArgs = {
            ...args,
            taskDefinition,
            launchType: "FARGATE",
            networkConfiguration: {
                assignPublicIp: !cluster.network.usePrivateSubnets,
                securityGroups: [cluster.instanceSecurityGroup.id],
                subnets: cluster.network.subnetIds,
            },
        };

        super(name, cluster, serviceArgs, opts);
    }
}
