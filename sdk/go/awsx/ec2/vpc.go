// Code generated by pulumi-gen-awsx DO NOT EDIT.
// *** WARNING: Do not edit by hand unless you're certain you know what you are doing! ***

package ec2

import (
	"context"
	"reflect"

	"github.com/pulumi/pulumi-aws/sdk/v5/go/aws/ec2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type Vpc struct {
	pulumi.ResourceState

	// The EIPs for any NAT Gateways for the VPC. If no NAT Gateways are specified, this will be an empty list.
	Eips ec2.EipArrayOutput `pulumi:"eips"`
	// The Internet Gateway for the VPC.
	InternetGateway   ec2.InternetGatewayOutput `pulumi:"internetGateway"`
	IsolatedSubnetIds pulumi.StringArrayOutput  `pulumi:"isolatedSubnetIds"`
	// The NAT Gateways for the VPC. If no NAT Gateways are specified, this will be an empty list.
	NatGateways      ec2.NatGatewayArrayOutput `pulumi:"natGateways"`
	PrivateSubnetIds pulumi.StringArrayOutput  `pulumi:"privateSubnetIds"`
	PublicSubnetIds  pulumi.StringArrayOutput  `pulumi:"publicSubnetIds"`
	// The Route Table Associations for the VPC.
	RouteTableAssociations ec2.RouteTableAssociationArrayOutput `pulumi:"routeTableAssociations"`
	// The Route Tables for the VPC.
	RouteTables ec2.RouteTableArrayOutput `pulumi:"routeTables"`
	// The Routes for the VPC.
	Routes ec2.RouteArrayOutput `pulumi:"routes"`
	// The VPC's subnets.
	Subnets ec2.SubnetArrayOutput `pulumi:"subnets"`
	// The VPC.
	Vpc ec2.VpcOutput `pulumi:"vpc"`
	// The VPC Endpoints that are enabled
	VpcEndpoints ec2.VpcEndpointArrayOutput `pulumi:"vpcEndpoints"`
	VpcId        pulumi.StringOutput        `pulumi:"vpcId"`
}

