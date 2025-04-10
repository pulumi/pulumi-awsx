// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as inputs from "../types/input";
import * as outputs from "../types/output";
import * as enums from "../types/enums";
import * as utilities from "../utilities";

import * as pulumiAws from "@pulumi/aws";

/**
 * Create a TaskDefinition resource with the given unique name, arguments, and options.
 * Creates required log-group and task & execution roles.
 * Presents required Service load balancers if target group included in port mappings.
 */
export class FargateTaskDefinition extends pulumi.ComponentResource {
    /** @internal */
    public static readonly __pulumiType = 'awsx:ecs:FargateTaskDefinition';

    /**
     * Returns true if the given object is an instance of FargateTaskDefinition.  This is designed to work even
     * when multiple copies of the Pulumi SDK have been loaded into the same process.
     */
    public static isInstance(obj: any): obj is FargateTaskDefinition {
        if (obj === undefined || obj === null) {
            return false;
        }
        return obj['__pulumiType'] === FargateTaskDefinition.__pulumiType;
    }

    /**
     * Auto-created IAM task execution role that the Amazon ECS container agent and the Docker daemon can assume.
     */
    public readonly executionRole!: pulumi.Output<pulumiAws.iam.Role | undefined>;
    /**
     * Computed load balancers from target groups specified of container port mappings.
     */
    public /*out*/ readonly loadBalancers!: pulumi.Output<pulumiAws.types.output.ecs.ServiceLoadBalancer[]>;
    /**
     * Auto-created Log Group resource for use by containers.
     */
    public readonly logGroup!: pulumi.Output<pulumiAws.cloudwatch.LogGroup | undefined>;
    /**
     * Underlying ECS Task Definition resource
     */
    public /*out*/ readonly taskDefinition!: pulumi.Output<pulumiAws.ecs.TaskDefinition>;
    /**
     * Auto-created IAM role that allows your Amazon ECS container task to make calls to other AWS services.
     */
    public readonly taskRole!: pulumi.Output<pulumiAws.iam.Role | undefined>;

    /**
     * Create a FargateTaskDefinition resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args?: FargateTaskDefinitionArgs, opts?: pulumi.ComponentResourceOptions) {
        let resourceInputs: pulumi.Inputs = {};
        opts = opts || {};
        if (!opts.id) {
            resourceInputs["container"] = args ? args.container : undefined;
            resourceInputs["containers"] = args ? args.containers : undefined;
            resourceInputs["cpu"] = args ? args.cpu : undefined;
            resourceInputs["enableFaultInjection"] = args ? args.enableFaultInjection : undefined;
            resourceInputs["ephemeralStorage"] = args ? args.ephemeralStorage : undefined;
            resourceInputs["executionRole"] = args ? args.executionRole : undefined;
            resourceInputs["family"] = args ? args.family : undefined;
            resourceInputs["inferenceAccelerators"] = args ? args.inferenceAccelerators : undefined;
            resourceInputs["ipcMode"] = args ? args.ipcMode : undefined;
            resourceInputs["logGroup"] = args ? args.logGroup : undefined;
            resourceInputs["memory"] = args ? args.memory : undefined;
            resourceInputs["pidMode"] = args ? args.pidMode : undefined;
            resourceInputs["placementConstraints"] = args ? args.placementConstraints : undefined;
            resourceInputs["proxyConfiguration"] = args ? args.proxyConfiguration : undefined;
            resourceInputs["runtimePlatform"] = args ? args.runtimePlatform : undefined;
            resourceInputs["skipDestroy"] = args ? args.skipDestroy : undefined;
            resourceInputs["tags"] = args ? args.tags : undefined;
            resourceInputs["taskRole"] = args ? args.taskRole : undefined;
            resourceInputs["trackLatest"] = args ? args.trackLatest : undefined;
            resourceInputs["volumes"] = args ? args.volumes : undefined;
            resourceInputs["loadBalancers"] = undefined /*out*/;
            resourceInputs["taskDefinition"] = undefined /*out*/;
        } else {
            resourceInputs["executionRole"] = undefined /*out*/;
            resourceInputs["loadBalancers"] = undefined /*out*/;
            resourceInputs["logGroup"] = undefined /*out*/;
            resourceInputs["taskDefinition"] = undefined /*out*/;
            resourceInputs["taskRole"] = undefined /*out*/;
        }
        opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
        super(FargateTaskDefinition.__pulumiType, name, resourceInputs, opts, true /*remote*/);
    }
}

