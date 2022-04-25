# coding=utf-8
# *** WARNING: this file was generated by pulumi-gen-awsx. ***
# *** Do not edit by hand unless you're certain you know what you are doing! ***

import warnings
import pulumi
import pulumi.runtime
from typing import Any, Mapping, Optional, Sequence, Union, overload
from .. import _utilities
from .. import awsx as _awsx
from ._inputs import *
import pulumi_aws

__all__ = ['FargateServiceArgs', 'FargateService']

@pulumi.input_type
class FargateServiceArgs:
    def __init__(__self__, *,
                 network_configuration: pulumi.Input['pulumi_aws.ecs.ServiceNetworkConfigurationArgs'],
                 cluster: Optional[pulumi.Input[str]] = None,
                 continue_before_steady_state: Optional[pulumi.Input[bool]] = None,
                 deployment_circuit_breaker: Optional[pulumi.Input['pulumi_aws.ecs.ServiceDeploymentCircuitBreakerArgs']] = None,
                 deployment_controller: Optional[pulumi.Input['pulumi_aws.ecs.ServiceDeploymentControllerArgs']] = None,
                 deployment_maximum_percent: Optional[pulumi.Input[int]] = None,
                 deployment_minimum_healthy_percent: Optional[pulumi.Input[int]] = None,
                 desired_count: Optional[pulumi.Input[int]] = None,
                 enable_ecs_managed_tags: Optional[pulumi.Input[bool]] = None,
                 enable_execute_command: Optional[pulumi.Input[bool]] = None,
                 force_new_deployment: Optional[pulumi.Input[bool]] = None,
                 health_check_grace_period_seconds: Optional[pulumi.Input[int]] = None,
                 iam_role: Optional[pulumi.Input[str]] = None,
                 load_balancers: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.ServiceLoadBalancerArgs']]]] = None,
                 name: Optional[pulumi.Input[str]] = None,
                 placement_constraints: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.ServicePlacementConstraintArgs']]]] = None,
                 platform_version: Optional[pulumi.Input[str]] = None,
                 propagate_tags: Optional[pulumi.Input[str]] = None,
                 scheduling_strategy: Optional[pulumi.Input[str]] = None,
                 service_registries: Optional[pulumi.Input['pulumi_aws.ecs.ServiceServiceRegistriesArgs']] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 task_definition: Optional[pulumi.Input[str]] = None,
                 task_definition_args: Optional['FargateServiceTaskDefinitionArgs'] = None):
        """
        The set of arguments for constructing a FargateService resource.
        :param pulumi.Input['pulumi_aws.ecs.ServiceNetworkConfigurationArgs'] network_configuration: Network configuration for the service. This parameter is required for task definitions that use the `awsvpc` network mode to receive their own Elastic Network Interface, and it is not supported for other network modes. See below.
        :param pulumi.Input[str] cluster: ARN of an ECS cluster.
        :param pulumi.Input[bool] continue_before_steady_state: If `true`, this provider will not wait for the service to reach a steady state (like [`aws ecs wait services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html)) before continuing. Default `false`.
        :param pulumi.Input['pulumi_aws.ecs.ServiceDeploymentCircuitBreakerArgs'] deployment_circuit_breaker: Configuration block for deployment circuit breaker. See below.
        :param pulumi.Input['pulumi_aws.ecs.ServiceDeploymentControllerArgs'] deployment_controller: Configuration block for deployment controller configuration. See below.
        :param pulumi.Input[int] deployment_maximum_percent: Upper limit (as a percentage of the service's desiredCount) of the number of running tasks that can be running in a service during a deployment. Not valid when using the `DAEMON` scheduling strategy.
        :param pulumi.Input[int] deployment_minimum_healthy_percent: Lower limit (as a percentage of the service's desiredCount) of the number of running tasks that must remain running and healthy in a service during a deployment.
        :param pulumi.Input[int] desired_count: Number of instances of the task definition to place and keep running. Defaults to 0. Do not specify if using the `DAEMON` scheduling strategy.
        :param pulumi.Input[bool] enable_ecs_managed_tags: Specifies whether to enable Amazon ECS managed tags for the tasks within the service.
        :param pulumi.Input[bool] enable_execute_command: Specifies whether to enable Amazon ECS Exec for the tasks within the service.
        :param pulumi.Input[bool] force_new_deployment: Enable to force a new task deployment of the service. This can be used to update tasks to use a newer Docker image with same image/tag combination (e.g., `myimage:latest`), roll Fargate tasks onto a newer platform version, or immediately deploy `ordered_placement_strategy` and `placement_constraints` updates.
        :param pulumi.Input[int] health_check_grace_period_seconds: Seconds to ignore failing load balancer health checks on newly instantiated tasks to prevent premature shutdown, up to 2147483647. Only valid for services configured to use load balancers.
        :param pulumi.Input[str] iam_role: ARN of the IAM role that allows Amazon ECS to make calls to your load balancer on your behalf. This parameter is required if you are using a load balancer with your service, but only if your task definition does not use the `awsvpc` network mode. If using `awsvpc` network mode, do not specify this role. If your account has already created the Amazon ECS service-linked role, that role is used by default for your service unless you specify a role here.
        :param pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.ServiceLoadBalancerArgs']]] load_balancers: Configuration block for load balancers. See below.
        :param pulumi.Input[str] name: Name of the service (up to 255 letters, numbers, hyphens, and underscores)
        :param pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.ServicePlacementConstraintArgs']]] placement_constraints: Rules that are taken into consideration during task placement. Updates to this configuration will take effect next task deployment unless `force_new_deployment` is enabled. Maximum number of `placement_constraints` is `10`. See below.
        :param pulumi.Input[str] platform_version: Platform version on which to run your service. Only applicable for `launch_type` set to `FARGATE`. Defaults to `LATEST`. More information about Fargate platform versions can be found in the [AWS ECS User Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/platform_versions.html).
        :param pulumi.Input[str] propagate_tags: Specifies whether to propagate the tags from the task definition or the service to the tasks. The valid values are `SERVICE` and `TASK_DEFINITION`.
        :param pulumi.Input[str] scheduling_strategy: Scheduling strategy to use for the service. The valid values are `REPLICA` and `DAEMON`. Defaults to `REPLICA`. Note that [*Tasks using the Fargate launch type or the `CODE_DEPLOY` or `EXTERNAL` deployment controller types don't support the `DAEMON` scheduling strategy*](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_CreateService.html).
        :param pulumi.Input['pulumi_aws.ecs.ServiceServiceRegistriesArgs'] service_registries: Service discovery registries for the service. The maximum number of `service_registries` blocks is `1`. See below.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] tags: Key-value map of resource tags. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        :param pulumi.Input[str] task_definition: Family and revision (`family:revision`) or full ARN of the task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.
        :param 'FargateServiceTaskDefinitionArgs' task_definition_args: The args of task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.
        """
        pulumi.set(__self__, "network_configuration", network_configuration)
        if cluster is not None:
            pulumi.set(__self__, "cluster", cluster)
        if continue_before_steady_state is not None:
            pulumi.set(__self__, "continue_before_steady_state", continue_before_steady_state)
        if deployment_circuit_breaker is not None:
            pulumi.set(__self__, "deployment_circuit_breaker", deployment_circuit_breaker)
        if deployment_controller is not None:
            pulumi.set(__self__, "deployment_controller", deployment_controller)
        if deployment_maximum_percent is not None:
            pulumi.set(__self__, "deployment_maximum_percent", deployment_maximum_percent)
        if deployment_minimum_healthy_percent is not None:
            pulumi.set(__self__, "deployment_minimum_healthy_percent", deployment_minimum_healthy_percent)
        if desired_count is not None:
            pulumi.set(__self__, "desired_count", desired_count)
        if enable_ecs_managed_tags is not None:
            pulumi.set(__self__, "enable_ecs_managed_tags", enable_ecs_managed_tags)
        if enable_execute_command is not None:
            pulumi.set(__self__, "enable_execute_command", enable_execute_command)
        if force_new_deployment is not None:
            pulumi.set(__self__, "force_new_deployment", force_new_deployment)
        if health_check_grace_period_seconds is not None:
            pulumi.set(__self__, "health_check_grace_period_seconds", health_check_grace_period_seconds)
        if iam_role is not None:
            pulumi.set(__self__, "iam_role", iam_role)
        if load_balancers is not None:
            pulumi.set(__self__, "load_balancers", load_balancers)
        if name is not None:
            pulumi.set(__self__, "name", name)
        if placement_constraints is not None:
            pulumi.set(__self__, "placement_constraints", placement_constraints)
        if platform_version is not None:
            pulumi.set(__self__, "platform_version", platform_version)
        if propagate_tags is not None:
            pulumi.set(__self__, "propagate_tags", propagate_tags)
        if scheduling_strategy is not None:
            pulumi.set(__self__, "scheduling_strategy", scheduling_strategy)
        if service_registries is not None:
            pulumi.set(__self__, "service_registries", service_registries)
        if tags is not None:
            pulumi.set(__self__, "tags", tags)
        if task_definition is not None:
            pulumi.set(__self__, "task_definition", task_definition)
        if task_definition_args is not None:
            pulumi.set(__self__, "task_definition_args", task_definition_args)

    @property
    @pulumi.getter(name="networkConfiguration")
    def network_configuration(self) -> pulumi.Input['pulumi_aws.ecs.ServiceNetworkConfigurationArgs']:
        """
        Network configuration for the service. This parameter is required for task definitions that use the `awsvpc` network mode to receive their own Elastic Network Interface, and it is not supported for other network modes. See below.
        """
        return pulumi.get(self, "network_configuration")

    @network_configuration.setter
    def network_configuration(self, value: pulumi.Input['pulumi_aws.ecs.ServiceNetworkConfigurationArgs']):
        pulumi.set(self, "network_configuration", value)

    @property
    @pulumi.getter
    def cluster(self) -> Optional[pulumi.Input[str]]:
        """
        ARN of an ECS cluster.
        """
        return pulumi.get(self, "cluster")

    @cluster.setter
    def cluster(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "cluster", value)

    @property
    @pulumi.getter(name="continueBeforeSteadyState")
    def continue_before_steady_state(self) -> Optional[pulumi.Input[bool]]:
        """
        If `true`, this provider will not wait for the service to reach a steady state (like [`aws ecs wait services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html)) before continuing. Default `false`.
        """
        return pulumi.get(self, "continue_before_steady_state")

    @continue_before_steady_state.setter
    def continue_before_steady_state(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "continue_before_steady_state", value)

    @property
    @pulumi.getter(name="deploymentCircuitBreaker")
    def deployment_circuit_breaker(self) -> Optional[pulumi.Input['pulumi_aws.ecs.ServiceDeploymentCircuitBreakerArgs']]:
        """
        Configuration block for deployment circuit breaker. See below.
        """
        return pulumi.get(self, "deployment_circuit_breaker")

    @deployment_circuit_breaker.setter
    def deployment_circuit_breaker(self, value: Optional[pulumi.Input['pulumi_aws.ecs.ServiceDeploymentCircuitBreakerArgs']]):
        pulumi.set(self, "deployment_circuit_breaker", value)

    @property
    @pulumi.getter(name="deploymentController")
    def deployment_controller(self) -> Optional[pulumi.Input['pulumi_aws.ecs.ServiceDeploymentControllerArgs']]:
        """
        Configuration block for deployment controller configuration. See below.
        """
        return pulumi.get(self, "deployment_controller")

    @deployment_controller.setter
    def deployment_controller(self, value: Optional[pulumi.Input['pulumi_aws.ecs.ServiceDeploymentControllerArgs']]):
        pulumi.set(self, "deployment_controller", value)

    @property
    @pulumi.getter(name="deploymentMaximumPercent")
    def deployment_maximum_percent(self) -> Optional[pulumi.Input[int]]:
        """
        Upper limit (as a percentage of the service's desiredCount) of the number of running tasks that can be running in a service during a deployment. Not valid when using the `DAEMON` scheduling strategy.
        """
        return pulumi.get(self, "deployment_maximum_percent")

    @deployment_maximum_percent.setter
    def deployment_maximum_percent(self, value: Optional[pulumi.Input[int]]):
        pulumi.set(self, "deployment_maximum_percent", value)

    @property
    @pulumi.getter(name="deploymentMinimumHealthyPercent")
    def deployment_minimum_healthy_percent(self) -> Optional[pulumi.Input[int]]:
        """
        Lower limit (as a percentage of the service's desiredCount) of the number of running tasks that must remain running and healthy in a service during a deployment.
        """
        return pulumi.get(self, "deployment_minimum_healthy_percent")

    @deployment_minimum_healthy_percent.setter
    def deployment_minimum_healthy_percent(self, value: Optional[pulumi.Input[int]]):
        pulumi.set(self, "deployment_minimum_healthy_percent", value)

    @property
    @pulumi.getter(name="desiredCount")
    def desired_count(self) -> Optional[pulumi.Input[int]]:
        """
        Number of instances of the task definition to place and keep running. Defaults to 0. Do not specify if using the `DAEMON` scheduling strategy.
        """
        return pulumi.get(self, "desired_count")

    @desired_count.setter
    def desired_count(self, value: Optional[pulumi.Input[int]]):
        pulumi.set(self, "desired_count", value)

    @property
    @pulumi.getter(name="enableEcsManagedTags")
    def enable_ecs_managed_tags(self) -> Optional[pulumi.Input[bool]]:
        """
        Specifies whether to enable Amazon ECS managed tags for the tasks within the service.
        """
        return pulumi.get(self, "enable_ecs_managed_tags")

    @enable_ecs_managed_tags.setter
    def enable_ecs_managed_tags(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "enable_ecs_managed_tags", value)

    @property
    @pulumi.getter(name="enableExecuteCommand")
    def enable_execute_command(self) -> Optional[pulumi.Input[bool]]:
        """
        Specifies whether to enable Amazon ECS Exec for the tasks within the service.
        """
        return pulumi.get(self, "enable_execute_command")

    @enable_execute_command.setter
    def enable_execute_command(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "enable_execute_command", value)

    @property
    @pulumi.getter(name="forceNewDeployment")
    def force_new_deployment(self) -> Optional[pulumi.Input[bool]]:
        """
        Enable to force a new task deployment of the service. This can be used to update tasks to use a newer Docker image with same image/tag combination (e.g., `myimage:latest`), roll Fargate tasks onto a newer platform version, or immediately deploy `ordered_placement_strategy` and `placement_constraints` updates.
        """
        return pulumi.get(self, "force_new_deployment")

    @force_new_deployment.setter
    def force_new_deployment(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "force_new_deployment", value)

    @property
    @pulumi.getter(name="healthCheckGracePeriodSeconds")
    def health_check_grace_period_seconds(self) -> Optional[pulumi.Input[int]]:
        """
        Seconds to ignore failing load balancer health checks on newly instantiated tasks to prevent premature shutdown, up to 2147483647. Only valid for services configured to use load balancers.
        """
        return pulumi.get(self, "health_check_grace_period_seconds")

    @health_check_grace_period_seconds.setter
    def health_check_grace_period_seconds(self, value: Optional[pulumi.Input[int]]):
        pulumi.set(self, "health_check_grace_period_seconds", value)

    @property
    @pulumi.getter(name="iamRole")
    def iam_role(self) -> Optional[pulumi.Input[str]]:
        """
        ARN of the IAM role that allows Amazon ECS to make calls to your load balancer on your behalf. This parameter is required if you are using a load balancer with your service, but only if your task definition does not use the `awsvpc` network mode. If using `awsvpc` network mode, do not specify this role. If your account has already created the Amazon ECS service-linked role, that role is used by default for your service unless you specify a role here.
        """
        return pulumi.get(self, "iam_role")

    @iam_role.setter
    def iam_role(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "iam_role", value)

    @property
    @pulumi.getter(name="loadBalancers")
    def load_balancers(self) -> Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.ServiceLoadBalancerArgs']]]]:
        """
        Configuration block for load balancers. See below.
        """
        return pulumi.get(self, "load_balancers")

    @load_balancers.setter
    def load_balancers(self, value: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.ServiceLoadBalancerArgs']]]]):
        pulumi.set(self, "load_balancers", value)

    @property
    @pulumi.getter
    def name(self) -> Optional[pulumi.Input[str]]:
        """
        Name of the service (up to 255 letters, numbers, hyphens, and underscores)
        """
        return pulumi.get(self, "name")

    @name.setter
    def name(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "name", value)

    @property
    @pulumi.getter(name="placementConstraints")
    def placement_constraints(self) -> Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.ServicePlacementConstraintArgs']]]]:
        """
        Rules that are taken into consideration during task placement. Updates to this configuration will take effect next task deployment unless `force_new_deployment` is enabled. Maximum number of `placement_constraints` is `10`. See below.
        """
        return pulumi.get(self, "placement_constraints")

    @placement_constraints.setter
    def placement_constraints(self, value: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.ServicePlacementConstraintArgs']]]]):
        pulumi.set(self, "placement_constraints", value)

    @property
    @pulumi.getter(name="platformVersion")
    def platform_version(self) -> Optional[pulumi.Input[str]]:
        """
        Platform version on which to run your service. Only applicable for `launch_type` set to `FARGATE`. Defaults to `LATEST`. More information about Fargate platform versions can be found in the [AWS ECS User Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/platform_versions.html).
        """
        return pulumi.get(self, "platform_version")

    @platform_version.setter
    def platform_version(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "platform_version", value)

    @property
    @pulumi.getter(name="propagateTags")
    def propagate_tags(self) -> Optional[pulumi.Input[str]]:
        """
        Specifies whether to propagate the tags from the task definition or the service to the tasks. The valid values are `SERVICE` and `TASK_DEFINITION`.
        """
        return pulumi.get(self, "propagate_tags")

    @propagate_tags.setter
    def propagate_tags(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "propagate_tags", value)

    @property
    @pulumi.getter(name="schedulingStrategy")
    def scheduling_strategy(self) -> Optional[pulumi.Input[str]]:
        """
        Scheduling strategy to use for the service. The valid values are `REPLICA` and `DAEMON`. Defaults to `REPLICA`. Note that [*Tasks using the Fargate launch type or the `CODE_DEPLOY` or `EXTERNAL` deployment controller types don't support the `DAEMON` scheduling strategy*](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_CreateService.html).
        """
        return pulumi.get(self, "scheduling_strategy")

    @scheduling_strategy.setter
    def scheduling_strategy(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "scheduling_strategy", value)

    @property
    @pulumi.getter(name="serviceRegistries")
    def service_registries(self) -> Optional[pulumi.Input['pulumi_aws.ecs.ServiceServiceRegistriesArgs']]:
        """
        Service discovery registries for the service. The maximum number of `service_registries` blocks is `1`. See below.
        """
        return pulumi.get(self, "service_registries")

    @service_registries.setter
    def service_registries(self, value: Optional[pulumi.Input['pulumi_aws.ecs.ServiceServiceRegistriesArgs']]):
        pulumi.set(self, "service_registries", value)

    @property
    @pulumi.getter
    def tags(self) -> Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]]:
        """
        Key-value map of resource tags. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        """
        return pulumi.get(self, "tags")

    @tags.setter
    def tags(self, value: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]]):
        pulumi.set(self, "tags", value)

    @property
    @pulumi.getter(name="taskDefinition")
    def task_definition(self) -> Optional[pulumi.Input[str]]:
        """
        Family and revision (`family:revision`) or full ARN of the task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.
        """
        return pulumi.get(self, "task_definition")

    @task_definition.setter
    def task_definition(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "task_definition", value)

    @property
    @pulumi.getter(name="taskDefinitionArgs")
    def task_definition_args(self) -> Optional['FargateServiceTaskDefinitionArgs']:
        """
        The args of task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.
        """
        return pulumi.get(self, "task_definition_args")

    @task_definition_args.setter
    def task_definition_args(self, value: Optional['FargateServiceTaskDefinitionArgs']):
        pulumi.set(self, "task_definition_args", value)