// NewVpc registers a new resource with the given unique name, arguments, and options.
func NewVpc(ctx *pulumi.Context,
	name string, args *VpcArgs, opts ...pulumi.ResourceOption) (*Vpc, error) {
	if args == nil {
		args = &VpcArgs{}
	}

	var resource Vpc
	err := ctx.RegisterRemoteComponentResource("awsx:ec2:Vpc", name, args, &resource, opts...)
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

type vpcArgs struct {
	// Requests an Amazon-provided IPv6 CIDR block with a /56 prefix length for the VPC. You cannot specify the range of IP addresses, or the size of the CIDR block. Default is `false`. Conflicts with `ipv6_ipam_pool_id`
	AssignGeneratedIpv6CidrBlock *bool `pulumi:"assignGeneratedIpv6CidrBlock"`
	// A list of availability zone names to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
	AvailabilityZoneNames []string `pulumi:"availabilityZoneNames"`
	// The CIDR block for the VPC. Optional. Defaults to 10.0.0.0/16.
	CidrBlock *string `pulumi:"cidrBlock"`
	// A boolean flag to enable/disable ClassicLink
	// for the VPC. Only valid in regions and accounts that support EC2 Classic.
	// See the [ClassicLink documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/vpc-classiclink.html) for more information. Defaults false.
	//
	// Deprecated: With the retirement of EC2-Classic the enable_classiclink attribute has been deprecated and will be removed in a future version.
	EnableClassiclink *bool `pulumi:"enableClassiclink"`
	// A boolean flag to enable/disable ClassicLink DNS Support for the VPC.
	// Only valid in regions and accounts that support EC2 Classic.
	//
	// Deprecated: With the retirement of EC2-Classic the enable_classiclink_dns_support attribute has been deprecated and will be removed in a future version.
	EnableClassiclinkDnsSupport *bool `pulumi:"enableClassiclinkDnsSupport"`
	// A boolean flag to enable/disable DNS hostnames in the VPC. Defaults false.
	EnableDnsHostnames *bool `pulumi:"enableDnsHostnames"`
	// A boolean flag to enable/disable DNS support in the VPC. Defaults true.
	EnableDnsSupport *bool `pulumi:"enableDnsSupport"`
	// A tenancy option for instances launched into the VPC. Default is `default`, which ensures that EC2 instances launched in this VPC use the EC2 instance tenancy attribute specified when the EC2 instance is launched. The only other option is `dedicated`, which ensures that EC2 instances launched in this VPC are run on dedicated tenancy instances regardless of the tenancy attribute specified at launch. This has a dedicated per region fee of $2 per hour, plus an hourly per instance usage fee.
	InstanceTenancy *string `pulumi:"instanceTenancy"`
	// The ID of an IPv4 IPAM pool you want to use for allocating this VPC's CIDR. IPAM is a VPC feature that you can use to automate your IP address management workflows including assigning, tracking, troubleshooting, and auditing IP addresses across AWS Regions and accounts. Using IPAM you can monitor IP address usage throughout your AWS Organization.
	Ipv4IpamPoolId *string `pulumi:"ipv4IpamPoolId"`
	// The netmask length of the IPv4 CIDR you want to allocate to this VPC. Requires specifying a `ipv4_ipam_pool_id`.
	Ipv4NetmaskLength *int `pulumi:"ipv4NetmaskLength"`
	// IPv6 CIDR block to request from an IPAM Pool. Can be set explicitly or derived from IPAM using `ipv6_netmask_length`.
	Ipv6CidrBlock *string `pulumi:"ipv6CidrBlock"`
	// By default when an IPv6 CIDR is assigned to a VPC a default ipv6_cidr_block_network_border_group will be set to the region of the VPC. This can be changed to restrict advertisement of public addresses to specific Network Border Groups such as LocalZones.
	Ipv6CidrBlockNetworkBorderGroup *string `pulumi:"ipv6CidrBlockNetworkBorderGroup"`
	// IPAM Pool ID for a IPv6 pool. Conflicts with `assign_generated_ipv6_cidr_block`.
	Ipv6IpamPoolId *string `pulumi:"ipv6IpamPoolId"`
	// Netmask length to request from IPAM Pool. Conflicts with `ipv6_cidr_block`. This can be omitted if IPAM pool as a `allocation_default_netmask_length` set. Valid values: `56`.
	Ipv6NetmaskLength *int `pulumi:"ipv6NetmaskLength"`
	// Configuration for NAT Gateways. Optional. If private and public subnets are both specified, defaults to one gateway per availability zone. Otherwise, no gateways will be created.
	NatGateways *NatGatewayConfiguration `pulumi:"natGateways"`
	// A number of availability zones to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
	NumberOfAvailabilityZones *int `pulumi:"numberOfAvailabilityZones"`
	// A list of subnet specs that should be deployed to each AZ specified in availabilityZoneNames. Optional. Defaults to a (smaller) public subnet and a (larger) private subnet based on the size of the CIDR block for the VPC.
	SubnetSpecs []SubnetSpec `pulumi:"subnetSpecs"`
	// A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
	Tags map[string]string `pulumi:"tags"`
	// A list of VPC Endpoints specs to be deployed as part of the VPC
	VpcEndpointSpecs []VpcEndpointSpec `pulumi:"vpcEndpointSpecs"`
}

// The set of arguments for constructing a Vpc resource.
type VpcArgs struct {
	// Requests an Amazon-provided IPv6 CIDR block with a /56 prefix length for the VPC. You cannot specify the range of IP addresses, or the size of the CIDR block. Default is `false`. Conflicts with `ipv6_ipam_pool_id`
	AssignGeneratedIpv6CidrBlock pulumi.BoolPtrInput
	// A list of availability zone names to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
	AvailabilityZoneNames []string
	// The CIDR block for the VPC. Optional. Defaults to 10.0.0.0/16.
	CidrBlock *string
	// A boolean flag to enable/disable ClassicLink
	// for the VPC. Only valid in regions and accounts that support EC2 Classic.
	// See the [ClassicLink documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/vpc-classiclink.html) for more information. Defaults false.
	//
	// Deprecated: With the retirement of EC2-Classic the enable_classiclink attribute has been deprecated and will be removed in a future version.
	EnableClassiclink pulumi.BoolPtrInput
	// A boolean flag to enable/disable ClassicLink DNS Support for the VPC.
	// Only valid in regions and accounts that support EC2 Classic.
	//
	// Deprecated: With the retirement of EC2-Classic the enable_classiclink_dns_support attribute has been deprecated and will be removed in a future version.
	EnableClassiclinkDnsSupport pulumi.BoolPtrInput
	// A boolean flag to enable/disable DNS hostnames in the VPC. Defaults false.
	EnableDnsHostnames pulumi.BoolPtrInput
	// A boolean flag to enable/disable DNS support in the VPC. Defaults true.
	EnableDnsSupport pulumi.BoolPtrInput
	// A tenancy option for instances launched into the VPC. Default is `default`, which ensures that EC2 instances launched in this VPC use the EC2 instance tenancy attribute specified when the EC2 instance is launched. The only other option is `dedicated`, which ensures that EC2 instances launched in this VPC are run on dedicated tenancy instances regardless of the tenancy attribute specified at launch. This has a dedicated per region fee of $2 per hour, plus an hourly per instance usage fee.
	InstanceTenancy pulumi.StringPtrInput
	// The ID of an IPv4 IPAM pool you want to use for allocating this VPC's CIDR. IPAM is a VPC feature that you can use to automate your IP address management workflows including assigning, tracking, troubleshooting, and auditing IP addresses across AWS Regions and accounts. Using IPAM you can monitor IP address usage throughout your AWS Organization.
	Ipv4IpamPoolId pulumi.StringPtrInput
	// The netmask length of the IPv4 CIDR you want to allocate to this VPC. Requires specifying a `ipv4_ipam_pool_id`.
	Ipv4NetmaskLength pulumi.IntPtrInput
	// IPv6 CIDR block to request from an IPAM Pool. Can be set explicitly or derived from IPAM using `ipv6_netmask_length`.
	Ipv6CidrBlock pulumi.StringPtrInput
	// By default when an IPv6 CIDR is assigned to a VPC a default ipv6_cidr_block_network_border_group will be set to the region of the VPC. This can be changed to restrict advertisement of public addresses to specific Network Border Groups such as LocalZones.
	Ipv6CidrBlockNetworkBorderGroup pulumi.StringPtrInput
	// IPAM Pool ID for a IPv6 pool. Conflicts with `assign_generated_ipv6_cidr_block`.
	Ipv6IpamPoolId pulumi.StringPtrInput
	// Netmask length to request from IPAM Pool. Conflicts with `ipv6_cidr_block`. This can be omitted if IPAM pool as a `allocation_default_netmask_length` set. Valid values: `56`.
	Ipv6NetmaskLength pulumi.IntPtrInput
	// Configuration for NAT Gateways. Optional. If private and public subnets are both specified, defaults to one gateway per availability zone. Otherwise, no gateways will be created.
	NatGateways *NatGatewayConfigurationArgs
	// A number of availability zones to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
	NumberOfAvailabilityZones *int
	// A list of subnet specs that should be deployed to each AZ specified in availabilityZoneNames. Optional. Defaults to a (smaller) public subnet and a (larger) private subnet based on the size of the CIDR block for the VPC.
	SubnetSpecs []SubnetSpecArgs
	// A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
	Tags pulumi.StringMapInput
	// A list of VPC Endpoints specs to be deployed as part of the VPC
	VpcEndpointSpecs []VpcEndpointSpecArgs
}

func (VpcArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*vpcArgs)(nil)).Elem()
}

