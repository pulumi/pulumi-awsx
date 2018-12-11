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

import * as utils from "../../utils";

import * as ecs from ".";
import * as x from "..";

export declare type HostOperatingSystem = "linux" | "windows";

export interface TaskRunOptions {
    /**
     * The cluster to run this task in.
     */
    cluster: ecs.Cluster;

    /**
     * The name of the container to run as a task.  If not provided, the first container in the list
     * of containers in the ClusterTaskDefinition will be the one that is run.
     */
    containerName?: string;

    /**
     * The OS to run.  Defaults to 'linux' if unspecified.
     */
    os?: HostOperatingSystem;

    /**
     * Optional environment variables to override those set in the container definition.
     */
    environment?: aws.ecs.KeyValuePair[];
}

export abstract class TaskDefinition extends pulumi.ComponentResource {
    public readonly instance: aws.ecs.TaskDefinition;
    public readonly logGroup: aws.cloudwatch.LogGroup;
    public readonly containers: Record<string, ecs.Container>;
    public readonly taskRole: aws.iam.Role;
    public readonly executionRole: aws.iam.Role;

    /**
     * Runs this task definition in this cluster once.
     */
    public readonly run: (options: TaskRunOptions) => Promise<void>;

    constructor(type: string, name: string,
                isFargate: boolean, args: TaskDefinitionArgs,
                opts?: pulumi.ComponentResourceOptions) {
        super(type, name, args, opts);

        const parentOpts = { parent: this };
        const logGroup = args.logGroup || new aws.cloudwatch.LogGroup(name, {
            retentionInDays: 1,
        }, parentOpts);

        const taskRole = args.taskRole || TaskDefinition.createTaskRole(
            `${name}-task`, /*assumeRolePolicy*/ undefined, /*policyArns*/ undefined, parentOpts);
        const executionRole = args.executionRole || TaskDefinition.createExecutionRole(
            `${name}-execution`, /*assumeRolePolicy*/ undefined, /*policyArns*/ undefined, parentOpts);

//         // todo(cyrusn): volumes.
//         //     // Find all referenced Volumes.
// //     const volumes: { hostPath?: string; name: string }[] = [];
// //     for (const containerName of Object.keys(containers)) {
// //         const container = containers[containerName];

// //         // Collect referenced Volumes.
// //         if (container.volumes) {
// //             for (const volumeMount of container.volumes) {
// //                 const volume = volumeMount.sourceVolume;
// //                 volumes.push({
// //                     hostPath: (volume as Volume).getHostPath(),
// //                     name: (volume as Volume).getVolumeName(),
// //                 });
// //             }
// //         }
// //     }

        const containers = args.containers;
        const containerDefinitions = computeContainerDefinitions(this, name, containers, logGroup);
        const containerString = containerDefinitions.apply(JSON.stringify);
        const family = containerString.apply(s => name + "-" + utils.sha1hash(pulumi.getStack() + containerString));

        const instance = new aws.ecs.TaskDefinition(name, {
            ...args,
            family,
            taskRoleArn: taskRole.arn,
            executionRoleArn: executionRole.arn,
            containerDefinitions: containerString,
        }, parentOpts);

        const containerToEnvironment =
            pulumi.output(containers)
                  .apply(c => {
                        const result: Record<string, aws.ecs.KeyValuePair[]> = {};
                        for (const key of Object.keys(c)) {
                            result[key] = c[key].environment || [];
                        }
                        return result;
                  });

        this.run = createRunFunction(isFargate, instance.arn, containerToEnvironment);

        this.instance = instance;
        this.containers = containers;
        this.logGroup = logGroup;
        this.taskRole = taskRole;
        this.executionRole = executionRole;

        this.registerOutputs({
            instance,
            containers,
            logGroup,
            taskRole,
            executionRole,
        });
    }