class FargateService(pulumi.ComponentResource):
    @overload
    def __init__(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 cluster: Optional[pulumi.Input[str]] = None,
                 continue_before_steady_state: Optional[pulumi.Input[bool]] = None,
                 deployment_circuit_breaker: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceDeploymentCircuitBreakerArgs']]] = None,
                 deployment_controller: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceDeploymentControllerArgs']]] = None,
                 deployment_maximum_percent: Optional[pulumi.Input[int]] = None,
                 deployment_minimum_healthy_percent: Optional[pulumi.Input[int]] = None,
                 desired_count: Optional[pulumi.Input[int]] = None,
                 enable_ecs_managed_tags: Optional[pulumi.Input[bool]] = None,
                 enable_execute_command: Optional[pulumi.Input[bool]] = None,
                 force_new_deployment: Optional[pulumi.Input[bool]] = None,
                 health_check_grace_period_seconds: Optional[pulumi.Input[int]] = None,
                 iam_role: Optional[pulumi.Input[str]] = None,
                 load_balancers: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceLoadBalancerArgs']]]]] = None,
                 name: Optional[pulumi.Input[str]] = None,
                 network_configuration: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceNetworkConfigurationArgs']]] = None,
                 placement_constraints: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServicePlacementConstraintArgs']]]]] = None,
                 platform_version: Optional[pulumi.Input[str]] = None,
                 propagate_tags: Optional[pulumi.Input[str]] = None,
                 scheduling_strategy: Optional[pulumi.Input[str]] = None,
                 service_registries: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceServiceRegistriesArgs']]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 task_definition: Optional[pulumi.Input[str]] = None,
                 task_definition_args: Optional[pulumi.InputType['FargateServiceTaskDefinitionArgs']] = None,
                 __props__=None):
        """
        Create an ECS Service resource for Fargate with the given unique name, arguments, and options.
        Creates Task definition if `taskDefinitionArgs` is specified.

        :param str resource_name: The name of the resource.
        :param pulumi.ResourceOptions opts: Options for the resource.
        :param pulumi.Input[str] cluster: ARN of an ECS cluster.
        :param pulumi.Input[bool] continue_before_steady_state: If `true`, this provider will not wait for the service to reach a steady state (like [`aws ecs wait services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html)) before continuing. Default `false`.
        :param pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceDeploymentCircuitBreakerArgs']] deployment_circuit_breaker: Configuration block for deployment circuit breaker. See below.
        :param pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceDeploymentControllerArgs']] deployment_controller: Configuration block for deployment controller configuration. See below.
        :param pulumi.Input[int] deployment_maximum_percent: Upper limit (as a percentage of the service's desiredCount) of the number of running tasks that can be running in a service during a deployment. Not valid when using the `DAEMON` scheduling strategy.
        :param pulumi.Input[int] deployment_minimum_healthy_percent: Lower limit (as a percentage of the service's desiredCount) of the number of running tasks that must remain running and healthy in a service during a deployment.
        :param pulumi.Input[int] desired_count: Number of instances of the task definition to place and keep running. Defaults to 0. Do not specify if using the `DAEMON` scheduling strategy.
        :param pulumi.Input[bool] enable_ecs_managed_tags: Specifies whether to enable Amazon ECS managed tags for the tasks within the service.
        :param pulumi.Input[bool] enable_execute_command: Specifies whether to enable Amazon ECS Exec for the tasks within the service.
        :param pulumi.Input[bool] force_new_deployment: Enable to force a new task deployment of the service. This can be used to update tasks to use a newer Docker image with same image/tag combination (e.g., `myimage:latest`), roll Fargate tasks onto a newer platform version, or immediately deploy `ordered_placement_strategy` and `placement_constraints` updates.
        :param pulumi.Input[int] health_check_grace_period_seconds: Seconds to ignore failing load balancer health checks on newly instantiated tasks to prevent premature shutdown, up to 2147483647. Only valid for services configured to use load balancers.
        :param pulumi.Input[str] iam_role: ARN of the IAM role that allows Amazon ECS to make calls to your load balancer on your behalf. This parameter is required if you are using a load balancer with your service, but only if your task definition does not use the `awsvpc` network mode. If using `awsvpc` network mode, do not specify this role. If your account has already created the Amazon ECS service-linked role, that role is used by default for your service unless you specify a role here.
        :param pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceLoadBalancerArgs']]]] load_balancers: Configuration block for load balancers. See below.
        :param pulumi.Input[str] name: Name of the service (up to 255 letters, numbers, hyphens, and underscores)
        :param pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceNetworkConfigurationArgs']] network_configuration: Network configuration for the service. This parameter is required for task definitions that use the `awsvpc` network mode to receive their own Elastic Network Interface, and it is not supported for other network modes. See below.
        :param pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServicePlacementConstraintArgs']]]] placement_constraints: Rules that are taken into consideration during task placement. Updates to this configuration will take effect next task deployment unless `force_new_deployment` is enabled. Maximum number of `placement_constraints` is `10`. See below.
        :param pulumi.Input[str] platform_version: Platform version on which to run your service. Only applicable for `launch_type` set to `FARGATE`. Defaults to `LATEST`. More information about Fargate platform versions can be found in the [AWS ECS User Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/platform_versions.html).
        :param pulumi.Input[str] propagate_tags: Specifies whether to propagate the tags from the task definition or the service to the tasks. The valid values are `SERVICE` and `TASK_DEFINITION`.
        :param pulumi.Input[str] scheduling_strategy: Scheduling strategy to use for the service. The valid values are `REPLICA` and `DAEMON`. Defaults to `REPLICA`. Note that [*Tasks using the Fargate launch type or the `CODE_DEPLOY` or `EXTERNAL` deployment controller types don't support the `DAEMON` scheduling strategy*](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_CreateService.html).
        :param pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceServiceRegistriesArgs']] service_registries: Service discovery registries for the service. The maximum number of `service_registries` blocks is `1`. See below.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] tags: Key-value map of resource tags. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        :param pulumi.Input[str] task_definition: Family and revision (`family:revision`) or full ARN of the task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.
        :param pulumi.InputType['FargateServiceTaskDefinitionArgs'] task_definition_args: The args of task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.
        """
        ...
    @overload
    def __init__(__self__,
                 resource_name: str,
                 args: FargateServiceArgs,
                 opts: Optional[pulumi.ResourceOptions] = None):
        """
        Create an ECS Service resource for Fargate with the given unique name, arguments, and options.
        Creates Task definition if `taskDefinitionArgs` is specified.

        :param str resource_name: The name of the resource.
        :param FargateServiceArgs args: The arguments to use to populate this resource's properties.
        :param pulumi.ResourceOptions opts: Options for the resource.
        """
        ...
    def __init__(__self__, resource_name: str, *args, **kwargs):
        resource_args, opts = _utilities.get_resource_args_opts(FargateServiceArgs, pulumi.ResourceOptions, *args, **kwargs)
        if resource_args is not None:
            __self__._internal_init(resource_name, opts, **resource_args.__dict__)
        else:
            __self__._internal_init(resource_name, *args, **kwargs)

    def _internal_init(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 cluster: Optional[pulumi.Input[str]] = None,
                 continue_before_steady_state: Optional[pulumi.Input[bool]] = None,
                 deployment_circuit_breaker: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceDeploymentCircuitBreakerArgs']]] = None,
                 deployment_controller: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceDeploymentControllerArgs']]] = None,
                 deployment_maximum_percent: Optional[pulumi.Input[int]] = None,
                 deployment_minimum_healthy_percent: Optional[pulumi.Input[int]] = None,
                 desired_count: Optional[pulumi.Input[int]] = None,
                 enable_ecs_managed_tags: Optional[pulumi.Input[bool]] = None,
                 enable_execute_command: Optional[pulumi.Input[bool]] = None,
                 force_new_deployment: Optional[pulumi.Input[bool]] = None,
                 health_check_grace_period_seconds: Optional[pulumi.Input[int]] = None,
                 iam_role: Optional[pulumi.Input[str]] = None,
                 load_balancers: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceLoadBalancerArgs']]]]] = None,
                 name: Optional[pulumi.Input[str]] = None,
                 network_configuration: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceNetworkConfigurationArgs']]] = None,
                 placement_constraints: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServicePlacementConstraintArgs']]]]] = None,
                 platform_version: Optional[pulumi.Input[str]] = None,
                 propagate_tags: Optional[pulumi.Input[str]] = None,
                 scheduling_strategy: Optional[pulumi.Input[str]] = None,
                 service_registries: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.ServiceServiceRegistriesArgs']]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 task_definition: Optional[pulumi.Input[str]] = None,
                 task_definition_args: Optional[pulumi.InputType['FargateServiceTaskDefinitionArgs']] = None,
                 __props__=None):
        if opts is None:
            opts = pulumi.ResourceOptions()
        if not isinstance(opts, pulumi.ResourceOptions):
            raise TypeError('Expected resource options to be a ResourceOptions instance')
        if opts.version is None:
            opts.version = _utilities.get_version()
        if opts.id is not None:
            raise ValueError('ComponentResource classes do not support opts.id')
        else:
            if __props__ is not None:
                raise TypeError('__props__ is only valid when passed in combination with a valid opts.id to get an existing resource')
            __props__ = FargateServiceArgs.__new__(FargateServiceArgs)

            __props__.__dict__["cluster"] = cluster
            __props__.__dict__["continue_before_steady_state"] = continue_before_steady_state
            __props__.__dict__["deployment_circuit_breaker"] = deployment_circuit_breaker
            __props__.__dict__["deployment_controller"] = deployment_controller
            __props__.__dict__["deployment_maximum_percent"] = deployment_maximum_percent
            __props__.__dict__["deployment_minimum_healthy_percent"] = deployment_minimum_healthy_percent
            __props__.__dict__["desired_count"] = desired_count
            __props__.__dict__["enable_ecs_managed_tags"] = enable_ecs_managed_tags
            __props__.__dict__["enable_execute_command"] = enable_execute_command
            __props__.__dict__["force_new_deployment"] = force_new_deployment
            __props__.__dict__["health_check_grace_period_seconds"] = health_check_grace_period_seconds
            __props__.__dict__["iam_role"] = iam_role
            __props__.__dict__["load_balancers"] = load_balancers
            __props__.__dict__["name"] = name
            if network_configuration is None and not opts.urn:
                raise TypeError("Missing required property 'network_configuration'")
            __props__.__dict__["network_configuration"] = network_configuration
            __props__.__dict__["placement_constraints"] = placement_constraints
            __props__.__dict__["platform_version"] = platform_version
            __props__.__dict__["propagate_tags"] = propagate_tags
            __props__.__dict__["scheduling_strategy"] = scheduling_strategy
            __props__.__dict__["service_registries"] = service_registries
            __props__.__dict__["tags"] = tags
            __props__.__dict__["task_definition"] = task_definition
            __props__.__dict__["task_definition_args"] = task_definition_args
            __props__.__dict__["service"] = None
        super(FargateService, __self__).__init__(
            'awsx:ecs:FargateService',
            resource_name,
            __props__,
            opts,
            remote=True)

    @property
    @pulumi.getter
    def service(self) -> pulumi.Output['pulumi_aws.ecs.Service']:
        """
        Underlying ECS Service resource
        """
        return pulumi.get(self, "service")

    @property
    @pulumi.getter(name="taskDefinition")
    def task_definition(self) -> pulumi.Output[Optional['pulumi_aws.ecs.TaskDefinition']]:
        """
        Underlying Fargate component resource if created from args
        """
        return pulumi.get(self, "task_definition")

