# coding=utf-8
# *** WARNING: this file was generated by pulumi-gen-awsx. ***
# *** Do not edit by hand unless you're certain you know what you are doing! ***

import copy
import warnings
import sys
import pulumi
import pulumi.runtime
from typing import Any, Mapping, Optional, Sequence, Union, overload
if sys.version_info >= (3, 11):
    from typing import NotRequired, TypedDict, TypeAlias
else:
    from typing_extensions import NotRequired, TypedDict, TypeAlias
from .. import _utilities
from .. import awsx as _awsx
from ._enums import *
from ._inputs import *
import pulumi_aws

__all__ = ['EC2TaskDefinitionArgs', 'EC2TaskDefinition']

@pulumi.input_type
class EC2TaskDefinitionArgs:
    def __init__(__self__, *,
                 container: Optional['TaskDefinitionContainerDefinitionArgs'] = None,
                 containers: Optional[Mapping[str, 'TaskDefinitionContainerDefinitionArgs']] = None,
                 cpu: Optional[pulumi.Input[str]] = None,
                 enable_fault_injection: Optional[pulumi.Input[bool]] = None,
                 ephemeral_storage: Optional[pulumi.Input['pulumi_aws.ecs.TaskDefinitionEphemeralStorageArgs']] = None,
                 execution_role: Optional['_awsx.DefaultRoleWithPolicyArgs'] = None,
                 family: Optional[pulumi.Input[str]] = None,
                 inference_accelerators: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.TaskDefinitionInferenceAcceleratorArgs']]]] = None,
                 ipc_mode: Optional[pulumi.Input[str]] = None,
                 log_group: Optional['_awsx.DefaultLogGroupArgs'] = None,
                 memory: Optional[pulumi.Input[str]] = None,
                 network_mode: Optional[pulumi.Input[str]] = None,
                 pid_mode: Optional[pulumi.Input[str]] = None,
                 placement_constraints: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.TaskDefinitionPlacementConstraintArgs']]]] = None,
                 proxy_configuration: Optional[pulumi.Input['pulumi_aws.ecs.TaskDefinitionProxyConfigurationArgs']] = None,
                 runtime_platform: Optional[pulumi.Input['pulumi_aws.ecs.TaskDefinitionRuntimePlatformArgs']] = None,
                 skip_destroy: Optional[pulumi.Input[bool]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 task_role: Optional['_awsx.DefaultRoleWithPolicyArgs'] = None,
                 track_latest: Optional[pulumi.Input[bool]] = None,
                 volumes: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.TaskDefinitionVolumeArgs']]]] = None):
        """
        The set of arguments for constructing a EC2TaskDefinition resource.
        :param 'TaskDefinitionContainerDefinitionArgs' container: Single container to make a TaskDefinition from.  Useful for simple cases where there aren't
               multiple containers, especially when creating a TaskDefinition to call [run] on.
               
               Either [container] or [containers] must be provided.
        :param Mapping[str, 'TaskDefinitionContainerDefinitionArgs'] containers: All the containers to make a TaskDefinition from.  Useful when creating a Service that will
               contain many containers within.
               
               Either [container] or [containers] must be provided.
        :param pulumi.Input[str] cpu: The number of cpu units used by the task. If not provided, a default will be computed based on the cumulative needs specified by [containerDefinitions]
        :param pulumi.Input[bool] enable_fault_injection: Enables fault injection and allows for fault injection requests to be accepted from the task's containers. Default is `false`.
               
               **Note:** Fault injection only works with tasks using the `awsvpc` or `host` network modes. Fault injection isn't available on Windows.
        :param pulumi.Input['pulumi_aws.ecs.TaskDefinitionEphemeralStorageArgs'] ephemeral_storage: The amount of ephemeral storage to allocate for the task. This parameter is used to expand the total amount of ephemeral storage available, beyond the default amount, for tasks hosted on AWS Fargate. See Ephemeral Storage.
        :param '_awsx.DefaultRoleWithPolicyArgs' execution_role: The execution role that the Amazon ECS container agent and the Docker daemon can assume.
               Will be created automatically if not defined.
        :param pulumi.Input[str] family: An optional unique name for your task definition. If not specified, then a default will be created.
        :param pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.TaskDefinitionInferenceAcceleratorArgs']]] inference_accelerators: Configuration block(s) with Inference Accelerators settings. Detailed below.
        :param pulumi.Input[str] ipc_mode: IPC resource namespace to be used for the containers in the task The valid values are `host`, `task`, and `none`.
        :param '_awsx.DefaultLogGroupArgs' log_group: A set of volume blocks that containers in your task may use.
        :param pulumi.Input[str] memory: The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
               based on the cumulative needs specified by [containerDefinitions]
        :param pulumi.Input[str] network_mode: Docker networking mode to use for the containers in the task. Valid values are `none`, `bridge`, `awsvpc`, and `host`.
        :param pulumi.Input[str] pid_mode: Process namespace to use for the containers in the task. The valid values are `host` and `task`.
        :param pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.TaskDefinitionPlacementConstraintArgs']]] placement_constraints: Configuration block for rules that are taken into consideration during task placement. Maximum number of `placement_constraints` is `10`. Detailed below.
        :param pulumi.Input['pulumi_aws.ecs.TaskDefinitionProxyConfigurationArgs'] proxy_configuration: Configuration block for the App Mesh proxy. Detailed below.
        :param pulumi.Input['pulumi_aws.ecs.TaskDefinitionRuntimePlatformArgs'] runtime_platform: Configuration block for runtime_platform that containers in your task may use.
        :param pulumi.Input[bool] skip_destroy: Whether to retain the old revision when the resource is destroyed or replacement is necessary. Default is `false`.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] tags: Key-value map of resource tags. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        :param '_awsx.DefaultRoleWithPolicyArgs' task_role: IAM role that allows your Amazon ECS container task to make calls to other AWS services.
               Will be created automatically if not defined.
        :param pulumi.Input[bool] track_latest: Whether should track latest `ACTIVE` task definition on AWS or the one created with the resource stored in state. Default is `false`. Useful in the event the task definition is modified outside of this resource.
        :param pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.TaskDefinitionVolumeArgs']]] volumes: Configuration block for volumes that containers in your task may use. Detailed below.
        """
        if container is not None:
            pulumi.set(__self__, "container", container)
        if containers is not None:
            pulumi.set(__self__, "containers", containers)
        if cpu is not None:
            pulumi.set(__self__, "cpu", cpu)
        if enable_fault_injection is not None:
            pulumi.set(__self__, "enable_fault_injection", enable_fault_injection)
        if ephemeral_storage is not None:
            pulumi.set(__self__, "ephemeral_storage", ephemeral_storage)
        if execution_role is not None:
            pulumi.set(__self__, "execution_role", execution_role)
        if family is not None:
            pulumi.set(__self__, "family", family)
        if inference_accelerators is not None:
            pulumi.set(__self__, "inference_accelerators", inference_accelerators)
        if ipc_mode is not None:
            pulumi.set(__self__, "ipc_mode", ipc_mode)
        if log_group is not None:
            pulumi.set(__self__, "log_group", log_group)
        if memory is not None:
            pulumi.set(__self__, "memory", memory)
        if network_mode is not None:
            pulumi.set(__self__, "network_mode", network_mode)
        if pid_mode is not None:
            pulumi.set(__self__, "pid_mode", pid_mode)
        if placement_constraints is not None:
            pulumi.set(__self__, "placement_constraints", placement_constraints)
        if proxy_configuration is not None:
            pulumi.set(__self__, "proxy_configuration", proxy_configuration)
        if runtime_platform is not None:
            pulumi.set(__self__, "runtime_platform", runtime_platform)
        if skip_destroy is not None:
            pulumi.set(__self__, "skip_destroy", skip_destroy)
        if tags is not None:
            pulumi.set(__self__, "tags", tags)
        if task_role is not None:
            pulumi.set(__self__, "task_role", task_role)
        if track_latest is not None:
            pulumi.set(__self__, "track_latest", track_latest)
        if volumes is not None:
            pulumi.set(__self__, "volumes", volumes)

    @property
    @pulumi.getter
    def container(self) -> Optional['TaskDefinitionContainerDefinitionArgs']:
        """
        Single container to make a TaskDefinition from.  Useful for simple cases where there aren't
        multiple containers, especially when creating a TaskDefinition to call [run] on.

        Either [container] or [containers] must be provided.
        """
        return pulumi.get(self, "container")

    @container.setter
    def container(self, value: Optional['TaskDefinitionContainerDefinitionArgs']):
        pulumi.set(self, "container", value)

    @property
    @pulumi.getter
    def containers(self) -> Optional[Mapping[str, 'TaskDefinitionContainerDefinitionArgs']]:
        """
        All the containers to make a TaskDefinition from.  Useful when creating a Service that will
        contain many containers within.

        Either [container] or [containers] must be provided.
        """
        return pulumi.get(self, "containers")

    @containers.setter
    def containers(self, value: Optional[Mapping[str, 'TaskDefinitionContainerDefinitionArgs']]):
        pulumi.set(self, "containers", value)

    @property
    @pulumi.getter
    def cpu(self) -> Optional[pulumi.Input[str]]:
        """
        The number of cpu units used by the task. If not provided, a default will be computed based on the cumulative needs specified by [containerDefinitions]
        """
        return pulumi.get(self, "cpu")

    @cpu.setter
    def cpu(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "cpu", value)

    @property
    @pulumi.getter(name="enableFaultInjection")
    def enable_fault_injection(self) -> Optional[pulumi.Input[bool]]:
        """
        Enables fault injection and allows for fault injection requests to be accepted from the task's containers. Default is `false`.

        **Note:** Fault injection only works with tasks using the `awsvpc` or `host` network modes. Fault injection isn't available on Windows.
        """
        return pulumi.get(self, "enable_fault_injection")

    @enable_fault_injection.setter
    def enable_fault_injection(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "enable_fault_injection", value)

    @property
    @pulumi.getter(name="ephemeralStorage")
    def ephemeral_storage(self) -> Optional[pulumi.Input['pulumi_aws.ecs.TaskDefinitionEphemeralStorageArgs']]:
        """
        The amount of ephemeral storage to allocate for the task. This parameter is used to expand the total amount of ephemeral storage available, beyond the default amount, for tasks hosted on AWS Fargate. See Ephemeral Storage.
        """
        return pulumi.get(self, "ephemeral_storage")

    @ephemeral_storage.setter
    def ephemeral_storage(self, value: Optional[pulumi.Input['pulumi_aws.ecs.TaskDefinitionEphemeralStorageArgs']]):
        pulumi.set(self, "ephemeral_storage", value)

    @property
    @pulumi.getter(name="executionRole")
    def execution_role(self) -> Optional['_awsx.DefaultRoleWithPolicyArgs']:
        """
        The execution role that the Amazon ECS container agent and the Docker daemon can assume.
        Will be created automatically if not defined.
        """
        return pulumi.get(self, "execution_role")

    @execution_role.setter
    def execution_role(self, value: Optional['_awsx.DefaultRoleWithPolicyArgs']):
        pulumi.set(self, "execution_role", value)

    @property
    @pulumi.getter
    def family(self) -> Optional[pulumi.Input[str]]:
        """
        An optional unique name for your task definition. If not specified, then a default will be created.
        """
        return pulumi.get(self, "family")

    @family.setter
    def family(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "family", value)

    @property
    @pulumi.getter(name="inferenceAccelerators")
    def inference_accelerators(self) -> Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.TaskDefinitionInferenceAcceleratorArgs']]]]:
        """
        Configuration block(s) with Inference Accelerators settings. Detailed below.
        """
        return pulumi.get(self, "inference_accelerators")

    @inference_accelerators.setter
    def inference_accelerators(self, value: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.TaskDefinitionInferenceAcceleratorArgs']]]]):
        pulumi.set(self, "inference_accelerators", value)

    @property
    @pulumi.getter(name="ipcMode")
    def ipc_mode(self) -> Optional[pulumi.Input[str]]:
        """
        IPC resource namespace to be used for the containers in the task The valid values are `host`, `task`, and `none`.
        """
        return pulumi.get(self, "ipc_mode")

    @ipc_mode.setter
    def ipc_mode(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "ipc_mode", value)

    @property
    @pulumi.getter(name="logGroup")
    def log_group(self) -> Optional['_awsx.DefaultLogGroupArgs']:
        """
        A set of volume blocks that containers in your task may use.
        """
        return pulumi.get(self, "log_group")

    @log_group.setter
    def log_group(self, value: Optional['_awsx.DefaultLogGroupArgs']):
        pulumi.set(self, "log_group", value)

    @property
    @pulumi.getter
    def memory(self) -> Optional[pulumi.Input[str]]:
        """
        The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
        based on the cumulative needs specified by [containerDefinitions]
        """
        return pulumi.get(self, "memory")

    @memory.setter
    def memory(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "memory", value)

    @property
    @pulumi.getter(name="networkMode")
    def network_mode(self) -> Optional[pulumi.Input[str]]:
        """
        Docker networking mode to use for the containers in the task. Valid values are `none`, `bridge`, `awsvpc`, and `host`.
        """
        return pulumi.get(self, "network_mode")

    @network_mode.setter
    def network_mode(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "network_mode", value)

    @property
    @pulumi.getter(name="pidMode")
    def pid_mode(self) -> Optional[pulumi.Input[str]]:
        """
        Process namespace to use for the containers in the task. The valid values are `host` and `task`.
        """
        return pulumi.get(self, "pid_mode")

    @pid_mode.setter
    def pid_mode(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "pid_mode", value)

    @property
    @pulumi.getter(name="placementConstraints")
    def placement_constraints(self) -> Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.TaskDefinitionPlacementConstraintArgs']]]]:
        """
        Configuration block for rules that are taken into consideration during task placement. Maximum number of `placement_constraints` is `10`. Detailed below.
        """
        return pulumi.get(self, "placement_constraints")

    @placement_constraints.setter
    def placement_constraints(self, value: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.TaskDefinitionPlacementConstraintArgs']]]]):
        pulumi.set(self, "placement_constraints", value)

    @property
    @pulumi.getter(name="proxyConfiguration")
    def proxy_configuration(self) -> Optional[pulumi.Input['pulumi_aws.ecs.TaskDefinitionProxyConfigurationArgs']]:
        """
        Configuration block for the App Mesh proxy. Detailed below.
        """
        return pulumi.get(self, "proxy_configuration")

    @proxy_configuration.setter
    def proxy_configuration(self, value: Optional[pulumi.Input['pulumi_aws.ecs.TaskDefinitionProxyConfigurationArgs']]):
        pulumi.set(self, "proxy_configuration", value)

    @property
    @pulumi.getter(name="runtimePlatform")
    def runtime_platform(self) -> Optional[pulumi.Input['pulumi_aws.ecs.TaskDefinitionRuntimePlatformArgs']]:
        """
        Configuration block for runtime_platform that containers in your task may use.
        """
        return pulumi.get(self, "runtime_platform")

    @runtime_platform.setter
    def runtime_platform(self, value: Optional[pulumi.Input['pulumi_aws.ecs.TaskDefinitionRuntimePlatformArgs']]):
        pulumi.set(self, "runtime_platform", value)

    @property
    @pulumi.getter(name="skipDestroy")
    def skip_destroy(self) -> Optional[pulumi.Input[bool]]:
        """
        Whether to retain the old revision when the resource is destroyed or replacement is necessary. Default is `false`.
        """
        return pulumi.get(self, "skip_destroy")

    @skip_destroy.setter
    def skip_destroy(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "skip_destroy", value)

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
    @pulumi.getter(name="taskRole")
    def task_role(self) -> Optional['_awsx.DefaultRoleWithPolicyArgs']:
        """
        IAM role that allows your Amazon ECS container task to make calls to other AWS services.
        Will be created automatically if not defined.
        """
        return pulumi.get(self, "task_role")

    @task_role.setter
    def task_role(self, value: Optional['_awsx.DefaultRoleWithPolicyArgs']):
        pulumi.set(self, "task_role", value)

    @property
    @pulumi.getter(name="trackLatest")
    def track_latest(self) -> Optional[pulumi.Input[bool]]:
        """
        Whether should track latest `ACTIVE` task definition on AWS or the one created with the resource stored in state. Default is `false`. Useful in the event the task definition is modified outside of this resource.
        """
        return pulumi.get(self, "track_latest")

    @track_latest.setter
    def track_latest(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "track_latest", value)

    @property
    @pulumi.getter
    def volumes(self) -> Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.TaskDefinitionVolumeArgs']]]]:
        """
        Configuration block for volumes that containers in your task may use. Detailed below.
        """
        return pulumi.get(self, "volumes")

    @volumes.setter
    def volumes(self, value: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecs.TaskDefinitionVolumeArgs']]]]):
        pulumi.set(self, "volumes", value)


class EC2TaskDefinition(pulumi.ComponentResource):
    @overload
    def __init__(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 container: Optional[Union['TaskDefinitionContainerDefinitionArgs', 'TaskDefinitionContainerDefinitionArgsDict']] = None,
                 containers: Optional[Mapping[str, Union['TaskDefinitionContainerDefinitionArgs', 'TaskDefinitionContainerDefinitionArgsDict']]] = None,
                 cpu: Optional[pulumi.Input[str]] = None,
                 enable_fault_injection: Optional[pulumi.Input[bool]] = None,
                 ephemeral_storage: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionEphemeralStorageArgs']]] = None,
                 execution_role: Optional[Union['_awsx.DefaultRoleWithPolicyArgs', '_awsx.DefaultRoleWithPolicyArgsDict']] = None,
                 family: Optional[pulumi.Input[str]] = None,
                 inference_accelerators: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionInferenceAcceleratorArgs']]]]] = None,
                 ipc_mode: Optional[pulumi.Input[str]] = None,
                 log_group: Optional[Union['_awsx.DefaultLogGroupArgs', '_awsx.DefaultLogGroupArgsDict']] = None,
                 memory: Optional[pulumi.Input[str]] = None,
                 network_mode: Optional[pulumi.Input[str]] = None,
                 pid_mode: Optional[pulumi.Input[str]] = None,
                 placement_constraints: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionPlacementConstraintArgs']]]]] = None,
                 proxy_configuration: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionProxyConfigurationArgs']]] = None,
                 runtime_platform: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionRuntimePlatformArgs']]] = None,
                 skip_destroy: Optional[pulumi.Input[bool]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 task_role: Optional[Union['_awsx.DefaultRoleWithPolicyArgs', '_awsx.DefaultRoleWithPolicyArgsDict']] = None,
                 track_latest: Optional[pulumi.Input[bool]] = None,
                 volumes: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionVolumeArgs']]]]] = None,
                 __props__=None):
        """
        Create a TaskDefinition resource with the given unique name, arguments, and options.
        Creates required log-group and task & execution roles.
        Presents required Service load balancers if target group included in port mappings.

        :param str resource_name: The name of the resource.
        :param pulumi.ResourceOptions opts: Options for the resource.
        :param Union['TaskDefinitionContainerDefinitionArgs', 'TaskDefinitionContainerDefinitionArgsDict'] container: Single container to make a TaskDefinition from.  Useful for simple cases where there aren't
               multiple containers, especially when creating a TaskDefinition to call [run] on.
               
               Either [container] or [containers] must be provided.
        :param Mapping[str, Union['TaskDefinitionContainerDefinitionArgs', 'TaskDefinitionContainerDefinitionArgsDict']] containers: All the containers to make a TaskDefinition from.  Useful when creating a Service that will
               contain many containers within.
               
               Either [container] or [containers] must be provided.
        :param pulumi.Input[str] cpu: The number of cpu units used by the task. If not provided, a default will be computed based on the cumulative needs specified by [containerDefinitions]
        :param pulumi.Input[bool] enable_fault_injection: Enables fault injection and allows for fault injection requests to be accepted from the task's containers. Default is `false`.
               
               **Note:** Fault injection only works with tasks using the `awsvpc` or `host` network modes. Fault injection isn't available on Windows.
        :param pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionEphemeralStorageArgs']] ephemeral_storage: The amount of ephemeral storage to allocate for the task. This parameter is used to expand the total amount of ephemeral storage available, beyond the default amount, for tasks hosted on AWS Fargate. See Ephemeral Storage.
        :param Union['_awsx.DefaultRoleWithPolicyArgs', '_awsx.DefaultRoleWithPolicyArgsDict'] execution_role: The execution role that the Amazon ECS container agent and the Docker daemon can assume.
               Will be created automatically if not defined.
        :param pulumi.Input[str] family: An optional unique name for your task definition. If not specified, then a default will be created.
        :param pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionInferenceAcceleratorArgs']]]] inference_accelerators: Configuration block(s) with Inference Accelerators settings. Detailed below.
        :param pulumi.Input[str] ipc_mode: IPC resource namespace to be used for the containers in the task The valid values are `host`, `task`, and `none`.
        :param Union['_awsx.DefaultLogGroupArgs', '_awsx.DefaultLogGroupArgsDict'] log_group: A set of volume blocks that containers in your task may use.
        :param pulumi.Input[str] memory: The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
               based on the cumulative needs specified by [containerDefinitions]
        :param pulumi.Input[str] network_mode: Docker networking mode to use for the containers in the task. Valid values are `none`, `bridge`, `awsvpc`, and `host`.
        :param pulumi.Input[str] pid_mode: Process namespace to use for the containers in the task. The valid values are `host` and `task`.
        :param pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionPlacementConstraintArgs']]]] placement_constraints: Configuration block for rules that are taken into consideration during task placement. Maximum number of `placement_constraints` is `10`. Detailed below.
        :param pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionProxyConfigurationArgs']] proxy_configuration: Configuration block for the App Mesh proxy. Detailed below.
        :param pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionRuntimePlatformArgs']] runtime_platform: Configuration block for runtime_platform that containers in your task may use.
        :param pulumi.Input[bool] skip_destroy: Whether to retain the old revision when the resource is destroyed or replacement is necessary. Default is `false`.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] tags: Key-value map of resource tags. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        :param Union['_awsx.DefaultRoleWithPolicyArgs', '_awsx.DefaultRoleWithPolicyArgsDict'] task_role: IAM role that allows your Amazon ECS container task to make calls to other AWS services.
               Will be created automatically if not defined.
        :param pulumi.Input[bool] track_latest: Whether should track latest `ACTIVE` task definition on AWS or the one created with the resource stored in state. Default is `false`. Useful in the event the task definition is modified outside of this resource.
        :param pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionVolumeArgs']]]] volumes: Configuration block for volumes that containers in your task may use. Detailed below.
        """
        ...
    @overload
    def __init__(__self__,
                 resource_name: str,
                 args: Optional[EC2TaskDefinitionArgs] = None,
                 opts: Optional[pulumi.ResourceOptions] = None):
        """
        Create a TaskDefinition resource with the given unique name, arguments, and options.
        Creates required log-group and task & execution roles.
        Presents required Service load balancers if target group included in port mappings.

        :param str resource_name: The name of the resource.
        :param EC2TaskDefinitionArgs args: The arguments to use to populate this resource's properties.
        :param pulumi.ResourceOptions opts: Options for the resource.
        """
        ...
    def __init__(__self__, resource_name: str, *args, **kwargs):
        resource_args, opts = _utilities.get_resource_args_opts(EC2TaskDefinitionArgs, pulumi.ResourceOptions, *args, **kwargs)
        if resource_args is not None:
            __self__._internal_init(resource_name, opts, **resource_args.__dict__)
        else:
            __self__._internal_init(resource_name, *args, **kwargs)

    def _internal_init(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 container: Optional[Union['TaskDefinitionContainerDefinitionArgs', 'TaskDefinitionContainerDefinitionArgsDict']] = None,
                 containers: Optional[Mapping[str, Union['TaskDefinitionContainerDefinitionArgs', 'TaskDefinitionContainerDefinitionArgsDict']]] = None,
                 cpu: Optional[pulumi.Input[str]] = None,
                 enable_fault_injection: Optional[pulumi.Input[bool]] = None,
                 ephemeral_storage: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionEphemeralStorageArgs']]] = None,
                 execution_role: Optional[Union['_awsx.DefaultRoleWithPolicyArgs', '_awsx.DefaultRoleWithPolicyArgsDict']] = None,
                 family: Optional[pulumi.Input[str]] = None,
                 inference_accelerators: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionInferenceAcceleratorArgs']]]]] = None,
                 ipc_mode: Optional[pulumi.Input[str]] = None,
                 log_group: Optional[Union['_awsx.DefaultLogGroupArgs', '_awsx.DefaultLogGroupArgsDict']] = None,
                 memory: Optional[pulumi.Input[str]] = None,
                 network_mode: Optional[pulumi.Input[str]] = None,
                 pid_mode: Optional[pulumi.Input[str]] = None,
                 placement_constraints: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionPlacementConstraintArgs']]]]] = None,
                 proxy_configuration: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionProxyConfigurationArgs']]] = None,
                 runtime_platform: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionRuntimePlatformArgs']]] = None,
                 skip_destroy: Optional[pulumi.Input[bool]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 task_role: Optional[Union['_awsx.DefaultRoleWithPolicyArgs', '_awsx.DefaultRoleWithPolicyArgsDict']] = None,
                 track_latest: Optional[pulumi.Input[bool]] = None,
                 volumes: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecs.TaskDefinitionVolumeArgs']]]]] = None,
                 __props__=None):
        opts = pulumi.ResourceOptions.merge(_utilities.get_resource_opts_defaults(), opts)
        if not isinstance(opts, pulumi.ResourceOptions):
            raise TypeError('Expected resource options to be a ResourceOptions instance')
        if opts.id is not None:
            raise ValueError('ComponentResource classes do not support opts.id')
        else:
            if __props__ is not None:
                raise TypeError('__props__ is only valid when passed in combination with a valid opts.id to get an existing resource')
            __props__ = EC2TaskDefinitionArgs.__new__(EC2TaskDefinitionArgs)

            __props__.__dict__["container"] = container
            __props__.__dict__["containers"] = containers
            __props__.__dict__["cpu"] = cpu
            __props__.__dict__["enable_fault_injection"] = enable_fault_injection
            __props__.__dict__["ephemeral_storage"] = ephemeral_storage
            __props__.__dict__["execution_role"] = execution_role
            __props__.__dict__["family"] = family
            __props__.__dict__["inference_accelerators"] = inference_accelerators
            __props__.__dict__["ipc_mode"] = ipc_mode
            __props__.__dict__["log_group"] = log_group
            __props__.__dict__["memory"] = memory
            __props__.__dict__["network_mode"] = network_mode
            __props__.__dict__["pid_mode"] = pid_mode
            __props__.__dict__["placement_constraints"] = placement_constraints
            __props__.__dict__["proxy_configuration"] = proxy_configuration
            __props__.__dict__["runtime_platform"] = runtime_platform
            __props__.__dict__["skip_destroy"] = skip_destroy
            __props__.__dict__["tags"] = tags
            __props__.__dict__["task_role"] = task_role
            __props__.__dict__["track_latest"] = track_latest
            __props__.__dict__["volumes"] = volumes
            __props__.__dict__["load_balancers"] = None
            __props__.__dict__["task_definition"] = None
        super(EC2TaskDefinition, __self__).__init__(
            'awsx:ecs:EC2TaskDefinition',
            resource_name,
            __props__,
            opts,
            remote=True)

    @property
    @pulumi.getter(name="executionRole")
    def execution_role(self) -> pulumi.Output[Optional['pulumi_aws.iam.Role']]:
        """
        Auto-created IAM task execution role that the Amazon ECS container agent and the Docker daemon can assume.
        """
        return pulumi.get(self, "execution_role")

    @property
    @pulumi.getter(name="loadBalancers")
    def load_balancers(self) -> pulumi.Output[Sequence['pulumi_aws.ecs.outputs.ServiceLoadBalancer']]:
        """
        Computed load balancers from target groups specified of container port mappings.
        """
        return pulumi.get(self, "load_balancers")

    @property
    @pulumi.getter(name="logGroup")
    def log_group(self) -> pulumi.Output[Optional['pulumi_aws.cloudwatch.LogGroup']]:
        """
        Auto-created Log Group resource for use by containers.
        """
        return pulumi.get(self, "log_group")

    @property
    @pulumi.getter(name="taskDefinition")
    def task_definition(self) -> pulumi.Output['pulumi_aws.ecs.TaskDefinition']:
        """
        Underlying ECS Task Definition resource
        """
        return pulumi.get(self, "task_definition")

    @property
    @pulumi.getter(name="taskRole")
    def task_role(self) -> pulumi.Output[Optional['pulumi_aws.iam.Role']]:
        """
        Auto-created IAM role that allows your Amazon ECS container task to make calls to other AWS services.
        """
        return pulumi.get(self, "task_role")

