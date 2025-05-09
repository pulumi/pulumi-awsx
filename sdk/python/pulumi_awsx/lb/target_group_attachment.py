# coding=utf-8
# *** WARNING: this file was generated by pulumi-gen-awsx. ***
# *** Do not edit by hand unless you're certain you know what you are doing! ***

import builtins
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
import pulumi_aws

__all__ = ['TargetGroupAttachmentArgs', 'TargetGroupAttachment']

@pulumi.input_type
class TargetGroupAttachmentArgs:
    def __init__(__self__, *,
                 instance: Optional[pulumi.Input['pulumi_aws.ec2.Instance']] = None,
                 instance_id: Optional[pulumi.Input[builtins.str]] = None,
                 lambda_: Optional[pulumi.Input['pulumi_aws.lambda_.Function']] = None,
                 lambda_arn: Optional[pulumi.Input[builtins.str]] = None,
                 target_group: Optional[pulumi.Input['pulumi_aws.lb.TargetGroup']] = None,
                 target_group_arn: Optional[pulumi.Input[builtins.str]] = None):
        """
        The set of arguments for constructing a TargetGroupAttachment resource.
        :param pulumi.Input['pulumi_aws.ec2.Instance'] instance: EC2 Instance to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
        :param pulumi.Input[builtins.str] instance_id: ID of an EC2 Instance to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
        :param pulumi.Input['pulumi_aws.lambda_.Function'] lambda_: Lambda Function to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
        :param pulumi.Input[builtins.str] lambda_arn: ARN of a Lambda Function to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
        :param pulumi.Input['pulumi_aws.lb.TargetGroup'] target_group: Target Group to attach to. Exactly one of [targetGroup] or [targetGroupArn] must be specified.
        :param pulumi.Input[builtins.str] target_group_arn: ARN of the Target Group to attach to. Exactly one of [targetGroup] or [targetGroupArn] must be specified.
        """
        if instance is not None:
            pulumi.set(__self__, "instance", instance)
        if instance_id is not None:
            pulumi.set(__self__, "instance_id", instance_id)
        if lambda_ is not None:
            pulumi.set(__self__, "lambda_", lambda_)
        if lambda_arn is not None:
            pulumi.set(__self__, "lambda_arn", lambda_arn)
        if target_group is not None:
            pulumi.set(__self__, "target_group", target_group)
        if target_group_arn is not None:
            pulumi.set(__self__, "target_group_arn", target_group_arn)

    @property
    @pulumi.getter
    def instance(self) -> Optional[pulumi.Input['pulumi_aws.ec2.Instance']]:
        """
        EC2 Instance to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
        """
        return pulumi.get(self, "instance")

    @instance.setter
    def instance(self, value: Optional[pulumi.Input['pulumi_aws.ec2.Instance']]):
        pulumi.set(self, "instance", value)

    @property
    @pulumi.getter(name="instanceId")
    def instance_id(self) -> Optional[pulumi.Input[builtins.str]]:
        """
        ID of an EC2 Instance to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
        """
        return pulumi.get(self, "instance_id")

    @instance_id.setter
    def instance_id(self, value: Optional[pulumi.Input[builtins.str]]):
        pulumi.set(self, "instance_id", value)

    @property
    @pulumi.getter(name="lambda")
    def lambda_(self) -> Optional[pulumi.Input['pulumi_aws.lambda_.Function']]:
        """
        Lambda Function to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
        """
        return pulumi.get(self, "lambda_")

    @lambda_.setter
    def lambda_(self, value: Optional[pulumi.Input['pulumi_aws.lambda_.Function']]):
        pulumi.set(self, "lambda_", value)

    @property
    @pulumi.getter(name="lambdaArn")
    def lambda_arn(self) -> Optional[pulumi.Input[builtins.str]]:
        """
        ARN of a Lambda Function to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
        """
        return pulumi.get(self, "lambda_arn")

    @lambda_arn.setter
    def lambda_arn(self, value: Optional[pulumi.Input[builtins.str]]):
        pulumi.set(self, "lambda_arn", value)

    @property
    @pulumi.getter(name="targetGroup")
    def target_group(self) -> Optional[pulumi.Input['pulumi_aws.lb.TargetGroup']]:
        """
        Target Group to attach to. Exactly one of [targetGroup] or [targetGroupArn] must be specified.
        """
        return pulumi.get(self, "target_group")

    @target_group.setter
    def target_group(self, value: Optional[pulumi.Input['pulumi_aws.lb.TargetGroup']]):
        pulumi.set(self, "target_group", value)

    @property
    @pulumi.getter(name="targetGroupArn")
    def target_group_arn(self) -> Optional[pulumi.Input[builtins.str]]:
        """
        ARN of the Target Group to attach to. Exactly one of [targetGroup] or [targetGroupArn] must be specified.
        """
        return pulumi.get(self, "target_group_arn")

    @target_group_arn.setter
    def target_group_arn(self, value: Optional[pulumi.Input[builtins.str]]):
        pulumi.set(self, "target_group_arn", value)


