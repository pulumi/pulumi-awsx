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
import * as ecssdk from "@aws-sdk/client-ecs";
import * as ec2 from "../ec2";
import * as lb from "../lb";
import * as role from "../role";
import { Cluster } from "./cluster";
import { computeContainerDefinition, Container } from "./container";

import * as utils from "../utils";

export abstract class TaskDefinition extends pulumi.ComponentResource {
    public readonly taskDefinition: aws.ecs.TaskDefinition;
    public readonly logGroup?: aws.cloudwatch.LogGroup;
    public readonly containers: Record<string, Container>;
    public readonly taskRole?: aws.iam.Role;
    public readonly executionRole?: aws.iam.Role;

    /**
     * Mapping from container in this task to the ELB listener exposing it through a load balancer.
     * Only present if a listener was provided in [Container.portMappings] or in
     * [Container.applicationListener] or [Container.networkListener].
     */
    public readonly listeners: Record<string, lb.Listener> = {};
    public readonly applicationListeners: Record<string, lb.ApplicationListener> = {};
    public readonly networkListeners: Record<string, lb.NetworkListener> = {};

    /**
     * Run one or more instances of this TaskDefinition using the ECS `runTask` API, returning the Task instances.
     *
     * This wrapper around `runTask` provides appropriate defaults based on the TaskDefinition and allows specifying a Cluster instead of individual network configurations.
     *
     * This API is designed for use at runtime.
     */
    public readonly run: (
        params: RunTaskRequest,
    ) => Promise<ecssdk.RunTaskCommandOutput>;

