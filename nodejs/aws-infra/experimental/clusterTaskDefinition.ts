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

export declare type HostOperatingSystem = "linux" | "windows";

export type ClusterTaskDefinitionArgs = utils.Overwrite<aws.ecs.TaskDefinitionArgs, {
    /**
     * Not used.  The pulumi resource name will be used for this.
     */
    family?: never;

    /** Not used.  Provide  [containers] instead. */
    containerDefinitions?: never;

    /**
     * All the containers to make a ClusterTaskDefinition from.  Useful when creating a
     * ClusterService that will contain many containers within.
     */
    containers: Record<string, module.ContainerDefinition>;

    /**
     * Log group for logging information related to the service.  If not provided a default instance
     * with a one-day retention policy will be created.for no log group.
     */
    logGroup?: aws.cloudwatch.LogGroup

    /**
     * Not used.  Provide [taskRole] instead.
     */
    taskRoleArn?: never;
    /**
     * IAM role that allows your Amazon ECS container task to make calls to other AWS services.
     * If not provided, a default will be created for the task.
     */
    taskRole?: aws.iam.Role;

    /**
     * Not used.  Provide [executionRole] instead.
     */
    executionRoleArn?: never;

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
}>;

export interface TaskRunOptions {
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
    environment?: Record<string, string>;
}

export abstract class ClusterTaskDefinition extends aws.ecs.TaskDefinition {
    public readonly cluster: module.Cluster;
    public readonly logGroup: aws.cloudwatch.LogGroup;
    public readonly containers: Record<string, module.ContainerDefinition>;
    public readonly taskRole: aws.iam.Role;
    public readonly executionRole: aws.iam.Role;

    /**
     * Information about the exposed port for the task definitions if it has one.
     */
    public readonly exposedPort?: ExposedPort;

    public readonly endpoints: pulumi.Output<module.Endpoints>;
    public readonly defaultEndpoint: pulumi.Output<module.Endpoint | undefined>;

    public readonly getEndpoint: (containerName?: string, containerPort?: number) => Promise<module.Endpoint>;

    /**
     * Runs this task definition in this cluster once.
     */
    public readonly run: (options?: TaskRunOptions) => Promise<void>;

    protected abstract isFargate(): boolean;

