# coding=utf-8
# *** WARNING: this file was generated by pulumi-gen-awsx. ***
# *** Do not edit by hand unless you're certain you know what you are doing! ***

import copy
import warnings
import pulumi
import pulumi.runtime
from typing import Any, Mapping, Optional, Sequence, Union, overload
from .. import _utilities
from ._enums import *
from ._inputs import *
import pulumi_aws

__all__ = ['VpcArgs', 'Vpc']

@pulumi.input_type
class VpcArgs:
    def __init__(__self__, *,
                 assign_generated_ipv6_cidr_block: Optional[pulumi.Input[bool]] = None,
                 availability_zone_names: Optional[Sequence[str]] = None,
                 cidr_block: Optional[str] = None,
                 enable_dns_hostnames: Optional[pulumi.Input[bool]] = None,
                 enable_dns_support: Optional[pulumi.Input[bool]] = None,
                 enable_network_address_usage_metrics: Optional[pulumi.Input[bool]] = None,
                 instance_tenancy: Optional[pulumi.Input[str]] = None,
                 ipv4_ipam_pool_id: Optional[pulumi.Input[str]] = None,
                 ipv4_netmask_length: Optional[pulumi.Input[int]] = None,
                 ipv6_cidr_block: Optional[pulumi.Input[str]] = None,
                 ipv6_cidr_block_network_border_group: Optional[pulumi.Input[str]] = None,
                 ipv6_ipam_pool_id: Optional[pulumi.Input[str]] = None,
                 ipv6_netmask_length: Optional[pulumi.Input[int]] = None,
                 nat_gateways: Optional['NatGatewayConfigurationArgs'] = None,
                 number_of_availability_zones: Optional[int] = None,
                 subnet_specs: Optional[Sequence['SubnetSpecArgs']] = None,
                 subnet_strategy: Optional['SubnetAllocationStrategy'] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 vpc_endpoint_specs: Optional[Sequence['VpcEndpointSpecArgs']] = None):
        """
        The set of arguments for constructing a Vpc resource.
        :param pulumi.Input[bool] assign_generated_ipv6_cidr_block: Requests an Amazon-provided IPv6 CIDR block with a /56 prefix length for the VPC. You cannot specify the range of IP addresses, or the size of the CIDR block. Default is `false`. Conflicts with `ipv6_ipam_pool_id`
        :param Sequence[str] availability_zone_names: A list of availability zone names to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
        :param str cidr_block: The CIDR block for the VPC. Optional. Defaults to 10.0.0.0/16.
        :param pulumi.Input[bool] enable_dns_hostnames: A boolean flag to enable/disable DNS hostnames in the VPC. Defaults false.
        :param pulumi.Input[bool] enable_dns_support: A boolean flag to enable/disable DNS support in the VPC. Defaults to true.
        :param pulumi.Input[bool] enable_network_address_usage_metrics: Indicates whether Network Address Usage metrics are enabled for your VPC. Defaults to false.
        :param pulumi.Input[str] instance_tenancy: A tenancy option for instances launched into the VPC. Default is `default`, which ensures that EC2 instances launched in this VPC use the EC2 instance tenancy attribute specified when the EC2 instance is launched. The only other option is `dedicated`, which ensures that EC2 instances launched in this VPC are run on dedicated tenancy instances regardless of the tenancy attribute specified at launch. This has a dedicated per region fee of $2 per hour, plus an hourly per instance usage fee.
        :param pulumi.Input[str] ipv4_ipam_pool_id: The ID of an IPv4 IPAM pool you want to use for allocating this VPC's CIDR. IPAM is a VPC feature that you can use to automate your IP address management workflows including assigning, tracking, troubleshooting, and auditing IP addresses across AWS Regions and accounts. Using IPAM you can monitor IP address usage throughout your AWS Organization.
        :param pulumi.Input[int] ipv4_netmask_length: The netmask length of the IPv4 CIDR you want to allocate to this VPC. Requires specifying a `ipv4_ipam_pool_id`.
        :param pulumi.Input[str] ipv6_cidr_block: IPv6 CIDR block to request from an IPAM Pool. Can be set explicitly or derived from IPAM using `ipv6_netmask_length`.
        :param pulumi.Input[str] ipv6_cidr_block_network_border_group: By default when an IPv6 CIDR is assigned to a VPC a default ipv6_cidr_block_network_border_group will be set to the region of the VPC. This can be changed to restrict advertisement of public addresses to specific Network Border Groups such as LocalZones.
        :param pulumi.Input[str] ipv6_ipam_pool_id: IPAM Pool ID for a IPv6 pool. Conflicts with `assign_generated_ipv6_cidr_block`.
        :param pulumi.Input[int] ipv6_netmask_length: Netmask length to request from IPAM Pool. Conflicts with `ipv6_cidr_block`. This can be omitted if IPAM pool as a `allocation_default_netmask_length` set. Valid values: `56`.
        :param 'NatGatewayConfigurationArgs' nat_gateways: Configuration for NAT Gateways. Optional. If private and public subnets are both specified, defaults to one gateway per availability zone. Otherwise, no gateways will be created.
        :param int number_of_availability_zones: A number of availability zones to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
        :param Sequence['SubnetSpecArgs'] subnet_specs: A list of subnet specs that should be deployed to each AZ specified in availabilityZoneNames. Optional. Defaults to a (smaller) public subnet and a (larger) private subnet based on the size of the CIDR block for the VPC. Private subnets are allocated CIDR block ranges first, followed by Private subnets, and Isolated subnets are allocated last.
        :param 'SubnetAllocationStrategy' subnet_strategy: The strategy to use when allocating subnets for the VPC. Optional. Defaults to `Legacy`.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] tags: A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        :param Sequence['VpcEndpointSpecArgs'] vpc_endpoint_specs: A list of VPC Endpoints specs to be deployed as part of the VPC
        """
        if assign_generated_ipv6_cidr_block is not None:
            pulumi.set(__self__, "assign_generated_ipv6_cidr_block", assign_generated_ipv6_cidr_block)
        if availability_zone_names is not None:
            pulumi.set(__self__, "availability_zone_names", availability_zone_names)
        if cidr_block is not None:
            pulumi.set(__self__, "cidr_block", cidr_block)
        if enable_dns_hostnames is not None:
            pulumi.set(__self__, "enable_dns_hostnames", enable_dns_hostnames)
        if enable_dns_support is not None:
            pulumi.set(__self__, "enable_dns_support", enable_dns_support)
        if enable_network_address_usage_metrics is not None:
            pulumi.set(__self__, "enable_network_address_usage_metrics", enable_network_address_usage_metrics)
        if instance_tenancy is not None:
            pulumi.set(__self__, "instance_tenancy", instance_tenancy)
        if ipv4_ipam_pool_id is not None:
            pulumi.set(__self__, "ipv4_ipam_pool_id", ipv4_ipam_pool_id)
        if ipv4_netmask_length is not None:
            pulumi.set(__self__, "ipv4_netmask_length", ipv4_netmask_length)
        if ipv6_cidr_block is not None:
            pulumi.set(__self__, "ipv6_cidr_block", ipv6_cidr_block)
        if ipv6_cidr_block_network_border_group is not None:
            pulumi.set(__self__, "ipv6_cidr_block_network_border_group", ipv6_cidr_block_network_border_group)
        if ipv6_ipam_pool_id is not None:
            pulumi.set(__self__, "ipv6_ipam_pool_id", ipv6_ipam_pool_id)
        if ipv6_netmask_length is not None:
            pulumi.set(__self__, "ipv6_netmask_length", ipv6_netmask_length)
        if nat_gateways is not None:
            pulumi.set(__self__, "nat_gateways", nat_gateways)
        if number_of_availability_zones is not None:
            pulumi.set(__self__, "number_of_availability_zones", number_of_availability_zones)
        if subnet_specs is not None:
            pulumi.set(__self__, "subnet_specs", subnet_specs)
        if subnet_strategy is not None:
            pulumi.set(__self__, "subnet_strategy", subnet_strategy)
        if tags is not None:
            pulumi.set(__self__, "tags", tags)
        if vpc_endpoint_specs is not None:
            pulumi.set(__self__, "vpc_endpoint_specs", vpc_endpoint_specs)

    @property
    @pulumi.getter(name="assignGeneratedIpv6CidrBlock")
    def assign_generated_ipv6_cidr_block(self) -> Optional[pulumi.Input[bool]]:
        """
        Requests an Amazon-provided IPv6 CIDR block with a /56 prefix length for the VPC. You cannot specify the range of IP addresses, or the size of the CIDR block. Default is `false`. Conflicts with `ipv6_ipam_pool_id`
        """
        return pulumi.get(self, "assign_generated_ipv6_cidr_block")

    @assign_generated_ipv6_cidr_block.setter
    def assign_generated_ipv6_cidr_block(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "assign_generated_ipv6_cidr_block", value)

    @property
    @pulumi.getter(name="availabilityZoneNames")
    def availability_zone_names(self) -> Optional[Sequence[str]]:
        """
        A list of availability zone names to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
        """
        return pulumi.get(self, "availability_zone_names")

    @availability_zone_names.setter
    def availability_zone_names(self, value: Optional[Sequence[str]]):
        pulumi.set(self, "availability_zone_names", value)

    @property
    @pulumi.getter(name="cidrBlock")
    def cidr_block(self) -> Optional[str]:
        """
        The CIDR block for the VPC. Optional. Defaults to 10.0.0.0/16.
        """
        return pulumi.get(self, "cidr_block")

    @cidr_block.setter
    def cidr_block(self, value: Optional[str]):
        pulumi.set(self, "cidr_block", value)

    @property
    @pulumi.getter(name="enableDnsHostnames")
    def enable_dns_hostnames(self) -> Optional[pulumi.Input[bool]]:
        """
        A boolean flag to enable/disable DNS hostnames in the VPC. Defaults false.
        """
        return pulumi.get(self, "enable_dns_hostnames")

    @enable_dns_hostnames.setter
    def enable_dns_hostnames(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "enable_dns_hostnames", value)

    @property
    @pulumi.getter(name="enableDnsSupport")
    def enable_dns_support(self) -> Optional[pulumi.Input[bool]]:
        """
        A boolean flag to enable/disable DNS support in the VPC. Defaults to true.
        """
        return pulumi.get(self, "enable_dns_support")

    @enable_dns_support.setter
    def enable_dns_support(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "enable_dns_support", value)

    @property
    @pulumi.getter(name="enableNetworkAddressUsageMetrics")
    def enable_network_address_usage_metrics(self) -> Optional[pulumi.Input[bool]]:
        """
        Indicates whether Network Address Usage metrics are enabled for your VPC. Defaults to false.
        """
        return pulumi.get(self, "enable_network_address_usage_metrics")

    @enable_network_address_usage_metrics.setter
    def enable_network_address_usage_metrics(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "enable_network_address_usage_metrics", value)

    @property
    @pulumi.getter(name="instanceTenancy")
    def instance_tenancy(self) -> Optional[pulumi.Input[str]]:
        """
        A tenancy option for instances launched into the VPC. Default is `default`, which ensures that EC2 instances launched in this VPC use the EC2 instance tenancy attribute specified when the EC2 instance is launched. The only other option is `dedicated`, which ensures that EC2 instances launched in this VPC are run on dedicated tenancy instances regardless of the tenancy attribute specified at launch. This has a dedicated per region fee of $2 per hour, plus an hourly per instance usage fee.
        """
        return pulumi.get(self, "instance_tenancy")

    @instance_tenancy.setter
    def instance_tenancy(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "instance_tenancy", value)

    @property
    @pulumi.getter(name="ipv4IpamPoolId")
    def ipv4_ipam_pool_id(self) -> Optional[pulumi.Input[str]]:
        """
        The ID of an IPv4 IPAM pool you want to use for allocating this VPC's CIDR. IPAM is a VPC feature that you can use to automate your IP address management workflows including assigning, tracking, troubleshooting, and auditing IP addresses across AWS Regions and accounts. Using IPAM you can monitor IP address usage throughout your AWS Organization.
        """
        return pulumi.get(self, "ipv4_ipam_pool_id")

    @ipv4_ipam_pool_id.setter
    def ipv4_ipam_pool_id(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "ipv4_ipam_pool_id", value)

    @property
    @pulumi.getter(name="ipv4NetmaskLength")
    def ipv4_netmask_length(self) -> Optional[pulumi.Input[int]]:
        """
        The netmask length of the IPv4 CIDR you want to allocate to this VPC. Requires specifying a `ipv4_ipam_pool_id`.
        """
        return pulumi.get(self, "ipv4_netmask_length")

    @ipv4_netmask_length.setter
    def ipv4_netmask_length(self, value: Optional[pulumi.Input[int]]):
        pulumi.set(self, "ipv4_netmask_length", value)

    @property
    @pulumi.getter(name="ipv6CidrBlock")
    def ipv6_cidr_block(self) -> Optional[pulumi.Input[str]]:
        """
        IPv6 CIDR block to request from an IPAM Pool. Can be set explicitly or derived from IPAM using `ipv6_netmask_length`.
        """
        return pulumi.get(self, "ipv6_cidr_block")

    @ipv6_cidr_block.setter
    def ipv6_cidr_block(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "ipv6_cidr_block", value)

    @property
    @pulumi.getter(name="ipv6CidrBlockNetworkBorderGroup")
    def ipv6_cidr_block_network_border_group(self) -> Optional[pulumi.Input[str]]:
        """
        By default when an IPv6 CIDR is assigned to a VPC a default ipv6_cidr_block_network_border_group will be set to the region of the VPC. This can be changed to restrict advertisement of public addresses to specific Network Border Groups such as LocalZones.
        """
        return pulumi.get(self, "ipv6_cidr_block_network_border_group")

    @ipv6_cidr_block_network_border_group.setter
    def ipv6_cidr_block_network_border_group(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "ipv6_cidr_block_network_border_group", value)

    @property
    @pulumi.getter(name="ipv6IpamPoolId")
    def ipv6_ipam_pool_id(self) -> Optional[pulumi.Input[str]]:
        """
        IPAM Pool ID for a IPv6 pool. Conflicts with `assign_generated_ipv6_cidr_block`.
        """
        return pulumi.get(self, "ipv6_ipam_pool_id")

    @ipv6_ipam_pool_id.setter
    def ipv6_ipam_pool_id(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "ipv6_ipam_pool_id", value)

    @property
    @pulumi.getter(name="ipv6NetmaskLength")
    def ipv6_netmask_length(self) -> Optional[pulumi.Input[int]]:
        """
        Netmask length to request from IPAM Pool. Conflicts with `ipv6_cidr_block`. This can be omitted if IPAM pool as a `allocation_default_netmask_length` set. Valid values: `56`.
        """
        return pulumi.get(self, "ipv6_netmask_length")

    @ipv6_netmask_length.setter
    def ipv6_netmask_length(self, value: Optional[pulumi.Input[int]]):
        pulumi.set(self, "ipv6_netmask_length", value)

    @property
    @pulumi.getter(name="natGateways")
    def nat_gateways(self) -> Optional['NatGatewayConfigurationArgs']:
        """
        Configuration for NAT Gateways. Optional. If private and public subnets are both specified, defaults to one gateway per availability zone. Otherwise, no gateways will be created.
        """
        return pulumi.get(self, "nat_gateways")

    @nat_gateways.setter
    def nat_gateways(self, value: Optional['NatGatewayConfigurationArgs']):
        pulumi.set(self, "nat_gateways", value)

    @property
    @pulumi.getter(name="numberOfAvailabilityZones")
    def number_of_availability_zones(self) -> Optional[int]:
        """
        A number of availability zones to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
        """
        return pulumi.get(self, "number_of_availability_zones")

    @number_of_availability_zones.setter
    def number_of_availability_zones(self, value: Optional[int]):
        pulumi.set(self, "number_of_availability_zones", value)

    @property
    @pulumi.getter(name="subnetSpecs")
    def subnet_specs(self) -> Optional[Sequence['SubnetSpecArgs']]:
        """
        A list of subnet specs that should be deployed to each AZ specified in availabilityZoneNames. Optional. Defaults to a (smaller) public subnet and a (larger) private subnet based on the size of the CIDR block for the VPC. Private subnets are allocated CIDR block ranges first, followed by Private subnets, and Isolated subnets are allocated last.
        """
        return pulumi.get(self, "subnet_specs")

    @subnet_specs.setter
    def subnet_specs(self, value: Optional[Sequence['SubnetSpecArgs']]):
        pulumi.set(self, "subnet_specs", value)

    @property
    @pulumi.getter(name="subnetStrategy")
    def subnet_strategy(self) -> Optional['SubnetAllocationStrategy']:
        """
        The strategy to use when allocating subnets for the VPC. Optional. Defaults to `Legacy`.
        """
        return pulumi.get(self, "subnet_strategy")

    @subnet_strategy.setter
    def subnet_strategy(self, value: Optional['SubnetAllocationStrategy']):
        pulumi.set(self, "subnet_strategy", value)

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

    @property
    @pulumi.getter(name="vpcEndpointSpecs")
    def vpc_endpoint_specs(self) -> Optional[Sequence['VpcEndpointSpecArgs']]:
        """
        A list of VPC Endpoints specs to be deployed as part of the VPC
        """
        return pulumi.get(self, "vpc_endpoint_specs")

    @vpc_endpoint_specs.setter
    def vpc_endpoint_specs(self, value: Optional[Sequence['VpcEndpointSpecArgs']]):
        pulumi.set(self, "vpc_endpoint_specs", value)


