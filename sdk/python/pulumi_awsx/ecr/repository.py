# coding=utf-8
# *** WARNING: this file was generated by pulumi-gen-awsx. ***
# *** Do not edit by hand unless you're certain you know what you are doing! ***

import copy
import warnings
import pulumi
import pulumi.runtime
from typing import Any, Callable, Mapping, Optional, Sequence, Union, overload
from .. import _utilities
from ._enums import *
from ._inputs import *
import pulumi_aws

__all__ = ['RepositoryArgs', 'Repository']

@pulumi.input_type
class RepositoryArgs:
    def __init__(__self__, *,
                 encryption_configurations: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecr.RepositoryEncryptionConfigurationArgs']]]] = None,
                 force_delete: Optional[pulumi.Input[bool]] = None,
                 image_scanning_configuration: Optional[pulumi.Input['pulumi_aws.ecr.RepositoryImageScanningConfigurationArgs']] = None,
                 image_tag_mutability: Optional[pulumi.Input[str]] = None,
                 lifecycle_policy: Optional['LifecyclePolicyArgs'] = None,
                 name: Optional[pulumi.Input[str]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None):
        """
        The set of arguments for constructing a Repository resource.
        :param pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecr.RepositoryEncryptionConfigurationArgs']]] encryption_configurations: Encryption configuration for the repository. See below for schema.
        :param pulumi.Input[bool] force_delete: If `true`, will delete the repository even if it contains images.
               Defaults to `false`.
        :param pulumi.Input['pulumi_aws.ecr.RepositoryImageScanningConfigurationArgs'] image_scanning_configuration: Configuration block that defines image scanning configuration for the repository. By default, image scanning must be manually triggered. See the [ECR User Guide](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html) for more information about image scanning.
        :param pulumi.Input[str] image_tag_mutability: The tag mutability setting for the repository. Must be one of: `MUTABLE` or `IMMUTABLE`. Defaults to `MUTABLE`.
        :param 'LifecyclePolicyArgs' lifecycle_policy: A lifecycle policy consists of one or more rules that determine which images in a repository should be expired. If not provided, this will default to untagged images expiring after 1 day.
        :param pulumi.Input[str] name: Name of the repository.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] tags: A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        """
        RepositoryArgs._configure(
            lambda key, value: pulumi.set(__self__, key, value),
            encryption_configurations=encryption_configurations,
            force_delete=force_delete,
            image_scanning_configuration=image_scanning_configuration,
            image_tag_mutability=image_tag_mutability,
            lifecycle_policy=lifecycle_policy,
            name=name,
            tags=tags,
        )
    @staticmethod
    def _configure(
             _setter: Callable[[Any, Any], None],
             encryption_configurations: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecr.RepositoryEncryptionConfigurationArgs']]]] = None,
             force_delete: Optional[pulumi.Input[bool]] = None,
             image_scanning_configuration: Optional[pulumi.Input['pulumi_aws.ecr.RepositoryImageScanningConfigurationArgs']] = None,
             image_tag_mutability: Optional[pulumi.Input[str]] = None,
             lifecycle_policy: Optional['LifecyclePolicyArgs'] = None,
             name: Optional[pulumi.Input[str]] = None,
             tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
             opts: Optional[pulumi.ResourceOptions]=None):
        if encryption_configurations is not None:
            _setter("encryption_configurations", encryption_configurations)
        if force_delete is not None:
            _setter("force_delete", force_delete)
        if image_scanning_configuration is not None:
            _setter("image_scanning_configuration", image_scanning_configuration)
        if image_tag_mutability is not None:
            _setter("image_tag_mutability", image_tag_mutability)
        if lifecycle_policy is not None:
            _setter("lifecycle_policy", lifecycle_policy)
        if name is not None:
            _setter("name", name)
        if tags is not None:
            _setter("tags", tags)

    @property
    @pulumi.getter(name="encryptionConfigurations")
    def encryption_configurations(self) -> Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecr.RepositoryEncryptionConfigurationArgs']]]]:
        """
        Encryption configuration for the repository. See below for schema.
        """
        return pulumi.get(self, "encryption_configurations")

    @encryption_configurations.setter
    def encryption_configurations(self, value: Optional[pulumi.Input[Sequence[pulumi.Input['pulumi_aws.ecr.RepositoryEncryptionConfigurationArgs']]]]):
        pulumi.set(self, "encryption_configurations", value)

    @property
    @pulumi.getter(name="forceDelete")
    def force_delete(self) -> Optional[pulumi.Input[bool]]:
        """
        If `true`, will delete the repository even if it contains images.
        Defaults to `false`.
        """
        return pulumi.get(self, "force_delete")

    @force_delete.setter
    def force_delete(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "force_delete", value)

    @property
    @pulumi.getter(name="imageScanningConfiguration")
    def image_scanning_configuration(self) -> Optional[pulumi.Input['pulumi_aws.ecr.RepositoryImageScanningConfigurationArgs']]:
        """
        Configuration block that defines image scanning configuration for the repository. By default, image scanning must be manually triggered. See the [ECR User Guide](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html) for more information about image scanning.
        """
        return pulumi.get(self, "image_scanning_configuration")

    @image_scanning_configuration.setter
    def image_scanning_configuration(self, value: Optional[pulumi.Input['pulumi_aws.ecr.RepositoryImageScanningConfigurationArgs']]):
        pulumi.set(self, "image_scanning_configuration", value)

    @property
    @pulumi.getter(name="imageTagMutability")
    def image_tag_mutability(self) -> Optional[pulumi.Input[str]]:
        """
        The tag mutability setting for the repository. Must be one of: `MUTABLE` or `IMMUTABLE`. Defaults to `MUTABLE`.
        """
        return pulumi.get(self, "image_tag_mutability")

    @image_tag_mutability.setter
    def image_tag_mutability(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "image_tag_mutability", value)

    @property
    @pulumi.getter(name="lifecyclePolicy")
    def lifecycle_policy(self) -> Optional['LifecyclePolicyArgs']:
        """
        A lifecycle policy consists of one or more rules that determine which images in a repository should be expired. If not provided, this will default to untagged images expiring after 1 day.
        """
        return pulumi.get(self, "lifecycle_policy")

    @lifecycle_policy.setter
    def lifecycle_policy(self, value: Optional['LifecyclePolicyArgs']):
        pulumi.set(self, "lifecycle_policy", value)

    @property
    @pulumi.getter
    def name(self) -> Optional[pulumi.Input[str]]:
        """
        Name of the repository.
        """
        return pulumi.get(self, "name")

    @name.setter
    def name(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "name", value)

    @property
    @pulumi.getter
    def tags(self) -> Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]]:
        """
        A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        """
        return pulumi.get(self, "tags")

    @tags.setter
    def tags(self, value: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]]):
        pulumi.set(self, "tags", value)


