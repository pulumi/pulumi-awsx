// Code generated by pulumi-gen-awsx DO NOT EDIT.
// *** WARNING: Do not edit by hand unless you're certain you know what you are doing! ***

package ec2

import (
	"context"
	"reflect"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// Configuration for NAT Gateways.
type NatGatewayConfiguration struct {
	// A list of EIP allocation IDs to assign to the NAT Gateways. Optional. If specified, the number of supplied values must match the chosen strategy (either one, or the number of availability zones).
	ElasticIpAllocationIds []string `pulumi:"elasticIpAllocationIds"`
	// The strategy for deploying NAT Gateways.
	Strategy NatGatewayStrategy `pulumi:"strategy"`
}

// NatGatewayConfigurationInput is an input type that accepts NatGatewayConfigurationArgs and NatGatewayConfigurationOutput values.
// You can construct a concrete instance of `NatGatewayConfigurationInput` via:
//
//	NatGatewayConfigurationArgs{...}
type NatGatewayConfigurationInput interface {
	pulumi.Input

	ToNatGatewayConfigurationOutput() NatGatewayConfigurationOutput
	ToNatGatewayConfigurationOutputWithContext(context.Context) NatGatewayConfigurationOutput
}

// Configuration for NAT Gateways.
type NatGatewayConfigurationArgs struct {
	// A list of EIP allocation IDs to assign to the NAT Gateways. Optional. If specified, the number of supplied values must match the chosen strategy (either one, or the number of availability zones).
	ElasticIpAllocationIds []pulumi.StringInput `pulumi:"elasticIpAllocationIds"`
	// The strategy for deploying NAT Gateways.
	Strategy NatGatewayStrategy `pulumi:"strategy"`
}

func (NatGatewayConfigurationArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*NatGatewayConfiguration)(nil)).Elem()
}

func (i NatGatewayConfigurationArgs) ToNatGatewayConfigurationOutput() NatGatewayConfigurationOutput {
	return i.ToNatGatewayConfigurationOutputWithContext(context.Background())
}

func (i NatGatewayConfigurationArgs) ToNatGatewayConfigurationOutputWithContext(ctx context.Context) NatGatewayConfigurationOutput {
	return pulumi.ToOutputWithContext(ctx, i).(NatGatewayConfigurationOutput)
}

func (i NatGatewayConfigurationArgs) ToNatGatewayConfigurationPtrOutput() NatGatewayConfigurationPtrOutput {
	return i.ToNatGatewayConfigurationPtrOutputWithContext(context.Background())
}

func (i NatGatewayConfigurationArgs) ToNatGatewayConfigurationPtrOutputWithContext(ctx context.Context) NatGatewayConfigurationPtrOutput {
	return pulumi.ToOutputWithContext(ctx, i).(NatGatewayConfigurationOutput).ToNatGatewayConfigurationPtrOutputWithContext(ctx)
}

// NatGatewayConfigurationPtrInput is an input type that accepts NatGatewayConfigurationArgs, NatGatewayConfigurationPtr and NatGatewayConfigurationPtrOutput values.
// You can construct a concrete instance of `NatGatewayConfigurationPtrInput` via:
//
//	        NatGatewayConfigurationArgs{...}
//
//	or:
//
//	        nil
type NatGatewayConfigurationPtrInput interface {
	pulumi.Input

	ToNatGatewayConfigurationPtrOutput() NatGatewayConfigurationPtrOutput
	ToNatGatewayConfigurationPtrOutputWithContext(context.Context) NatGatewayConfigurationPtrOutput
}

type natGatewayConfigurationPtrType NatGatewayConfigurationArgs

func NatGatewayConfigurationPtr(v *NatGatewayConfigurationArgs) NatGatewayConfigurationPtrInput {
	return (*natGatewayConfigurationPtrType)(v)
}

func (*natGatewayConfigurationPtrType) ElementType() reflect.Type {
	return reflect.TypeOf((**NatGatewayConfiguration)(nil)).Elem()
}

func (i *natGatewayConfigurationPtrType) ToNatGatewayConfigurationPtrOutput() NatGatewayConfigurationPtrOutput {
	return i.ToNatGatewayConfigurationPtrOutputWithContext(context.Background())
}

func (i *natGatewayConfigurationPtrType) ToNatGatewayConfigurationPtrOutputWithContext(ctx context.Context) NatGatewayConfigurationPtrOutput {
	return pulumi.ToOutputWithContext(ctx, i).(NatGatewayConfigurationPtrOutput)
}

// Configuration for NAT Gateways.
type NatGatewayConfigurationOutput struct{ *pulumi.OutputState }

func (NatGatewayConfigurationOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*NatGatewayConfiguration)(nil)).Elem()
}

func (o NatGatewayConfigurationOutput) ToNatGatewayConfigurationOutput() NatGatewayConfigurationOutput {
	return o
}

func (o NatGatewayConfigurationOutput) ToNatGatewayConfigurationOutputWithContext(ctx context.Context) NatGatewayConfigurationOutput {
	return o
}

