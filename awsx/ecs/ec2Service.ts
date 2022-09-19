// Copyright 2016-2022, Pulumi Corporation.
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
import * as schema from "../schema-types";
import * as utils from "../utils";
import { EC2TaskDefinition } from "./ec2TaskDefinition";

/**
 * Create an ECS Service resource for EC2 with the given unique name, arguments, and options.
 * Creates Task definition if `taskDefinitionArgs` is specified.
 */
export class EC2Service extends schema.EC2Service {
  constructor(
    name: string,
    args: schema.EC2ServiceArgs,
    opts: pulumi.ComponentResourceOptions = {},
  ) {
    super(
      name,
      {},
      {
        ...opts,
        aliases: [{ type: "awsx:x:ecs:EC2Service" }, ...(opts?.aliases ?? [])],
      },
    );

    if (args.taskDefinition !== undefined && args.taskDefinitionArgs !== undefined) {
      throw new Error("Only one of `taskDefinition` or `taskDefinitionArgs` can be provided.");
    }
    let taskDefinitionIdentifier = args.taskDefinition;
    let taskDefinition: EC2TaskDefinition | undefined;
    if (args.taskDefinitionArgs) {
      taskDefinition = new EC2TaskDefinition(name, args.taskDefinitionArgs, {
        parent: this,
      });
      this.taskDefinition = taskDefinition.taskDefinition;
      taskDefinitionIdentifier = taskDefinition.taskDefinition.arn;
    }
    if (taskDefinitionIdentifier === undefined) {
      throw new Error("Either `taskDefinition` or `taskDefinitionArgs` must be provided.");
    }

    this.service = new aws.ecs.Service(
      name,
      {
        ...args,
        cluster: aws.ecs.Cluster.isInstance(args.cluster) ? args.cluster.arn : args.cluster,
        launchType: "EC2",
        loadBalancers: args.loadBalancers ?? taskDefinition?.loadBalancers,
        waitForSteadyState: utils.ifUndefined(args.continueBeforeSteadyState, false).apply(x => !x),
        taskDefinition: taskDefinitionIdentifier,
      },
      { parent: this },
    );

    this.registerOutputs();
  }
}