class Repository(pulumi.ComponentResource):
    @overload
    def __init__(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 encryption_configurations: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecr.RepositoryEncryptionConfigurationArgs']]]]] = None,
                 force_delete: Optional[pulumi.Input[bool]] = None,
                 image_scanning_configuration: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecr.RepositoryImageScanningConfigurationArgs']]] = None,
                 image_tag_mutability: Optional[pulumi.Input[str]] = None,
                 lifecycle_policy: Optional[pulumi.InputType['LifecyclePolicyArgs']] = None,
                 name: Optional[pulumi.Input[str]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 __props__=None):
        """
        A [Repository] represents an [aws.ecr.Repository] along with an associated [LifecyclePolicy] controlling how images are retained in the repo.

        Docker images can be built and pushed to the repo using the [buildAndPushImage] method.  This will call into the `@pulumi/docker/buildAndPushImage` function using this repo as the appropriate destination registry.

        :param str resource_name: The name of the resource.
        :param pulumi.ResourceOptions opts: Options for the resource.
        :param pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecr.RepositoryEncryptionConfigurationArgs']]]] encryption_configurations: Encryption configuration for the repository. See below for schema.
        :param pulumi.Input[bool] force_delete: If `true`, will delete the repository even if it contains images.
               Defaults to `false`.
        :param pulumi.Input[pulumi.InputType['pulumi_aws.ecr.RepositoryImageScanningConfigurationArgs']] image_scanning_configuration: Configuration block that defines image scanning configuration for the repository. By default, image scanning must be manually triggered. See the [ECR User Guide](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html) for more information about image scanning.
        :param pulumi.Input[str] image_tag_mutability: The tag mutability setting for the repository. Must be one of: `MUTABLE` or `IMMUTABLE`. Defaults to `MUTABLE`.
        :param pulumi.InputType['LifecyclePolicyArgs'] lifecycle_policy: A lifecycle policy consists of one or more rules that determine which images in a repository should be expired. If not provided, this will default to untagged images expiring after 1 day.
        :param pulumi.Input[str] name: Name of the repository.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] tags: A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        """
        ...
    @overload
    def __init__(__self__,
                 resource_name: str,
                 args: Optional[RepositoryArgs] = None,
                 opts: Optional[pulumi.ResourceOptions] = None):
        """
        A [Repository] represents an [aws.ecr.Repository] along with an associated [LifecyclePolicy] controlling how images are retained in the repo.

        Docker images can be built and pushed to the repo using the [buildAndPushImage] method.  This will call into the `@pulumi/docker/buildAndPushImage` function using this repo as the appropriate destination registry.

        :param str resource_name: The name of the resource.
        :param RepositoryArgs args: The arguments to use to populate this resource's properties.
        :param pulumi.ResourceOptions opts: Options for the resource.
        """
        ...
    def __init__(__self__, resource_name: str, *args, **kwargs):
        resource_args, opts = _utilities.get_resource_args_opts(RepositoryArgs, pulumi.ResourceOptions, *args, **kwargs)
        if resource_args is not None:
            __self__._internal_init(resource_name, opts, **resource_args.__dict__)
        else:
            kwargs = kwargs or {}
            def _setter(key, value):
                kwargs[key] = value
            RepositoryArgs._configure(_setter, **kwargs)
            __self__._internal_init(resource_name, *args, **kwargs)

    def _internal_init(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 encryption_configurations: Optional[pulumi.Input[Sequence[pulumi.Input[pulumi.InputType['pulumi_aws.ecr.RepositoryEncryptionConfigurationArgs']]]]] = None,
                 force_delete: Optional[pulumi.Input[bool]] = None,
                 image_scanning_configuration: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.ecr.RepositoryImageScanningConfigurationArgs']]] = None,
                 image_tag_mutability: Optional[pulumi.Input[str]] = None,
                 lifecycle_policy: Optional[pulumi.InputType['LifecyclePolicyArgs']] = None,
                 name: Optional[pulumi.Input[str]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 __props__=None):
        opts = pulumi.ResourceOptions.merge(_utilities.get_resource_opts_defaults(), opts)
        if not isinstance(opts, pulumi.ResourceOptions):
            raise TypeError('Expected resource options to be a ResourceOptions instance')
        if opts.id is not None:
            raise ValueError('ComponentResource classes do not support opts.id')
        else:
            if __props__ is not None:
                raise TypeError('__props__ is only valid when passed in combination with a valid opts.id to get an existing resource')
            __props__ = RepositoryArgs.__new__(RepositoryArgs)

            __props__.__dict__["encryption_configurations"] = encryption_configurations
            __props__.__dict__["force_delete"] = force_delete
            if image_scanning_configuration is not None and not isinstance(image_scanning_configuration, pulumi_aws.ecr.RepositoryImageScanningConfigurationArgs):
                image_scanning_configuration = image_scanning_configuration or {}
                def _setter(key, value):
                    image_scanning_configuration[key] = value
                pulumi_aws.ecr.RepositoryImageScanningConfigurationArgs._configure(_setter, **image_scanning_configuration)
            __props__.__dict__["image_scanning_configuration"] = image_scanning_configuration
            __props__.__dict__["image_tag_mutability"] = image_tag_mutability
            if lifecycle_policy is not None and not isinstance(lifecycle_policy, LifecyclePolicyArgs):
                lifecycle_policy = lifecycle_policy or {}
                def _setter(key, value):
                    lifecycle_policy[key] = value
                LifecyclePolicyArgs._configure(_setter, **lifecycle_policy)
            __props__.__dict__["lifecycle_policy"] = lifecycle_policy
            __props__.__dict__["name"] = name
            __props__.__dict__["tags"] = tags
            __props__.__dict__["repository"] = None
            __props__.__dict__["url"] = None
        super(Repository, __self__).__init__(
            'awsx:ecr:Repository',
            resource_name,
            __props__,
            opts,
            remote=True)

    @property
    @pulumi.getter(name="lifecyclePolicy")
    def lifecycle_policy(self) -> pulumi.Output[Optional['pulumi_aws.ecr.LifecyclePolicy']]:
        """
        Underlying repository lifecycle policy
        """
        return pulumi.get(self, "lifecycle_policy")

    @property
    @pulumi.getter
    def repository(self) -> pulumi.Output['pulumi_aws.ecr.Repository']:
        """
        Underlying Repository resource
        """
        return pulumi.get(self, "repository")

    @property
    @pulumi.getter
    def url(self) -> pulumi.Output[str]:
        """
        The URL of the repository (in the form aws_account_id.dkr.ecr.region.amazonaws.com/repositoryName).
        """
        return pulumi.get(self, "url")

