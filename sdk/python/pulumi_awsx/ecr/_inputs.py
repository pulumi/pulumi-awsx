# coding=utf-8
# *** WARNING: this file was generated by pulumi-gen-awsx. ***
# *** Do not edit by hand unless you're certain you know what you are doing! ***

import warnings
import pulumi
import pulumi.runtime
from typing import Any, Mapping, Optional, Sequence, Union, overload
from .. import _utilities
from ._enums import *

__all__ = [
    'DockerBuild',
    'LifecyclePolicyRuleArgs',
    'LifecyclePolicyArgs',
]

@pulumi.input_type
class DockerBuild:
    def __init__(__self__, *,
                 args: Optional[Mapping[str, str]] = None,
                 cache_from: Optional[Sequence[str]] = None,
                 dockerfile: Optional[str] = None,
                 env: Optional[Mapping[str, str]] = None,
                 extra_options: Optional[Sequence[str]] = None,
                 path: Optional[str] = None,
                 target: Optional[str] = None):
        """
        Arguments for building a docker image
        :param Mapping[str, str] args: An optional map of named build-time argument variables to set during the Docker build.  This flag allows you to pass built-time variables that can be accessed like environment variables inside the `RUN` instruction.
        :param Sequence[str] cache_from: Images to consider as cache sources
        :param str dockerfile: dockerfile may be used to override the default Dockerfile name and/or location.  By default, it is assumed to be a file named Dockerfile in the root of the build context.
        :param Mapping[str, str] env: Environment variables to set on the invocation of `docker build`, for example to support `DOCKER_BUILDKIT=1 docker build`.
        :param Sequence[str] extra_options: An optional catch-all list of arguments to provide extra CLI options to the docker build command.  For example `['--network', 'host']`.
        :param str path: Path to a directory to use for the Docker build context, usually the directory in which the Dockerfile resides (although dockerfile may be used to choose a custom location independent of this choice). If not specified, the context defaults to the current working directory; if a relative path is used, it is relative to the current working directory that Pulumi is evaluating.
        :param str target: The target of the dockerfile to build
        """
        if args is not None:
            pulumi.set(__self__, "args", args)
        if cache_from is not None:
            pulumi.set(__self__, "cache_from", cache_from)
        if dockerfile is not None:
            pulumi.set(__self__, "dockerfile", dockerfile)
        if env is not None:
            pulumi.set(__self__, "env", env)
        if extra_options is not None:
            pulumi.set(__self__, "extra_options", extra_options)
        if path is not None:
            pulumi.set(__self__, "path", path)
        if target is not None:
            pulumi.set(__self__, "target", target)

    @property
    @pulumi.getter
    def args(self) -> Optional[Mapping[str, str]]:
        """
        An optional map of named build-time argument variables to set during the Docker build.  This flag allows you to pass built-time variables that can be accessed like environment variables inside the `RUN` instruction.
        """
        return pulumi.get(self, "args")

    @args.setter
    def args(self, value: Optional[Mapping[str, str]]):
        pulumi.set(self, "args", value)

    @property
    @pulumi.getter(name="cacheFrom")
    def cache_from(self) -> Optional[Sequence[str]]:
        """
        Images to consider as cache sources
        """
        return pulumi.get(self, "cache_from")

    @cache_from.setter
    def cache_from(self, value: Optional[Sequence[str]]):
        pulumi.set(self, "cache_from", value)

    @property
    @pulumi.getter
    def dockerfile(self) -> Optional[str]:
        """
        dockerfile may be used to override the default Dockerfile name and/or location.  By default, it is assumed to be a file named Dockerfile in the root of the build context.
        """
        return pulumi.get(self, "dockerfile")

    @dockerfile.setter
    def dockerfile(self, value: Optional[str]):
        pulumi.set(self, "dockerfile", value)

    @property
    @pulumi.getter
    def env(self) -> Optional[Mapping[str, str]]:
        """
        Environment variables to set on the invocation of `docker build`, for example to support `DOCKER_BUILDKIT=1 docker build`.
        """
        return pulumi.get(self, "env")

    @env.setter
    def env(self, value: Optional[Mapping[str, str]]):
        pulumi.set(self, "env", value)

    @property
    @pulumi.getter(name="extraOptions")
    def extra_options(self) -> Optional[Sequence[str]]:
        """
        An optional catch-all list of arguments to provide extra CLI options to the docker build command.  For example `['--network', 'host']`.
        """
        return pulumi.get(self, "extra_options")

    @extra_options.setter
    def extra_options(self, value: Optional[Sequence[str]]):
        pulumi.set(self, "extra_options", value)

    @property
    @pulumi.getter
    def path(self) -> Optional[str]:
        """
        Path to a directory to use for the Docker build context, usually the directory in which the Dockerfile resides (although dockerfile may be used to choose a custom location independent of this choice). If not specified, the context defaults to the current working directory; if a relative path is used, it is relative to the current working directory that Pulumi is evaluating.
        """
        return pulumi.get(self, "path")

    @path.setter
    def path(self, value: Optional[str]):
        pulumi.set(self, "path", value)

    @property
    @pulumi.getter
    def target(self) -> Optional[str]:
        """
        The target of the dockerfile to build
        """
        return pulumi.get(self, "target")

    @target.setter
    def target(self, value: Optional[str]):
        pulumi.set(self, "target", value)


