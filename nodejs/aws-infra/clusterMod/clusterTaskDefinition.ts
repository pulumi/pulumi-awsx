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
// import { RunError } from "@pulumi/pulumi/errors";
// import { getAvailabilityZone } from "./aws";
// import { ClusterNetworkArgs } from "./cluster";

import * as utils from "../utils";

import { Cluster2 } from "./../clusterMod";
import { ClusterLoadBalancer, ClusterLoadBalancerPort } from "./clusterLoadBalancer";

export type TaskHost = "linux" | "windows";

export type ContainerDefinition = utils.Overwrite<aws.ecs.ContainerDefinition, {
    /**
     * Not provided.  Use [port] instead.
     */
    portMappings?: never;

    /**
     * The port information to create a load balancer for.  At most one container in a service
     * can have this set.  Should not be set for containers intended for TaskDeinitions that will
     * just be run, and will not be part of an aws.ecs.Service.
     */
    loadBalancerPort?: ClusterLoadBalancerPort;

    environment?: pulumi.Input<Record<string, pulumi.Input<string>>;
}>;

export type ClusterTaskDefinitionArgs = utils.Overwrite<aws.ecs.TaskDefinitionArgs, {
    // /**
    //  * Whether or not a load balancer should be created.  A load balancer is required for
    //  * a Service but should not be created for a Task.  If true, a load balancer will be
    //  * created for the first container in [containers] that specifies a loadBalancerPort
    //  */
    // createLoadBalancer: boolean;

    /** Not used.  Provide [container] or [containers] instead. */
    containerDefinitions?: never;

    /**
     * Single container to make a ClusterTaskDefinition from.  Useful for simple cases where there
     * aren't multiple containers, especially when creating a ClusterTaskDefinition to call [run]
     * on.
     *
     * Either [container] or [containers] must be provided.
     */
    container?: ContainerDefinition;

    /**
     * All the containers to make a ClusterTaskDefinition from.  Useful when creating a
     * ClusterService that will contain many containers within.
     */
    containers?: Record<string, ContainerDefinition>;

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

export type FargateTaskDefinitionArgs = utils.Overwrite<ClusterTaskDefinitionArgs, {
    /** Not provided.  Defaults automatically to ["FARGATE"] */
    requiresCompatibilities?: never;

    /** Not provided.  Defaults automatically to "awsvpc" */
    networkMode?: never;
}>;

export type EC2TaskDefinitionArgs = utils.Overwrite<ClusterTaskDefinitionArgs, {
    /** Not provided.  Defaults automatically to ["EC2"] */
    requiresCompatibilities?: never;

    /**
     * Not provided for ec2 task definitions.
     */
    cpu?: never;
    /**
     * Not provided for ec2 task definitions.
     */
    memory?: never;
}>;

export interface TaskRunOptions {
    /**
     * The name of the container to run as a task.  If not provided, the first container in the list
     * of containers in the ClusterTaskDefinition will be the one that is run.
     */
    containerName?: string;

    /**
     * Optional environment variables to override those set in the container definition.
     */
    environment?: Record<string, string>;
}

export class ClusterTaskDefinition extends aws.ecs.TaskDefinition {
    public readonly cluster: Cluster2;
    public readonly logGroup: aws.cloudwatch.LogGroup;
    public readonly loadBalancer?: ClusterLoadBalancer;
    public readonly containers: Record<string, ContainerDefinition>;

    /**
     * Runs this task definition in this cluster once.
     */
    public readonly run: (options?: TaskRunOptions) => Promise<void>;

    constructor(name: string, cluster: Cluster2,
                args: ClusterTaskDefinitionArgs,
                opts?: pulumi.ComponentResourceOptions) {
        if (!args.container && !args.containers) {
            throw new Error("Either [container] or [containers] must be provided");
        }

        const containers = args.containers || { container: args.container! };

        const logGroup = args.logGroup || new aws.cloudwatch.LogGroup(name, {
            retentionInDays: 1,
        }, opts);

        const taskRole = args.taskRole || createTaskRole(opts);
        const executionRole = args.executionRole || createExecutionRole(opts);

            // const taskDefinition = new aws.ecs.TaskDefinition(name, {
    //     family: name,
    //     containerDefinitions: containerDefinitions.apply(JSON.stringify),
    //     volumes: volumes,
    //     taskRoleArn: getTaskRole().arn,
    //     requiresCompatibilities: config.useFargate ? ["FARGATE"] : undefined,
    //     memory: config.useFargate ? taskMemoryAndCPU.apply(t => t.memory) : undefined,
    //     cpu: config.useFargate ? taskMemoryAndCPU.apply(t => t.cpu) : undefined,
    //     networkMode: "awsvpc",
    //     executionRoleArn: getExecutionRole().arn,
    // }, { parent: parent });


        const loadBalancer = createLoadBalancer(
            cluster, singleContainerWithLoadBalancerPort(containers));

        // for (const containerName of Object.keys(containers)) {
        //     const container = containers[containerName];
        //     // if (firstContainerName === undefined) {
        //     //     firstContainerName = containerName;
        //     //     if (container.ports && container.ports.length > 0) {
        //     //         firstContainerPort = container.ports[0].port;
        //     //     }
        //     // }

        //     // ports[containerName] = {};
        //     if (container.loadBalancerPort) {
        //         if (loadBalancer) {
        //             throw new Error("Only one port can currently be exposed per Service.");
        //         }
        //         const loadBalancerPort = container.loadBalancerPort;
        //         loadBalancer = cluster.createLoadBalancer(
        //             name + "-" + containerName, { loadBalancerPort });
        //         ports[containerName][portMapping.port] = {
        //             host: info.loadBalancer,
        //             hostPort: portMapping.port,
        //             hostProtocol: info.protocol,
        //         };
        //         loadBalancers.push({
        //             containerName: containerName,
        //             containerPort: loadBalancerPort.targetPort || loadBalancerPort.port,
        //             targetGroupArn: loadBalancer.targetGroup.arn,
        //         });
        //     }
        // }

        const containerDefinitions = computeContainerDefinitions(name, cluster, args);

        const taskDefArgs: aws.ecs.TaskDefinitionArgs = {
            ...args,
            family: name,
            taskRoleArn: taskRole.arn,
            executionRoleArn: executionRole.arn,
            containerDefinitions: containerDefinitions.apply(JSON.stringify),
        };

    // // Find all referenced Volumes.
    // const volumes: { hostPath?: string; name: string }[] = [];
    // for (const containerName of Object.keys(containers)) {
    //     const container = containers[containerName];

    //     // Collect referenced Volumes.
    //     if (container.volumes) {
    //         for (const volumeMount of container.volumes) {
    //             const volume = volumeMount.sourceVolume;
    //             volumes.push({
    //                 hostPath: (volume as Volume).getHostPath(),
    //                 name: (volume as Volume).getVolumeName(),
    //             });
    //         }
    //     }
    // }

    // // Create the task definition for the group of containers associated with this Service.
    // const containerDefinitions = computeContainerDefinitions(parent, containers, ports, logGroup);

    // // Compute the memory and CPU requirements of the task for Fargate
    // const taskMemoryAndCPU = containerDefinitions.apply(taskMemoryAndCPUForContainers);
        super(name, taskDefArgs, opts);

        this.containers = containers;
        this.cluster = cluster;
        this.logGroup = logGroup;
        this.loadBalancer = loadBalancer;

        const subnetIds = pulumi.all(cluster.network.subnetIds);
        const securityGroupId =  cluster.instanceSecurityGroup.id;

        const containersOutput = pulumi.output(containers);

        this.run = async function (options: TaskRunOptions = {}) {
            const ecs = new aws.sdk.ECS();

            const innerContainers = containersOutput.get();
            const containerName = options.containerName || Object.keys(innerContainers)[0];
            if (!containerName) {
                throw new Error("No valid container name found to run task for.")
            }

            const container = innerContainers[containerName];

            // Extract the environment values from the options
            const env: { name: string, value: string }[] = [];
            addEnvironmentVariables(container.environment);
            addEnvironmentVariables(options && options.environment);

            const useFargate = this.requiresCompatibilities.get()[0] === "FARGATE";
            const assignPublicIp = useFargate && !cluster.network.usePrivateSubnets;

            // Run the task
            const res = await ecs.runTask({
                cluster: cluster.arn.get(),
                taskDefinition: this.arn.get(),
                // placementConstraints: placementConstraintsForHost(options && options.host),
                launchType: useFargate ? "FARGATE" : "EC2",
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

function createLoadBalancer(
        cluster: Cluster2,
        info: { containerName: string, container: ContainerDefinition } | undefined) {
    if (!info) {
        return;
    }

    const { containerName, container } = info;
    return  cluster.createLoadBalancer(
        name + "-" + containerName, { loadBalancerPort: container.loadBalancerPort! });
}

export function singleContainerWithLoadBalancerPort(
    containers: Record<string, ContainerDefinition>) {

    let match: { containerName: string, container: ContainerDefinition } | undefined;
    for (const containerName of Object.keys(containers)) {
        const container = containers[containerName];
        const loadBalancerPort = container.loadBalancerPort;
        if (loadBalancerPort) {
            if (match) {
                throw new Error("Only a single container can specify a [loadBalancerPort].");
            }

            match = { containerName, container };
        }
    }

    return match;
}

function computeContainerDefinitions(
    name: string,
    cluster: Cluster2,
    args: ClusterTaskDefinitionArgs): pulumi.Output<aws.ecs.ContainerDefinition[]> {

    const result: pulumi.Output<aws.ecs.ContainerDefinition>[] = [];

    for (const containerName of Object.keys(args.containers)) {
        const container = args.containers[containerName];

        result.push(computeContainerDefinition(name, cluster, containerName, container));
    }

    return pulumi.all(result);

    let loadBalancer: ClusterLoadBalancer | undefined = undefined;
    const containers = args.containers;
    for (const containerName of Object.keys(containers)) {
        const container = containers[containerName];
        // if (firstContainerName === undefined) {
        //     firstContainerName = containerName;
        //     if (container.ports && container.ports.length > 0) {
        //         firstContainerPort = container.ports[0].port;
        //     }
        // }

        // ports[containerName] = {};
        if (container.loadBalancerPort) {
            if (loadBalancer) {
                throw new Error("Only one port can currently be exposed per Service.");
            }
            const loadBalancerPort = container.loadBalancerPort;
            loadBalancer = cluster.createLoadBalancer(
                name + "-" + containerName, container.loadBalancerPort);
            ports[containerName][portMapping.port] = {
                host: info.loadBalancer,
                hostPort: portMapping.port,
                hostProtocol: info.protocol,
            };
            loadBalancers.push({
                containerName: containerName,
                containerPort: loadBalancerPort.targetPort || loadBalancerPort.port,
                targetGroupArn: loadBalancer.targetGroup.arn,
            });
        }
    }
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

export class FargateTaskDefinition extends ClusterTaskDefinition {
    constructor(name: string, cluster: Cluster2,
                args: FargateTaskDefinitionArgs,
                opts?: pulumi.ComponentResourceOptions) {
        const baseArgs: ClusterTaskDefinitionArgs = {
            ...args,
            requiresCompatibilities: ["FARGATE"],
            networkMode: "awsvpc",
        };

        throw new Error("Set memory and cpu");

        super(name, cluster, baseArgs, opts);
    }
}

export class EC2TaskDefinition extends ClusterTaskDefinition {
    constructor(name: string, cluster: Cluster2,
                args: FargateTaskDefinitionArgs,
                opts?: pulumi.ComponentResourceOptions) {
        const baseArgs: ClusterTaskDefinitionArgs = {
            ...args,
            requiresCompatibilities: ["EC2"],
        };

        // baseArgs.requiresCompatibilities = ["EC2"];
        // baseArgs.networkMode = "awsvpc";
        throw new Error("Should we set the networking mode?");

        super(name, cluster, baseArgs, opts);
    }
}
