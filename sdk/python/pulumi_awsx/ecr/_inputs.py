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
from ._enums import *

__all__ = [
    'LifecyclePolicyRuleArgs',
    'LifecyclePolicyRuleArgsDict',
    'LifecyclePolicyArgs',
    'LifecyclePolicyArgsDict',
]

MYPY = False

if not MYPY:
    class LifecyclePolicyRuleArgsDict(TypedDict):
        """
        A lifecycle policy rule that determine which images in a repository should be expired.
        """
        tag_status: pulumi.Input['LifecycleTagStatus']
        """
        Determines whether the lifecycle policy rule that you are adding specifies a tag for an image. Acceptable options are tagged, untagged, or any. If you specify any, then all images have the rule evaluated against them. If you specify tagged, then you must also specify a tagPrefixList value. If you specify untagged, then you must omit tagPrefixList.
        """
        description: NotRequired[pulumi.Input[builtins.str]]
        """
        Describes the purpose of a rule within a lifecycle policy.
        """
        maximum_age_limit: NotRequired[pulumi.Input[builtins.float]]
        """
        The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
        """
        maximum_number_of_images: NotRequired[pulumi.Input[builtins.float]]
        """
        The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
        """
        tag_prefix_list: NotRequired[pulumi.Input[Sequence[pulumi.Input[builtins.str]]]]
        """
        A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified "tagStatus": "tagged". For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
        """
elif False:
    LifecyclePolicyRuleArgsDict: TypeAlias = Mapping[str, Any]

@pulumi.input_type
class LifecyclePolicyRuleArgs:
    def __init__(__self__, *,
                 tag_status: pulumi.Input['LifecycleTagStatus'],
                 description: Optional[pulumi.Input[builtins.str]] = None,
                 maximum_age_limit: Optional[pulumi.Input[builtins.float]] = None,
                 maximum_number_of_images: Optional[pulumi.Input[builtins.float]] = None,
                 tag_prefix_list: Optional[pulumi.Input[Sequence[pulumi.Input[builtins.str]]]] = None):
        """
        A lifecycle policy rule that determine which images in a repository should be expired.
        :param pulumi.Input['LifecycleTagStatus'] tag_status: Determines whether the lifecycle policy rule that you are adding specifies a tag for an image. Acceptable options are tagged, untagged, or any. If you specify any, then all images have the rule evaluated against them. If you specify tagged, then you must also specify a tagPrefixList value. If you specify untagged, then you must omit tagPrefixList.
        :param pulumi.Input[builtins.str] description: Describes the purpose of a rule within a lifecycle policy.
        :param pulumi.Input[builtins.float] maximum_age_limit: The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
        :param pulumi.Input[builtins.float] maximum_number_of_images: The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
        :param pulumi.Input[Sequence[pulumi.Input[builtins.str]]] tag_prefix_list: A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified "tagStatus": "tagged". For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
        """
        pulumi.set(__self__, "tag_status", tag_status)
        if description is not None:
            pulumi.set(__self__, "description", description)
        if maximum_age_limit is not None:
            pulumi.set(__self__, "maximum_age_limit", maximum_age_limit)
        if maximum_number_of_images is not None:
            pulumi.set(__self__, "maximum_number_of_images", maximum_number_of_images)
        if tag_prefix_list is not None:
            pulumi.set(__self__, "tag_prefix_list", tag_prefix_list)

    @property
    @pulumi.getter(name="tagStatus")
    def tag_status(self) -> pulumi.Input['LifecycleTagStatus']:
        """
        Determines whether the lifecycle policy rule that you are adding specifies a tag for an image. Acceptable options are tagged, untagged, or any. If you specify any, then all images have the rule evaluated against them. If you specify tagged, then you must also specify a tagPrefixList value. If you specify untagged, then you must omit tagPrefixList.
        """
        return pulumi.get(self, "tag_status")

    @tag_status.setter
    def tag_status(self, value: pulumi.Input['LifecycleTagStatus']):
        pulumi.set(self, "tag_status", value)

    @property
    @pulumi.getter
    def description(self) -> Optional[pulumi.Input[builtins.str]]:
        """
        Describes the purpose of a rule within a lifecycle policy.
        """
        return pulumi.get(self, "description")

    @description.setter
    def description(self, value: Optional[pulumi.Input[builtins.str]]):
        pulumi.set(self, "description", value)

    @property
    @pulumi.getter(name="maximumAgeLimit")
    def maximum_age_limit(self) -> Optional[pulumi.Input[builtins.float]]:
        """
        The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
        """
        return pulumi.get(self, "maximum_age_limit")

    @maximum_age_limit.setter
    def maximum_age_limit(self, value: Optional[pulumi.Input[builtins.float]]):
        pulumi.set(self, "maximum_age_limit", value)

    @property
    @pulumi.getter(name="maximumNumberOfImages")
    def maximum_number_of_images(self) -> Optional[pulumi.Input[builtins.float]]:
        """
        The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
        """
        return pulumi.get(self, "maximum_number_of_images")

    @maximum_number_of_images.setter
    def maximum_number_of_images(self, value: Optional[pulumi.Input[builtins.float]]):
        pulumi.set(self, "maximum_number_of_images", value)

    @property
    @pulumi.getter(name="tagPrefixList")
    def tag_prefix_list(self) -> Optional[pulumi.Input[Sequence[pulumi.Input[builtins.str]]]]:
        """
        A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified "tagStatus": "tagged". For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
        """
        return pulumi.get(self, "tag_prefix_list")

    @tag_prefix_list.setter
    def tag_prefix_list(self, value: Optional[pulumi.Input[Sequence[pulumi.Input[builtins.str]]]]):
        pulumi.set(self, "tag_prefix_list", value)


