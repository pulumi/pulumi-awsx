// Code generated by pulumi-gen-awsx DO NOT EDIT.
// *** WARNING: Do not edit by hand unless you're certain you know what you are doing! ***

package lb

import (
	"context"
	"reflect"

	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/ec2"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/lb"
	"github.com/pulumi/pulumi-awsx/sdk/v3/go/awsx/internal"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// Provides a Network Load Balancer resource with listeners and default target group.
type NetworkLoadBalancer struct {
	pulumi.ResourceState

	// Default target group, if auto-created
	DefaultTargetGroup lb.TargetGroupOutput `pulumi:"defaultTargetGroup"`
	// Listeners created as part of this load balancer
	Listeners lb.ListenerArrayOutput `pulumi:"listeners"`
	// Underlying Load Balancer resource
	LoadBalancer lb.LoadBalancerOutput `pulumi:"loadBalancer"`
	// Id of the VPC in which this load balancer is operating
	VpcId pulumi.StringPtrOutput `pulumi:"vpcId"`
}

// NewNetworkLoadBalancer registers a new resource with the given unique name, arguments, and options.
func NewNetworkLoadBalancer(ctx *pulumi.Context,
	name string, args *NetworkLoadBalancerArgs, opts ...pulumi.ResourceOption) (*NetworkLoadBalancer, error) {
	if args == nil {
		args = &NetworkLoadBalancerArgs{}
	}

	opts = internal.PkgResourceDefaultOpts(opts)
	var resource NetworkLoadBalancer
	err := ctx.RegisterRemoteComponentResource("awsx:lb:NetworkLoadBalancer", name, args, &resource, opts...)
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

type networkLoadBalancerArgs struct {
	// Access Logs block. See below.
	AccessLogs *lb.LoadBalancerAccessLogs `pulumi:"accessLogs"`
	// Client keep alive value in seconds. The valid range is 60-604800 seconds. The default is 3600 seconds.
	ClientKeepAlive *int `pulumi:"clientKeepAlive"`
	// Connection Logs block. See below. Only valid for Load Balancers of type `application`.
	ConnectionLogs *lb.LoadBalancerConnectionLogs `pulumi:"connectionLogs"`
	// ID of the customer owned ipv4 pool to use for this load balancer.
	CustomerOwnedIpv4Pool *string `pulumi:"customerOwnedIpv4Pool"`
	// Options creating a default target group.
	DefaultTargetGroup *TargetGroup `pulumi:"defaultTargetGroup"`
	// Port to use to connect with the target. Valid values are ports 1-65535. Defaults to 80.
	DefaultTargetGroupPort *int `pulumi:"defaultTargetGroupPort"`
	// How the load balancer handles requests that might pose a security risk to an application due to HTTP desync. Valid values are `monitor`, `defensive` (default), `strictest`.
	DesyncMitigationMode *string `pulumi:"desyncMitigationMode"`
	// How traffic is distributed among the load balancer Availability Zones. Possible values are `any_availability_zone` (default), `availability_zone_affinity`, or `partial_availability_zone_affinity`. See   [Availability Zone DNS affinity](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html#zonal-dns-affinity) for additional details. Only valid for `network` type load balancers.
	DnsRecordClientRoutingPolicy *string `pulumi:"dnsRecordClientRoutingPolicy"`
	// Whether HTTP headers with header fields that are not valid are removed by the load balancer (true) or routed to targets (false). The default is false. Elastic Load Balancing requires that message header names contain only alphanumeric characters and hyphens. Only valid for Load Balancers of type `application`.
	DropInvalidHeaderFields *bool `pulumi:"dropInvalidHeaderFields"`
	// If true, cross-zone load balancing of the load balancer will be enabled. For `network` and `gateway` type load balancers, this feature is disabled by default (`false`). For `application` load balancer this feature is always enabled (`true`) and cannot be disabled. Defaults to `false`.
	EnableCrossZoneLoadBalancing *bool `pulumi:"enableCrossZoneLoadBalancing"`
	// If true, deletion of the load balancer will be disabled via the AWS API. This will prevent this provider from deleting the load balancer. Defaults to `false`.
	EnableDeletionProtection *bool `pulumi:"enableDeletionProtection"`
	// Whether the two headers (`x-amzn-tls-version` and `x-amzn-tls-cipher-suite`), which contain information about the negotiated TLS version and cipher suite, are added to the client request before sending it to the target. Only valid for Load Balancers of type `application`. Defaults to `false`
	EnableTlsVersionAndCipherSuiteHeaders *bool `pulumi:"enableTlsVersionAndCipherSuiteHeaders"`
	// Whether to allow a WAF-enabled load balancer to route requests to targets if it is unable to forward the request to AWS WAF. Defaults to `false`.
	EnableWafFailOpen *bool `pulumi:"enableWafFailOpen"`
	// Whether the X-Forwarded-For header should preserve the source port that the client used to connect to the load balancer in `application` load balancers. Defaults to `false`.
	EnableXffClientPort *bool `pulumi:"enableXffClientPort"`
	// Whether zonal shift is enabled. Defaults to `false`.
	EnableZonalShift *bool `pulumi:"enableZonalShift"`
	// Whether inbound security group rules are enforced for traffic originating from a PrivateLink. Only valid for Load Balancers of type `network`. The possible values are `on` and `off`.
	EnforceSecurityGroupInboundRulesOnPrivateLinkTraffic *string `pulumi:"enforceSecurityGroupInboundRulesOnPrivateLinkTraffic"`
	// Time in seconds that the connection is allowed to be idle. Only valid for Load Balancers of type `application`. Default: 60.
	IdleTimeout *int `pulumi:"idleTimeout"`
	// If true, the LB will be internal. Defaults to `false`.
	Internal *bool `pulumi:"internal"`
	// Type of IP addresses used by the subnets for your load balancer. The possible values depend upon the load balancer type: `ipv4` (all load balancer types), `dualstack` (all load balancer types), and `dualstack-without-public-ipv4` (type `application` only).
	IpAddressType *string `pulumi:"ipAddressType"`
	// . The IPAM pools to use with the load balancer.  Only valid for Load Balancers of type `application`. See ipam_pools for more information.
	IpamPools *lb.LoadBalancerIpamPools `pulumi:"ipamPools"`
	// A listener to create. Only one of [listener] and [listeners] can be specified.
	Listener *Listener `pulumi:"listener"`
	// List of listeners to create. Only one of [listener] and [listeners] can be specified.
	Listeners []Listener `pulumi:"listeners"`
	// Minimum capacity for a load balancer. Only valid for Load Balancers of type `application` or `network`.
	MinimumLoadBalancerCapacity *lb.LoadBalancerMinimumLoadBalancerCapacity `pulumi:"minimumLoadBalancerCapacity"`
	// Name of the LB. This name must be unique within your AWS account, can have a maximum of 32 characters, must contain only alphanumeric characters or hyphens, and must not begin or end with a hyphen. If not specified, this provider will autogenerate a name beginning with `tf-lb`.
	Name *string `pulumi:"name"`
	// Creates a unique name beginning with the specified prefix. Conflicts with `name`.
	NamePrefix *string `pulumi:"namePrefix"`
	// Whether the Application Load Balancer should preserve the Host header in the HTTP request and send it to the target without any change. Defaults to `false`.
	PreserveHostHeader *bool `pulumi:"preserveHostHeader"`
	// Region where this resource will be [managed](https://docs.aws.amazon.com/general/latest/gr/rande.html#regional-endpoints). Defaults to the Region set in the provider configuration.
	Region *string `pulumi:"region"`
	// List of security group IDs to assign to the LB. Only valid for Load Balancers of type `application` or `network`. For load balancers of type `network` security groups cannot be added if none are currently present, and cannot all be removed once added. If either of these conditions are met, this will force a recreation of the resource.
	SecurityGroups []string `pulumi:"securityGroups"`
	// List of subnet IDs to attach to the LB. For Load Balancers of type `network` subnets can only be added (see [Availability Zones](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html#availability-zones)), deleting a subnet for load balancers of type `network` will force a recreation of the resource.
	SubnetIds []string `pulumi:"subnetIds"`
	// Subnet mapping block. See below. For Load Balancers of type `network` subnet mappings can only be added.
	SubnetMappings []lb.LoadBalancerSubnetMapping `pulumi:"subnetMappings"`
	// A list of subnets to attach to the LB. Only one of [subnets], [subnetIds] or [subnetMappings] can be specified
	Subnets []*ec2.Subnet `pulumi:"subnets"`
	// Map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
	Tags map[string]string `pulumi:"tags"`
	// Determines how the load balancer modifies the `X-Forwarded-For` header in the HTTP request before sending the request to the target. The possible values are `append`, `preserve`, and `remove`. Only valid for Load Balancers of type `application`. The default is `append`.
	//
	// > **NOTE:** Please note that internal LBs can only use `ipv4` as the `ip_address_type`. You can only change to `dualstack` `ip_address_type` if the selected subnets are IPv6 enabled.
	//
	// > **NOTE:** Please note that one of either `subnets` or `subnet_mapping` is required.
	XffHeaderProcessingMode *string `pulumi:"xffHeaderProcessingMode"`
}

// The set of arguments for constructing a NetworkLoadBalancer resource.
type NetworkLoadBalancerArgs struct {
	// Access Logs block. See below.
	AccessLogs lb.LoadBalancerAccessLogsPtrInput
	// Client keep alive value in seconds. The valid range is 60-604800 seconds. The default is 3600 seconds.
	ClientKeepAlive pulumi.IntPtrInput
	// Connection Logs block. See below. Only valid for Load Balancers of type `application`.
	ConnectionLogs lb.LoadBalancerConnectionLogsPtrInput
	// ID of the customer owned ipv4 pool to use for this load balancer.
	CustomerOwnedIpv4Pool pulumi.StringPtrInput
	// Options creating a default target group.
	DefaultTargetGroup *TargetGroupArgs
	// Port to use to connect with the target. Valid values are ports 1-65535. Defaults to 80.
	DefaultTargetGroupPort pulumi.IntPtrInput
	// How the load balancer handles requests that might pose a security risk to an application due to HTTP desync. Valid values are `monitor`, `defensive` (default), `strictest`.
	DesyncMitigationMode pulumi.StringPtrInput
	// How traffic is distributed among the load balancer Availability Zones. Possible values are `any_availability_zone` (default), `availability_zone_affinity`, or `partial_availability_zone_affinity`. See   [Availability Zone DNS affinity](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html#zonal-dns-affinity) for additional details. Only valid for `network` type load balancers.
	DnsRecordClientRoutingPolicy pulumi.StringPtrInput
	// Whether HTTP headers with header fields that are not valid are removed by the load balancer (true) or routed to targets (false). The default is false. Elastic Load Balancing requires that message header names contain only alphanumeric characters and hyphens. Only valid for Load Balancers of type `application`.
	DropInvalidHeaderFields pulumi.BoolPtrInput
	// If true, cross-zone load balancing of the load balancer will be enabled. For `network` and `gateway` type load balancers, this feature is disabled by default (`false`). For `application` load balancer this feature is always enabled (`true`) and cannot be disabled. Defaults to `false`.
	EnableCrossZoneLoadBalancing pulumi.BoolPtrInput
	// If true, deletion of the load balancer will be disabled via the AWS API. This will prevent this provider from deleting the load balancer. Defaults to `false`.
	EnableDeletionProtection pulumi.BoolPtrInput
	// Whether the two headers (`x-amzn-tls-version` and `x-amzn-tls-cipher-suite`), which contain information about the negotiated TLS version and cipher suite, are added to the client request before sending it to the target. Only valid for Load Balancers of type `application`. Defaults to `false`
	EnableTlsVersionAndCipherSuiteHeaders pulumi.BoolPtrInput
	// Whether to allow a WAF-enabled load balancer to route requests to targets if it is unable to forward the request to AWS WAF. Defaults to `false`.
	EnableWafFailOpen pulumi.BoolPtrInput
	// Whether the X-Forwarded-For header should preserve the source port that the client used to connect to the load balancer in `application` load balancers. Defaults to `false`.
	EnableXffClientPort pulumi.BoolPtrInput
	// Whether zonal shift is enabled. Defaults to `false`.
	EnableZonalShift pulumi.BoolPtrInput
	// Whether inbound security group rules are enforced for traffic originating from a PrivateLink. Only valid for Load Balancers of type `network`. The possible values are `on` and `off`.
	EnforceSecurityGroupInboundRulesOnPrivateLinkTraffic pulumi.StringPtrInput
	// Time in seconds that the connection is allowed to be idle. Only valid for Load Balancers of type `application`. Default: 60.
	IdleTimeout pulumi.IntPtrInput
	// If true, the LB will be internal. Defaults to `false`.
	Internal pulumi.BoolPtrInput
	// Type of IP addresses used by the subnets for your load balancer. The possible values depend upon the load balancer type: `ipv4` (all load balancer types), `dualstack` (all load balancer types), and `dualstack-without-public-ipv4` (type `application` only).
	IpAddressType pulumi.StringPtrInput
	// . The IPAM pools to use with the load balancer.  Only valid for Load Balancers of type `application`. See ipam_pools for more information.
	IpamPools lb.LoadBalancerIpamPoolsPtrInput
	// A listener to create. Only one of [listener] and [listeners] can be specified.
	Listener *ListenerArgs
	// List of listeners to create. Only one of [listener] and [listeners] can be specified.
	Listeners []ListenerArgs
	// Minimum capacity for a load balancer. Only valid for Load Balancers of type `application` or `network`.
	MinimumLoadBalancerCapacity lb.LoadBalancerMinimumLoadBalancerCapacityPtrInput
	// Name of the LB. This name must be unique within your AWS account, can have a maximum of 32 characters, must contain only alphanumeric characters or hyphens, and must not begin or end with a hyphen. If not specified, this provider will autogenerate a name beginning with `tf-lb`.
	Name pulumi.StringPtrInput
	// Creates a unique name beginning with the specified prefix. Conflicts with `name`.
	NamePrefix pulumi.StringPtrInput
	// Whether the Application Load Balancer should preserve the Host header in the HTTP request and send it to the target without any change. Defaults to `false`.
	PreserveHostHeader pulumi.BoolPtrInput
	// Region where this resource will be [managed](https://docs.aws.amazon.com/general/latest/gr/rande.html#regional-endpoints). Defaults to the Region set in the provider configuration.
	Region pulumi.StringPtrInput
	// List of security group IDs to assign to the LB. Only valid for Load Balancers of type `application` or `network`. For load balancers of type `network` security groups cannot be added if none are currently present, and cannot all be removed once added. If either of these conditions are met, this will force a recreation of the resource.
	SecurityGroups pulumi.StringArrayInput
	// List of subnet IDs to attach to the LB. For Load Balancers of type `network` subnets can only be added (see [Availability Zones](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html#availability-zones)), deleting a subnet for load balancers of type `network` will force a recreation of the resource.
	SubnetIds pulumi.StringArrayInput
	// Subnet mapping block. See below. For Load Balancers of type `network` subnet mappings can only be added.
	SubnetMappings lb.LoadBalancerSubnetMappingArrayInput
	// A list of subnets to attach to the LB. Only one of [subnets], [subnetIds] or [subnetMappings] can be specified
	Subnets ec2.SubnetArrayInput
	// Map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
	Tags pulumi.StringMapInput
	// Determines how the load balancer modifies the `X-Forwarded-For` header in the HTTP request before sending the request to the target. The possible values are `append`, `preserve`, and `remove`. Only valid for Load Balancers of type `application`. The default is `append`.
	//
	// > **NOTE:** Please note that internal LBs can only use `ipv4` as the `ip_address_type`. You can only change to `dualstack` `ip_address_type` if the selected subnets are IPv6 enabled.
	//
	// > **NOTE:** Please note that one of either `subnets` or `subnet_mapping` is required.
	XffHeaderProcessingMode pulumi.StringPtrInput
}

func (NetworkLoadBalancerArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*networkLoadBalancerArgs)(nil)).Elem()
}