func (o NatGatewayConfigurationOutput) ToNatGatewayConfigurationPtrOutput() NatGatewayConfigurationPtrOutput {
	return o.ToNatGatewayConfigurationPtrOutputWithContext(context.Background())
}

func (o NatGatewayConfigurationOutput) ToNatGatewayConfigurationPtrOutputWithContext(ctx context.Context) NatGatewayConfigurationPtrOutput {
	return o.ApplyTWithContext(ctx, func(_ context.Context, v NatGatewayConfiguration) *NatGatewayConfiguration {
		return &v
	}).(NatGatewayConfigurationPtrOutput)
}

// A list of EIP allocation IDs to assign to the NAT Gateways. Optional. If specified, the number of supplied values must match the chosen strategy (either one, or the number of availability zones).
func (o NatGatewayConfigurationOutput) ElasticIpAllocationIds() pulumi.StringArrayOutput {
	return o.ApplyT(func(v NatGatewayConfiguration) []string { return v.ElasticIpAllocationIds }).(pulumi.StringArrayOutput)
}

// The strategy for deploying NAT Gateways.
func (o NatGatewayConfigurationOutput) Strategy() NatGatewayStrategyOutput {
	return o.ApplyT(func(v NatGatewayConfiguration) NatGatewayStrategy { return v.Strategy }).(NatGatewayStrategyOutput)
}

type NatGatewayConfigurationPtrOutput struct{ *pulumi.OutputState }

func (NatGatewayConfigurationPtrOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**NatGatewayConfiguration)(nil)).Elem()
}

func (o NatGatewayConfigurationPtrOutput) ToNatGatewayConfigurationPtrOutput() NatGatewayConfigurationPtrOutput {
	return o
}

func (o NatGatewayConfigurationPtrOutput) ToNatGatewayConfigurationPtrOutputWithContext(ctx context.Context) NatGatewayConfigurationPtrOutput {
	return o
}

func (o NatGatewayConfigurationPtrOutput) Elem() NatGatewayConfigurationOutput {
	return o.ApplyT(func(v *NatGatewayConfiguration) NatGatewayConfiguration {
		if v != nil {
			return *v
		}
		var ret NatGatewayConfiguration
		return ret
	}).(NatGatewayConfigurationOutput)
}

// A list of EIP allocation IDs to assign to the NAT Gateways. Optional. If specified, the number of supplied values must match the chosen strategy (either one, or the number of availability zones).
func (o NatGatewayConfigurationPtrOutput) ElasticIpAllocationIds() pulumi.StringArrayOutput {
	return o.ApplyT(func(v *NatGatewayConfiguration) []string {
		if v == nil {
			return nil
		}
		return v.ElasticIpAllocationIds
	}).(pulumi.StringArrayOutput)
}

// The strategy for deploying NAT Gateways.
func (o NatGatewayConfigurationPtrOutput) Strategy() NatGatewayStrategyPtrOutput {
	return o.ApplyT(func(v *NatGatewayConfiguration) *NatGatewayStrategy {
		if v == nil {
			return nil
		}
		return &v.Strategy
	}).(NatGatewayStrategyPtrOutput)
}

// Configuration for a VPC subnet.
type SubnetSpec struct {
	// The bitmask for the subnet's CIDR block.
	CidrMask *int `pulumi:"cidrMask"`
	// The subnet's name. Will be templated upon creation.
	Name *string `pulumi:"name"`
	// A map of tags to assign to the resource.
	Tags map[string]string `pulumi:"tags"`
	// The type of subnet.
	Type SubnetType `pulumi:"type"`
}

// SubnetSpecInput is an input type that accepts SubnetSpecArgs and SubnetSpecOutput values.
// You can construct a concrete instance of `SubnetSpecInput` via:
//
//	SubnetSpecArgs{...}
type SubnetSpecInput interface {
	pulumi.Input

	ToSubnetSpecOutput() SubnetSpecOutput
	ToSubnetSpecOutputWithContext(context.Context) SubnetSpecOutput
}

// Configuration for a VPC subnet.
type SubnetSpecArgs struct {
	// The bitmask for the subnet's CIDR block.
	CidrMask *int `pulumi:"cidrMask"`
	// The subnet's name. Will be templated upon creation.
	Name *string `pulumi:"name"`
	// A map of tags to assign to the resource.
	Tags pulumi.StringMapInput `pulumi:"tags"`
	// The type of subnet.
	Type SubnetType `pulumi:"type"`
}

func (SubnetSpecArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*SubnetSpec)(nil)).Elem()
}

func (i SubnetSpecArgs) ToSubnetSpecOutput() SubnetSpecOutput {
	return i.ToSubnetSpecOutputWithContext(context.Background())
}

func (i SubnetSpecArgs) ToSubnetSpecOutputWithContext(ctx context.Context) SubnetSpecOutput {
	return pulumi.ToOutputWithContext(ctx, i).(SubnetSpecOutput)
}

