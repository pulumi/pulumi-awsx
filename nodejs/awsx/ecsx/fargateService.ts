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
import {
    FargateTaskDefinition,
    FargateTaskDefinitionArgs,
} from "./fargateTaskDefinition";

export interface FargateServiceArgs
    extends Omit<
            aws.ecs.ServiceArgs,
            | "launchType"
            | "networkConfiguration"
            | "taskDefinition"
            | "waitForSteadyState"
        >,
        Required<Pick<aws.ecs.ServiceArgs, "networkConfiguration">> {
    /**
     * If `true`, this provider will not wait for the service to reach a steady state (like [`aws ecs wait services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html)) before continuing. Default `false`.
     */
    continueBeforeSteadyState?: pulumi.Input<boolean>;

    /**
     * Family and revision (`family:revision`) or full ARN of the task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.
     */
    taskDefinition?: pulumi.Input<string>;

    /**
     * The args of task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.
     */
    taskDefinitionArgs?: FargateTaskDefinitionArgs;
}

/**
 * Create an ECS Service resource for Fargate with the given unique name, arguments, and options.
 * Creates Task definition if `taskDefinitionArgs` is specified.
 */
export class FargateService extends pulumi.ComponentResource {
    /** Underlying ECS Service resource */
    public readonly service: aws.ecs.Service;
    /** Underlying Fargate component resource if created from args */
    public readonly taskDefinition?: FargateTaskDefinition;

    constructor(
        name: string,
        args: FargateServiceArgs,
        opts: pulumi.ComponentResourceOptions = {},
    ) {
        super(
            "awsx:ecsx:FargateService",
            name,
            { aliases: [{ type: "awsx:x:ecs:FargateService" }] },
            opts,
        );

        if (
            args.taskDefinition !== undefined &&
            args.taskDefinitionArgs !== undefined
        ) {
            throw new Error(
                "Only one of `taskDefinition` or `taskDefinitionArgs` can be provided.",
            );
        }
        let taskDefinition = args.taskDefinition;
        if (args.taskDefinitionArgs) {
            this.taskDefinition = new FargateTaskDefinition(
                name,
                args.taskDefinitionArgs,
                {
                    parent: this,
                },
            );
            taskDefinition = this.taskDefinition.taskDefinition.arn;
        }
        if (taskDefinition === undefined) {
            throw new Error(
                "Either `taskDefinition` or `taskDefinitionArgs` must be provided.",
            );
        }

        this.service = new aws.ecs.Service(
            name,
            {
                ...args,
                cluster: aws.ecs.Cluster.isInstance(args.cluster)
                    ? args.cluster.arn
                    : args.cluster,
                launchType: "FARGATE",
                loadBalancers:
                    args.loadBalancers ?? this.taskDefinition?.loadBalancers,
                waitForSteadyState: !utils.ifUndefined(
                    args.continueBeforeSteadyState,
                    false,
                ),
                taskDefinition,
            },
            { parent: this },
        );

        this.registerOutputs();
    }
}