type NetworkLoadBalancerInput interface {
	pulumi.Input

	ToNetworkLoadBalancerOutput() NetworkLoadBalancerOutput
	ToNetworkLoadBalancerOutputWithContext(ctx context.Context) NetworkLoadBalancerOutput
}

func (*NetworkLoadBalancer) ElementType() reflect.Type {
	return reflect.TypeOf((**NetworkLoadBalancer)(nil)).Elem()
}

func (i *NetworkLoadBalancer) ToNetworkLoadBalancerOutput() NetworkLoadBalancerOutput {
	return i.ToNetworkLoadBalancerOutputWithContext(context.Background())
}

func (i *NetworkLoadBalancer) ToNetworkLoadBalancerOutputWithContext(ctx context.Context) NetworkLoadBalancerOutput {
	return pulumi.ToOutputWithContext(ctx, i).(NetworkLoadBalancerOutput)
}

// NetworkLoadBalancerArrayInput is an input type that accepts NetworkLoadBalancerArray and NetworkLoadBalancerArrayOutput values.
// You can construct a concrete instance of `NetworkLoadBalancerArrayInput` via:
//
//	NetworkLoadBalancerArray{ NetworkLoadBalancerArgs{...} }
type NetworkLoadBalancerArrayInput interface {
	pulumi.Input

	ToNetworkLoadBalancerArrayOutput() NetworkLoadBalancerArrayOutput
	ToNetworkLoadBalancerArrayOutputWithContext(context.Context) NetworkLoadBalancerArrayOutput
}