// SubnetSpecArrayInput is an input type that accepts SubnetSpecArray and SubnetSpecArrayOutput values.
// You can construct a concrete instance of `SubnetSpecArrayInput` via:
//
//	SubnetSpecArray{ SubnetSpecArgs{...} }
type SubnetSpecArrayInput interface {
	pulumi.Input

	ToSubnetSpecArrayOutput() SubnetSpecArrayOutput
	ToSubnetSpecArrayOutputWithContext(context.Context) SubnetSpecArrayOutput
}

type SubnetSpecArray []SubnetSpecInput

func (SubnetSpecArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]SubnetSpec)(nil)).Elem()
}

func (i SubnetSpecArray) ToSubnetSpecArrayOutput() SubnetSpecArrayOutput {
	return i.ToSubnetSpecArrayOutputWithContext(context.Background())
}

func (i SubnetSpecArray) ToSubnetSpecArrayOutputWithContext(ctx context.Context) SubnetSpecArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(SubnetSpecArrayOutput)
}

// Configuration for a VPC subnet.
type SubnetSpecOutput struct{ *pulumi.OutputState }

func (SubnetSpecOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*SubnetSpec)(nil)).Elem()
}

func (o SubnetSpecOutput) ToSubnetSpecOutput() SubnetSpecOutput {
	return o
}

func (o SubnetSpecOutput) ToSubnetSpecOutputWithContext(ctx context.Context) SubnetSpecOutput {
	return o
}

// The bitmask for the subnet's CIDR block.
func (o SubnetSpecOutput) CidrMask() pulumi.IntPtrOutput {
	return o.ApplyT(func(v SubnetSpec) *int { return v.CidrMask }).(pulumi.IntPtrOutput)
}

// The subnet's name. Will be templated upon creation.
func (o SubnetSpecOutput) Name() pulumi.StringPtrOutput {
	return o.ApplyT(func(v SubnetSpec) *string { return v.Name }).(pulumi.StringPtrOutput)
}

// A map of tags to assign to the resource.
func (o SubnetSpecOutput) Tags() pulumi.StringMapOutput {
	return o.ApplyT(func(v SubnetSpec) map[string]string { return v.Tags }).(pulumi.StringMapOutput)
}

// The type of subnet.
func (o SubnetSpecOutput) Type() SubnetTypeOutput {
	return o.ApplyT(func(v SubnetSpec) SubnetType { return v.Type }).(SubnetTypeOutput)
}

type SubnetSpecArrayOutput struct{ *pulumi.OutputState }

func (SubnetSpecArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]SubnetSpec)(nil)).Elem()
}

func (o SubnetSpecArrayOutput) ToSubnetSpecArrayOutput() SubnetSpecArrayOutput {
	return o
}

func (o SubnetSpecArrayOutput) ToSubnetSpecArrayOutputWithContext(ctx context.Context) SubnetSpecArrayOutput {
	return o
}

func (o SubnetSpecArrayOutput) Index(i pulumi.IntInput) SubnetSpecOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) SubnetSpec {
		return vs[0].([]SubnetSpec)[vs[1].(int)]
	}).(SubnetSpecOutput)
}