    /**
     * Creates the [taskRole] for a [TaskDefinition] if not provided explicitly. If
     * [assumeRolePolicy] is provided it will be used when creating the task, otherwise
     * [defaultRoleAssumeRolePolicy] will be used.  If [policyArns] are provided, they will be used
     * to create [RolePolicyAttachment]s for the Role.  Otherwise, [defaultTaskRolePolicyARNs] will
     * be used.
     */
    public static createTaskRole(
            name: string,
            assumeRolePolicy?: string | aws.iam.PolicyDocument,
            policyArns?: string[],
            opts?: pulumi.ResourceOptions): aws.iam.Role {

        return x.createRole(
            name,
            assumeRolePolicy || TaskDefinition.defaultRoleAssumeRolePolicy(),
            policyArns || TaskDefinition.defaultTaskRolePolicyARNs(),
            opts);
    }

    /**
     * Creates the [executionRole] for a [TaskDefinition] if not provided explicitly. If
     * [assumeRolePolicy] is provided it will be used when creating the task, otherwise
     * [defaultRoleAssumeRolePolicy] will be used.  If [policyArns] are provided, they will be used
     * to create [RolePolicyAttachment]s for the Role.  Otherwise, [defaultExecutionRolePolicyARNs] will
     * be used.
     */
    public static createExecutionRole(
            name: string,
            assumeRolePolicy?: string | aws.iam.PolicyDocument,
            policyArns?: string[],
            opts?: pulumi.ResourceOptions): aws.iam.Role {

        return x.createRole(
            name,
            assumeRolePolicy || TaskDefinition.defaultRoleAssumeRolePolicy(),
            policyArns || TaskDefinition.defaultExecutionRolePolicyARNs(),
            opts);
    }

    // The default ECS Task assume role policy for Task and Execution Roles
    public static defaultRoleAssumeRolePolicy(): aws.iam.PolicyDocument {
        return {
            "Version": "2012-10-17",
            "Statement": [{
                    "Action": "sts:AssumeRole",
                    "Principal": {
                        "Service": "ecs-tasks.amazonaws.com",
                    },
                    "Effect": "Allow",
                    "Sid": "",
                }],
        };
    }

    // Default policy arns for the Task role.
    public static defaultTaskRolePolicyARNs() {
        return [
            // Provides wide access to "serverless" services (Dynamo, S3, etc.)
            aws.iam.AWSLambdaFullAccess,
            // Required for lambda compute to be able to run Tasks
            aws.iam.AmazonEC2ContainerServiceFullAccess,
        ];
    }

    // Default policy arns for the Execution role.
    public static defaultExecutionRolePolicyARNs() {
        return ["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"];
    }
}

function createRunFunction(
        isFargate: boolean,
        taskDefArn: pulumi.Output<string>,
        containerToEnvironment: pulumi.Output<Record<string, aws.ecs.KeyValuePair[]>>) {

    return async function runTask(options: TaskRunOptions) {
        const ecs = new aws.sdk.ECS();

        const cluster = options.cluster;
        const usePrivateSubnets = cluster.network.usePrivateSubnets;
        const clusterArn = cluster.instance.id.get();
        const securityGroupIds = cluster.securityGroups.map(g => g.instance.id.get());
        const subnetIds = cluster.network.subnetIds.map(i => i.get());

        const innerContainers = containerToEnvironment.get();
        const containerName = options.containerName || Object.keys(innerContainers)[0];
        if (!containerName) {
            throw new Error("No valid container name found to run task for.");
        }

        // Extract the environment values from the options
        const env1 = innerContainers[containerName] || [];
        const env2 = options.environment || [];

        const env = [...env1, ...env2];

        const assignPublicIp = isFargate && !usePrivateSubnets;

        // Run the task
        const res = await ecs.runTask({
            cluster: clusterArn,
            taskDefinition: taskDefArn.get(),
            placementConstraints: placementConstraints(isFargate, options.os),
            launchType: isFargate ? "FARGATE" : "EC2",
            networkConfiguration: {
                awsvpcConfiguration: {
                    assignPublicIp: assignPublicIp ? "ENABLED" : "DISABLED",
                    securityGroups: securityGroupIds,
                    subnets: subnetIds,
                },
            },
            overrides: {
                containerOverrides: [
                    {
                        name: "container",
                        environment: env,
                    },
                ],
            },
        }).promise();

        if (res.failures && res.failures.length > 0) {
            console.log("Failed to start task:" + JSON.stringify(res.failures));
            throw new Error("Failed to start task:" + JSON.stringify(res.failures));
        }
    };
}