type VpcInput interface {
	pulumi.Input

	ToVpcOutput() VpcOutput
	ToVpcOutputWithContext(ctx context.Context) VpcOutput
}

func (*Vpc) ElementType() reflect.Type {
	return reflect.TypeOf((**Vpc)(nil)).Elem()
}

func (i *Vpc) ToVpcOutput() VpcOutput {
	return i.ToVpcOutputWithContext(context.Background())
}

func (i *Vpc) ToVpcOutputWithContext(ctx context.Context) VpcOutput {
	return pulumi.ToOutputWithContext(ctx, i).(VpcOutput)
}

// VpcArrayInput is an input type that accepts VpcArray and VpcArrayOutput values.
// You can construct a concrete instance of `VpcArrayInput` via:
//
//	VpcArray{ VpcArgs{...} }
type VpcArrayInput interface {
	pulumi.Input

	ToVpcArrayOutput() VpcArrayOutput
	ToVpcArrayOutputWithContext(context.Context) VpcArrayOutput
}

type VpcArray []VpcInput

func (VpcArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*Vpc)(nil)).Elem()
}

func (i VpcArray) ToVpcArrayOutput() VpcArrayOutput {
	return i.ToVpcArrayOutputWithContext(context.Background())
}

func (i VpcArray) ToVpcArrayOutputWithContext(ctx context.Context) VpcArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(VpcArrayOutput)
}