// Provides a VPC Endpoint resource.
//
// > **NOTE on VPC Endpoints and VPC Endpoint Associations:** The provider provides both standalone VPC Endpoint Associations for
// Route Tables - (an association between a VPC endpoint and a single `route_table_id`),
// Security Groups - (an association between a VPC endpoint and a single `security_group_id`),
// and Subnets - (an association between a VPC endpoint and a single `subnet_id`) and
// a VPC Endpoint resource with `route_table_ids` and `subnet_ids` attributes.
// Do not use the same resource ID in both a VPC Endpoint resource and a VPC Endpoint Association resource.
// Doing so will cause a conflict of associations and will overwrite the association.
//
// ## Example Usage
// ### Basic
// ```go
// package main
//
// import (
//
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
//	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
//
// )
//
//	func main() {
//		pulumi.Run(func(ctx *pulumi.Context) error {
//			_, err := ec2.NewVpcEndpoint(ctx, "s3", &ec2.VpcEndpointArgs{
//				VpcId:       pulumi.Any(aws_vpc.Main.Id),
//				ServiceName: pulumi.String("com.amazonaws.us-west-2.s3"),
//			})
//			if err != nil {
//				return err
//			}
//			return nil
//		})
//	}
//
// ```
// ### Basic w/ Tags
// ```go
// package main
//
// import (
//
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
//	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
//
// )
//
//	func main() {
//		pulumi.Run(func(ctx *pulumi.Context) error {
//			_, err := ec2.NewVpcEndpoint(ctx, "s3", &ec2.VpcEndpointArgs{
//				VpcId:       pulumi.Any(aws_vpc.Main.Id),
//				ServiceName: pulumi.String("com.amazonaws.us-west-2.s3"),
//				Tags: pulumi.StringMap{
//					"Environment": pulumi.String("test"),
//				},
//			})
//			if err != nil {
//				return err
//			}
//			return nil
//		})
//	}
//
// ```
// ### Interface Endpoint Type
// ```go
// package main
//
// import (
//
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
//	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
//
// )
//
//	func main() {
//		pulumi.Run(func(ctx *pulumi.Context) error {
//			_, err := ec2.NewVpcEndpoint(ctx, "ec2", &ec2.VpcEndpointArgs{
//				VpcId:           pulumi.Any(aws_vpc.Main.Id),
//				ServiceName:     pulumi.String("com.amazonaws.us-west-2.ec2"),
//				VpcEndpointType: pulumi.String("Interface"),
//				SecurityGroupIds: pulumi.StringArray{
//					aws_security_group.Sg1.Id,
//				},
//				PrivateDnsEnabled: pulumi.Bool(true),
//			})
//			if err != nil {
//				return err
//			}
//			return nil
//		})
//	}
//
// ```
// ### Gateway Load Balancer Endpoint Type
// ```go
// package main
//
// import (
//
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws"
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
//	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
//
// )
//
//	func main() {
//		pulumi.Run(func(ctx *pulumi.Context) error {
//			current, err := aws.GetCallerIdentity(ctx, nil, nil)
//			if err != nil {
//				return err
//			}
//			exampleVpcEndpointService, err := ec2.NewVpcEndpointService(ctx, "exampleVpcEndpointService", &ec2.VpcEndpointServiceArgs{
//				AcceptanceRequired: pulumi.Bool(false),
//				AllowedPrincipals: pulumi.StringArray{
//					*pulumi.String(current.Arn),
//				},
//				GatewayLoadBalancerArns: pulumi.StringArray{
//					aws_lb.Example.Arn,
//				},
//			})
//			if err != nil {
//				return err
//			}
//			_, err = ec2.NewVpcEndpoint(ctx, "exampleVpcEndpoint", &ec2.VpcEndpointArgs{
//				ServiceName: exampleVpcEndpointService.ServiceName,
//				SubnetIds: pulumi.StringArray{
//					aws_subnet.Example.Id,
//				},
//				VpcEndpointType: exampleVpcEndpointService.ServiceType,
//				VpcId:           pulumi.Any(aws_vpc.Example.Id),
//			})
//			if err != nil {
//				return err
//			}
//			return nil
//		})
//	}
//
// ```
//
// ## Import
//
// VPC Endpoints can be imported using the `vpc endpoint id`, e.g.,
//
// ```sh
//
//	$ pulumi import aws:ec2/vpcEndpoint:VpcEndpoint endpoint1 vpce-3ecf2a57
//
// ```
type VpcEndpointSpec struct {
	// Accept the VPC endpoint (the VPC endpoint and service need to be in the same AWS account).
	AutoAccept *bool `pulumi:"autoAccept"`
	// The DNS options for the endpoint. See dns_options below.
	DnsOptions *ec2.VpcEndpointDnsOptions `pulumi:"dnsOptions"`
	// The IP address type for the endpoint. Valid values are `ipv4`, `dualstack`, and `ipv6`.
	IpAddressType *string `pulumi:"ipAddressType"`
	// A policy to attach to the endpoint that controls access to the service. This is a JSON formatted string. Defaults to full access. All `Gateway` and some `Interface` endpoints support policies - see the [relevant AWS documentation](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints-access.html) for more details.
	Policy *string `pulumi:"policy"`
	// Whether or not to associate a private hosted zone with the specified VPC. Applicable for endpoints of type Interface. Defaults to `false`.
	PrivateDnsEnabled *bool `pulumi:"privateDnsEnabled"`
	// One or more route table IDs. Applicable for endpoints of type `Gateway`.
	RouteTableIds []string `pulumi:"routeTableIds"`
	// The ID of one or more security groups to associate with the network interface. Applicable for endpoints of type `Interface`.
	// If no security groups are specified, the VPC's [default security group](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html#DefaultSecurityGroup) is associated with the endpoint.
	SecurityGroupIds []string `pulumi:"securityGroupIds"`
	// The service name. For AWS services the service name is usually in the form `com.amazonaws.<region>.<service>` (the SageMaker Notebook service is an exception to this rule, the service name is in the form `aws.sagemaker.<region>.notebook`).
	ServiceName string `pulumi:"serviceName"`
	// The ID of one or more subnets in which to create a network interface for the endpoint. Applicable for endpoints of type `GatewayLoadBalancer` and `Interface`.
	SubnetIds []string `pulumi:"subnetIds"`
	// A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
	Tags map[string]string `pulumi:"tags"`
	// The VPC endpoint type, `Gateway`, `GatewayLoadBalancer`, or `Interface`. Defaults to `Gateway`.
	VpcEndpointType *string `pulumi:"vpcEndpointType"`
}

// VpcEndpointSpecInput is an input type that accepts VpcEndpointSpecArgs and VpcEndpointSpecOutput values.
// You can construct a concrete instance of `VpcEndpointSpecInput` via:
//
//	VpcEndpointSpecArgs{...}
type VpcEndpointSpecInput interface {
	pulumi.Input

	ToVpcEndpointSpecOutput() VpcEndpointSpecOutput
	ToVpcEndpointSpecOutputWithContext(context.Context) VpcEndpointSpecOutput
}

