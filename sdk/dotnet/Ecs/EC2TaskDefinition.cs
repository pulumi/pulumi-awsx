// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Ecs
{
    /// <summary>
    /// Create a TaskDefinition resource with the given unique name, arguments, and options.
    /// Creates required log-group and task &amp; execution roles.
    /// Presents required Service load balancers if target group included in port mappings.
    /// </summary>
    [AwsxResourceType("awsx:ecs:EC2TaskDefinition")]
    public partial class EC2TaskDefinition : global::Pulumi.ComponentResource
    {
        /// <summary>
        /// Auto-created IAM task execution role that the Amazon ECS container agent and the Docker daemon can assume.
        /// </summary>
        [Output("executionRole")]
        public Output<Pulumi.Aws.Iam.Role?> ExecutionRole { get; private set; } = null!;

        /// <summary>
        /// Computed load balancers from target groups specified of container port mappings.
        /// </summary>
        [Output("loadBalancers")]
        public Output<ImmutableArray<Pulumi.Aws.Ecs.Outputs.ServiceLoadBalancer>> LoadBalancers { get; private set; } = null!;

        /// <summary>
        /// Auto-created Log Group resource for use by containers.
        /// </summary>
        [Output("logGroup")]
        public Output<Pulumi.Aws.CloudWatch.LogGroup?> LogGroup { get; private set; } = null!;

        /// <summary>
        /// Underlying ECS Task Definition resource
        /// </summary>
        [Output("taskDefinition")]
        public Output<Pulumi.Aws.Ecs.TaskDefinition> TaskDefinition { get; private set; } = null!;

        /// <summary>
        /// Auto-created IAM role that allows your Amazon ECS container task to make calls to other AWS services.
        /// </summary>
        [Output("taskRole")]
        public Output<Pulumi.Aws.Iam.Role?> TaskRole { get; private set; } = null!;


        /// <summary>
        /// Create a EC2TaskDefinition resource with the given unique name, arguments, and options.
        /// </summary>
        ///
        /// <param name="name">The unique name of the resource</param>
        /// <param name="args">The arguments used to populate this resource's properties</param>
        /// <param name="options">A bag of options that control this resource's behavior</param>
        public EC2TaskDefinition(string name, EC2TaskDefinitionArgs? args = null, ComponentResourceOptions? options = null)
            : base("awsx:ecs:EC2TaskDefinition", name, args ?? new EC2TaskDefinitionArgs(), MakeResourceOptions(options, ""), remote: true)
        {
        }

        private static ComponentResourceOptions MakeResourceOptions(ComponentResourceOptions? options, Input<string>? id)
        {
            var defaultOptions = new ComponentResourceOptions
            {
                Version = Utilities.Version,
            };
            var merged = ComponentResourceOptions.Merge(defaultOptions, options);
            // Override the ID if one was specified for consistency with other language SDKs.
            merged.Id = id ?? merged.Id;
            return merged;
        }
    }

    public sealed class EC2TaskDefinitionArgs : global::Pulumi.ResourceArgs
    {
        /// <summary>
        /// Single container to make a TaskDefinition from.  Useful for simple cases where there aren't
        /// multiple containers, especially when creating a TaskDefinition to call [run] on.
        /// 
        /// Either [container] or [containers] must be provided.
        /// </summary>
        [Input("container")]
        public Inputs.TaskDefinitionContainerDefinitionArgs? Container { get; set; }

        [Input("containers")]
        private Dictionary<string, Inputs.TaskDefinitionContainerDefinitionArgs>? _containers;

        /// <summary>
        /// All the containers to make a TaskDefinition from.  Useful when creating a Service that will
        /// contain many containers within.
        /// 
        /// Either [container] or [containers] must be provided.
        /// </summary>
        public Dictionary<string, Inputs.TaskDefinitionContainerDefinitionArgs> Containers
        {
            get => _containers ?? (_containers = new Dictionary<string, Inputs.TaskDefinitionContainerDefinitionArgs>());
            set => _containers = value;
        }

        /// <summary>
        /// The number of cpu units used by the task. If not provided, a default will be computed based on the cumulative needs specified by [containerDefinitions]
        /// </summary>
        [Input("cpu")]
        public Input<string>? Cpu { get; set; }

        /// <summary>
        /// Enables fault injection and allows for fault injection requests to be accepted from the task's containers. Default is `false`.
        /// 
        /// **Note:** Fault injection only works with tasks using the `awsvpc` or `host` network modes. Fault injection isn't available on Windows.
        /// </summary>
        [Input("enableFaultInjection")]
        public Input<bool>? EnableFaultInjection { get; set; }

        /// <summary>
        /// The amount of ephemeral storage to allocate for the task. This parameter is used to expand the total amount of ephemeral storage available, beyond the default amount, for tasks hosted on AWS Fargate. See Ephemeral Storage.
        /// </summary>
        [Input("ephemeralStorage")]
        public Input<Pulumi.Aws.Ecs.Inputs.TaskDefinitionEphemeralStorageArgs>? EphemeralStorage { get; set; }

        /// <summary>
        /// The execution role that the Amazon ECS container agent and the Docker daemon can assume.
        /// Will be created automatically if not defined.
        /// </summary>
        [Input("executionRole")]
        public Pulumi.Awsx.Awsx.Inputs.DefaultRoleWithPolicyArgs? ExecutionRole { get; set; }

        /// <summary>
        /// An optional unique name for your task definition. If not specified, then a default will be created.
        /// </summary>
        [Input("family")]
        public Input<string>? Family { get; set; }

        [Input("inferenceAccelerators")]
        private InputList<Pulumi.Aws.Ecs.Inputs.TaskDefinitionInferenceAcceleratorArgs>? _inferenceAccelerators;

        /// <summary>
        /// Configuration block(s) with Inference Accelerators settings. Detailed below.
        /// </summary>
        public InputList<Pulumi.Aws.Ecs.Inputs.TaskDefinitionInferenceAcceleratorArgs> InferenceAccelerators
        {
            get => _inferenceAccelerators ?? (_inferenceAccelerators = new InputList<Pulumi.Aws.Ecs.Inputs.TaskDefinitionInferenceAcceleratorArgs>());
            set => _inferenceAccelerators = value;
        }

        /// <summary>
        /// IPC resource namespace to be used for the containers in the task The valid values are `host`, `task`, and `none`.
        /// </summary>
        [Input("ipcMode")]
        public Input<string>? IpcMode { get; set; }

        /// <summary>
        /// A set of volume blocks that containers in your task may use.
        /// </summary>
        [Input("logGroup")]
        public Pulumi.Awsx.Awsx.Inputs.DefaultLogGroupArgs? LogGroup { get; set; }

        /// <summary>
        /// The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
        /// based on the cumulative needs specified by [containerDefinitions]
        /// </summary>
        [Input("memory")]
        public Input<string>? Memory { get; set; }

        /// <summary>
        /// Docker networking mode to use for the containers in the task. Valid values are `none`, `bridge`, `awsvpc`, and `host`.
        /// </summary>
        [Input("networkMode")]
        public Input<string>? NetworkMode { get; set; }

        /// <summary>
        /// Process namespace to use for the containers in the task. The valid values are `host` and `task`.
        /// </summary>
        [Input("pidMode")]
        public Input<string>? PidMode { get; set; }

        [Input("placementConstraints")]
        private InputList<Pulumi.Aws.Ecs.Inputs.TaskDefinitionPlacementConstraintArgs>? _placementConstraints;

        /// <summary>
        /// Configuration block for rules that are taken into consideration during task placement. Maximum number of `placement_constraints` is `10`. Detailed below.
        /// </summary>
        public InputList<Pulumi.Aws.Ecs.Inputs.TaskDefinitionPlacementConstraintArgs> PlacementConstraints
        {
            get => _placementConstraints ?? (_placementConstraints = new InputList<Pulumi.Aws.Ecs.Inputs.TaskDefinitionPlacementConstraintArgs>());
            set => _placementConstraints = value;
        }

        /// <summary>
        /// Configuration block for the App Mesh proxy. Detailed below.
        /// </summary>
        [Input("proxyConfiguration")]
        public Input<Pulumi.Aws.Ecs.Inputs.TaskDefinitionProxyConfigurationArgs>? ProxyConfiguration { get; set; }

        /// <summary>
        /// Configuration block for runtime_platform that containers in your task may use.
        /// </summary>
        [Input("runtimePlatform")]
        public Input<Pulumi.Aws.Ecs.Inputs.TaskDefinitionRuntimePlatformArgs>? RuntimePlatform { get; set; }

        /// <summary>
        /// Whether to retain the old revision when the resource is destroyed or replacement is necessary. Default is `false`.
        /// </summary>
        [Input("skipDestroy")]
        public Input<bool>? SkipDestroy { get; set; }

        [Input("tags")]
        private InputMap<string>? _tags;

        /// <summary>
        /// Key-value map of resource tags. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        /// </summary>
        public InputMap<string> Tags
        {
            get => _tags ?? (_tags = new InputMap<string>());
            set => _tags = value;
        }

        /// <summary>
        /// IAM role that allows your Amazon ECS container task to make calls to other AWS services.
        /// Will be created automatically if not defined.
        /// </summary>
        [Input("taskRole")]
        public Pulumi.Awsx.Awsx.Inputs.DefaultRoleWithPolicyArgs? TaskRole { get; set; }

        /// <summary>
        /// Whether should track latest `ACTIVE` task definition on AWS or the one created with the resource stored in state. Default is `false`. Useful in the event the task definition is modified outside of this resource.
        /// </summary>
        [Input("trackLatest")]
        public Input<bool>? TrackLatest { get; set; }

        [Input("volumes")]
        private InputList<Pulumi.Aws.Ecs.Inputs.TaskDefinitionVolumeArgs>? _volumes;

        /// <summary>
        /// Configuration block for volumes that containers in your task may use. Detailed below.
        /// </summary>
        public InputList<Pulumi.Aws.Ecs.Inputs.TaskDefinitionVolumeArgs> Volumes
        {
            get => _volumes ?? (_volumes = new InputList<Pulumi.Aws.Ecs.Inputs.TaskDefinitionVolumeArgs>());
            set => _volumes = value;
        }

        public EC2TaskDefinitionArgs()
        {
        }
        public static new EC2TaskDefinitionArgs Empty => new EC2TaskDefinitionArgs();
    }
}
