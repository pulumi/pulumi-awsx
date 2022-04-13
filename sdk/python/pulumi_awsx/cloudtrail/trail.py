# coding=utf-8
# *** WARNING: this file was generated by pulumi-gen-awsx. ***
# *** Do not edit by hand unless you're certain you know what you are doing! ***

import warnings
import pulumi
import pulumi.runtime
from typing import Any, Mapping, Optional, Sequence, Union, overload
from .. import _utilities
from ._inputs import *
import pulumi_aws

__all__ = ['TrailArgs', 'Trail']

@pulumi.input_type
class TrailArgs:
    def __init__(__self__, *,
                 advanced_event_selectors: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.cloudtrail.TrailAdvancedEventSelectorArgs']]]] = None,
                 cloud_watch_log_group_args: Optional[pulumi.Input['LogGroupArgs']] = None,
                 cloud_watch_logs_group_arn: Optional[pulumi.Input[str]] = None,
                 cloud_watch_logs_role_arn: Optional[pulumi.Input[str]] = None,
                 enable_log_file_validation: Optional[pulumi.Input[bool]] = None,
                 enable_logging: Optional[pulumi.Input[bool]] = None,
                 event_selectors: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.cloudtrail.TrailEventSelectorArgs']]]] = None,
                 include_global_service_events: Optional[pulumi.Input[bool]] = None,
                 insight_selectors: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.cloudtrail.TrailInsightSelectorArgs']]]] = None,
                 is_multi_region_trail: Optional[pulumi.Input[bool]] = None,
                 is_organization_trail: Optional[pulumi.Input[bool]] = None,
                 kms_key_id: Optional[pulumi.Input[str]] = None,
                 s3_bucket_name: Optional[pulumi.Input[str]] = None,
                 s3_key_prefix: Optional[pulumi.Input[str]] = None,
                 send_to_cloud_watch_logs: Optional[pulumi.Input[bool]] = None,
                 sns_topic_name: Optional[pulumi.Input[str]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None):
        """
        The set of arguments for constructing a Trail resource.
        :param pulumi.Input[Sequence[pulumi.Input['pulumi_aws.cloudtrail.TrailAdvancedEventSelectorArgs']]] advanced_event_selectors: Specifies an advanced event selector for enabling data event logging.
        :param pulumi.Input['LogGroupArgs'] cloud_watch_log_group_args: If sendToCloudWatchLogs is enabled, provide the log group configuration.
        :param pulumi.Input[str] cloud_watch_logs_group_arn: Log group name using an ARN that represents the log group to which CloudTrail logs will be delivered. Note that CloudTrail requires the Log Stream wildcard.
        :param pulumi.Input[str] cloud_watch_logs_role_arn: Role for the CloudWatch Logs endpoint to assume to write to a user’s log group.
        :param pulumi.Input[bool] enable_log_file_validation: Whether log file integrity validation is enabled. Defaults to `false`.
        :param pulumi.Input[bool] enable_logging: Enables logging for the trail. Defaults to `true`. Setting this to `false` will pause logging.
        :param pulumi.Input[Sequence[pulumi.Input['pulumi_aws.cloudtrail.TrailEventSelectorArgs']]] event_selectors: Specifies an event selector for enabling data event logging. Please note the CloudTrail limits when configuring these
        :param pulumi.Input[bool] include_global_service_events: Whether the trail is publishing events from global services such as IAM to the log files. Defaults to `true`.
        :param pulumi.Input[Sequence[pulumi.Input['pulumi_aws.cloudtrail.TrailInsightSelectorArgs']]] insight_selectors: Configuration block for identifying unusual operational activity.
        :param pulumi.Input[bool] is_multi_region_trail: Whether the trail is created in the current region or in all regions. Defaults to `false`.
        :param pulumi.Input[bool] is_organization_trail: Whether the trail is an AWS Organizations trail. Organization trails log events for the master account and all member accounts. Can only be created in the organization master account. Defaults to `false`
        :param pulumi.Input[str] kms_key_id: KMS key ARN to use to encrypt the logs delivered by CloudTrail.
        :param pulumi.Input[str] s3_bucket_name: Name of the S3 bucket designated for publishing log files.
        :param pulumi.Input[str] s3_key_prefix: S3 key prefix that follows the name of the bucket you have designated for log file delivery.
        :param pulumi.Input[bool] send_to_cloud_watch_logs: If CloudTrail pushes logs to CloudWatch Logs in addition to S3. Disabled by default to reduce costs. Defaults to `false`
        :param pulumi.Input[str] sns_topic_name: Name of the Amazon SNS topic defined for notification of log file delivery.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] tags: Map of tags to assign to the trail. If configured with provider defaultTags present, tags with matching keys will overwrite those defined at the provider-level.
        """
        if advanced_event_selectors is not None:
            pulumi.set(__self__, "advanced_event_selectors", advanced_event_selectors)
        if cloud_watch_log_group_args is not None:
            pulumi.set(__self__, "cloud_watch_log_group_args", cloud_watch_log_group_args)
        if cloud_watch_logs_group_arn is not None:
            pulumi.set(__self__, "cloud_watch_logs_group_arn", cloud_watch_logs_group_arn)
        if cloud_watch_logs_role_arn is not None:
            pulumi.set(__self__, "cloud_watch_logs_role_arn", cloud_watch_logs_role_arn)
        if enable_log_file_validation is not None:
            pulumi.set(__self__, "enable_log_file_validation", enable_log_file_validation)
        if enable_logging is not None:
            pulumi.set(__self__, "enable_logging", enable_logging)
        if event_selectors is not None:
            pulumi.set(__self__, "event_selectors", event_selectors)
        if include_global_service_events is not None:
            pulumi.set(__self__, "include_global_service_events", include_global_service_events)
        if insight_selectors is not None:
            pulumi.set(__self__, "insight_selectors", insight_selectors)
        if is_multi_region_trail is not None:
            pulumi.set(__self__, "is_multi_region_trail", is_multi_region_trail)
        if is_organization_trail is not None:
            pulumi.set(__self__, "is_organization_trail", is_organization_trail)
        if kms_key_id is not None:
            pulumi.set(__self__, "kms_key_id", kms_key_id)
        if s3_bucket_name is not None:
            pulumi.set(__self__, "s3_bucket_name", s3_bucket_name)
        if s3_key_prefix is not None:
            pulumi.set(__self__, "s3_key_prefix", s3_key_prefix)
        if send_to_cloud_watch_logs is not None:
            pulumi.set(__self__, "send_to_cloud_watch_logs", send_to_cloud_watch_logs)
        if sns_topic_name is not None:
            pulumi.set(__self__, "sns_topic_name", sns_topic_name)
        if tags is not None:
            pulumi.set(__self__, "tags", tags)

    @property
    @pulumi.getter(name="advancedEventSelectors")
    def advanced_event_selectors(self) -> Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.cloudtrail.TrailAdvancedEventSelectorArgs']]]]:
        """
        Specifies an advanced event selector for enabling data event logging.
        """
        return pulumi.get(self, "advanced_event_selectors")

    @advanced_event_selectors.setter
    def advanced_event_selectors(self, value: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.cloudtrail.TrailAdvancedEventSelectorArgs']]]]):
        pulumi.set(self, "advanced_event_selectors", value)

    @property
    @pulumi.getter(name="cloudWatchLogGroupArgs")
    def cloud_watch_log_group_args(self) -> Optional[pulumi.Input['LogGroupArgs']]:
        """
        If sendToCloudWatchLogs is enabled, provide the log group configuration.
        """
        return pulumi.get(self, "cloud_watch_log_group_args")

    @cloud_watch_log_group_args.setter
    def cloud_watch_log_group_args(self, value: Optional[pulumi.Input['LogGroupArgs']]):
        pulumi.set(self, "cloud_watch_log_group_args", value)

    @property
    @pulumi.getter(name="cloudWatchLogsGroupArn")
    def cloud_watch_logs_group_arn(self) -> Optional[pulumi.Input[str]]:
        """
        Log group name using an ARN that represents the log group to which CloudTrail logs will be delivered. Note that CloudTrail requires the Log Stream wildcard.
        """
        return pulumi.get(self, "cloud_watch_logs_group_arn")

    @cloud_watch_logs_group_arn.setter
    def cloud_watch_logs_group_arn(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "cloud_watch_logs_group_arn", value)

    @property
    @pulumi.getter(name="cloudWatchLogsRoleArn")
    def cloud_watch_logs_role_arn(self) -> Optional[pulumi.Input[str]]:
        """
        Role for the CloudWatch Logs endpoint to assume to write to a user’s log group.
        """
        return pulumi.get(self, "cloud_watch_logs_role_arn")

    @cloud_watch_logs_role_arn.setter
    def cloud_watch_logs_role_arn(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "cloud_watch_logs_role_arn", value)

    @property
    @pulumi.getter(name="enableLogFileValidation")
    def enable_log_file_validation(self) -> Optional[pulumi.Input[bool]]:
        """
        Whether log file integrity validation is enabled. Defaults to `false`.
        """
        return pulumi.get(self, "enable_log_file_validation")

    @enable_log_file_validation.setter
    def enable_log_file_validation(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "enable_log_file_validation", value)

    @property
    @pulumi.getter(name="enableLogging")
    def enable_logging(self) -> Optional[pulumi.Input[bool]]:
        """
        Enables logging for the trail. Defaults to `true`. Setting this to `false` will pause logging.
        """
        return pulumi.get(self, "enable_logging")

    @enable_logging.setter
    def enable_logging(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "enable_logging", value)

    @property
    @pulumi.getter(name="eventSelectors")
    def event_selectors(self) -> Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.cloudtrail.TrailEventSelectorArgs']]]]:
        """
        Specifies an event selector for enabling data event logging. Please note the CloudTrail limits when configuring these
        """
        return pulumi.get(self, "event_selectors")

    @event_selectors.setter
    def event_selectors(self, value: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.cloudtrail.TrailEventSelectorArgs']]]]):
        pulumi.set(self, "event_selectors", value)

    @property
    @pulumi.getter(name="includeGlobalServiceEvents")
    def include_global_service_events(self) -> Optional[pulumi.Input[bool]]:
        """
        Whether the trail is publishing events from global services such as IAM to the log files. Defaults to `true`.
        """
        return pulumi.get(self, "include_global_service_events")

    @include_global_service_events.setter
    def include_global_service_events(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "include_global_service_events", value)

    @property
    @pulumi.getter(name="insightSelectors")
    def insight_selectors(self) -> Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.cloudtrail.TrailInsightSelectorArgs']]]]:
        """
        Configuration block for identifying unusual operational activity.
        """
        return pulumi.get(self, "insight_selectors")

    @insight_selectors.setter
    def insight_selectors(self, value: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.cloudtrail.TrailInsightSelectorArgs']]]]):
        pulumi.set(self, "insight_selectors", value)

    @property
    @pulumi.getter(name="isMultiRegionTrail")
    def is_multi_region_trail(self) -> Optional[pulumi.Input[bool]]:
        """
        Whether the trail is created in the current region or in all regions. Defaults to `false`.
        """
        return pulumi.get(self, "is_multi_region_trail")

    @is_multi_region_trail.setter
    def is_multi_region_trail(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "is_multi_region_trail", value)

    @property
    @pulumi.getter(name="isOrganizationTrail")
    def is_organization_trail(self) -> Optional[pulumi.Input[bool]]:
        """
        Whether the trail is an AWS Organizations trail. Organization trails log events for the master account and all member accounts. Can only be created in the organization master account. Defaults to `false`
        """
        return pulumi.get(self, "is_organization_trail")

    @is_organization_trail.setter
    def is_organization_trail(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "is_organization_trail", value)

    @property
    @pulumi.getter(name="kmsKeyId")
    def kms_key_id(self) -> Optional[pulumi.Input[str]]:
        """
        KMS key ARN to use to encrypt the logs delivered by CloudTrail.
        """
        return pulumi.get(self, "kms_key_id")

    @kms_key_id.setter
    def kms_key_id(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "kms_key_id", value)

    @property
    @pulumi.getter(name="s3BucketName")
    def s3_bucket_name(self) -> Optional[pulumi.Input[str]]:
        """
        Name of the S3 bucket designated for publishing log files.
        """
        return pulumi.get(self, "s3_bucket_name")

    @s3_bucket_name.setter
    def s3_bucket_name(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "s3_bucket_name", value)

    @property
    @pulumi.getter(name="s3KeyPrefix")
    def s3_key_prefix(self) -> Optional[pulumi.Input[str]]:
        """
        S3 key prefix that follows the name of the bucket you have designated for log file delivery.
        """
        return pulumi.get(self, "s3_key_prefix")

    @s3_key_prefix.setter
    def s3_key_prefix(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "s3_key_prefix", value)

    @property
    @pulumi.getter(name="sendToCloudWatchLogs")
    def send_to_cloud_watch_logs(self) -> Optional[pulumi.Input[bool]]:
        """
        If CloudTrail pushes logs to CloudWatch Logs in addition to S3. Disabled by default to reduce costs. Defaults to `false`
        """
        return pulumi.get(self, "send_to_cloud_watch_logs")

    @send_to_cloud_watch_logs.setter
    def send_to_cloud_watch_logs(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "send_to_cloud_watch_logs", value)

    @property
    @pulumi.getter(name="snsTopicName")
    def sns_topic_name(self) -> Optional[pulumi.Input[str]]:
        """
        Name of the Amazon SNS topic defined for notification of log file delivery.
        """
        return pulumi.get(self, "sns_topic_name")

    @sns_topic_name.setter
    def sns_topic_name(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "sns_topic_name", value)

    @property
    @pulumi.getter
    def tags(self) -> Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]]:
        """
        Map of tags to assign to the trail. If configured with provider defaultTags present, tags with matching keys will overwrite those defined at the provider-level.
        """
        return pulumi.get(self, "tags")

    @tags.setter
    def tags(self, value: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]]):
        pulumi.set(self, "tags", value)