type NetworkLoadBalancerArray []NetworkLoadBalancerInput

func (NetworkLoadBalancerArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*NetworkLoadBalancer)(nil)).Elem()
}

func (i NetworkLoadBalancerArray) ToNetworkLoadBalancerArrayOutput() NetworkLoadBalancerArrayOutput {
	return i.ToNetworkLoadBalancerArrayOutputWithContext(context.Background())
}

func (i NetworkLoadBalancerArray) ToNetworkLoadBalancerArrayOutputWithContext(ctx context.Context) NetworkLoadBalancerArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(NetworkLoadBalancerArrayOutput)
}

// NetworkLoadBalancerMapInput is an input type that accepts NetworkLoadBalancerMap and NetworkLoadBalancerMapOutput values.
// You can construct a concrete instance of `NetworkLoadBalancerMapInput` via:
//
//	NetworkLoadBalancerMap{ "key": NetworkLoadBalancerArgs{...} }
type NetworkLoadBalancerMapInput interface {
	pulumi.Input

	ToNetworkLoadBalancerMapOutput() NetworkLoadBalancerMapOutput
	ToNetworkLoadBalancerMapOutputWithContext(context.Context) NetworkLoadBalancerMapOutput
}

type NetworkLoadBalancerMap map[string]NetworkLoadBalancerInput

