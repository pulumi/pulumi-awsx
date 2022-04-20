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
import * as ec2 from "../ec2";

import * as utils from "../utils";
import { Cluster } from "./cluster";
import { EC2TaskDefinition } from "./ec2Service";
import { FargateTaskDefinition, getSubnets } from "./fargateService";
import { Service, ServiceArgs, ServiceLoadBalancer, ServiceLoadBalancerProvider } from "./service";

export class CapacityProviderService extends Service {
    public readonly taskDefinition: FargateTaskDefinition | EC2TaskDefinition;

    constructor(name: string,
                args: CapacityProviderServiceArgs,
                opts: pulumi.ComponentResourceOptions = {}) {

        if (!args.taskDefinition) {
            throw new Error("The [taskDefinition] must be provided");
        }

        const cluster = args.cluster || Cluster.getDefault();

        const taskDefinition = args.taskDefinition;

        const securityGroups = ec2.getSecurityGroups(
            cluster.vpc, name, args.securityGroups || cluster.securityGroups, opts) || [];

        let assignPublicIp, networkConfiguration,
        subnets: pulumi.Input<pulumi.Input<string>[]>;

        if (taskDefinition instanceof FargateTaskDefinition) {
            assignPublicIp = utils.ifUndefined(args.assignPublicIp, true);
            subnets = getSubnets(cluster, args.subnets, assignPublicIp);
            networkConfiguration = {
                subnets,
                assignPublicIp,
                securityGroups: securityGroups.map(g => g.id),
            };
        } else {
            assignPublicIp = false;
            subnets = args.subnets || cluster.vpc.publicSubnetIds;
            networkConfiguration = taskDefinition.taskDefinition.networkMode.apply(n => {
                // The network configuration for the EC2 service. This parameter is required for task
                // definitions that use the `awsvpc` network mode to receive their own Elastic
                // Network Interface, and it is not supported for other network modes.
                if (n !== "awsvpc") {
                    return undefined!;
                }

                return {
                    subnets,
                    assignPublicIp: false,
                    securityGroups: securityGroups.map(g => g.id),
                };
            });
        }

        super("awsx:x:ecs:CapacityProviderService", name, {
            ...args,
            taskDefinition,
            securityGroups,
            networkConfiguration,
        }, opts);

        this.taskDefinition = taskDefinition;

        this.registerOutputs();
    }
}

type OverwriteCapacityProviderServiceArgs = utils.Overwrite<ServiceArgs, {
    taskDefinition: FargateTaskDefinition | EC2TaskDefinition;
    launchType?: never;
    networkConfiguration?: never;
    securityGroups?: ec2.SecurityGroupOrId[];
}>;

export interface CapacityProviderServiceArgs {
    // Properties from ecs.ServiceArgs

    /**
     * The custom capacity provider strategy to use for the service.
     * If not set, the cluster default capacity provider strategies
     * will be used.
     */
    capacityProviderStrategies?: aws.ecs.ServiceArgs["capacityProviderStrategies"];

    /**
     * Configuration block for deployment circuit breaker.
     */
    deploymentCircuitBreaker?: aws.ecs.ServiceArgs["deploymentCircuitBreaker"];

    /**
     * Configuration block containing deployment controller configuration.
     */
    deploymentController?: aws.ecs.ServiceArgs["deploymentController"];

    /**
     * The upper limit (as a percentage of the service's desiredCount) of the number of running
     * tasks that can be running in a service during a deployment. Not valid when using the `DAEMON`
     * scheduling strategy.
     */
    deploymentMaximumPercent?: pulumi.Input<number>;

    /**
     * The lower limit (as a percentage of the service's desiredCount) of the number of running
     * tasks that must remain running and healthy in a service during a deployment.
     */
    deploymentMinimumHealthyPercent?: pulumi.Input<number>;

    /**
     * The number of instances of the task definition to place and keep running. Defaults to 1. Do
     * not specify if using the `DAEMON` scheduling strategy.
     */
    desiredCount?: pulumi.Input<number>;

    /**
     * Specifies whether to enable Amazon ECS managed tags for the tasks within the service.
     */
    enableEcsManagedTags?: pulumi.Input<boolean>;

    /**
     * Specifies whether to enable Amazon ECS Exec for the tasks within the service.
     */
    enableExecuteCommand?: pulumi.Input<boolean>;