// VpcMapInput is an input type that accepts VpcMap and VpcMapOutput values.
// You can construct a concrete instance of `VpcMapInput` via:
//
//	VpcMap{ "key": VpcArgs{...} }
type VpcMapInput interface {
	pulumi.Input

	ToVpcMapOutput() VpcMapOutput
	ToVpcMapOutputWithContext(context.Context) VpcMapOutput
}

type VpcMap map[string]VpcInput

func (VpcMap) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*Vpc)(nil)).Elem()
}

func (i VpcMap) ToVpcMapOutput() VpcMapOutput {
	return i.ToVpcMapOutputWithContext(context.Background())
}

func (i VpcMap) ToVpcMapOutputWithContext(ctx context.Context) VpcMapOutput {
	return pulumi.ToOutputWithContext(ctx, i).(VpcMapOutput)
}

type VpcOutput struct{ *pulumi.OutputState }

func (VpcOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**Vpc)(nil)).Elem()
}

func (o VpcOutput) ToVpcOutput() VpcOutput {
	return o
}

func (o VpcOutput) ToVpcOutputWithContext(ctx context.Context) VpcOutput {
	return o
}

// The EIPs for any NAT Gateways for the VPC. If no NAT Gateways are specified, this will be an empty list.
func (o VpcOutput) Eips() ec2.EipArrayOutput {
	return o.ApplyT(func(v *Vpc) ec2.EipArrayOutput { return v.Eips }).(ec2.EipArrayOutput)
}

// The Internet Gateway for the VPC.
func (o VpcOutput) InternetGateway() ec2.InternetGatewayOutput {
	return o.ApplyT(func(v *Vpc) ec2.InternetGatewayOutput { return v.InternetGateway }).(ec2.InternetGatewayOutput)
}

func (o VpcOutput) IsolatedSubnetIds() pulumi.StringArrayOutput {
	return o.ApplyT(func(v *Vpc) pulumi.StringArrayOutput { return v.IsolatedSubnetIds }).(pulumi.StringArrayOutput)
}

// The NAT Gateways for the VPC. If no NAT Gateways are specified, this will be an empty list.
func (o VpcOutput) NatGateways() ec2.NatGatewayArrayOutput {
	return o.ApplyT(func(v *Vpc) ec2.NatGatewayArrayOutput { return v.NatGateways }).(ec2.NatGatewayArrayOutput)
}

func (o VpcOutput) PrivateSubnetIds() pulumi.StringArrayOutput {
	return o.ApplyT(func(v *Vpc) pulumi.StringArrayOutput { return v.PrivateSubnetIds }).(pulumi.StringArrayOutput)
}

