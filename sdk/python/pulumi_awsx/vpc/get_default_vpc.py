# coding=utf-8
# *** WARNING: this file was generated by pulumi-gen-awsx. ***
# *** Do not edit by hand unless you're certain you know what you are doing! ***

import warnings
import pulumi
import pulumi.runtime
from typing import Any, Mapping, Optional, Sequence, Union, overload
from .. import _utilities

__all__ = [
    'GetDefaultVpcResult',
    'AwaitableGetDefaultVpcResult',
    'get_default_vpc',
]

@pulumi.output_type
class GetDefaultVpcResult:
    """
    Outputs from the default VPC configuration
    """
    def __init__(__self__, private_subnet_ids=None, public_subnet_ids=None, vpc_id=None):
        if private_subnet_ids and not isinstance(private_subnet_ids, list):
            raise TypeError("Expected argument 'private_subnet_ids' to be a list")
        pulumi.set(__self__, "private_subnet_ids", private_subnet_ids)
        if public_subnet_ids and not isinstance(public_subnet_ids, list):
            raise TypeError("Expected argument 'public_subnet_ids' to be a list")
        pulumi.set(__self__, "public_subnet_ids", public_subnet_ids)
        if vpc_id and not isinstance(vpc_id, str):
            raise TypeError("Expected argument 'vpc_id' to be a str")
        pulumi.set(__self__, "vpc_id", vpc_id)

    @property
    @pulumi.getter(name="privateSubnetIds")
    def private_subnet_ids(self) -> Sequence[str]:
        return pulumi.get(self, "private_subnet_ids")

    @property
    @pulumi.getter(name="publicSubnetIds")
    def public_subnet_ids(self) -> Sequence[str]:
        return pulumi.get(self, "public_subnet_ids")

    @property
    @pulumi.getter(name="vpcId")
    def vpc_id(self) -> str:
        """
        The VPC ID for the default VPC
        """
        return pulumi.get(self, "vpc_id")


class AwaitableGetDefaultVpcResult(GetDefaultVpcResult):
    # pylint: disable=using-constant-test
    def __await__(self):
        if False:
            yield self
        return GetDefaultVpcResult(
            private_subnet_ids=self.private_subnet_ids,
            public_subnet_ids=self.public_subnet_ids,
            vpc_id=self.vpc_id)


def get_default_vpc(opts: Optional[pulumi.InvokeOptions] = None) -> AwaitableGetDefaultVpcResult:
    """
    Get the Default VPC for a region
    """
    __args__ = dict()
    if opts is None:
        opts = pulumi.InvokeOptions()
    if opts.version is None:
        opts.version = _utilities.get_version()
    __ret__ = pulumi.runtime.invoke('awsx:vpc:getDefaultVpc', __args__, opts=opts, typ=GetDefaultVpcResult).value

    return AwaitableGetDefaultVpcResult(
        private_subnet_ids=__ret__.private_subnet_ids,
        public_subnet_ids=__ret__.public_subnet_ids,
        vpc_id=__ret__.vpc_id)