class TargetGroupAttachment(pulumi.ComponentResource):

    pulumi_type = "awsx:lb:TargetGroupAttachment"

    @overload
    def __init__(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 instance: Optional[pulumi.Input['pulumi_aws.ec2.Instance']] = None,
                 instance_id: Optional[pulumi.Input[builtins.str]] = None,
                 lambda_: Optional[pulumi.Input['pulumi_aws.lambda_.Function']] = None,
                 lambda_arn: Optional[pulumi.Input[builtins.str]] = None,
                 target_group: Optional[pulumi.Input['pulumi_aws.lb.TargetGroup']] = None,
                 target_group_arn: Optional[pulumi.Input[builtins.str]] = None,
                 __props__=None):
        """
        Attach an EC2 instance or Lambda to a Load Balancer. This will create required permissions if attaching to a Lambda Function.

        :param str resource_name: The name of the resource.
        :param pulumi.ResourceOptions opts: Options for the resource.
        :param pulumi.Input['pulumi_aws.ec2.Instance'] instance: EC2 Instance to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
        :param pulumi.Input[builtins.str] instance_id: ID of an EC2 Instance to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
        :param pulumi.Input['pulumi_aws.lambda_.Function'] lambda_: Lambda Function to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
        :param pulumi.Input[builtins.str] lambda_arn: ARN of a Lambda Function to attach to the Target Group. Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.
        :param pulumi.Input['pulumi_aws.lb.TargetGroup'] target_group: Target Group to attach to. Exactly one of [targetGroup] or [targetGroupArn] must be specified.
        :param pulumi.Input[builtins.str] target_group_arn: ARN of the Target Group to attach to. Exactly one of [targetGroup] or [targetGroupArn] must be specified.
        """
        ...
    @overload
    def __init__(__self__,
                 resource_name: str,
                 args: Optional[TargetGroupAttachmentArgs] = None,
                 opts: Optional[pulumi.ResourceOptions] = None):
        """
        Attach an EC2 instance or Lambda to a Load Balancer. This will create required permissions if attaching to a Lambda Function.

        :param str resource_name: The name of the resource.
        :param TargetGroupAttachmentArgs args: The arguments to use to populate this resource's properties.
        :param pulumi.ResourceOptions opts: Options for the resource.
        """
        ...
    def __init__(__self__, resource_name: str, *args, **kwargs):
        resource_args, opts = _utilities.get_resource_args_opts(TargetGroupAttachmentArgs, pulumi.ResourceOptions, *args, **kwargs)
        if resource_args is not None:
            __self__._internal_init(resource_name, opts, **resource_args.__dict__)
        else:
            __self__._internal_init(resource_name, *args, **kwargs)

    def _internal_init(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 instance: Optional[pulumi.Input['pulumi_aws.ec2.Instance']] = None,
                 instance_id: Optional[pulumi.Input[builtins.str]] = None,
                 lambda_: Optional[pulumi.Input['pulumi_aws.lambda_.Function']] = None,
                 lambda_arn: Optional[pulumi.Input[builtins.str]] = None,
                 target_group: Optional[pulumi.Input['pulumi_aws.lb.TargetGroup']] = None,
                 target_group_arn: Optional[pulumi.Input[builtins.str]] = None,
                 __props__=None):
        opts = pulumi.ResourceOptions.merge(_utilities.get_resource_opts_defaults(), opts)
        if not isinstance(opts, pulumi.ResourceOptions):
            raise TypeError('Expected resource options to be a ResourceOptions instance')
        if opts.id is not None:
            raise ValueError('ComponentResource classes do not support opts.id')
        else:
            if __props__ is not None:
                raise TypeError('__props__ is only valid when passed in combination with a valid opts.id to get an existing resource')
            __props__ = TargetGroupAttachmentArgs.__new__(TargetGroupAttachmentArgs)

            __props__.__dict__["instance"] = instance
            __props__.__dict__["instance_id"] = instance_id
            __props__.__dict__["lambda_"] = lambda_
            __props__.__dict__["lambda_arn"] = lambda_arn
            __props__.__dict__["target_group"] = target_group
            __props__.__dict__["target_group_arn"] = target_group_arn
            __props__.__dict__["lambda_permission"] = None
            __props__.__dict__["target_group_attachment"] = None
        super(TargetGroupAttachment, __self__).__init__(
            'awsx:lb:TargetGroupAttachment',
            resource_name,
            __props__,
            opts,
            remote=True)

    @property
    @pulumi.getter(name="lambdaPermission")
    def lambda_permission(self) -> pulumi.Output[Optional['pulumi_aws.lambda_.Permission']]:
        """
        Auto-created Lambda permission, if targeting a Lambda function
        """
        return pulumi.get(self, "lambda_permission")

    @property
    @pulumi.getter(name="targetGroupAttachment")
    def target_group_attachment(self) -> pulumi.Output['pulumi_aws.lb.TargetGroupAttachment']:
        """
        Underlying Target Group Attachment resource
        """
        return pulumi.get(self, "target_group_attachment")

