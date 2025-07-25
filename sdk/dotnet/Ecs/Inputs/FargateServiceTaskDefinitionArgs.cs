// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Ecs.Inputs
{

    /// <summary>
    /// Create a TaskDefinition resource with the given unique name, arguments, and options.
    /// Creates required log-group and task &amp; execution roles.
    /// Presents required Service load balancers if target group included in port mappings.
    /// </summary>
    public sealed class FargateServiceTaskDefinitionArgs : global::Pulumi.ResourceArgs
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
        /// Region where this resource will be [managed](https://docs.aws.amazon.com/general/latest/gr/rande.html#regional-endpoints). Defaults to the Region set in the provider configuration.
        /// </summary>
        [Input("region")]
        public Input<string>? Region { get; set; }

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
        /// 
        /// &gt; **NOTE:** Proper escaping is required for JSON field values containing quotes (`"`) such as `environment` values. If directly setting the JSON, they should be escaped as `\"` in the JSON,  e.g., `"value": "I \"love\" escaped quotes"`. If using a variable value, they should be escaped as `\\\"` in the variable, e.g., `value = "I \\\"love\\\" escaped quotes"` in the variable and `"value": "${var.myvariable}"` in the JSON.
        /// 
        /// &gt; **Note:** Fault injection only works with tasks using the `awsvpc` or `host` network modes. Fault injection isn't available on Windows.
        /// </summary>
        public InputList<Pulumi.Aws.Ecs.Inputs.TaskDefinitionVolumeArgs> Volumes
        {
            get => _volumes ?? (_volumes = new InputList<Pulumi.Aws.Ecs.Inputs.TaskDefinitionVolumeArgs>());
            set => _volumes = value;
        }

        public FargateServiceTaskDefinitionArgs()
        {
        }
        public static new FargateServiceTaskDefinitionArgs Empty => new FargateServiceTaskDefinitionArgs();
    }
}
