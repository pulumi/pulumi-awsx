import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import {
    FargateTaskDefinition,
    FargateTaskDefinitionArgs,
} from "./fargateTaskDefinition";
import * as utils from "../utils";
export interface FargateServiceArgs {
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
     * A list of load balancer objects to associate with the service. If you specify the Role property, LoadBalancers must be specified as well.
     */
    loadBalancers?: pulumi.Input<
        pulumi.Input<aws.types.input.ecs.ServiceLoadBalancer>[]
    >;

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
    securityGroups?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The subnets to connect the instances to.  If unspecified and [assignPublicIp] is true, then
     * these will be the public subnets of the cluster's vpc.  If unspecified and [assignPublicIp]
     * is false, then these will be the private subnets of the cluster's vpc.
     */
    subnets: pulumi.Input<pulumi.Input<string>[]>;

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
     * ARN of the Cluster this service will run in.
     */
    cluster: aws.ecs.Cluster | pulumi.Input<string>;

    os?: pulumi.Input<"linux" | "windows">;

    /**
     * Wait for the service to reach a steady state (like [`aws ecs wait
     * services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html))
     * before continuing. Defaults to `true`.
     */
    waitForSteadyState?: pulumi.Input<boolean>;

    // Properties we're adding.

    /**
     * ARN of the task definition to create the service from. Either [taskDefinition] or
     * [taskDefinitionArgs] must be provided.
     */
    taskDefinition?: pulumi.Input<string>;

    /**
     * The task definition to create the service from. Either [taskDefinition] or
     * [taskDefinitionArgs] must be provided.
     */
    taskDefinitionArgs?: FargateTaskDefinitionArgs;

    /**
     * Key-value mapping of resource tags
     */
    tags?: pulumi.Input<aws.Tags>;
}

export class FargateService extends pulumi.ComponentResource {
    public readonly taskDefinition?: FargateTaskDefinition;
    public readonly service: aws.ecs.Service;

    constructor(
        name: string,
        args: FargateServiceArgs,
        opts: pulumi.ComponentResourceOptions = {}
    ) {
        super("awsx:x:ecs:FargateService", name, {}, opts);

        if (
            args.taskDefinition !== undefined &&
            args.taskDefinitionArgs !== undefined
        ) {
            throw new Error(
                "Only one of `taskDefinition` or `taskDefinitionArgs` can be provided."
            );
        }
        let taskDefinition = args.taskDefinition;
        if (args.taskDefinitionArgs) {
            this.taskDefinition = new FargateTaskDefinition(
                name,
                args.taskDefinitionArgs,
                {
                    parent: this,
                }
            );
            taskDefinition = this.taskDefinition.taskDefinition.arn;
        }
        if (taskDefinition == undefined) {
            throw new Error(
                "Either `taskDefinition` or `taskDefinitionArgs` must be provided."
            );
        }

        this.service = new aws.ecs.Service(
            name,
            {
                ...args,
                cluster: aws.ecs.Cluster.isInstance(args.cluster)
                    ? args.cluster.arn
                    : args.cluster,
                launchType: "FARGATE",
                loadBalancers:
                    args.loadBalancers ?? this.taskDefinition?.loadBalancers,
                networkConfiguration: {
                    subnets: args.subnets,
                    assignPublicIp: utils.ifUndefined(
                        args.assignPublicIp,
                        true
                    ),
                    securityGroups: args.securityGroups,
                },
                taskDefinition,
            },
            { parent: this }
        );

        this.registerOutputs();
    }
}
