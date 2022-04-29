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
import { defaultLogGroup } from "../cloudwatch/logGroup";
import * as role from "../role";
import * as schema from "../schema-types";
import * as utils from "../utils";
import { computeContainerDefinitions, computeLoadBalancers } from "./containers";
import { calculateFargateMemoryAndCPU } from "./fargateMemoryAndCpu";

/**
 * Create a TaskDefinition resource with the given unique name, arguments, and options.
 * Creates required log-group and task & execution roles.
 * Presents required Service load balancers if target group included in port mappings.
 */
export class FargateTaskDefinition extends schema.FargateTaskDefinition {
  /** Created ECS Task Definition resource. */
  public readonly taskDefinition: aws.ecs.TaskDefinition;
  /** Auto-created Log Group resource for use by containers. */
  public readonly logGroup?: aws.cloudwatch.LogGroup;
  /** Auto-created IAM role that allows your Amazon ECS container task to make calls to other AWS services. */
  public readonly taskRole?: aws.iam.Role;
  /** Auto-created IAM task execution role that the Amazon ECS container agent and the Docker daemon can assume. */
  public readonly executionRole?: aws.iam.Role;
  /** Computed load balancers from target groups specified of container port mappings. */
  public readonly loadBalancers: pulumi.Output<aws.types.output.ecs.ServiceLoadBalancer[]>;

  constructor(
    name: string,
    args: schema.FargateTaskDefinitionArgs,
    opts: pulumi.ComponentResourceOptions = {},
  ) {
    super(
      name,
      {},
      {
        ...opts,
        aliases: [{ type: "awsx:x:ecs:FargateTaskDefinition" }, ...(opts.aliases ?? [])],
      },
    );

    const containers = normalizeFargateTaskDefinitionContainers(args);

    const { logGroup, logGroupId } = defaultLogGroup(name, args.logGroup, {}, { parent: this });
    this.logGroup = logGroup;

    const taskRole = role.defaultRoleWithPolicies(
      `${name}-task`,
      args.taskRole,
      {
        assumeRolePolicy: role.defaultRoleAssumeRolePolicy(),
        policyArns: role.defaultTaskRolePolicyARNs(),
      },
      { parent: this },
    );
    const executionRole = role.defaultRoleWithPolicies(
      `${name}-execution`,
      args.executionRole,
      {
        assumeRolePolicy: role.defaultRoleAssumeRolePolicy(),
        policyArns: role.defaultExecutionRolePolicyARNs(),
      },
      { parent: this },
    );
    this.taskRole = taskRole.role;
    this.executionRole = executionRole.role;

    const containerDefinitions = computeContainerDefinitions(this, containers, logGroupId);

    this.loadBalancers = computeLoadBalancers(containers);

    this.taskDefinition = new aws.ecs.TaskDefinition(
      name,
      buildTaskDefinitionArgs(
        name,
        args,
        containerDefinitions,
        taskRole.roleArn,
        executionRole.roleArn,
      ),
      { parent: this },
    );
  }
}

function normalizeFargateTaskDefinitionContainers(args: schema.FargateTaskDefinitionArgs) {
  const { container, containers } = args;
  if (containers !== undefined && container === undefined) {
    return containers;
  } else if (container !== undefined && containers === undefined) {
    return { container: container };
  } else {
    throw new Error("Exactly one of [container] or [containers] must be provided");
  }
}

function buildTaskDefinitionArgs(
  name: string,
  args: schema.FargateTaskDefinitionArgs,
  containerDefinitions: pulumi.Output<schema.TaskDefinitionContainerDefinitionInputs[]>,
  taskRoleArn?: pulumi.Input<string>,
  executionRoleArn?: pulumi.Input<string>,
): aws.ecs.TaskDefinitionArgs {
  const mutableArgs = { ...args };
  const requiredMemoryAndCPU = containerDefinitions
    .apply((defs) =>
      pulumi.all(
        defs.map((def) =>
          pulumi
            .all([def.cpu, def.memory, def.memoryReservation])
            .apply(([cpu, memory, memoryReservation]) => ({
              cpu,
              memory,
              memoryReservation,
            })),
        ),
      ),
    )
    .apply((defs) => calculateFargateMemoryAndCPU(defs));

  if (mutableArgs.cpu === undefined) {
    mutableArgs.cpu = requiredMemoryAndCPU.cpu;
  }
  if (mutableArgs.memory === undefined) {
    mutableArgs.memory = requiredMemoryAndCPU.memory;
  }
  const containerString = containerDefinitions.apply((d) => JSON.stringify(d));
  const defaultFamily = containerString.apply(
    (s) => name + "-" + utils.sha1hash(pulumi.getStack() + s),
  );
  const family = utils.ifUndefined(args.family, defaultFamily);

  return {
    ...mutableArgs,
    requiresCompatibilities: ["FARGATE"],
    networkMode: "awsvpc",
    taskRoleArn: taskRoleArn,
    executionRoleArn: executionRoleArn,
    family,
    containerDefinitions: containerString,
  };
}