// Provides a VPC Endpoint resource.
//
// > **NOTE on VPC Endpoints and VPC Endpoint Associations:** The provider provides both standalone VPC Endpoint Associations for
// Route Tables - (an association between a VPC endpoint and a single `route_table_id`),
// Security Groups - (an association between a VPC endpoint and a single `security_group_id`),
// and Subnets - (an association between a VPC endpoint and a single `subnet_id`) and
// a VPC Endpoint resource with `route_table_ids` and `subnet_ids` attributes.
// Do not use the same resource ID in both a VPC Endpoint resource and a VPC Endpoint Association resource.
// Doing so will cause a conflict of associations and will overwrite the association.
//
// ## Example Usage
// ### Basic
// ```go
// package main
//
// import (
//
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
//	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
//
// )
//
//	func main() {
//		pulumi.Run(func(ctx *pulumi.Context) error {
//			_, err := ec2.NewVpcEndpoint(ctx, "s3", &ec2.VpcEndpointArgs{
//				VpcId:       pulumi.Any(aws_vpc.Main.Id),
//				ServiceName: pulumi.String("com.amazonaws.us-west-2.s3"),
//			})
//			if err != nil {
//				return err
//			}
//			return nil
//		})
//	}
//
// ```
// ### Basic w/ Tags
// ```go
// package main
//
// import (
//
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
//	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
//
// )
//
//	func main() {
//		pulumi.Run(func(ctx *pulumi.Context) error {
//			_, err := ec2.NewVpcEndpoint(ctx, "s3", &ec2.VpcEndpointArgs{
//				VpcId:       pulumi.Any(aws_vpc.Main.Id),
//				ServiceName: pulumi.String("com.amazonaws.us-west-2.s3"),
//				Tags: pulumi.StringMap{
//					"Environment": pulumi.String("test"),
//				},
//			})
//			if err != nil {
//				return err
//			}
//			return nil
//		})
//	}
//
// ```
// ### Interface Endpoint Type
// ```go
// package main
//
// import (
//
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
//	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
//
// )
//
//	func main() {
//		pulumi.Run(func(ctx *pulumi.Context) error {
//			_, err := ec2.NewVpcEndpoint(ctx, "ec2", &ec2.VpcEndpointArgs{
//				VpcId:           pulumi.Any(aws_vpc.Main.Id),
//				ServiceName:     pulumi.String("com.amazonaws.us-west-2.ec2"),
//				VpcEndpointType: pulumi.String("Interface"),
//				SecurityGroupIds: pulumi.StringArray{
//					aws_security_group.Sg1.Id,
//				},
//				PrivateDnsEnabled: pulumi.Bool(true),
//			})
//			if err != nil {
//				return err
//			}
//			return nil
//		})
//	}
//
// ```
// ### Gateway Load Balancer Endpoint Type
// ```go
// package main
//
// import (
//
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws"
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
//	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
//
// )
//
//	func main() {
//		pulumi.Run(func(ctx *pulumi.Context) error {
//			current, err := aws.GetCallerIdentity(ctx, nil, nil)
//			if err != nil {
//				return err
//			}
//			exampleVpcEndpointService, err := ec2.NewVpcEndpointService(ctx, "exampleVpcEndpointService", &ec2.VpcEndpointServiceArgs{
//				AcceptanceRequired: pulumi.Bool(false),
//				AllowedPrincipals: pulumi.StringArray{
//					*pulumi.String(current.Arn),
//				},
//				GatewayLoadBalancerArns: pulumi.StringArray{
//					aws_lb.Example.Arn,
//				},
//			})
//			if err != nil {
//				return err
//			}
//			_, err = ec2.NewVpcEndpoint(ctx, "exampleVpcEndpoint", &ec2.VpcEndpointArgs{
//				ServiceName: exampleVpcEndpointService.ServiceName,
//				SubnetIds: pulumi.StringArray{
//					aws_subnet.Example.Id,
//				},
//				VpcEndpointType: exampleVpcEndpointService.ServiceType,
//				VpcId:           pulumi.Any(aws_vpc.Example.Id),
//			})
//			if err != nil {
//				return err
//			}
//			return nil
//		})
//	}
//
// ```
//
// ## Import
//
// VPC Endpoints can be imported using the `vpc endpoint id`, e.g.,
//
// ```sh
//
//	$ pulumi import aws:ec2/vpcEndpoint:VpcEndpoint endpoint1 vpce-3ecf2a57
//
// ```
type VpcEndpointSpecArgs struct {
	// Accept the VPC endpoint (the VPC endpoint and service need to be in the same AWS account).
	AutoAccept *bool `pulumi:"autoAccept"`
	// The DNS options for the endpoint. See dns_options below.
	DnsOptions ec2.VpcEndpointDnsOptionsPtrInput `pulumi:"dnsOptions"`
	// The IP address type for the endpoint. Valid values are `ipv4`, `dualstack`, and `ipv6`.
	IpAddressType pulumi.StringPtrInput `pulumi:"ipAddressType"`
	// A policy to attach to the endpoint that controls access to the service. This is a JSON formatted string. Defaults to full access. All `Gateway` and some `Interface` endpoints support policies - see the [relevant AWS documentation](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints-access.html) for more details.
	Policy pulumi.StringPtrInput `pulumi:"policy"`
	// Whether or not to associate a private hosted zone with the specified VPC. Applicable for endpoints of type Interface. Defaults to `false`.
	PrivateDnsEnabled *bool `pulumi:"privateDnsEnabled"`
	// One or more route table IDs. Applicable for endpoints of type `Gateway`.
	RouteTableIds pulumi.StringArrayInput `pulumi:"routeTableIds"`
	// The ID of one or more security groups to associate with the network interface. Applicable for endpoints of type `Interface`.
	// If no security groups are specified, the VPC's [default security group](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html#DefaultSecurityGroup) is associated with the endpoint.
	SecurityGroupIds pulumi.StringArrayInput `pulumi:"securityGroupIds"`
	// The service name. For AWS services the service name is usually in the form `com.amazonaws.<region>.<service>` (the SageMaker Notebook service is an exception to this rule, the service name is in the form `aws.sagemaker.<region>.notebook`).
	ServiceName string `pulumi:"serviceName"`
	// The ID of one or more subnets in which to create a network interface for the endpoint. Applicable for endpoints of type `GatewayLoadBalancer` and `Interface`.
	SubnetIds pulumi.StringArrayInput `pulumi:"subnetIds"`
	// A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
	Tags pulumi.StringMapInput `pulumi:"tags"`
	// The VPC endpoint type, `Gateway`, `GatewayLoadBalancer`, or `Interface`. Defaults to `Gateway`.
	VpcEndpointType pulumi.StringPtrInput `pulumi:"vpcEndpointType"`
}