func (NetworkLoadBalancerMap) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*NetworkLoadBalancer)(nil)).Elem()
}

func (i NetworkLoadBalancerMap) ToNetworkLoadBalancerMapOutput() NetworkLoadBalancerMapOutput {
	return i.ToNetworkLoadBalancerMapOutputWithContext(context.Background())
}

func (i NetworkLoadBalancerMap) ToNetworkLoadBalancerMapOutputWithContext(ctx context.Context) NetworkLoadBalancerMapOutput {
	return pulumi.ToOutputWithContext(ctx, i).(NetworkLoadBalancerMapOutput)
}

type NetworkLoadBalancerOutput struct{ *pulumi.OutputState }

func (NetworkLoadBalancerOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**NetworkLoadBalancer)(nil)).Elem()
}

func (o NetworkLoadBalancerOutput) ToNetworkLoadBalancerOutput() NetworkLoadBalancerOutput {
	return o
}

func (o NetworkLoadBalancerOutput) ToNetworkLoadBalancerOutputWithContext(ctx context.Context) NetworkLoadBalancerOutput {
	return o
}

// Default target group, if auto-created
func (o NetworkLoadBalancerOutput) DefaultTargetGroup() lb.TargetGroupOutput {
	return o.ApplyT(func(v *NetworkLoadBalancer) lb.TargetGroupOutput { return v.DefaultTargetGroup }).(lb.TargetGroupOutput)
}

