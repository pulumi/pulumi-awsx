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
import {
    defaultLogGroup,
    DefaultLogGroupArgs,
    LogGroupId,
} from "../cloudwatch/logGroup";
import * as role from "../role";
import { DefaultRoleWithPolicyArgs } from "../role";
import * as utils from "../utils";
import { Container } from "./container";
import { calculateFargateMemoryAndCPU } from "./fargateMemoryAndCpu";

export interface FargateTaskDefinitionArgs
    extends Omit<
        aws.ecs.TaskDefinitionArgs,
        | "containerDefinitions"
        | "cpu"
        | "executionRoleArn"
        | "family"
        | "memory"
        | "taskRoleArn"
    > {
    /**
     * Single container to make a TaskDefinition from.  Useful for simple cases where there aren't
     * multiple containers, especially when creating a TaskDefinition to call [run] on.
     *
     * Either [container] or [containers] must be provided.
     */
    container?: Container;

    /**
     * All the containers to make a TaskDefinition from.  Useful when creating a Service that will
     * contain many containers within.
     *
     * Either [container] or [containers] must be provided.
     */
    containers?: Record<string, Container>;

    /**
     * The number of cpu units used by the task. If not provided, a default will be computed
     * based on the cumulative needs specified by [containerDefinitions]
     */
    cpu?: pulumi.Input<string>;

    /**
     * The execution role that the Amazon ECS container agent and the Docker daemon can assume.
     * Will be created automatically if not defined.
     */
    executionRole?: DefaultRoleWithPolicyArgs;

    /**
     * An optional unique name for your task definition. If not specified, then a default will be created.
     */
    family?: pulumi.Input<string>;

    /**
     * Log group for logging information related to the service.
     * Will be created automatically if not defined.
     */
    logGroup?: DefaultLogGroupArgs;

    /**
     * The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
     * based on the cumulative needs specified by [containerDefinitions]
     */
    memory?: pulumi.Input<string>;

    /**
     * IAM role that allows your Amazon ECS container task to make calls to other AWS services.
     * Will be created automatically if not defined.
     */
    taskRole?: DefaultRoleWithPolicyArgs;
}

/**
 * Create a TaskDefinition resource with the given unique name, arguments, and options.
 * Creates required log-group and task & execution roles.
 * Presents required Service load balancers if target group included in port mappings.
 */
export class FargateTaskDefinition extends pulumi.ComponentResource {
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
    // tslint:disable-next-line:variable-name
    public readonly __isFargateTaskDefinition: boolean;

    constructor(
        name: string,
        args: FargateTaskDefinitionArgs,
        opts: pulumi.ComponentResourceOptions = {},
    ) {
        super("awsx:x:ecs:FargateTaskDefinition", name, {}, opts);
        this.__isFargateTaskDefinition = true;

        const { container } = args;
        let { containers } = args;
        if (containers !== undefined && container === undefined) {
            containers = containers;
        } else if (container !== undefined && containers === undefined) {
            containers = { container: container };
        } else {
            throw new Error(
                "Exactly one of [container] or [containers] must be provided",
            );
        }

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

    public static isInstance(obj: any): obj is FargateTaskDefinition {
        return utils.isInstance<FargateTaskDefinition>(
            obj,
            "__isFargateTaskDefinition",
        );
    }
}

function buildTaskDefinitionArgs(
    name: string,
    args: FargateTaskDefinitionArgs,
    containerDefinitions: pulumi.Output<aws.ecs.ContainerDefinition[]>,
    taskRoleArn?: pulumi.Input<string>,
    executionRoleArn?: pulumi.Input<string>,
): aws.ecs.TaskDefinitionArgs {
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

    if (args.cpu === undefined) {
        args.cpu = requiredMemoryAndCPU.cpu;
    }
    if (args.memory === undefined) {
        args.memory = requiredMemoryAndCPU.memory;
    }
    const containerString = containerDefinitions.apply((d) =>
        JSON.stringify(d),
    );
    const defaultFamily = containerString.apply(
        (s) => name + "-" + utils.sha1hash(pulumi.getStack() + s),
    );
    const family = utils.ifUndefined(args.family, defaultFamily);

    return {
        ...args,
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
    containers: Record<string, Container>,
    logGroupId: pulumi.Input<LogGroupId> | undefined,
): pulumi.Output<aws.ecs.ContainerDefinition[]> {
    const result: pulumi.Output<aws.ecs.ContainerDefinition>[] = [];

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
    container: Container,
    logGroupId: pulumi.Input<LogGroupId> | undefined,
): pulumi.Output<aws.ecs.ContainerDefinition> {
    const resolvedMappings = container.portMappings
        ? pulumi.all(
              container.portMappings.map((mappingInput) => {
                  return pulumi.output(mappingInput).apply((mi) =>
                      pulumi
                          .output(mi.targetGroup?.port)
                          .apply((tgPort): aws.ecs.PortMapping => {
                              return {
                                  containerPort:
                                      mi.containerPort ?? tgPort ?? mi.hostPort,
                                  hostPort: tgPort ?? mi.hostPort,
                                  protocol: mi.protocol,
                              };
                          }),
                  );
              }),
          )
        : undefined;
    const region = utils.getRegion(parent);
    return pulumi
        .all([container, resolvedMappings, region, logGroupId])
        .apply(([container, portMappings, region, logGroupId]) => {
            const containerDefinition: aws.ecs.ContainerDefinition = {
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
    containers: Record<string, Container>,
): pulumi.Output<aws.types.output.ecs.ServiceLoadBalancer[]> {
    return pulumi
        .all(
            Object.entries(containers).map(([containerName, v]) => {
                if (v.portMappings === undefined) {
                    return pulumi.output([]);
                }
                return pulumi.all(
                    v.portMappings?.map((m) => {
                        const targetGroup = pulumi.output(m).targetGroup;
                        return pulumi
                            .all([
                                targetGroup?.apply((tg) => tg?.arn),
                                targetGroup?.apply((tg) => tg?.port),
                            ])
                            .apply(([arn, port]) => ({
                                containerName,
                                tgArn: arn,
                                tgPort: port,
                            }));
                    }),
                );
            }),
        )
        .apply((containerGroups) =>
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
                    }):
                        | aws.types.output.ecs.ServiceLoadBalancer
                        | undefined => {
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