func (VpcEndpointSpecArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*VpcEndpointSpec)(nil)).Elem()
}

func (i VpcEndpointSpecArgs) ToVpcEndpointSpecOutput() VpcEndpointSpecOutput {
	return i.ToVpcEndpointSpecOutputWithContext(context.Background())
}

func (i VpcEndpointSpecArgs) ToVpcEndpointSpecOutputWithContext(ctx context.Context) VpcEndpointSpecOutput {
	return pulumi.ToOutputWithContext(ctx, i).(VpcEndpointSpecOutput)
}

// VpcEndpointSpecArrayInput is an input type that accepts VpcEndpointSpecArray and VpcEndpointSpecArrayOutput values.
// You can construct a concrete instance of `VpcEndpointSpecArrayInput` via:
//
//	VpcEndpointSpecArray{ VpcEndpointSpecArgs{...} }
type VpcEndpointSpecArrayInput interface {
	pulumi.Input

	ToVpcEndpointSpecArrayOutput() VpcEndpointSpecArrayOutput
	ToVpcEndpointSpecArrayOutputWithContext(context.Context) VpcEndpointSpecArrayOutput
}

type VpcEndpointSpecArray []VpcEndpointSpecInput

func (VpcEndpointSpecArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]VpcEndpointSpec)(nil)).Elem()
}

func (i VpcEndpointSpecArray) ToVpcEndpointSpecArrayOutput() VpcEndpointSpecArrayOutput {
	return i.ToVpcEndpointSpecArrayOutputWithContext(context.Background())
}

func (i VpcEndpointSpecArray) ToVpcEndpointSpecArrayOutputWithContext(ctx context.Context) VpcEndpointSpecArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(VpcEndpointSpecArrayOutput)
}