// Listeners created as part of this load balancer
func (o NetworkLoadBalancerOutput) Listeners() lb.ListenerArrayOutput {
	return o.ApplyT(func(v *NetworkLoadBalancer) lb.ListenerArrayOutput { return v.Listeners }).(lb.ListenerArrayOutput)
}

// Underlying Load Balancer resource
func (o NetworkLoadBalancerOutput) LoadBalancer() lb.LoadBalancerOutput {
	return o.ApplyT(func(v *NetworkLoadBalancer) lb.LoadBalancerOutput { return v.LoadBalancer }).(lb.LoadBalancerOutput)
}

// Id of the VPC in which this load balancer is operating
func (o NetworkLoadBalancerOutput) VpcId() pulumi.StringPtrOutput {
	return o.ApplyT(func(v *NetworkLoadBalancer) pulumi.StringPtrOutput { return v.VpcId }).(pulumi.StringPtrOutput)
}

type NetworkLoadBalancerArrayOutput struct{ *pulumi.OutputState }

func (NetworkLoadBalancerArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*NetworkLoadBalancer)(nil)).Elem()
}

func (o NetworkLoadBalancerArrayOutput) ToNetworkLoadBalancerArrayOutput() NetworkLoadBalancerArrayOutput {
	return o
}

func (o NetworkLoadBalancerArrayOutput) ToNetworkLoadBalancerArrayOutputWithContext(ctx context.Context) NetworkLoadBalancerArrayOutput {
	return o
}

