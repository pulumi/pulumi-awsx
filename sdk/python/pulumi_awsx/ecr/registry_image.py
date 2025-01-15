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
import pulumi_docker

__all__ = ['RegistryImageArgs', 'RegistryImage']

@pulumi.input_type
class RegistryImageArgs:
    def __init__(__self__, *,
                 repository_url: pulumi.Input[str],
                 source_image: pulumi.Input[str],
                 insecure_skip_verify: Optional[pulumi.Input[bool]] = None,
                 keep_remotely: Optional[pulumi.Input[bool]] = None,
                 tag: Optional[pulumi.Input[str]] = None,
                 triggers: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None):
        """
        The set of arguments for constructing a RegistryImage resource.
        :param pulumi.Input[str] repository_url: The URL of the repository (in the form aws_account_id.dkr.ecr.region.amazonaws.com/repositoryName).
        :param pulumi.Input[str] source_image: The source image to push to the registry.
        :param pulumi.Input[bool] insecure_skip_verify: If `true`, the verification of TLS certificates of the server/registry is disabled. Defaults to `false`
        :param pulumi.Input[bool] keep_remotely: If true, then the Docker image won't be deleted on destroy operation. If this is false, it will delete the image from the docker registry on destroy operation. Defaults to `false`
        :param pulumi.Input[str] tag: The tag to use for the pushed image. If not provided, it defaults to `latest`.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] triggers: A map of arbitrary strings that, when changed, will force the `docker.RegistryImage` resource to be replaced. This can be used to repush a local image
        """
        pulumi.set(__self__, "repository_url", repository_url)
        pulumi.set(__self__, "source_image", source_image)
        if insecure_skip_verify is not None:
            pulumi.set(__self__, "insecure_skip_verify", insecure_skip_verify)
        if keep_remotely is not None:
            pulumi.set(__self__, "keep_remotely", keep_remotely)
        if tag is not None:
            pulumi.set(__self__, "tag", tag)
        if triggers is not None:
            pulumi.set(__self__, "triggers", triggers)

    @property
    @pulumi.getter(name="repositoryUrl")
    def repository_url(self) -> pulumi.Input[str]:
        """
        The URL of the repository (in the form aws_account_id.dkr.ecr.region.amazonaws.com/repositoryName).
        """
        return pulumi.get(self, "repository_url")

    @repository_url.setter
    def repository_url(self, value: pulumi.Input[str]):
        pulumi.set(self, "repository_url", value)

    @property
    @pulumi.getter(name="sourceImage")
    def source_image(self) -> pulumi.Input[str]:
        """
        The source image to push to the registry.
        """
        return pulumi.get(self, "source_image")

    @source_image.setter
    def source_image(self, value: pulumi.Input[str]):
        pulumi.set(self, "source_image", value)

    @property
    @pulumi.getter(name="insecureSkipVerify")
    def insecure_skip_verify(self) -> Optional[pulumi.Input[bool]]:
        """
        If `true`, the verification of TLS certificates of the server/registry is disabled. Defaults to `false`
        """
        return pulumi.get(self, "insecure_skip_verify")

    @insecure_skip_verify.setter
    def insecure_skip_verify(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "insecure_skip_verify", value)

    @property
    @pulumi.getter(name="keepRemotely")
    def keep_remotely(self) -> Optional[pulumi.Input[bool]]:
        """
        If true, then the Docker image won't be deleted on destroy operation. If this is false, it will delete the image from the docker registry on destroy operation. Defaults to `false`
        """
        return pulumi.get(self, "keep_remotely")

    @keep_remotely.setter
    def keep_remotely(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "keep_remotely", value)

    @property
    @pulumi.getter
    def tag(self) -> Optional[pulumi.Input[str]]:
        """
        The tag to use for the pushed image. If not provided, it defaults to `latest`.
        """
        return pulumi.get(self, "tag")

    @tag.setter
    def tag(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "tag", value)

    @property
    @pulumi.getter
    def triggers(self) -> Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]]:
        """
        A map of arbitrary strings that, when changed, will force the `docker.RegistryImage` resource to be replaced. This can be used to repush a local image
        """
        return pulumi.get(self, "triggers")

    @triggers.setter
    def triggers(self, value: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]]):
        pulumi.set(self, "triggers", value)