// Provides a VPC Endpoint resource.
//
// > **NOTE on VPC Endpoints and VPC Endpoint Associations:** The provider provides both standalone VPC Endpoint Associations for
// Route Tables - (an association between a VPC endpoint and a single `route_table_id`),
// Security Groups - (an association between a VPC endpoint and a single `security_group_id`),
// and Subnets - (an association between a VPC endpoint and a single `subnet_id`) and
// a VPC Endpoint resource with `route_table_ids` and `subnet_ids` attributes.
// Do not use the same resource ID in both a VPC Endpoint resource and a VPC Endpoint Association resource.
// Doing so will cause a conflict of associations and will overwrite the association.
//
// ## Example Usage
// ### Basic
// ```go
// package main
//
// import (
//
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
//	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
//
// )
//
//	func main() {
//		pulumi.Run(func(ctx *pulumi.Context) error {
//			_, err := ec2.NewVpcEndpoint(ctx, "s3", &ec2.VpcEndpointArgs{
//				VpcId:       pulumi.Any(aws_vpc.Main.Id),
//				ServiceName: pulumi.String("com.amazonaws.us-west-2.s3"),
//			})
//			if err != nil {
//				return err
//			}
//			return nil
//		})
//	}
//
// ```
// ### Basic w/ Tags
// ```go
// package main
//
// import (
//
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
//	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
//
// )
//
//	func main() {
//		pulumi.Run(func(ctx *pulumi.Context) error {
//			_, err := ec2.NewVpcEndpoint(ctx, "s3", &ec2.VpcEndpointArgs{
//				VpcId:       pulumi.Any(aws_vpc.Main.Id),
//				ServiceName: pulumi.String("com.amazonaws.us-west-2.s3"),
//				Tags: pulumi.StringMap{
//					"Environment": pulumi.String("test"),
//				},
//			})
//			if err != nil {
//				return err
//			}
//			return nil
//		})
//	}
//
// ```
// ### Interface Endpoint Type
// ```go
// package main
//
// import (
//
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
//	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
//
// )
//
//	func main() {
//		pulumi.Run(func(ctx *pulumi.Context) error {
//			_, err := ec2.NewVpcEndpoint(ctx, "ec2", &ec2.VpcEndpointArgs{
//				VpcId:           pulumi.Any(aws_vpc.Main.Id),
//				ServiceName:     pulumi.String("com.amazonaws.us-west-2.ec2"),
//				VpcEndpointType: pulumi.String("Interface"),
//				SecurityGroupIds: pulumi.StringArray{
//					aws_security_group.Sg1.Id,
//				},
//				PrivateDnsEnabled: pulumi.Bool(true),
//			})
//			if err != nil {
//				return err
//			}
//			return nil
//		})
//	}
//
// ```
// ### Gateway Load Balancer Endpoint Type
// ```go
// package main
//
// import (
//
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws"
//	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
//	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
//
// )
//
//	func main() {
//		pulumi.Run(func(ctx *pulumi.Context) error {
//			current, err := aws.GetCallerIdentity(ctx, nil, nil)
//			if err != nil {
//				return err
//			}
//			exampleVpcEndpointService, err := ec2.NewVpcEndpointService(ctx, "exampleVpcEndpointService", &ec2.VpcEndpointServiceArgs{
//				AcceptanceRequired: pulumi.Bool(false),
//				AllowedPrincipals: pulumi.StringArray{
//					*pulumi.String(current.Arn),
//				},
//				GatewayLoadBalancerArns: pulumi.StringArray{
//					aws_lb.Example.Arn,
//				},
//			})
//			if err != nil {
//				return err
//			}
//			_, err = ec2.NewVpcEndpoint(ctx, "exampleVpcEndpoint", &ec2.VpcEndpointArgs{
//				ServiceName: exampleVpcEndpointService.ServiceName,
//				SubnetIds: pulumi.StringArray{
//					aws_subnet.Example.Id,
//				},
//				VpcEndpointType: exampleVpcEndpointService.ServiceType,
//				VpcId:           pulumi.Any(aws_vpc.Example.Id),
//			})
//			if err != nil {
//				return err
//			}
//			return nil
//		})
//	}
//
// ```
//
// ## Import
//
// VPC Endpoints can be imported using the `vpc endpoint id`, e.g.,
//
// ```sh
//
//	$ pulumi import aws:ec2/vpcEndpoint:VpcEndpoint endpoint1 vpce-3ecf2a57
//
// ```
type VpcEndpointSpecOutput struct{ *pulumi.OutputState }

func (VpcEndpointSpecOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*VpcEndpointSpec)(nil)).Elem()
}

func (o VpcEndpointSpecOutput) ToVpcEndpointSpecOutput() VpcEndpointSpecOutput {
	return o
}

func (o VpcEndpointSpecOutput) ToVpcEndpointSpecOutputWithContext(ctx context.Context) VpcEndpointSpecOutput {
	return o
}

// Accept the VPC endpoint (the VPC endpoint and service need to be in the same AWS account).
func (o VpcEndpointSpecOutput) AutoAccept() pulumi.BoolPtrOutput {
	return o.ApplyT(func(v VpcEndpointSpec) *bool { return v.AutoAccept }).(pulumi.BoolPtrOutput)
}

// The DNS options for the endpoint. See dns_options below.
func (o VpcEndpointSpecOutput) DnsOptions() ec2.VpcEndpointDnsOptionsPtrOutput {
	return o.ApplyT(func(v VpcEndpointSpec) *ec2.VpcEndpointDnsOptions { return v.DnsOptions }).(ec2.VpcEndpointDnsOptionsPtrOutput)
}

// The IP address type for the endpoint. Valid values are `ipv4`, `dualstack`, and `ipv6`.
func (o VpcEndpointSpecOutput) IpAddressType() pulumi.StringPtrOutput {
	return o.ApplyT(func(v VpcEndpointSpec) *string { return v.IpAddressType }).(pulumi.StringPtrOutput)
}

// A policy to attach to the endpoint that controls access to the service. This is a JSON formatted string. Defaults to full access. All `Gateway` and some `Interface` endpoints support policies - see the [relevant AWS documentation](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints-access.html) for more details.
func (o VpcEndpointSpecOutput) Policy() pulumi.StringPtrOutput {
	return o.ApplyT(func(v VpcEndpointSpec) *string { return v.Policy }).(pulumi.StringPtrOutput)
}