/**
 * The set of arguments for constructing a FargateTaskDefinition resource.
 */
export interface FargateTaskDefinitionArgs {
    /**
     * Single container to make a TaskDefinition from.  Useful for simple cases where there aren't
     * multiple containers, especially when creating a TaskDefinition to call [run] on.
     *
     * Either [container] or [containers] must be provided.
     */
    container?: inputs.ecs.TaskDefinitionContainerDefinitionArgs;
    /**
     * All the containers to make a TaskDefinition from.  Useful when creating a Service that will
     * contain many containers within.
     *
     * Either [container] or [containers] must be provided.
     */
    containers?: {[key: string]: inputs.ecs.TaskDefinitionContainerDefinitionArgs};
    /**
     * The number of cpu units used by the task. If not provided, a default will be computed based on the cumulative needs specified by [containerDefinitions]
     */
    cpu?: pulumi.Input<string>;
    /**
     * Enables fault injection and allows for fault injection requests to be accepted from the task's containers. Default is `false`.
     *
     * **Note:** Fault injection only works with tasks using the `awsvpc` or `host` network modes. Fault injection isn't available on Windows.
     */
    enableFaultInjection?: pulumi.Input<boolean>;
    /**
     * The amount of ephemeral storage to allocate for the task. This parameter is used to expand the total amount of ephemeral storage available, beyond the default amount, for tasks hosted on AWS Fargate. See Ephemeral Storage.
     */
    ephemeralStorage?: pulumi.Input<pulumiAws.types.input.ecs.TaskDefinitionEphemeralStorage>;
    /**
     * The execution role that the Amazon ECS container agent and the Docker daemon can assume.
     * Will be created automatically if not defined.
     */
    executionRole?: inputs.awsx.DefaultRoleWithPolicyArgs;
    /**
     * An optional unique name for your task definition. If not specified, then a default will be created.
     */
    family?: pulumi.Input<string>;
    /**
     * Configuration block(s) with Inference Accelerators settings. Detailed below.
     */
    inferenceAccelerators?: pulumi.Input<pulumi.Input<pulumiAws.types.input.ecs.TaskDefinitionInferenceAccelerator>[]>;
    /**
     * IPC resource namespace to be used for the containers in the task The valid values are `host`, `task`, and `none`.
     */
    ipcMode?: pulumi.Input<string>;
    /**
     * A set of volume blocks that containers in your task may use.
     */
    logGroup?: inputs.awsx.DefaultLogGroupArgs;
    /**
     * The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
     * based on the cumulative needs specified by [containerDefinitions]
     */
    memory?: pulumi.Input<string>;
    /**
     * Process namespace to use for the containers in the task. The valid values are `host` and `task`.
     */
    pidMode?: pulumi.Input<string>;
    /**
     * Configuration block for rules that are taken into consideration during task placement. Maximum number of `placement_constraints` is `10`. Detailed below.
     */
    placementConstraints?: pulumi.Input<pulumi.Input<pulumiAws.types.input.ecs.TaskDefinitionPlacementConstraint>[]>;
    /**
     * Configuration block for the App Mesh proxy. Detailed below.
     */
    proxyConfiguration?: pulumi.Input<pulumiAws.types.input.ecs.TaskDefinitionProxyConfiguration>;
    /**
     * Configuration block for runtime_platform that containers in your task may use.
     */
    runtimePlatform?: pulumi.Input<pulumiAws.types.input.ecs.TaskDefinitionRuntimePlatform>;
    /**
     * Whether to retain the old revision when the resource is destroyed or replacement is necessary. Default is `false`.
     */
    skipDestroy?: pulumi.Input<boolean>;
    /**
     * Key-value map of resource tags. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
     */
    tags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * IAM role that allows your Amazon ECS container task to make calls to other AWS services.
     * Will be created automatically if not defined.
     */
    taskRole?: inputs.awsx.DefaultRoleWithPolicyArgs;
    /**
     * Whether should track latest `ACTIVE` task definition on AWS or the one created with the resource stored in state. Default is `false`. Useful in the event the task definition is modified outside of this resource.
     */
    trackLatest?: pulumi.Input<boolean>;
    /**
     * Configuration block for volumes that containers in your task may use. Detailed below.
     */
    volumes?: pulumi.Input<pulumi.Input<pulumiAws.types.input.ecs.TaskDefinitionVolume>[]>;
}