class RegistryImage(pulumi.ComponentResource):
    @overload
    def __init__(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 insecure_skip_verify: Optional[pulumi.Input[bool]] = None,
                 keep_remotely: Optional[pulumi.Input[bool]] = None,
                 repository_url: Optional[pulumi.Input[str]] = None,
                 source_image: Optional[pulumi.Input[str]] = None,
                 tag: Optional[pulumi.Input[str]] = None,
                 triggers: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 __props__=None):
        """
        Manages the lifecycle of a docker image in a registry. You can upload images to a registry (= `docker push`) and also delete them again. In contrast to [`awsx.ecr.Image`](/registry/packages/awsx/api-docs/ecr/image/), this resource does not require to build the image, but can be used to push an existing image to an ECR repository. The image will be pushed whenever the source image changes or is updated.

        ## Example Usage
        ### Pushing an image to an ECR repository
        ```python
        import pulumi
        import pulumi_awsx as awsx

        repository = awsx.ecr.Repository("repository", force_delete=True)

        registry_image = awsx.ecr.RegistryImage("registry_image",
            repository_url=repository.url,
            source_image="my-awesome-image:v1.0.0")
        ```

        :param str resource_name: The name of the resource.
        :param pulumi.ResourceOptions opts: Options for the resource.
        :param pulumi.Input[bool] insecure_skip_verify: If `true`, the verification of TLS certificates of the server/registry is disabled. Defaults to `false`
        :param pulumi.Input[bool] keep_remotely: If true, then the Docker image won't be deleted on destroy operation. If this is false, it will delete the image from the docker registry on destroy operation. Defaults to `false`
        :param pulumi.Input[str] repository_url: The URL of the repository (in the form aws_account_id.dkr.ecr.region.amazonaws.com/repositoryName).
        :param pulumi.Input[str] source_image: The source image to push to the registry.
        :param pulumi.Input[str] tag: The tag to use for the pushed image. If not provided, it defaults to `latest`.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] triggers: A map of arbitrary strings that, when changed, will force the `docker.RegistryImage` resource to be replaced. This can be used to repush a local image
        """
        ...
    @overload
    def __init__(__self__,
                 resource_name: str,
                 args: RegistryImageArgs,
                 opts: Optional[pulumi.ResourceOptions] = None):
        """
        Manages the lifecycle of a docker image in a registry. You can upload images to a registry (= `docker push`) and also delete them again. In contrast to [`awsx.ecr.Image`](/registry/packages/awsx/api-docs/ecr/image/), this resource does not require to build the image, but can be used to push an existing image to an ECR repository. The image will be pushed whenever the source image changes or is updated.

        ## Example Usage
        ### Pushing an image to an ECR repository
        ```python
        import pulumi
        import pulumi_awsx as awsx

        repository = awsx.ecr.Repository("repository", force_delete=True)

        registry_image = awsx.ecr.RegistryImage("registry_image",
            repository_url=repository.url,
            source_image="my-awesome-image:v1.0.0")
        ```

        :param str resource_name: The name of the resource.
        :param RegistryImageArgs args: The arguments to use to populate this resource's properties.
        :param pulumi.ResourceOptions opts: Options for the resource.
        """
        ...
    def __init__(__self__, resource_name: str, *args, **kwargs):
        resource_args, opts = _utilities.get_resource_args_opts(RegistryImageArgs, pulumi.ResourceOptions, *args, **kwargs)
        if resource_args is not None:
            __self__._internal_init(resource_name, opts, **resource_args.__dict__)
        else:
            __self__._internal_init(resource_name, *args, **kwargs)

    def _internal_init(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 insecure_skip_verify: Optional[pulumi.Input[bool]] = None,
                 keep_remotely: Optional[pulumi.Input[bool]] = None,
                 repository_url: Optional[pulumi.Input[str]] = None,
                 source_image: Optional[pulumi.Input[str]] = None,
                 tag: Optional[pulumi.Input[str]] = None,
                 triggers: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 __props__=None):
        opts = pulumi.ResourceOptions.merge(_utilities.get_resource_opts_defaults(), opts)
        if not isinstance(opts, pulumi.ResourceOptions):
            raise TypeError('Expected resource options to be a ResourceOptions instance')
        if opts.id is not None:
            raise ValueError('ComponentResource classes do not support opts.id')
        else:
            if __props__ is not None:
                raise TypeError('__props__ is only valid when passed in combination with a valid opts.id to get an existing resource')
            __props__ = RegistryImageArgs.__new__(RegistryImageArgs)

            __props__.__dict__["insecure_skip_verify"] = insecure_skip_verify
            __props__.__dict__["keep_remotely"] = keep_remotely
            if repository_url is None and not opts.urn:
                raise TypeError("Missing required property 'repository_url'")
            __props__.__dict__["repository_url"] = repository_url
            if source_image is None and not opts.urn:
                raise TypeError("Missing required property 'source_image'")
            __props__.__dict__["source_image"] = source_image
            __props__.__dict__["tag"] = tag
            __props__.__dict__["triggers"] = triggers
            __props__.__dict__["image"] = None
        super(RegistryImage, __self__).__init__(
            'awsx:ecr:RegistryImage',
            resource_name,
            __props__,
            opts,
            remote=True)

    @property
    @pulumi.getter
    def image(self) -> pulumi.Output['pulumi_docker.RegistryImage']:
        """
        The underlying RegistryImage resource.
        """
        return pulumi.get(self, "image")