function placementConstraints(isFargate: boolean, os: HostOperatingSystem | undefined) {
    if (isFargate) {
        return undefined;
    }

    os = os || "linux";

    return [{
        type: "memberOf",
        expression: `attribute:ecs.os-type == ${os}`,
    }];
}

function computeContainerDefinitions(
    parent: pulumi.Resource,
    name: string,
    containers: Record<string, ecs.Container>,
    logGroup: aws.cloudwatch.LogGroup): pulumi.Output<aws.ecs.ContainerDefinition[]> {

    const result: pulumi.Output<aws.ecs.ContainerDefinition>[] = [];

    for (const containerName of Object.keys(containers)) {
        const container = containers[containerName];

        result.push(ecs.computeContainerDefinition(parent, name, containerName, container, logGroup));
    }

    return pulumi.all(result);
}

// The shape we want for ClusterTaskDefinitionArgsOverwriteShap.  We don't export this as
// 'Overwrite' types are not pleasant to work with. However, they internally allow us to succinctly
// express the shape we're trying to provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<aws.ecs.TaskDefinitionArgs, {
    family?: never;
    containerDefinitions?: never;
    logGroup?: aws.cloudwatch.LogGroup
    taskRoleArn?: never;
    taskRole?: aws.iam.Role;
    executionRoleArn?: never;
    executionRole?: aws.iam.Role;
    cpu?: pulumi.Input<string>;
    memory?: pulumi.Input<string>;
    requiresCompatibilities: pulumi.Input<["FARGATE"] | ["EC2"]>;
    networkMode?: pulumi.Input<"none" | "bridge" | "awsvpc" | "host">;

    containers: Record<string, ecs.Container>;
}>;

export interface TaskDefinitionArgs {
    // Properties copied from aws.ecs.TaskDefinitionArgs

    /**
     * A set of placement constraints rules that are taken into consideration during task placement.
     * Maximum number of `placement_constraints` is `10`.
     */
    placementConstraints?: aws.ecs.TaskDefinitionArgs["placementConstraints"];

    /**
     * A set of volume blocks that containers in your task may use.
     */
    volumes?: aws.ecs.TaskDefinitionArgs["volumes"];

    // Properties we've added/changed.

    /**
     * Log group for logging information related to the service.  If not provided a default instance
     * with a one-day retention policy will be created.
     */
    logGroup?: aws.cloudwatch.LogGroup;

    /**
     * IAM role that allows your Amazon ECS container task to make calls to other AWS services.
     * If not provided, a default will be created for the task.
     */
    taskRole?: aws.iam.Role;

    /**
     * The execution role that the Amazon ECS container agent and the Docker daemon can assume.
     *
     * If not provided, a default will be created for the task.
     */
    executionRole?: aws.iam.Role;

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
     * A set of launch types required by the task. The valid values are `EC2` and `FARGATE`.
     */
    requiresCompatibilities: pulumi.Input<["FARGATE"] | ["EC2"]>;

    /**
     * The Docker networking mode to use for the containers in the task. The valid values are
     * `none`, `bridge`, `awsvpc`, and `host`.
     */
    networkMode?: pulumi.Input<"none" | "bridge" | "awsvpc" | "host">;

    /**
     * All the containers to make a ClusterTaskDefinition from.  Useful when creating a
     * ClusterService that will contain many containers within.
     *
     * Either [container] or [containers] must be provided.
     */
    containers: Record<string, ecs.Container>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteShape, TaskDefinitionArgs>();
