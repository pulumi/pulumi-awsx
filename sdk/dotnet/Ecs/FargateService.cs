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
    /// Create an ECS Service resource for Fargate with the given unique name, arguments, and options.
    /// Creates Task definition if `taskDefinitionArgs` is specified.
    /// </summary>
    [AwsxResourceType("awsx:ecs:FargateService")]
    public partial class FargateService : Pulumi.ComponentResource
    {
        /// <summary>
        /// Underlying ECS Service resource
        /// </summary>
        [Output("service")]
        public Output<Pulumi.Aws.Ecs.Service> Service { get; private set; } = null!;

        /// <summary>
        /// Underlying Fargate component resource if created from args
        /// </summary>
        [Output("taskDefinition")]
        public Output<Pulumi.Aws.Ecs.TaskDefinition?> TaskDefinition { get; private set; } = null!;


        /// <summary>
        /// Create a FargateService resource with the given unique name, arguments, and options.
        /// </summary>
        ///
        /// <param name="name">The unique name of the resource</param>
        /// <param name="args">The arguments used to populate this resource's properties</param>
        /// <param name="options">A bag of options that control this resource's behavior</param>
        public FargateService(string name, FargateServiceArgs? args = null, ComponentResourceOptions? options = null)
            : base("awsx:ecs:FargateService", name, args ?? new FargateServiceArgs(), MakeResourceOptions(options, ""), remote: true)
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

    public sealed class FargateServiceArgs : Pulumi.ResourceArgs
    {
        /// <summary>
        /// Assign a public IP address to the ENI (Fargate launch type only). Valid values are `true` or `false`. Default `false`.
        /// </summary>
        [Input("assignPublicIp")]
        public Input<bool>? AssignPublicIp { get; set; }

        /// <summary>
        /// ARN of an ECS cluster.
        /// </summary>
        [Input("cluster")]
        public Input<string>? Cluster { get; set; }

        /// <summary>
        /// If `true`, this provider will not wait for the service to reach a steady state (like [`aws ecs wait services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html)) before continuing. Default `false`.
        /// </summary>
        [Input("continueBeforeSteadyState")]
        public Input<bool>? ContinueBeforeSteadyState { get; set; }

        /// <summary>
        /// Configuration block for deployment circuit breaker. See below.
        /// </summary>
        [Input("deploymentCircuitBreaker")]
        public Input<Pulumi.Aws.Ecs.Inputs.ServiceDeploymentCircuitBreakerArgs>? DeploymentCircuitBreaker { get; set; }

        /// <summary>
        /// Configuration block for deployment controller configuration. See below.
        /// </summary>
        [Input("deploymentController")]
        public Input<Pulumi.Aws.Ecs.Inputs.ServiceDeploymentControllerArgs>? DeploymentController { get; set; }

        /// <summary>
        /// Upper limit (as a percentage of the service's desiredCount) of the number of running tasks that can be running in a service during a deployment. Not valid when using the `DAEMON` scheduling strategy.
        /// </summary>
        [Input("deploymentMaximumPercent")]
        public Input<int>? DeploymentMaximumPercent { get; set; }

        /// <summary>
        /// Lower limit (as a percentage of the service's desiredCount) of the number of running tasks that must remain running and healthy in a service during a deployment.
        /// </summary>
        [Input("deploymentMinimumHealthyPercent")]
        public Input<int>? DeploymentMinimumHealthyPercent { get; set; }

        /// <summary>
        /// Number of instances of the task definition to place and keep running. Defaults to 0. Do not specify if using the `DAEMON` scheduling strategy.
        /// </summary>
        [Input("desiredCount")]
        public Input<int>? DesiredCount { get; set; }

        /// <summary>
        /// Specifies whether to enable Amazon ECS managed tags for the tasks within the service.
        /// </summary>
        [Input("enableEcsManagedTags")]
        public Input<bool>? EnableEcsManagedTags { get; set; }

        /// <summary>
        /// Specifies whether to enable Amazon ECS Exec for the tasks within the service.
        /// </summary>
        [Input("enableExecuteCommand")]
        public Input<bool>? EnableExecuteCommand { get; set; }

        /// <summary>
        /// Enable to force a new task deployment of the service. This can be used to update tasks to use a newer Docker image with same image/tag combination (e.g., `myimage:latest`), roll Fargate tasks onto a newer platform version, or immediately deploy `ordered_placement_strategy` and `placement_constraints` updates.
        /// </summary>
        [Input("forceNewDeployment")]
        public Input<bool>? ForceNewDeployment { get; set; }

        /// <summary>
        /// Seconds to ignore failing load balancer health checks on newly instantiated tasks to prevent premature shutdown, up to 2147483647. Only valid for services configured to use load balancers.
        /// </summary>
        [Input("healthCheckGracePeriodSeconds")]
        public Input<int>? HealthCheckGracePeriodSeconds { get; set; }

        /// <summary>
        /// ARN of the IAM role that allows Amazon ECS to make calls to your load balancer on your behalf. This parameter is required if you are using a load balancer with your service, but only if your task definition does not use the `awsvpc` network mode. If using `awsvpc` network mode, do not specify this role. If your account has already created the Amazon ECS service-linked role, that role is used by default for your service unless you specify a role here.
        /// </summary>
        [Input("iamRole")]
        public Input<string>? IamRole { get; set; }

        [Input("loadBalancers")]
        private InputList<Pulumi.Aws.Ecs.Inputs.ServiceLoadBalancerArgs>? _loadBalancers;

        /// <summary>
        /// Configuration block for load balancers. See below.
        /// </summary>
        public InputList<Pulumi.Aws.Ecs.Inputs.ServiceLoadBalancerArgs> LoadBalancers
        {
            get => _loadBalancers ?? (_loadBalancers = new InputList<Pulumi.Aws.Ecs.Inputs.ServiceLoadBalancerArgs>());
            set => _loadBalancers = value;
        }

        /// <summary>
        /// Name of the service (up to 255 letters, numbers, hyphens, and underscores)
        /// </summary>
        [Input("name")]
        public Input<string>? Name { get; set; }

        /// <summary>
        /// Network configuration for the service. This parameter is required for task definitions that use the `awsvpc` network mode to receive their own Elastic Network Interface, and it is not supported for other network modes. See below.
        /// </summary>
        [Input("networkConfiguration")]
        public Input<Pulumi.Aws.Ecs.Inputs.ServiceNetworkConfigurationArgs>? NetworkConfiguration { get; set; }

        [Input("placementConstraints")]
        private InputList<Pulumi.Aws.Ecs.Inputs.ServicePlacementConstraintArgs>? _placementConstraints;

        /// <summary>
        /// Rules that are taken into consideration during task placement. Updates to this configuration will take effect next task deployment unless `force_new_deployment` is enabled. Maximum number of `placement_constraints` is `10`. See below.
        /// </summary>
        public InputList<Pulumi.Aws.Ecs.Inputs.ServicePlacementConstraintArgs> PlacementConstraints
        {
            get => _placementConstraints ?? (_placementConstraints = new InputList<Pulumi.Aws.Ecs.Inputs.ServicePlacementConstraintArgs>());
            set => _placementConstraints = value;
        }

        /// <summary>
        /// Platform version on which to run your service. Only applicable for `launch_type` set to `FARGATE`. Defaults to `LATEST`. More information about Fargate platform versions can be found in the [AWS ECS User Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/platform_versions.html).
        /// </summary>
        [Input("platformVersion")]
        public Input<string>? PlatformVersion { get; set; }

        /// <summary>
        /// Specifies whether to propagate the tags from the task definition or the service to the tasks. The valid values are `SERVICE` and `TASK_DEFINITION`.
        /// </summary>
        [Input("propagateTags")]
        public Input<string>? PropagateTags { get; set; }

        /// <summary>
        /// Scheduling strategy to use for the service. The valid values are `REPLICA` and `DAEMON`. Defaults to `REPLICA`. Note that [*Tasks using the Fargate launch type or the `CODE_DEPLOY` or `EXTERNAL` deployment controller types don't support the `DAEMON` scheduling strategy*](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_CreateService.html).
        /// </summary>
        [Input("schedulingStrategy")]
        public Input<string>? SchedulingStrategy { get; set; }

        /// <summary>
        /// Service discovery registries for the service. The maximum number of `service_registries` blocks is `1`. See below.
        /// </summary>
        [Input("serviceRegistries")]
        public Input<Pulumi.Aws.Ecs.Inputs.ServiceServiceRegistriesArgs>? ServiceRegistries { get; set; }

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
        /// Family and revision (`family:revision`) or full ARN of the task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.
        /// </summary>
        [Input("taskDefinition")]
        public Input<string>? TaskDefinition { get; set; }

        /// <summary>
        /// The args of task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.
        /// </summary>
        [Input("taskDefinitionArgs")]
        public Inputs.FargateServiceTaskDefinitionArgs? TaskDefinitionArgs { get; set; }

        public FargateServiceArgs()
        {
        }
    }
}
