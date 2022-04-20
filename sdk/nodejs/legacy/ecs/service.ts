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
import * as lb from "../lb";
import { Cluster } from "./cluster";
import { ContainerLoadBalancerProvider, isContainerLoadBalancerProvider } from "./container";
import { TaskDefinition } from "./taskDefinition";

import * as utils from "../utils";

export abstract class Service extends pulumi.ComponentResource {
    public readonly service: aws.ecs.Service;
    public readonly cluster: Cluster;
    public readonly taskDefinition: TaskDefinition;

    /**
     * Mapping from container in this service to the ELB listener exposing it through a load
     * balancer. Only present if a listener was provided in [Container.portMappings] or in
     * [Container.applicationListener] or [Container.networkListener].
     */
    public readonly listeners: Record<string, lb.Listener> = {};
    public readonly applicationListeners: Record<string, lb.ApplicationListener> = {};
    public readonly networkListeners: Record<string, lb.NetworkListener> = {};

    constructor(type: string, name: string,
                args: ServiceArgs,
                opts: pulumi.ComponentResourceOptions) {
        super(type, name, {}, opts);

        this.cluster = args.cluster || Cluster.getDefault();

        this.listeners = args.taskDefinition.listeners;
        this.applicationListeners = args.taskDefinition.applicationListeners;
        this.networkListeners = args.taskDefinition.networkListeners;

        // Determine which load balancers we're attached to based on the information supplied to the
        // containers for this service.
        const loadBalancers = getLoadBalancers(this, name, args);

        this.service = new aws.ecs.Service(name, {
            ...args,
            loadBalancers,
            cluster: this.cluster.cluster.arn,
            taskDefinition: args.taskDefinition.taskDefinition.arn,
            desiredCount: utils.ifUndefined(args.desiredCount, 1),
            waitForSteadyState: utils.ifUndefined(args.waitForSteadyState, true),
        }, pulumi.mergeOptions(opts, {
            parent: this,
            dependsOn: this.cluster.autoScalingGroups.map(g => g.stack),
        }));

        this.taskDefinition = args.taskDefinition;
    }
}

function getLoadBalancers(service: Service, name: string, args: ServiceArgs) {
    const result: pulumi.Output<ServiceLoadBalancer>[] = [];

    // Get the initial set of load balancers if specified directly in our args.
    if (args.loadBalancers) {
        for (const obj of args.loadBalancers) {
            const loadBalancer = isServiceLoadBalancerProvider(obj)
                ? obj.serviceLoadBalancer(name, service)
                : obj;
            result.push(pulumi.output(loadBalancer));
        }
    }

    const containerLoadBalancerProviders: [string, ContainerLoadBalancerProvider][] = [];

    // Now walk each container and see if it wants to add load balancer information as well.
    for (const containerName of Object.keys(args.taskDefinition.containers)) {
        const container = args.taskDefinition.containers[containerName];
        if (!container.portMappings) {
            continue;
        }

        for (const obj of container.portMappings) {
            if (isContainerLoadBalancerProvider(obj)) {
                containerLoadBalancerProviders.push([containerName, obj]);
            }
        }
    }

    // Finally see if we were directly given load balancing listeners to associate our containers
    // with. If so, use their information to populate our LB information.
    for (const containerName of Object.keys(service.listeners)) {
        const provider = service.listeners[containerName];
        if (!containerLoadBalancerProviders.some(p => p[0] === containerName && p[1] === provider)) {
            containerLoadBalancerProviders.push([containerName, provider]);
        }
    }

    for (const [containerName, provider] of containerLoadBalancerProviders) {
        processContainerLoadBalancerProvider(containerName, provider);
    }

    return pulumi.output(result);

    function processContainerLoadBalancerProvider(containerName: string, prov: ContainerLoadBalancerProvider) {
        // Containers don't know their own name.  So we add the name in here on their behalf.
        const containerLoadBalancer = prov.containerLoadBalancer(name, service);
        const serviceLoadBalancer = pulumi.output(containerLoadBalancer).apply(
            lb => ({ ...lb, containerName }));
        result.push(serviceLoadBalancer);
    }
}

export interface ServiceLoadBalancer {
    containerName: pulumi.Input<string>;
    containerPort: pulumi.Input<number>;
    elbName?: pulumi.Input<string>;
    targetGroupArn?: pulumi.Input<string>;
}