@pulumi.input_type
class LifecyclePolicyRuleArgs:
    def __init__(__self__, *,
                 tag_status: pulumi.Input['LifecycleTagStatus'],
                 description: Optional[pulumi.Input[str]] = None,
                 maximum_age_limit: Optional[pulumi.Input[float]] = None,
                 maximum_number_of_images: Optional[pulumi.Input[float]] = None,
                 tag_prefix_list: Optional[pulumi.Input[Sequence[pulumi.Input[str]]]] = None):
        """
        A lifecycle policy rule that determine which images in a repository should be expired.
        :param pulumi.Input['LifecycleTagStatus'] tag_status: Determines whether the lifecycle policy rule that you are adding specifies a tag for an image. Acceptable options are tagged, untagged, or any. If you specify any, then all images have the rule evaluated against them. If you specify tagged, then you must also specify a tagPrefixList value. If you specify untagged, then you must omit tagPrefixList.
        :param pulumi.Input[str] description: Describes the purpose of a rule within a lifecycle policy.
        :param pulumi.Input[float] maximum_age_limit: The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
        :param pulumi.Input[float] maximum_number_of_images: The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
        :param pulumi.Input[Sequence[pulumi.Input[str]]] tag_prefix_list: A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified "tagStatus": "tagged". For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
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
    def description(self) -> Optional[pulumi.Input[str]]:
        """
        Describes the purpose of a rule within a lifecycle policy.
        """
        return pulumi.get(self, "description")

    @description.setter
    def description(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "description", value)

    @property
    @pulumi.getter(name="maximumAgeLimit")
    def maximum_age_limit(self) -> Optional[pulumi.Input[float]]:
        """
        The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
        """
        return pulumi.get(self, "maximum_age_limit")

    @maximum_age_limit.setter
    def maximum_age_limit(self, value: Optional[pulumi.Input[float]]):
        pulumi.set(self, "maximum_age_limit", value)

    @property
    @pulumi.getter(name="maximumNumberOfImages")
    def maximum_number_of_images(self) -> Optional[pulumi.Input[float]]:
        """
        The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
        """
        return pulumi.get(self, "maximum_number_of_images")

    @maximum_number_of_images.setter
    def maximum_number_of_images(self, value: Optional[pulumi.Input[float]]):
        pulumi.set(self, "maximum_number_of_images", value)

    @property
    @pulumi.getter(name="tagPrefixList")
    def tag_prefix_list(self) -> Optional[pulumi.Input[Sequence[pulumi.Input[str]]]]:
        """
        A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified "tagStatus": "tagged". For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
        """
        return pulumi.get(self, "tag_prefix_list")

    @tag_prefix_list.setter
    def tag_prefix_list(self, value: Optional[pulumi.Input[Sequence[pulumi.Input[str]]]]):
        pulumi.set(self, "tag_prefix_list", value)


@pulumi.input_type
class LifecyclePolicyArgs:
    def __init__(__self__, *,
                 rules: Optional[pulumi.Input[Sequence[pulumi.Input['LifecyclePolicyRuleArgs']]]] = None,
                 skip: Optional[bool] = None):
        """
        Simplified lifecycle policy model consisting of one or more rules that determine which images in a repository should be expired. See https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html for more details.
        :param pulumi.Input[Sequence[pulumi.Input['LifecyclePolicyRuleArgs']]] rules: Specifies the rules to determine how images should be retired from this repository. Rules are ordered from lowest priority to highest.  If there is a rule with a `selection` value of `any`, then it will have the highest priority.
        :param bool skip: Skips creation of the policy if set to `true`.
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
    def skip(self) -> Optional[bool]:
        """
        Skips creation of the policy if set to `true`.
        """
        return pulumi.get(self, "skip")

    @skip.setter
    def skip(self, value: Optional[bool]):
        pulumi.set(self, "skip", value)

