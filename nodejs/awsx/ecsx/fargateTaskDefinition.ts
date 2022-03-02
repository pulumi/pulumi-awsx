import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as role from "../role";
import * as utils from "../utils";
import { Container } from "./container";
import { NestedResourceOptions } from "../nestedResourceOptions";
import { DefaultRoleWithPolicyArgs } from "../role";
import { calculateFargateMemoryAndCPU } from "./fargateMemoryAndCpu";

export interface FargateTaskDefinitionArgs {
    // Properties copied from ecs.TaskDefinitionArgs

    /**
     * A set of placement constraints rules that are taken into consideration during task placement.
     * Maximum number of `placement_constraints` is `10`.
     */
    placementConstraints?: aws.ecs.TaskDefinitionArgs["placementConstraints"];

    /**
     * The proxy configuration details for the App Mesh proxy.
     */
    proxyConfiguration?: aws.ecs.TaskDefinitionArgs["proxyConfiguration"];

    /**
     * A set of volume blocks that containers in your task may use.
     */
    volumes?: aws.ecs.TaskDefinitionArgs["volumes"];

    // Properties we've added/changed.
    /**
     * Log group for logging information related to the service.  If `undefined` a default instance
     * with a one-day retention policy will be created.  If `null` no log group will be created.
     */
    logGroup?: aws.cloudwatch.LogGroup | aws.cloudwatch.LogGroupArgs;

    /**
     * IAM role that allows your Amazon ECS container task to make calls to other AWS services. If
     * `undefined`, a default will be created for the task.  If `null` no role will be created.
     */
    taskRole?: DefaultRoleWithPolicyArgs;

    /**
     * An optional family name for the Task Definition. If not specified, then a suitable default will be created.
     */
    family?: pulumi.Input<string>;

    /**
     * The execution role that the Amazon ECS container agent and the Docker daemon can assume.
     *
     *  If `undefined`, a default will be created for the task.  If `null` no role will be created.
     */
    executionRole?: DefaultRoleWithPolicyArgs;

    /**
     * The number of cpu units used by the task.  If not provided, a default will be computed
     * based on the cumulative needs specified by [containerDefinitions]
     */
    cpu?: pulumi.Input<string>;

    /**
     * The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
     * based on the cumulative needs specified by [containerDefinitions]
     */
    memory?: pulumi.Input<string>;

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
     * Key-value mapping of resource tags
     */
    tags?: pulumi.Input<aws.Tags>;
}

/**
 * Auto-creates log-group and task & execution roles.
 * Calculates required Service load balancers if target group included in port mappings.
 */
export class FargateTaskDefinition extends pulumi.ComponentResource {
    public readonly taskDefinition: aws.ecs.TaskDefinition;
    public readonly logGroup?: aws.cloudwatch.LogGroup;
    public readonly taskRole?: aws.iam.Role;
    public readonly executionRole?: aws.iam.Role;
    public readonly containers: Record<string, Container>;
    public readonly loadBalancers: pulumi.Output<aws.types.input.ecs.ServiceLoadBalancer[]>;
    // tslint:disable-next-line:variable-name
    public readonly __isFargateTaskDefinition: boolean;

    constructor(name: string, args: FargateTaskDefinitionArgs, opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:x:ecs:FargateTaskDefinition", name, {}, opts);
        this.__isFargateTaskDefinition = true;

        const { container, containers } = args;
        if (container && containers) {
            throw new Error("Exactly one of [container] or [containers] must be provided");
        } else if (containers !== undefined) {
            this.containers = containers;
        } else if (container !== undefined) {
            this.containers = { container: container };
        } else {
            throw new Error("Exactly one of [container] or [containers] must be provided");
        }

        if (args.logGroup) {
            this.logGroup = aws.cloudwatch.LogGroup.isInstance(args.logGroup)
                ? args.logGroup
                : new aws.cloudwatch.LogGroup(name, args.logGroup, opts);
        }

        const taskRole = role.defaultRoleWithPolicies(
            `${name}-task`,
            args.taskRole,
            {
                assumeRolePolicy: defaultRoleAssumeRolePolicy(),
                policyArns: defaultTaskRolePolicyARNs(),
            },
            { parent: this }
        );
        const executionRole = role.defaultRoleWithPolicies(
            `${name}-execution`,
            args.executionRole,
            {
                assumeRolePolicy: defaultRoleAssumeRolePolicy(),
                policyArns: defaultExecutionRolePolicyARNs(),
            },
            { parent: this }
        );
        this.taskRole = taskRole.role;
        this.executionRole = executionRole.role;

        const containerDefinitions = computeContainerDefinitions(this, this.containers, this.logGroup?.id);

        this.loadBalancers = computeLoadBalancers(this.containers);

        this.taskDefinition = new aws.ecs.TaskDefinition(
            name,
            buildTaskDefinitionArgs(name, args, containerDefinitions, taskRole.roleArn, executionRole.roleArn),
            { parent: this }
        );
    }

