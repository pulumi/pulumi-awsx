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
import { getDefaultVpc } from "../ec2";
import * as schema from "../schema-types";
import * as utils from "../utils";
import { FargateTaskDefinition } from "./fargateTaskDefinition";

/**
 * Create an ECS Service resource for Fargate with the given unique name, arguments, and options.
 * Creates Task definition if `taskDefinitionArgs` is specified.
 */
export class FargateService extends schema.FargateService {
  constructor(
    name: string,
    args: schema.FargateServiceArgs,
    opts: pulumi.ComponentResourceOptions = {},
  ) {
    super(
      name,
      {},
      {
        ...opts,
        aliases: [{ type: "awsx:x:ecs:FargateService" }, ...(opts?.aliases ?? [])],
      },
    );

    if (args.taskDefinition !== undefined && args.taskDefinitionArgs !== undefined) {
      throw new Error("Only one of `taskDefinition` or `taskDefinitionArgs` can be provided.");
    }
    let taskDefinitionIdentifier = args.taskDefinition;
    let taskDefinition: FargateTaskDefinition | undefined;
    if (args.taskDefinitionArgs) {
      taskDefinition = new FargateTaskDefinition(name, args.taskDefinitionArgs, {
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
        desiredCount: 1,
        ...args,
        networkConfiguration:
          args.networkConfiguration ?? getDefaultNetworkConfiguration(name, this),
        cluster: aws.ecs.Cluster.isInstance(args.cluster) ? args.cluster.arn : args.cluster,
        launchType: "FARGATE",
        loadBalancers: args.loadBalancers ?? taskDefinition?.loadBalancers,
        waitForSteadyState: !utils.ifUndefined(args.continueBeforeSteadyState, false),
        taskDefinition: taskDefinitionIdentifier,
      },
      { parent: this },
    );

    this.registerOutputs();
  }
}

function getDefaultNetworkConfiguration(
  name: string,
  parent: pulumi.Resource,
): aws.types.input.ecs.ServiceNetworkConfiguration {
  const defaultVpc = pulumi.output(getDefaultVpc());
  const sg = new aws.ec2.SecurityGroup(
    `${name}-sg`,
    {
      vpcId: defaultVpc.vpcId,
      ingress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          cidrBlocks: ["0.0.0.0/0"],
          ipv6CidrBlocks: ["::/0"],
        },
      ],
      egress: [
        {
          fromPort: 0,
          toPort: 65535,
          protocol: "tcp",
          cidrBlocks: ["0.0.0.0/0"],
          ipv6CidrBlocks: ["::/0"],
        },
      ],
    },
    {
      parent,
    },
  );
  return {
    subnets: defaultVpc.publicSubnetIds,
    assignPublicIp: true,
    securityGroups: [sg.id],
  };
}