func (o NetworkLoadBalancerArrayOutput) Index(i pulumi.IntInput) NetworkLoadBalancerOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) *NetworkLoadBalancer {
		return vs[0].([]*NetworkLoadBalancer)[vs[1].(int)]
	}).(NetworkLoadBalancerOutput)
}

type NetworkLoadBalancerMapOutput struct{ *pulumi.OutputState }

func (NetworkLoadBalancerMapOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*NetworkLoadBalancer)(nil)).Elem()
}

func (o NetworkLoadBalancerMapOutput) ToNetworkLoadBalancerMapOutput() NetworkLoadBalancerMapOutput {
	return o
}

func (o NetworkLoadBalancerMapOutput) ToNetworkLoadBalancerMapOutputWithContext(ctx context.Context) NetworkLoadBalancerMapOutput {
	return o
}

func (o NetworkLoadBalancerMapOutput) MapIndex(k pulumi.StringInput) NetworkLoadBalancerOutput {
	return pulumi.All(o, k).ApplyT(func(vs []interface{}) *NetworkLoadBalancer {
		return vs[0].(map[string]*NetworkLoadBalancer)[vs[1].(string)]
	}).(NetworkLoadBalancerOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*NetworkLoadBalancerInput)(nil)).Elem(), &NetworkLoadBalancer{})
	pulumi.RegisterInputType(reflect.TypeOf((*NetworkLoadBalancerArrayInput)(nil)).Elem(), NetworkLoadBalancerArray{})
	pulumi.RegisterInputType(reflect.TypeOf((*NetworkLoadBalancerMapInput)(nil)).Elem(), NetworkLoadBalancerMap{})
	pulumi.RegisterOutputType(NetworkLoadBalancerOutput{})
	pulumi.RegisterOutputType(NetworkLoadBalancerArrayOutput{})
	pulumi.RegisterOutputType(NetworkLoadBalancerMapOutput{})
}