    constructor(name: string, cluster: module.Cluster,
                args: ClusterTaskDefinitionArgs,
                opts?: pulumi.ComponentResourceOptions) {

        const logGroup = args.logGroup || new aws.cloudwatch.LogGroup(name, {
            retentionInDays: 1,
        }, opts);

        const taskRole = args.taskRole || createTaskRole(opts);
        const executionRole = args.executionRole || createExecutionRole(opts);

        const containers = args.containers;
        const exposedPortOpt = getExposedPort(name, cluster, containers);

        // todo(cyrusn): volumes.
        //     // Find all referenced Volumes.
//     const volumes: { hostPath?: string; name: string }[] = [];
//     for (const containerName of Object.keys(containers)) {
//         const container = containers[containerName];

//         // Collect referenced Volumes.
//         if (container.volumes) {
//             for (const volumeMount of container.volumes) {
//                 const volume = volumeMount.sourceVolume;
//                 volumes.push({
//                     hostPath: (volume as Volume).getHostPath(),
//                     name: (volume as Volume).getVolumeName(),
//                 });
//             }
//         }
//     }

        // const { firstContainerName, firstContainerPort, wrappedEndpoints } =
        //     getEndpointInfo(containers, loadBalancer!);

        const containerDefinitions = computeContainerDefinitions(
            name, cluster, args, exposedPortOpt, logGroup);

        super(name, {
            ...args,
            family:  name,
            taskRoleArn: taskRole.arn,
            executionRoleArn: executionRole.arn,
            containerDefinitions: containerDefinitions.apply(JSON.stringify),
        }, opts);

        this.containers = containers;
        this.cluster = cluster;
        this.logGroup = logGroup;
        this.taskRole = taskRole;
        this.executionRole = executionRole;

        this.exposedPort = exposedPortOpt;

        const endpoints = exposedPortOpt === undefined
            ? pulumi.output<module.Endpoints>({})
            : pulumi.output({
                [exposedPortOpt.containerName]: {
                    [exposedPortOpt.loadBalancerPort.port]: {
                        hostname: exposedPortOpt.loadBalancer.dnsName,
                        port: exposedPortOpt.loadBalancerPort.port,
                    } } });

        this.endpoints = endpoints;

        this.defaultEndpoint = exposedPortOpt === undefined
            ? pulumi.output(undefined)
            : endpoints.apply(
                ep => getEndpointHelper(ep, /*containerName:*/ undefined, /*containerPort:*/ undefined));

        this.getEndpoint = async (containerName, containerPort) =>
            getEndpointHelper(endpoints.get(), containerName, containerPort);

        const subnetIds = pulumi.all(cluster.network.subnetIds);
        const securityGroupId =  cluster.instanceSecurityGroup.id;

        const containersOutput = pulumi.output(containers);
        const isFargate = this.isFargate();

        this.run = async function (options: TaskRunOptions = {}) {
            const ecs = new aws.sdk.ECS();

            const innerContainers = containersOutput.get();
            const containerName = options.containerName || Object.keys(innerContainers)[0];
            if (!containerName) {
                throw new Error("No valid container name found to run task for.");
            }

            const container = innerContainers[containerName];

            // Extract the environment values from the options
            const env: { name: string, value: string }[] = [];
            addEnvironmentVariables(container.environment);
            addEnvironmentVariables(options && options.environment);

            const assignPublicIp = isFargate && !cluster.network.usePrivateSubnets;

            // Run the task
            const res = await ecs.runTask({
                cluster: cluster.arn.get(),
                taskDefinition: this.arn.get(),
                placementConstraints: placementConstraintsForHost(options && options.os),
                launchType: isFargate ? "FARGATE" : "EC2",
                networkConfiguration: {
                    awsvpcConfiguration: {
                        assignPublicIp: assignPublicIp ? "ENABLED" : "DISABLED",
                        securityGroups: [ securityGroupId.get() ],
                        subnets: subnetIds.get(),
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
                throw new Error("Failed to start task:" + JSON.stringify(res.failures));
            }

            return;

            // Local functions
            function addEnvironmentVariables(e: Record<string, string> | undefined) {
                if (e) {
                    for (const key of Object.keys(e)) {
                        const envVal = e[key];
                        if (envVal) {
                            env.push({ name: key, value: envVal });
                        }
                    }
                }
            }
        };
    }
}

function getEndpointHelper(
    endpoints: module.Endpoints, containerName: string | undefined, containerPort: number | undefined) {

    containerName = containerName || Object.keys(endpoints)[0];
    if (containerName === undefined)  {
        throw new Error(`No containers available in this service`);
    }

    const containerPorts = endpoints[containerName] || {};
    containerPort = containerPort || +Object.keys(containerPorts)[0];
    if (containerPort === undefined) {
        throw new Error(`No ports available in service container ${containerName}`);
    }

    const endpoint = containerPorts[containerPort];
    if (endpoint === undefined) {
        throw new Error(`No exposed port for ${containerName} port ${containerPort}`);
    }

    return endpoint;
}

export function placementConstraintsForHost(os: HostOperatingSystem | undefined) {
    os = os || "linux";

    return [{
        type: "memberOf",
        expression: `attribute:ecs.os-type == ${os}`,
    }];
}

export interface ExposedPort {
    /**
     * The name of the container this port maps to.
     */
    containerName: string;

    /**
     * Information about the type of port this is.
     */
    loadBalancerPort: module.ClusterLoadBalancerPort;

    /**
     * The load balancer that was created to map to the specified container port.
     */
    loadBalancer: module.ClusterLoadBalancer;
}

function getExposedPort(
    name: string, cluster: module.Cluster,
    containers: Record<string, module.ContainerDefinition>) {

    let exposedPort: ExposedPort | undefined;
    for (const containerName of Object.keys(containers)) {
        const container = containers[containerName];
        const loadBalancerPort = container.loadBalancerPort;
        if (loadBalancerPort) {
            if (exposedPort) {
                throw new Error("Only a single container can specify a [loadBalancerPort].");
            }

            const loadBalancer = cluster.createLoadBalancer(
                name + "-" + containerName, { loadBalancerPort });
            exposedPort = { containerName, loadBalancer, loadBalancerPort };
        }
    }

    return exposedPort;
}

function computeContainerDefinitions(
    name: string,
    cluster: module.Cluster,
    args: ClusterTaskDefinitionArgs,
    exposedPortOpt: ExposedPort | undefined,
    logGroup: aws.cloudwatch.LogGroup): pulumi.Output<aws.ecs.ContainerDefinition[]> {

    const result: pulumi.Output<aws.ecs.ContainerDefinition>[] = [];

    for (const containerName of Object.keys(args.containers)) {
        const container = args.containers[containerName];

        result.push(module.computeContainerDefinition(
            name, cluster, containerName, container, exposedPortOpt, logGroup));
    }

    return pulumi.all(result);
}

const defaultComputePolicies = [
    aws.iam.AWSLambdaFullAccess,                 // Provides wide access to "serverless" services (Dynamo, S3, etc.)
    aws.iam.AmazonEC2ContainerServiceFullAccess, // Required for lambda compute to be able to run Tasks
];

// The ECS Task assume role policy for Task Roles
const defaultTaskRolePolicy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sts:AssumeRole",
            "Principal": {
                "Service": "ecs-tasks.amazonaws.com",
            },
            "Effect": "Allow",
            "Sid": "",
        },
    ],
};

function createTaskRole(opts?: pulumi.ResourceOptions): aws.iam.Role {
    const taskRole = new aws.iam.Role("task", {
        assumeRolePolicy: JSON.stringify(defaultTaskRolePolicy),
    }, opts);

    // TODO[pulumi/pulumi-cloud#145]: These permissions are used for both Lambda and ECS compute.
    // We need to audit these permissions and potentially provide ways for users to directly configure these.
    const policies = defaultComputePolicies;
    for (let i = 0; i < policies.length; i++) {
        const policyArn = policies[i];
        const _ = new aws.iam.RolePolicyAttachment(
            `task-${utils.sha1hash(policyArn)}`, {
                role: taskRole,
                policyArn: policyArn,
            }, opts);
    }

    return taskRole;
}

function createExecutionRole(opts?: pulumi.ResourceOptions): aws.iam.Role {
    const executionRole = new aws.iam.Role("execution", {
        assumeRolePolicy: JSON.stringify(defaultTaskRolePolicy),
    }, opts);
    const _ = new aws.iam.RolePolicyAttachment("execution", {
        role: executionRole,
        policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    }, opts);

    return executionRole;
}