if not MYPY:
    class LifecyclePolicyArgsDict(TypedDict):
        """
        Simplified lifecycle policy model consisting of one or more rules that determine which images in a repository should be expired. See https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html for more details.
        """
        rules: NotRequired[pulumi.Input[Sequence[pulumi.Input['LifecyclePolicyRuleArgsDict']]]]
        """
        Specifies the rules to determine how images should be retired from this repository. Rules are ordered from lowest priority to highest.  If there is a rule with a `selection` value of `any`, then it will have the highest priority.
        """
        skip: NotRequired[builtins.bool]
        """
        Skips creation of the policy if set to `true`.
        """
elif False:
    LifecyclePolicyArgsDict: TypeAlias = Mapping[str, Any]

@pulumi.input_type
class LifecyclePolicyArgs:
    def __init__(__self__, *,
                 rules: Optional[pulumi.Input[Sequence[pulumi.Input['LifecyclePolicyRuleArgs']]]] = None,
                 skip: Optional[builtins.bool] = None):
        """
        Simplified lifecycle policy model consisting of one or more rules that determine which images in a repository should be expired. See https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html for more details.
        :param pulumi.Input[Sequence[pulumi.Input['LifecyclePolicyRuleArgs']]] rules: Specifies the rules to determine how images should be retired from this repository. Rules are ordered from lowest priority to highest.  If there is a rule with a `selection` value of `any`, then it will have the highest priority.
        :param builtins.bool skip: Skips creation of the policy if set to `true`.
        """
        if rules is not None:
            pulumi.set(__self__, "rules", rules)
        if skip is not None:
            pulumi.set(__self__, "skip", skip)

    @property
    @pulumi.getter
    def rules(self) -> Optional[pulumi.Input[Sequence[pulumi.Input['LifecyclePolicyRuleArgs']]]]:
        """
        Specifies the rules to determine how images should be retired from this repository. Rules are ordered from lowest priority to highest.  If there is a rule with a `selection` value of `any`, then it will have the highest priority.
        """
        return pulumi.get(self, "rules")

    @rules.setter
    def rules(self, value: Optional[pulumi.Input[Sequence[pulumi.Input['LifecyclePolicyRuleArgs']]]]):
        pulumi.set(self, "rules", value)

    @property
    @pulumi.getter
    def skip(self) -> Optional[builtins.bool]:
        """
        Skips creation of the policy if set to `true`.
        """
        return pulumi.get(self, "skip")

    @skip.setter
    def skip(self, value: Optional[builtins.bool]):
        pulumi.set(self, "skip", value)