    constructor(type: string, name: string,
                isFargate: boolean, args: TaskDefinitionArgs,
                opts: pulumi.ComponentResourceOptions) {
        super(type, name, {}, opts);

        this.logGroup = args.logGroup === null ? undefined :
                        args.logGroup ? args.logGroup : new aws.cloudwatch.LogGroup(name, {
            retentionInDays: 1,
        }, { parent: this });

        this.taskRole = args.taskRole === null ? undefined :
                        args.taskRole ? args.taskRole : TaskDefinition.createTaskRole(
            `${name}-task`, /*assumeRolePolicy*/ undefined, /*policyArns*/ undefined, { parent: this });

        this.executionRole = args.executionRole === null ? undefined :
                             args.executionRole ? args.executionRole : TaskDefinition.createExecutionRole(
            `${name}-execution`, /*assumeRolePolicy*/ undefined, /*policyArns*/ undefined, { parent: this });

        this.containers = args.containers;

        const containerDefinitions = computeContainerDefinitions(
            this, name, args.vpc, this.containers, this.applicationListeners, this.networkListeners, this.logGroup);
        this.listeners = {...this.applicationListeners, ...this.networkListeners };

        const containerString = containerDefinitions.apply(d => JSON.stringify(d));
        const defaultFamily = containerString.apply(s => name + "-" + utils.sha1hash(pulumi.getStack() + containerString));
        const family = utils.ifUndefined(args.family, defaultFamily);

        this.taskDefinition = new aws.ecs.TaskDefinition(name, {
            ...args,
            family: family,
            taskRoleArn: this.taskRole ? this.taskRole.arn : undefined,
            executionRoleArn: this.executionRole ? this.executionRole.arn : undefined,
            containerDefinitions: containerString,
        }, { parent: this });

        this.run = createRunFunction(isFargate, this.taskDefinition.arn);
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
            opts?: pulumi.ComponentResourceOptions): aws.iam.Role {

        return role.createRole(
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
            opts?: pulumi.ComponentResourceOptions): aws.iam.Role {

        return role.createRole(
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
            // Provides full access to Lambda
            aws.iam.ManagedPolicy.LambdaFullAccess,
            // Required for lambda compute to be able to run Tasks
            aws.iam.ManagedPolicy.AmazonECSFullAccess,
        ];
    }

    // Default policy arns for the Execution role.
    public static defaultExecutionRolePolicyARNs() {
        return [
            "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
            aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
        ];
    }
}

export interface RunTaskRequest {
    /**
     * The Cluster to run the Task within.
     */
    cluster: Cluster;
    /**
     * A list of container overrides in JSON format that specify the name of a container in the specified task definition and the overrides it should receive. You can override the default command for a container (that is specified in the task definition or Docker image) with a command override. You can also override existing environment variables (that are specified in the task definition or Docker image) on a container or add new environment variables to it with an environment override.  A total of 8192 characters are allowed for overrides. This limit includes the JSON formatting characters of the override structure.
     */
    overrides?: ecssdk.TaskOverride;
    /**
     * The number of instantiations of the specified task to place on your cluster. You can specify up to 10 tasks per call.
     */
    count?: number;
    /**
     * An optional tag specified when a task is started. For example, if you automatically trigger a task to run a batch process job, you could apply a unique identifier for that job to your task with the startedBy parameter. You can then identify which tasks belong to that job by filtering the results of a ListTasks call with the startedBy value. Up to 36 letters (uppercase and lowercase), numbers, hyphens, and underscores are allowed. If a task is started by an Amazon ECS service, then the startedBy parameter contains the deployment ID of the service that starts it.
     */
    startedBy?: string;
    /**
     * The name of the task group to associate with the task. The default value is the family name of the task definition (for example, family:my-family-name).
     */
    group?: string;
    /**
     * An array of placement constraint objects to use for the task. You can specify up to 10 constraints per task (including constraints in the task definition and those specified at runtime).
     */
    placementConstraints?: ecssdk.PlacementConstraint[];
    /**
     * The placement strategy objects to use for the task. You can specify a maximum of five strategy rules per task.
     */
    placementStrategy?: ecssdk.PlacementStrategy[];
    /**
     * The platform version the task should run. A platform version is only specified for tasks using the Fargate launch type. If one is not specified, the LATEST platform version is used by default. For more information, see AWS Fargate Platform Versions in the Amazon Elastic Container Service Developer Guide.
     */
    platformVersion?: string;
    /**
     * The network configuration for the task. This parameter is required for task definitions that use the awsvpc network mode to receive their own elastic network interface, and it is not supported for other network modes. For more information, see Task Networking in the Amazon Elastic Container Service Developer Guide.
     */
    networkConfiguration?: ecssdk.NetworkConfiguration;
    /**
     * The metadata that you apply to the task to help you categorize and organize them. Each tag consists of a key and an optional value, both of which you define. Tag keys can have a maximum character length of 128 characters, and tag values can have a maximum length of 256 characters.
     */
    tags?: ecssdk.Tag[];
    /**
     * Specifies whether to enable Amazon ECS managed tags for the task. For more information, see Tagging Your Amazon ECS Resources in the Amazon Elastic Container Service Developer Guide.
     */
    enableECSManagedTags?: boolean;
    /**
     * Specifies whether to propagate the tags from the task definition or the service to the task. If no value is specified, the tags are not propagated.
     */
    propagateTags?: ecssdk.PropagateTags;
}

type RunTaskRequestOverrideShape = utils.Overwrite<ecssdk.RunTaskRequest, {
    cluster: Cluster;
    taskDefinition?: never;
    launchType?: never;
}>;
const _: string = utils.checkCompat<RunTaskRequestOverrideShape, RunTaskRequest>();

function createRunFunction(isFargate: boolean, taskDefArn: pulumi.Output<string>) {
    return async function run(params: RunTaskRequest) {

        const ecs = new ecssdk.ECS();

        const cluster = params.cluster;
        const clusterArn = cluster.id.get();

        const securityGroupIds = cluster.securityGroups.map(g => g.id.get());
        const publicSubnetIds = await cluster.vpc.publicSubnetIds;

        const subnetIds = publicSubnetIds.map(i => i.get());
        const assignPublicIp = isFargate; // && !usePrivateSubnets;
        const assignPublicIpSdk: ecssdk.AssignPublicIp = assignPublicIp ? "ENABLED" : "DISABLED";

        // Run the task
        return ecs.runTask({
            taskDefinition: taskDefArn.get(),
            launchType: isFargate ? "FARGATE" : "EC2",
            networkConfiguration: {
                awsvpcConfiguration: {
                    assignPublicIp: assignPublicIpSdk,
                    securityGroups: securityGroupIds,
                    subnets: subnetIds,
                },
            },
            ...params,
            cluster: clusterArn, // Make sure to override the value of `params.cluster`
        });
    };
}

function computeContainerDefinitions(
    parent: pulumi.Resource,
    name: string,
    vpc: ec2.Vpc | undefined,
    containers: Record<string, Container>,
    applicationListeners: Record<string, lb.ApplicationListener>,
    networkListeners: Record<string, lb.NetworkListener>,
    logGroup: aws.cloudwatch.LogGroup | undefined | null): pulumi.Output<aws.ecs.ContainerDefinition[]> {

    const result: pulumi.Output<aws.ecs.ContainerDefinition>[] = [];

    for (const containerName of Object.keys(containers)) {
        const container = containers[containerName];

        result.push(computeContainerDefinition(
            parent, name, vpc, containerName, container,
            applicationListeners, networkListeners, logGroup));
    }

    return pulumi.all(result);
}

// The shape we want for ClusterTaskDefinitionArgsOverwriteShap.  We don't export this as
// 'Overwrite' types are not pleasant to work with. However, they internally allow us to succinctly
// express the shape we're trying to provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<aws.ecs.TaskDefinitionArgs, {
    family?: pulumi.Input<string>;
    containerDefinitions?: never;
    logGroup?: aws.cloudwatch.LogGroup | null
    taskRoleArn?: never;
    taskRole?: aws.iam.Role | null;
    executionRoleArn?: never;
    executionRole?: aws.iam.Role | null;
    cpu?: pulumi.Input<string>;
    memory?: pulumi.Input<string>;
    requiresCompatibilities: pulumi.Input<["FARGATE"] | ["EC2"]>;
    networkMode?: pulumi.Input<"none" | "bridge" | "awsvpc" | "host">;