    /**
     * Enable to force a new task deployment of the service. This can be used to update tasks to use a newer
     * Docker image with same image/tag combination (e.g. myimage:latest), roll Fargate tasks onto a newer platform
     * version, or immediately deploy orderedPlacementStrategies and placementConstraints updates.
     */
    forceNewDeployment?: pulumi.Input<boolean>;

    /**
     * Seconds to ignore failing load balancer health checks on newly instantiated tasks to prevent
     * premature shutdown, up to 7200. Only valid for services configured to use load balancers.
     */
    healthCheckGracePeriodSeconds?: pulumi.Input<number>;

    /**
     * ARN of the IAM role that allows Amazon ECS to make calls to your load balancer on your
     * behalf. This parameter is required if you are using a load balancer with your service, but
     * only if your task definition does not use the `awsvpc` network mode. If using `awsvpc`
     * network mode, do not specify this role. If your account has already created the Amazon ECS
     * service-linked role, that role is used by default for your service unless you specify a role
     * here.
     */
    iamRole?: pulumi.Input<string>;

    /**
     * A load balancer block. Load balancers documented below.
     */
    loadBalancers?: (pulumi.Input<ServiceLoadBalancer> | ServiceLoadBalancerProvider)[];

    /**
     * The name of the service (up to 255 letters, numbers, hyphens, and underscores)
     */
    name?: pulumi.Input<string>;

    /**
     * Whether or not public IPs should be provided for the instances.
     *
     * Defaults to [true] if unspecified.
     */
    assignPublicIp?: pulumi.Input<boolean>;

    /**
     * The security groups to use for the instances.
     *
     * Defaults to [cluster.securityGroups] if unspecified.
     */
    securityGroups?: ec2.SecurityGroupOrId[];

    /**
     * The subnets to connect the instances to.  If unspecified and [assignPublicIp] is true, then
     * these will be the public subnets of the cluster's vpc.  If unspecified and [assignPublicIp]
     * is false, then these will be the private subnets of the cluster's vpc.
     */
    subnets?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * Service level strategy rules that are taken into consideration during task placement. List
     * from top to bottom in order of precedence. The maximum number of `ordered_placement_strategy`
     * blocks is `5`. Defined below.
     */
    orderedPlacementStrategies?: aws.ecs.ServiceArgs["orderedPlacementStrategies"];

    /**
     * rules that are taken into consideration during task placement. Maximum number of
     * `placement_constraints` is `10`. Defined below.
     */
    placementConstraints?: aws.ecs.ServiceArgs["placementConstraints"];

    /**
     * The platform version on which to run your service. Only applicable for `launchType` set to `FARGATE`.
     * Defaults to `LATEST`. More information about Fargate platform versions can be found in the
     * [AWS ECS User Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/platform_versions.html).
     */
    platformVersion?: pulumi.Input<string>;

    /**
     * The scheduling strategy to use for the service. The valid values are `REPLICA` and `DAEMON`.
     * Defaults to `REPLICA`. Note that [*Fargate tasks do not support the `DAEMON` scheduling
     * strategy*](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/scheduling_tasks.html).
     */
    schedulingStrategy?: pulumi.Input<string>;

    /**
     * Specifies whether to propagate the tags from the task definition or the service
     * to the tasks. The valid values are `SERVICE` and `TASK_DEFINITION`.
     */
    propagateTags?: pulumi.Input<string>;

    /**
     * The service discovery registries for the service. The maximum number of `service_registries` blocks is `1`.
     */
    serviceRegistries?: aws.ecs.ServiceArgs["serviceRegistries"];

    // Changes we made to the core args type.

    /**
     * Cluster this service will run in.  If unspecified, [Cluster.getDefault()] will be used.
     */
    cluster?: Cluster;

    os?: pulumi.Input<"linux" | "windows">;

    /**
     * Wait for the service to reach a steady state (like [`aws ecs wait
     * services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html))
     * before continuing. Defaults to `true`.
     */
    waitForSteadyState?: pulumi.Input<boolean>;

    // Properties we're adding.

    /**
     * The task definition to create the service from.
     */
    taskDefinition: FargateTaskDefinition | EC2TaskDefinition;

    /**
     * Key-value mapping of resource tags
     */
    tags?: pulumi.Input<aws.Tags>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test: string = utils.checkCompat<OverwriteCapacityProviderServiceArgs, CapacityProviderServiceArgs>();