func (o VpcOutput) PublicSubnetIds() pulumi.StringArrayOutput {
	return o.ApplyT(func(v *Vpc) pulumi.StringArrayOutput { return v.PublicSubnetIds }).(pulumi.StringArrayOutput)
}

// The Route Table Associations for the VPC.
func (o VpcOutput) RouteTableAssociations() ec2.RouteTableAssociationArrayOutput {
	return o.ApplyT(func(v *Vpc) ec2.RouteTableAssociationArrayOutput { return v.RouteTableAssociations }).(ec2.RouteTableAssociationArrayOutput)
}

// The Route Tables for the VPC.
func (o VpcOutput) RouteTables() ec2.RouteTableArrayOutput {
	return o.ApplyT(func(v *Vpc) ec2.RouteTableArrayOutput { return v.RouteTables }).(ec2.RouteTableArrayOutput)
}

// The Routes for the VPC.
func (o VpcOutput) Routes() ec2.RouteArrayOutput {
	return o.ApplyT(func(v *Vpc) ec2.RouteArrayOutput { return v.Routes }).(ec2.RouteArrayOutput)
}

// The VPC's subnets.
func (o VpcOutput) Subnets() ec2.SubnetArrayOutput {
	return o.ApplyT(func(v *Vpc) ec2.SubnetArrayOutput { return v.Subnets }).(ec2.SubnetArrayOutput)
}

// The VPC.
func (o VpcOutput) Vpc() ec2.VpcOutput {
	return o.ApplyT(func(v *Vpc) ec2.VpcOutput { return v.Vpc }).(ec2.VpcOutput)
}

// The VPC Endpoints that are enabled
func (o VpcOutput) VpcEndpoints() ec2.VpcEndpointArrayOutput {
	return o.ApplyT(func(v *Vpc) ec2.VpcEndpointArrayOutput { return v.VpcEndpoints }).(ec2.VpcEndpointArrayOutput)
}

func (o VpcOutput) VpcId() pulumi.StringOutput {
	return o.ApplyT(func(v *Vpc) pulumi.StringOutput { return v.VpcId }).(pulumi.StringOutput)
}

type VpcArrayOutput struct{ *pulumi.OutputState }

func (VpcArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*Vpc)(nil)).Elem()
}

func (o VpcArrayOutput) ToVpcArrayOutput() VpcArrayOutput {
	return o
}

func (o VpcArrayOutput) ToVpcArrayOutputWithContext(ctx context.Context) VpcArrayOutput {
	return o
}

func (o VpcArrayOutput) Index(i pulumi.IntInput) VpcOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) *Vpc {
		return vs[0].([]*Vpc)[vs[1].(int)]
	}).(VpcOutput)
}

type VpcMapOutput struct{ *pulumi.OutputState }

func (VpcMapOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*Vpc)(nil)).Elem()
}

func (o VpcMapOutput) ToVpcMapOutput() VpcMapOutput {
	return o
}

func (o VpcMapOutput) ToVpcMapOutputWithContext(ctx context.Context) VpcMapOutput {
	return o
}

func (o VpcMapOutput) MapIndex(k pulumi.StringInput) VpcOutput {
	return pulumi.All(o, k).ApplyT(func(vs []interface{}) *Vpc {
		return vs[0].(map[string]*Vpc)[vs[1].(string)]
	}).(VpcOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*VpcInput)(nil)).Elem(), &Vpc{})
	pulumi.RegisterInputType(reflect.TypeOf((*VpcArrayInput)(nil)).Elem(), VpcArray{})
	pulumi.RegisterInputType(reflect.TypeOf((*VpcMapInput)(nil)).Elem(), VpcMap{})
	pulumi.RegisterOutputType(VpcOutput{})
	pulumi.RegisterOutputType(VpcArrayOutput{})
	pulumi.RegisterOutputType(VpcMapOutput{})
}