class Vpc(pulumi.ComponentResource):
    @overload
    def __init__(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 assign_generated_ipv6_cidr_block: Optional[pulumi.Input[bool]] = None,
                 availability_zone_names: Optional[Sequence[str]] = None,
                 cidr_block: Optional[str] = None,
                 enable_dns_hostnames: Optional[pulumi.Input[bool]] = None,
                 enable_dns_support: Optional[pulumi.Input[bool]] = None,
                 enable_network_address_usage_metrics: Optional[pulumi.Input[bool]] = None,
                 instance_tenancy: Optional[pulumi.Input[str]] = None,
                 ipv4_ipam_pool_id: Optional[pulumi.Input[str]] = None,
                 ipv4_netmask_length: Optional[pulumi.Input[int]] = None,
                 ipv6_cidr_block: Optional[pulumi.Input[str]] = None,
                 ipv6_cidr_block_network_border_group: Optional[pulumi.Input[str]] = None,
                 ipv6_ipam_pool_id: Optional[pulumi.Input[str]] = None,
                 ipv6_netmask_length: Optional[pulumi.Input[int]] = None,
                 nat_gateways: Optional[pulumi.InputType['NatGatewayConfigurationArgs']] = None,
                 number_of_availability_zones: Optional[int] = None,
                 subnet_specs: Optional[Sequence[pulumi.InputType['SubnetSpecArgs']]] = None,
                 subnet_strategy: Optional['SubnetAllocationStrategy'] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 vpc_endpoint_specs: Optional[Sequence[pulumi.InputType['VpcEndpointSpecArgs']]] = None,
                 __props__=None):
        """
        Create a Vpc resource with the given unique name, props, and options.
        :param str resource_name: The name of the resource.
        :param pulumi.ResourceOptions opts: Options for the resource.
        :param pulumi.Input[bool] assign_generated_ipv6_cidr_block: Requests an Amazon-provided IPv6 CIDR block with a /56 prefix length for the VPC. You cannot specify the range of IP addresses, or the size of the CIDR block. Default is `false`. Conflicts with `ipv6_ipam_pool_id`
        :param Sequence[str] availability_zone_names: A list of availability zone names to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
        :param str cidr_block: The CIDR block for the VPC. Optional. Defaults to 10.0.0.0/16.
        :param pulumi.Input[bool] enable_dns_hostnames: A boolean flag to enable/disable DNS hostnames in the VPC. Defaults false.
        :param pulumi.Input[bool] enable_dns_support: A boolean flag to enable/disable DNS support in the VPC. Defaults to true.
        :param pulumi.Input[bool] enable_network_address_usage_metrics: Indicates whether Network Address Usage metrics are enabled for your VPC. Defaults to false.
        :param pulumi.Input[str] instance_tenancy: A tenancy option for instances launched into the VPC. Default is `default`, which ensures that EC2 instances launched in this VPC use the EC2 instance tenancy attribute specified when the EC2 instance is launched. The only other option is `dedicated`, which ensures that EC2 instances launched in this VPC are run on dedicated tenancy instances regardless of the tenancy attribute specified at launch. This has a dedicated per region fee of $2 per hour, plus an hourly per instance usage fee.
        :param pulumi.Input[str] ipv4_ipam_pool_id: The ID of an IPv4 IPAM pool you want to use for allocating this VPC's CIDR. IPAM is a VPC feature that you can use to automate your IP address management workflows including assigning, tracking, troubleshooting, and auditing IP addresses across AWS Regions and accounts. Using IPAM you can monitor IP address usage throughout your AWS Organization.
        :param pulumi.Input[int] ipv4_netmask_length: The netmask length of the IPv4 CIDR you want to allocate to this VPC. Requires specifying a `ipv4_ipam_pool_id`.
        :param pulumi.Input[str] ipv6_cidr_block: IPv6 CIDR block to request from an IPAM Pool. Can be set explicitly or derived from IPAM using `ipv6_netmask_length`.
        :param pulumi.Input[str] ipv6_cidr_block_network_border_group: By default when an IPv6 CIDR is assigned to a VPC a default ipv6_cidr_block_network_border_group will be set to the region of the VPC. This can be changed to restrict advertisement of public addresses to specific Network Border Groups such as LocalZones.
        :param pulumi.Input[str] ipv6_ipam_pool_id: IPAM Pool ID for a IPv6 pool. Conflicts with `assign_generated_ipv6_cidr_block`.
        :param pulumi.Input[int] ipv6_netmask_length: Netmask length to request from IPAM Pool. Conflicts with `ipv6_cidr_block`. This can be omitted if IPAM pool as a `allocation_default_netmask_length` set. Valid values: `56`.
        :param pulumi.InputType['NatGatewayConfigurationArgs'] nat_gateways: Configuration for NAT Gateways. Optional. If private and public subnets are both specified, defaults to one gateway per availability zone. Otherwise, no gateways will be created.
        :param int number_of_availability_zones: A number of availability zones to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
        :param Sequence[pulumi.InputType['SubnetSpecArgs']] subnet_specs: A list of subnet specs that should be deployed to each AZ specified in availabilityZoneNames. Optional. Defaults to a (smaller) public subnet and a (larger) private subnet based on the size of the CIDR block for the VPC. Private subnets are allocated CIDR block ranges first, followed by Private subnets, and Isolated subnets are allocated last.
        :param 'SubnetAllocationStrategy' subnet_strategy: The strategy to use when allocating subnets for the VPC. Optional. Defaults to `Legacy`.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] tags: A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        :param Sequence[pulumi.InputType['VpcEndpointSpecArgs']] vpc_endpoint_specs: A list of VPC Endpoints specs to be deployed as part of the VPC
        """
        ...
    @overload
    def __init__(__self__,
                 resource_name: str,
                 args: Optional[VpcArgs] = None,
                 opts: Optional[pulumi.ResourceOptions] = None):
        """
        Create a Vpc resource with the given unique name, props, and options.
        :param str resource_name: The name of the resource.
        :param VpcArgs args: The arguments to use to populate this resource's properties.
        :param pulumi.ResourceOptions opts: Options for the resource.
        """
        ...
    def __init__(__self__, resource_name: str, *args, **kwargs):
        resource_args, opts = _utilities.get_resource_args_opts(VpcArgs, pulumi.ResourceOptions, *args, **kwargs)
        if resource_args is not None:
            __self__._internal_init(resource_name, opts, **resource_args.__dict__)
        else:
            __self__._internal_init(resource_name, *args, **kwargs)

    def _internal_init(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 assign_generated_ipv6_cidr_block: Optional[pulumi.Input[bool]] = None,
                 availability_zone_names: Optional[Sequence[str]] = None,
                 cidr_block: Optional[str] = None,
                 enable_dns_hostnames: Optional[pulumi.Input[bool]] = None,
                 enable_dns_support: Optional[pulumi.Input[bool]] = None,
                 enable_network_address_usage_metrics: Optional[pulumi.Input[bool]] = None,
                 instance_tenancy: Optional[pulumi.Input[str]] = None,
                 ipv4_ipam_pool_id: Optional[pulumi.Input[str]] = None,
                 ipv4_netmask_length: Optional[pulumi.Input[int]] = None,
                 ipv6_cidr_block: Optional[pulumi.Input[str]] = None,
                 ipv6_cidr_block_network_border_group: Optional[pulumi.Input[str]] = None,
                 ipv6_ipam_pool_id: Optional[pulumi.Input[str]] = None,
                 ipv6_netmask_length: Optional[pulumi.Input[int]] = None,
                 nat_gateways: Optional[pulumi.InputType['NatGatewayConfigurationArgs']] = None,
                 number_of_availability_zones: Optional[int] = None,
                 subnet_specs: Optional[Sequence[pulumi.InputType['SubnetSpecArgs']]] = None,
                 subnet_strategy: Optional['SubnetAllocationStrategy'] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 vpc_endpoint_specs: Optional[Sequence[pulumi.InputType['VpcEndpointSpecArgs']]] = None,
                 __props__=None):
        opts = pulumi.ResourceOptions.merge(_utilities.get_resource_opts_defaults(), opts)
        if not isinstance(opts, pulumi.ResourceOptions):
            raise TypeError('Expected resource options to be a ResourceOptions instance')
        if opts.id is not None:
            raise ValueError('ComponentResource classes do not support opts.id')
        else:
            if __props__ is not None:
                raise TypeError('__props__ is only valid when passed in combination with a valid opts.id to get an existing resource')
            __props__ = VpcArgs.__new__(VpcArgs)

            __props__.__dict__["assign_generated_ipv6_cidr_block"] = assign_generated_ipv6_cidr_block
            __props__.__dict__["availability_zone_names"] = availability_zone_names
            __props__.__dict__["cidr_block"] = cidr_block
            __props__.__dict__["enable_dns_hostnames"] = enable_dns_hostnames
            __props__.__dict__["enable_dns_support"] = enable_dns_support
            __props__.__dict__["enable_network_address_usage_metrics"] = enable_network_address_usage_metrics
            __props__.__dict__["instance_tenancy"] = instance_tenancy
            __props__.__dict__["ipv4_ipam_pool_id"] = ipv4_ipam_pool_id
            __props__.__dict__["ipv4_netmask_length"] = ipv4_netmask_length
            __props__.__dict__["ipv6_cidr_block"] = ipv6_cidr_block
            __props__.__dict__["ipv6_cidr_block_network_border_group"] = ipv6_cidr_block_network_border_group
            __props__.__dict__["ipv6_ipam_pool_id"] = ipv6_ipam_pool_id
            __props__.__dict__["ipv6_netmask_length"] = ipv6_netmask_length
            __props__.__dict__["nat_gateways"] = nat_gateways
            __props__.__dict__["number_of_availability_zones"] = number_of_availability_zones
            __props__.__dict__["subnet_specs"] = subnet_specs
            __props__.__dict__["subnet_strategy"] = subnet_strategy
            __props__.__dict__["tags"] = tags
            __props__.__dict__["vpc_endpoint_specs"] = vpc_endpoint_specs
            __props__.__dict__["eips"] = None
            __props__.__dict__["internet_gateway"] = None
            __props__.__dict__["isolated_subnet_ids"] = None
            __props__.__dict__["private_subnet_ids"] = None
            __props__.__dict__["public_subnet_ids"] = None
            __props__.__dict__["route_table_associations"] = None
            __props__.__dict__["route_tables"] = None
            __props__.__dict__["routes"] = None
            __props__.__dict__["subnets"] = None
            __props__.__dict__["vpc"] = None
            __props__.__dict__["vpc_endpoints"] = None
            __props__.__dict__["vpc_id"] = None
        super(Vpc, __self__).__init__(
            'awsx:ec2:Vpc',
            resource_name,
            __props__,
            opts,
            remote=True)

    @property
    @pulumi.getter
    def eips(self) -> pulumi.Output[Sequence['pulumi_aws.ec2.Eip']]:
        """
        The EIPs for any NAT Gateways for the VPC. If no NAT Gateways are specified, this will be an empty list.
        """
        return pulumi.get(self, "eips")

    @property
    @pulumi.getter(name="internetGateway")
    def internet_gateway(self) -> pulumi.Output['pulumi_aws.ec2.InternetGateway']:
        """
        The Internet Gateway for the VPC.
        """
        return pulumi.get(self, "internet_gateway")

    @property
    @pulumi.getter(name="isolatedSubnetIds")
    def isolated_subnet_ids(self) -> pulumi.Output[Sequence[str]]:
        return pulumi.get(self, "isolated_subnet_ids")

    @property
    @pulumi.getter(name="natGateways")
    def nat_gateways(self) -> pulumi.Output[Sequence['pulumi_aws.ec2.NatGateway']]:
        """
        The NAT Gateways for the VPC. If no NAT Gateways are specified, this will be an empty list.
        """
        return pulumi.get(self, "nat_gateways")

    @property
    @pulumi.getter(name="privateSubnetIds")
    def private_subnet_ids(self) -> pulumi.Output[Sequence[str]]:
        return pulumi.get(self, "private_subnet_ids")

    @property
    @pulumi.getter(name="publicSubnetIds")
    def public_subnet_ids(self) -> pulumi.Output[Sequence[str]]:
        return pulumi.get(self, "public_subnet_ids")

    @property
    @pulumi.getter(name="routeTableAssociations")
    def route_table_associations(self) -> pulumi.Output[Sequence['pulumi_aws.ec2.RouteTableAssociation']]:
        """
        The Route Table Associations for the VPC.
        """
        return pulumi.get(self, "route_table_associations")

    @property
    @pulumi.getter(name="routeTables")
    def route_tables(self) -> pulumi.Output[Sequence['pulumi_aws.ec2.RouteTable']]:
        """
        The Route Tables for the VPC.
        """
        return pulumi.get(self, "route_tables")

    @property
    @pulumi.getter
    def routes(self) -> pulumi.Output[Sequence['pulumi_aws.ec2.Route']]:
        """
        The Routes for the VPC.
        """
        return pulumi.get(self, "routes")

    @property
    @pulumi.getter
    def subnets(self) -> pulumi.Output[Sequence['pulumi_aws.ec2.Subnet']]:
        """
        The VPC's subnets.
        """
        return pulumi.get(self, "subnets")

    @property
    @pulumi.getter
    def vpc(self) -> pulumi.Output['pulumi_aws.ec2.Vpc']:
        """
        The VPC.
        """
        return pulumi.get(self, "vpc")

    @property
    @pulumi.getter(name="vpcEndpoints")
    def vpc_endpoints(self) -> pulumi.Output[Sequence['pulumi_aws.ec2.VpcEndpoint']]:
        """
        The VPC Endpoints that are enabled
        """
        return pulumi.get(self, "vpc_endpoints")

    @property
    @pulumi.getter(name="vpcId")
    def vpc_id(self) -> pulumi.Output[str]:
        return pulumi.get(self, "vpc_id")