// Whether or not to associate a private hosted zone with the specified VPC. Applicable for endpoints of type Interface. Defaults to `false`.
func (o VpcEndpointSpecOutput) PrivateDnsEnabled() pulumi.BoolPtrOutput {
	return o.ApplyT(func(v VpcEndpointSpec) *bool { return v.PrivateDnsEnabled }).(pulumi.BoolPtrOutput)
}

// One or more route table IDs. Applicable for endpoints of type `Gateway`.
func (o VpcEndpointSpecOutput) RouteTableIds() pulumi.StringArrayOutput {
	return o.ApplyT(func(v VpcEndpointSpec) []string { return v.RouteTableIds }).(pulumi.StringArrayOutput)
}

// The ID of one or more security groups to associate with the network interface. Applicable for endpoints of type `Interface`.
// If no security groups are specified, the VPC's [default security group](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html#DefaultSecurityGroup) is associated with the endpoint.
func (o VpcEndpointSpecOutput) SecurityGroupIds() pulumi.StringArrayOutput {
	return o.ApplyT(func(v VpcEndpointSpec) []string { return v.SecurityGroupIds }).(pulumi.StringArrayOutput)
}

// The service name. For AWS services the service name is usually in the form `com.amazonaws.<region>.<service>` (the SageMaker Notebook service is an exception to this rule, the service name is in the form `aws.sagemaker.<region>.notebook`).
func (o VpcEndpointSpecOutput) ServiceName() pulumi.StringOutput {
	return o.ApplyT(func(v VpcEndpointSpec) string { return v.ServiceName }).(pulumi.StringOutput)
}

// The ID of one or more subnets in which to create a network interface for the endpoint. Applicable for endpoints of type `GatewayLoadBalancer` and `Interface`.
func (o VpcEndpointSpecOutput) SubnetIds() pulumi.StringArrayOutput {
	return o.ApplyT(func(v VpcEndpointSpec) []string { return v.SubnetIds }).(pulumi.StringArrayOutput)
}

// A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
func (o VpcEndpointSpecOutput) Tags() pulumi.StringMapOutput {
	return o.ApplyT(func(v VpcEndpointSpec) map[string]string { return v.Tags }).(pulumi.StringMapOutput)
}

// The VPC endpoint type, `Gateway`, `GatewayLoadBalancer`, or `Interface`. Defaults to `Gateway`.
func (o VpcEndpointSpecOutput) VpcEndpointType() pulumi.StringPtrOutput {
	return o.ApplyT(func(v VpcEndpointSpec) *string { return v.VpcEndpointType }).(pulumi.StringPtrOutput)
}

type VpcEndpointSpecArrayOutput struct{ *pulumi.OutputState }

func (VpcEndpointSpecArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]VpcEndpointSpec)(nil)).Elem()
}

func (o VpcEndpointSpecArrayOutput) ToVpcEndpointSpecArrayOutput() VpcEndpointSpecArrayOutput {
	return o
}

func (o VpcEndpointSpecArrayOutput) ToVpcEndpointSpecArrayOutputWithContext(ctx context.Context) VpcEndpointSpecArrayOutput {
	return o
}

func (o VpcEndpointSpecArrayOutput) Index(i pulumi.IntInput) VpcEndpointSpecOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) VpcEndpointSpec {
		return vs[0].([]VpcEndpointSpec)[vs[1].(int)]
	}).(VpcEndpointSpecOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*NatGatewayConfigurationInput)(nil)).Elem(), NatGatewayConfigurationArgs{})
	pulumi.RegisterInputType(reflect.TypeOf((*NatGatewayConfigurationPtrInput)(nil)).Elem(), NatGatewayConfigurationArgs{})
	pulumi.RegisterInputType(reflect.TypeOf((*SubnetSpecInput)(nil)).Elem(), SubnetSpecArgs{})
	pulumi.RegisterInputType(reflect.TypeOf((*SubnetSpecArrayInput)(nil)).Elem(), SubnetSpecArray{})
	pulumi.RegisterInputType(reflect.TypeOf((*VpcEndpointSpecInput)(nil)).Elem(), VpcEndpointSpecArgs{})
	pulumi.RegisterInputType(reflect.TypeOf((*VpcEndpointSpecArrayInput)(nil)).Elem(), VpcEndpointSpecArray{})
	pulumi.RegisterOutputType(NatGatewayConfigurationOutput{})
	pulumi.RegisterOutputType(NatGatewayConfigurationPtrOutput{})
	pulumi.RegisterOutputType(SubnetSpecOutput{})
	pulumi.RegisterOutputType(SubnetSpecArrayOutput{})
	pulumi.RegisterOutputType(VpcEndpointSpecOutput{})
	pulumi.RegisterOutputType(VpcEndpointSpecArrayOutput{})
}