    public static isInstance(obj: any): obj is FargateTaskDefinition {
        return utils.isInstance<FargateTaskDefinition>(obj, "__isFargateTaskDefinition");
    }
}

function buildTaskDefinitionArgs(
    name: string,
    args: FargateTaskDefinitionArgs,
    containerDefinitions: pulumi.Output<aws.ecs.ContainerDefinition[]>,
    taskRoleArn?: pulumi.Input<string>,
    executionRoleArn?: pulumi.Input<string>
): aws.ecs.TaskDefinitionArgs {
    const requiredMemoryAndCPU = containerDefinitions.apply((defs) => calculateFargateMemoryAndCPU(defs));

    if (args.cpu === undefined) {
        args.cpu = requiredMemoryAndCPU.cpu;
    }
    if (args.memory === undefined) {
        args.memory = requiredMemoryAndCPU.memory;
    }
    const containerString = containerDefinitions.apply((d) => JSON.stringify(d));
    const defaultFamily = containerString.apply((s) => name + "-" + utils.sha1hash(pulumi.getStack() + s));
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
    logGroupId: pulumi.Input<string | undefined>
): pulumi.Output<aws.ecs.ContainerDefinition[]> {
    const result: pulumi.Output<aws.ecs.ContainerDefinition>[] = [];

    for (const containerName of Object.keys(containers)) {
        const container = containers[containerName];

        result.push(computeContainerDefinition(parent, containerName, container, logGroupId));
    }

    return pulumi.all(result);
}

function computeContainerDefinition(
    parent: pulumi.Resource,
    containerName: string,
    container: Container,
    logGroupId: pulumi.Input<string | undefined>
): pulumi.Output<aws.ecs.ContainerDefinition> {
    const resolvedMappings = container.portMappings
        ? pulumi.all(
              container.portMappings.map((mappingInput) => {
                  return pulumi.output(mappingInput).apply((mi) =>
                      pulumi.output(mi.targetGroup?.port).apply((tgPort): aws.ecs.PortMapping => {
                          return {
                              containerPort: mi.containerPort ?? tgPort ?? mi.hostPort,
                              hostPort: tgPort ?? mi.hostPort,
                              protocol: mi.protocol,
                          };
                      })
                  );
              })
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
            if (containerDefinition.logConfiguration === undefined && logGroupId !== undefined) {
                containerDefinition.logConfiguration = {
                    logDriver: "awslogs",
                    options: {
                        "awslogs-group": logGroupId,
                        "awslogs-region": region,
                        "awslogs-stream-prefix": containerName,
                    },
                };
            }
            return containerDefinition;
        });
}

function computeLoadBalancers(
    containers: Record<string, Container>
): pulumi.Output<aws.types.input.ecs.ServiceLoadBalancer[]> {
    return pulumi
        .all(
            Object.entries(containers).map(([containerName, v]) => {
                if (v.portMappings === undefined) return pulumi.output([]);
                return pulumi.all(
                    v.portMappings?.map((m) => {
                        const targetGroup = pulumi.output(m).targetGroup;
                        return pulumi
                            .all([targetGroup?.apply((tg) => tg?.arn), targetGroup?.apply((tg) => tg?.port)])
                            .apply(([arn, port]) => ({
                                containerName,
                                tgArn: arn,
                                tgPort: port,
                            }));
                    })
                );
            })
        )
        .apply((containerGroups) =>
            utils.collect(containerGroups, (cg) => {
                if (cg === undefined) {
                    return [];
                }
                return utils.choose(
                    cg,
                    ({ containerName, tgArn, tgPort }): aws.types.input.ecs.ServiceLoadBalancer | undefined => {
                        if (tgArn === undefined || tgPort === undefined) {
                            return undefined;
                        }
                        return { containerName, containerPort: tgPort, targetGroupArn: tgArn };
                    }
                );
            })
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
