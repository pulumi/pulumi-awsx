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
import { defaultLogGroup, LogGroupId } from "../cloudwatch/logGroup";
import * as role from "../role";
import * as utils from "../utils";
import { calculateFargateMemoryAndCPU } from "./fargateMemoryAndCpu";
import * as schema from "../schema-types";

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
    public readonly loadBalancers: pulumi.Output<
        aws.types.output.ecs.ServiceLoadBalancer[]
    >;

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
                aliases: [
                    { type: "awsx:x:ecs:FargateTaskDefinition" },
                    ...(opts.aliases ?? []),
                ],
            },
        );

        const containers = normalizeContainers(args);

        const { logGroup, logGroupId } = defaultLogGroup(
            name,
            args.logGroup,
            {},
            { parent: this },
        );
        this.logGroup = logGroup;

        const taskRole = role.defaultRoleWithPolicies(
            `${name}-task`,
            args.taskRole,
            {
                assumeRolePolicy: defaultRoleAssumeRolePolicy(),
                policyArns: defaultTaskRolePolicyARNs(),
            },
            { parent: this },
        );
        const executionRole = role.defaultRoleWithPolicies(
            `${name}-execution`,
            args.executionRole,
            {
                assumeRolePolicy: defaultRoleAssumeRolePolicy(),
                policyArns: defaultExecutionRolePolicyARNs(),
            },
            { parent: this },
        );
        this.taskRole = taskRole.role;
        this.executionRole = executionRole.role;

        const containerDefinitions = computeContainerDefinitions(
            this,
            containers,
            logGroupId,
        );

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

function normalizeContainers(args: schema.FargateTaskDefinitionArgs) {
    const { container, containers } = args;
    if (containers !== undefined && container === undefined) {
        return containers;
    } else if (container !== undefined && containers === undefined) {
        return { container: container };
    } else {
        throw new Error(
            "Exactly one of [container] or [containers] must be provided",
        );
    }
}

function buildTaskDefinitionArgs(
    name: string,
    args: schema.FargateTaskDefinitionArgs,
    containerDefinitions: pulumi.Output<
        schema.TaskDefinitionContainerDefinitionInputs[]
    >,
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
    const containerString = containerDefinitions.apply((d) =>
        JSON.stringify(d),
    );
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

function computeContainerDefinitions(
    parent: pulumi.Resource,
    containers: Record<string, schema.TaskDefinitionContainerDefinitionInputs>,
    logGroupId: pulumi.Input<LogGroupId> | undefined,
): pulumi.Output<schema.TaskDefinitionContainerDefinitionInputs[]> {
    const result: pulumi.Output<schema.TaskDefinitionContainerDefinitionInputs>[] =
        [];

    for (const containerName of Object.keys(containers)) {
        const container = containers[containerName];

        result.push(
            computeContainerDefinition(
                parent,
                containerName,
                container,
                logGroupId,
            ),
        );
    }

    return pulumi.all(result);
}

function computeContainerDefinition(
    parent: pulumi.Resource,
    containerName: string,
    container: schema.TaskDefinitionContainerDefinitionInputs,
    logGroupId: pulumi.Input<LogGroupId> | undefined,
): pulumi.Output<schema.TaskDefinitionContainerDefinitionInputs> {
    const resolvedMappings = container.portMappings
        ? pulumi.output(container.portMappings).apply((portMappings) =>
              portMappings.map((mappingInput) => {
                  return pulumi
                      .output(mappingInput.targetGroup?.port)
                      .apply(
                          (tgPort): schema.TaskDefinitionPortMappingInputs => {
                              return {
                                  containerPort:
                                      mappingInput.containerPort ??
                                      tgPort ??
                                      mappingInput.hostPort,
                                  hostPort: tgPort ?? mappingInput.hostPort,
                                  protocol: mappingInput.protocol,
                              };
                          },
                      );
              }),
          )
        : undefined;
    const region = utils.getRegion(parent);
    return pulumi
        .all([container, resolvedMappings, region, logGroupId])
        .apply(([container, portMappings, region, logGroupId]) => {
            const containerDefinition = {
                ...container,
                portMappings,
                name: containerName,
            };
            if (
                containerDefinition.logConfiguration === undefined &&
                logGroupId !== undefined
            ) {
                containerDefinition.logConfiguration = {
                    logDriver: "awslogs",
                    options: {
                        "awslogs-group": logGroupId.logGroupName,
                        "awslogs-region": logGroupId.logGroupRegion,
                        "awslogs-stream-prefix": containerName,
                    },
                };
            }
            return containerDefinition;
        });
}

function computeLoadBalancers(
    containers: Record<string, schema.TaskDefinitionContainerDefinitionInputs>,
): pulumi.Output<aws.types.output.ecs.ServiceLoadBalancer[]> {
    const mappedContainers = Object.entries(containers).map(
        ([containerName, containerDefinition]) => {
            const portMappings:
                | pulumi.Input<
                      pulumi.Input<schema.TaskDefinitionPortMappingInputs>[]
                  >
                | undefined = containerDefinition.portMappings;
            if (portMappings === undefined) {
                return pulumi.output([]);
            }
            const mappedMappings = pulumi
                .output(portMappings)
                .apply((mappings) => {
                    return mappings.map((m) => {
                        const targetGroup = m.targetGroup;
                        return {
                            containerName,
                            tgArn: targetGroup?.arn,
                            tgPort: targetGroup?.port,
                        };
                    });
                });
            return mappedMappings;
        },
    );
    return pulumi.all(mappedContainers).apply((containerGroups) =>
        utils.collect(containerGroups, (cg) => {
            if (cg === undefined) {
                return [];
            }
            return utils.choose(
                cg,
                ({
                    containerName,
                    tgArn,
                    tgPort,
                }): aws.types.output.ecs.ServiceLoadBalancer | undefined => {
                    if (tgArn === undefined || tgPort === undefined) {
                        return undefined;
                    }
                    return {
                        containerName,
                        containerPort: tgPort,
                        targetGroupArn: tgArn,
                    };
                },
            );
        }),
    );
}

function defaultRoleAssumeRolePolicy(): aws.iam.PolicyDocument {
    return {
        Version: "2012-10-17",
        Statement: [
            {
                Action: "sts:AssumeRole",
                Principal: {
                    Service: "ecs-tasks.amazonaws.com",
                },
                Effect: "Allow",
                Sid: "",
            },
        ],
    };
}

function defaultTaskRolePolicyARNs() {
    return [
        // Provides full access to Lambda
        // aws.iam.ManagedPolicy.LambdaFullAccess,
        // Required for lambda compute to be able to run Tasks
        // aws.iam.ManagedPolicy.AmazonECSFullAccess,
    ];
}

function defaultExecutionRolePolicyARNs() {
    return [
        "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
        // aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
    ];
}