class Trail(pulumi.ComponentResource):
    @overload
    def __init__(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 advanced_event_selectors: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.cloudtrail.TrailAdvancedEventSelectorArgs']]]]] = None,
                 cloud_watch_log_group_args: Optional[pulumi.Input[pulumi.InputType['LogGroupArgs']]] = None,
                 cloud_watch_logs_group_arn: Optional[pulumi.Input[str]] = None,
                 cloud_watch_logs_role_arn: Optional[pulumi.Input[str]] = None,
                 enable_log_file_validation: Optional[pulumi.Input[bool]] = None,
                 enable_logging: Optional[pulumi.Input[bool]] = None,
                 event_selectors: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.cloudtrail.TrailEventSelectorArgs']]]]] = None,
                 include_global_service_events: Optional[pulumi.Input[bool]] = None,
                 insight_selectors: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.cloudtrail.TrailInsightSelectorArgs']]]]] = None,
                 is_multi_region_trail: Optional[pulumi.Input[bool]] = None,
                 is_organization_trail: Optional[pulumi.Input[bool]] = None,
                 kms_key_id: Optional[pulumi.Input[str]] = None,
                 s3_bucket_name: Optional[pulumi.Input[str]] = None,
                 s3_key_prefix: Optional[pulumi.Input[str]] = None,
                 send_to_cloud_watch_logs: Optional[pulumi.Input[bool]] = None,
                 sns_topic_name: Optional[pulumi.Input[str]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 __props__=None):
        """
        Create a Trail resource with the given unique name, props, and options.
        :param str resource_name: The name of the resource.
        :param pulumi.ResourceOptions opts: Options for the resource.
        :param pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.cloudtrail.TrailAdvancedEventSelectorArgs']]]] advanced_event_selectors: Specifies an advanced event selector for enabling data event logging.
        :param pulumi.Input[pulumi.InputType['LogGroupArgs']] cloud_watch_log_group_args: If sendToCloudWatchLogs is enabled, provide the log group configuration.
        :param pulumi.Input[str] cloud_watch_logs_group_arn: Log group name using an ARN that represents the log group to which CloudTrail logs will be delivered. Note that CloudTrail requires the Log Stream wildcard.
        :param pulumi.Input[str] cloud_watch_logs_role_arn: Role for the CloudWatch Logs endpoint to assume to write to a user’s log group.
        :param pulumi.Input[bool] enable_log_file_validation: Whether log file integrity validation is enabled. Defaults to `false`.
        :param pulumi.Input[bool] enable_logging: Enables logging for the trail. Defaults to `true`. Setting this to `false` will pause logging.
        :param pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.cloudtrail.TrailEventSelectorArgs']]]] event_selectors: Specifies an event selector for enabling data event logging. Please note the CloudTrail limits when configuring these
        :param pulumi.Input[bool] include_global_service_events: Whether the trail is publishing events from global services such as IAM to the log files. Defaults to `true`.
        :param pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.cloudtrail.TrailInsightSelectorArgs']]]] insight_selectors: Configuration block for identifying unusual operational activity.
        :param pulumi.Input[bool] is_multi_region_trail: Whether the trail is created in the current region or in all regions. Defaults to `false`.
        :param pulumi.Input[bool] is_organization_trail: Whether the trail is an AWS Organizations trail. Organization trails log events for the master account and all member accounts. Can only be created in the organization master account. Defaults to `false`
        :param pulumi.Input[str] kms_key_id: KMS key ARN to use to encrypt the logs delivered by CloudTrail.
        :param pulumi.Input[str] s3_bucket_name: Name of the S3 bucket designated for publishing log files.
        :param pulumi.Input[str] s3_key_prefix: S3 key prefix that follows the name of the bucket you have designated for log file delivery.
        :param pulumi.Input[bool] send_to_cloud_watch_logs: If CloudTrail pushes logs to CloudWatch Logs in addition to S3. Disabled by default to reduce costs. Defaults to `false`
        :param pulumi.Input[str] sns_topic_name: Name of the Amazon SNS topic defined for notification of log file delivery.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] tags: Map of tags to assign to the trail. If configured with provider defaultTags present, tags with matching keys will overwrite those defined at the provider-level.
        """
        ...
    @overload
    def __init__(__self__,
                 resource_name: str,
                 args: Optional[TrailArgs] = None,
                 opts: Optional[pulumi.ResourceOptions] = None):
        """
        Create a Trail resource with the given unique name, props, and options.
        :param str resource_name: The name of the resource.
        :param TrailArgs args: The arguments to use to populate this resource's properties.
        :param pulumi.ResourceOptions opts: Options for the resource.
        """
        ...
    def __init__(__self__, resource_name: str, *args, **kwargs):
        resource_args, opts = _utilities.get_resource_args_opts(TrailArgs, pulumi.ResourceOptions, *args, **kwargs)
        if resource_args is not None:
            __self__._internal_init(resource_name, opts, **resource_args.__dict__)
        else:
            __self__._internal_init(resource_name, *args, **kwargs)

    def _internal_init(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 advanced_event_selectors: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.cloudtrail.TrailAdvancedEventSelectorArgs']]]]] = None,
                 cloud_watch_log_group_args: Optional[pulumi.Input[pulumi.InputType['LogGroupArgs']]] = None,
                 cloud_watch_logs_group_arn: Optional[pulumi.Input[str]] = None,
                 cloud_watch_logs_role_arn: Optional[pulumi.Input[str]] = None,
                 enable_log_file_validation: Optional[pulumi.Input[bool]] = None,
                 enable_logging: Optional[pulumi.Input[bool]] = None,
                 event_selectors: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.cloudtrail.TrailEventSelectorArgs']]]]] = None,
                 include_global_service_events: Optional[pulumi.Input[bool]] = None,
                 insight_selectors: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.cloudtrail.TrailInsightSelectorArgs']]]]] = None,
                 is_multi_region_trail: Optional[pulumi.Input[bool]] = None,
                 is_organization_trail: Optional[pulumi.Input[bool]] = None,
                 kms_key_id: Optional[pulumi.Input[str]] = None,
                 s3_bucket_name: Optional[pulumi.Input[str]] = None,
                 s3_key_prefix: Optional[pulumi.Input[str]] = None,
                 send_to_cloud_watch_logs: Optional[pulumi.Input[bool]] = None,
                 sns_topic_name: Optional[pulumi.Input[str]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
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
            __props__ = TrailArgs.__new__(TrailArgs)

            __props__.__dict__["advanced_event_selectors"] = advanced_event_selectors
            __props__.__dict__["cloud_watch_log_group_args"] = cloud_watch_log_group_args
            __props__.__dict__["cloud_watch_logs_group_arn"] = cloud_watch_logs_group_arn
            __props__.__dict__["cloud_watch_logs_role_arn"] = cloud_watch_logs_role_arn
            __props__.__dict__["enable_log_file_validation"] = enable_log_file_validation
            __props__.__dict__["enable_logging"] = enable_logging
            __props__.__dict__["event_selectors"] = event_selectors
            __props__.__dict__["include_global_service_events"] = include_global_service_events
            __props__.__dict__["insight_selectors"] = insight_selectors
            __props__.__dict__["is_multi_region_trail"] = is_multi_region_trail
            __props__.__dict__["is_organization_trail"] = is_organization_trail
            __props__.__dict__["kms_key_id"] = kms_key_id
            __props__.__dict__["s3_bucket_name"] = s3_bucket_name
            __props__.__dict__["s3_key_prefix"] = s3_key_prefix
            __props__.__dict__["send_to_cloud_watch_logs"] = send_to_cloud_watch_logs
            __props__.__dict__["sns_topic_name"] = sns_topic_name
            __props__.__dict__["tags"] = tags
            __props__.__dict__["bucket"] = None
            __props__.__dict__["log_group"] = None
            __props__.__dict__["trail"] = None
        super(Trail, __self__).__init__(
            'awsx:cloudtrail:Trail',
            resource_name,
            __props__,
            opts,
            remote=True)

    @property
    @pulumi.getter
    def bucket(self) -> pulumi.Output['pulumi_aws.s3.Bucket']:
        """
        The managed S3 Bucket where the Trail will place its logs.
        """
        return pulumi.get(self, "bucket")

    @property
    @pulumi.getter(name="logGroup")
    def log_group(self) -> pulumi.Output['pulumi_aws.cloudwatch.LogGroup']:
        """
        The managed Cloudwatch Log Group.
        """
        return pulumi.get(self, "log_group")

    @property
    @pulumi.getter
    def trail(self) -> pulumi.Output['pulumi_aws.cloudtrail.Trail']:
        """
        The CloudTrail Trail.
        """
        return pulumi.get(self, "trail")