    containers: Record<string, Container>;
}>;

export interface TaskDefinitionArgs {
    // Added for AWSX

    /**
     * The vpc that the service for this task will run in.  Does not normally need to be explicitly
     * provided as it will be inferred from the cluster the service is associated with.
     */
    vpc?: ec2.Vpc;

    /**
     * Log group for logging information related to the service.  If `undefined` a default instance
     * with a one-day retention policy will be created.  If `null`, no log group will be created.
     */
    logGroup?: aws.cloudwatch.LogGroup | null;

    // Copied from aws.ecs.TaskDefinitionArgs

    /**
     * All the containers to make a ClusterTaskDefinition from.  Useful when creating a
     * ClusterService that will contain many containers within.
     *
     * Either [container] or [containers] must be provided.
     */
    containers: Record<string, Container>;

    /**
     * The number of cpu units used by the task.  If not provided, a default will be computed
     * based on the cumulative needs specified by [containerDefinitions]
     */
    cpu?: pulumi.Input<string>;

    /**
     * The execution role that the Amazon ECS container agent and the Docker daemon can assume.
     *
     * If `undefined`, a default will be created for the task.  If `null`, no task will be created.
     */
    executionRole?: aws.iam.Role | null;

    /**
     * An optional family name for the Task Definition. If not specified, then a suitable default will be created.
     */
    family?: pulumi.Input<string>;

    /**
     * The IPC resource namespace to be used for the containers in the task The valid values are `host`, `task`, and `none`.
     */
    ipcMode?: pulumi.Input<string>;

    /**
     * The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
     * based on the cumulative needs specified by [containerDefinitions]
     */
    memory?: pulumi.Input<string>;

    /**
     * The Docker networking mode to use for the containers in the task. The valid values are
     * `none`, `bridge`, `awsvpc`, and `host`.
     */
    networkMode?: pulumi.Input<"none" | "bridge" | "awsvpc" | "host">;

    /**
     * The process namespace to use for the containers in the task. The valid values are `host` and `task`.
     */
    pidMode?: pulumi.Input<string>;

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
     * A set of launch types required by the task. The valid values are `EC2` and `FARGATE`.
     */
    requiresCompatibilities: pulumi.Input<["FARGATE"] | ["EC2"]>;

    /**
     * Key-value mapping of resource tags
     */
    tags?: pulumi.Input<aws.Tags>;

    /**
     * IAM role that allows your Amazon ECS container task to make calls to other AWS services. If
     * `undefined`, a default will be created for the task.  If `null`, no task will be created.
     */
    taskRole?: aws.iam.Role | null;

    /**
     * A set of volume blocks that containers in your task may use.
     */
    volumes?: aws.ecs.TaskDefinitionArgs["volumes"];

}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteShape, TaskDefinitionArgs>();