export interface ServiceLoadBalancerProvider {
    serviceLoadBalancer(name: string, parent: pulumi.Resource): pulumi.Input<ServiceLoadBalancer>;
}

/** @internal */
export function isServiceLoadBalancerProvider(obj: any): obj is ServiceLoadBalancerProvider {
    return obj && (<ServiceLoadBalancerProvider>obj).serviceLoadBalancer instanceof Function;
}

// The shape we want for ClusterFileSystemArgs.  We don't export this as 'Overwrite' types are not pleasant to
// work with. However, they internally allow us to succinctly express the shape we're trying to
// provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<utils.Mutable<aws.ecs.ServiceArgs>, {
    cluster?: Cluster;
    taskDefinition: TaskDefinition;
    securityGroups: ec2.SecurityGroup[];
    desiredCount?: pulumi.Input<number>;
    launchType?: pulumi.Input<"EC2" | "FARGATE">;
    os?: pulumi.Input<"linux" | "windows">;
    waitForSteadyState?: pulumi.Input<boolean>;
    loadBalancers?: (pulumi.Input<ServiceLoadBalancer> | ServiceLoadBalancerProvider)[];
    tags?: pulumi.Input<aws.Tags>;
}>;

export interface NetworkConfiguration {
    /**
     * Assign a public IP address to the ENI (Fargate launch type only). Valid values are true or
     * false. Default false.
     *
     */
    assignPublicIp?: pulumi.Input<boolean>;

    /**
     * The security groups associated with the task or service. If you do not specify a security
     * group, the default security group for the VPC is used.
     */
    securityGroups?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The subnets associated with the task or service.
     */
    subnets: pulumi.Input<pulumi.Input<string>[]>;
}

export interface ServiceArgs {
    // Properties from aws.ecs.ServiceArgs

    /**
     * The capacity provider strategy to use for the service.
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
     * Enable to force a new task deployment of the service. This can be used to update tasks
     * to use a newer Docker image with same image/tag combination (e.g. `myimage:latest`), roll
     * Fargate tasks onto a newer platform version, or immediately deploy `orderedPlacementStrategy`
     * and `placementConstraints` updates.
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
     * The launch type on which to run your service. The valid values are `EC2` and `FARGATE`.
     * Defaults to `EC2`.
     */
    launchType?: pulumi.Input<"EC2" | "FARGATE">;

    /**
     * A load balancer block. Load balancers documented below.
     */
    loadBalancers?: (pulumi.Input<ServiceLoadBalancer> | ServiceLoadBalancerProvider)[];

    /**
     * The name of the service (up to 255 letters, numbers, hyphens, and underscores)
     */
    name?: pulumi.Input<string>;

    /**
     * The network configuration for the service. This parameter is required for task definitions
     * that use the `awsvpc` network mode to receive their own Elastic Network Interface, and it is
     * not supported for other network modes.
     */
    networkConfiguration?: pulumi.Input<NetworkConfiguration>;

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
     * Specifies whether to propagate the tags from the task definition or the service
     * to the tasks. The valid values are `SERVICE` and `TASK_DEFINITION`.
     */
    propagateTags?: pulumi.Input<string>;

    /**
     * The scheduling strategy to use for the service. The valid values are `REPLICA` and `DAEMON`.
     * Defaults to `REPLICA`. Note that [*Fargate tasks do not support the `DAEMON` scheduling
     * strategy*](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/scheduling_tasks.html).
     */
    schedulingStrategy?: pulumi.Input<string>;

    /**
     * The service discovery registries for the service. The maximum number of `service_registries` blocks is `1`.
     */
    serviceRegistries?: aws.ecs.ServiceArgs["serviceRegistries"];

    /**
     * Key-value mapping of resource tags
     */
    tags?: pulumi.Input<aws.Tags>;

    /**
     * Wait for the service to reach a steady state (like [`aws ecs wait
     * services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html))
     * before continuing. Defaults to `true`.
     */
    waitForSteadyState?: pulumi.Input<boolean>;

    // Changes we made to the core args type.

    /**
     * Cluster this service will run in.  If not specified [Cluster.getDefault()] will be used.
     */
    cluster?: Cluster;

    /**
     * The task definition to create the service from.
     */
    taskDefinition: TaskDefinition;

    /**
     * Security groups determining how this service can be reached.
     */
    securityGroups: ec2.SecurityGroup[];
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteShape, ServiceArgs>();
