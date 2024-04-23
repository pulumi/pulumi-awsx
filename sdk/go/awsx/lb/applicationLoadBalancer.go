// Code generated by pulumi-gen-awsx DO NOT EDIT.
// *** WARNING: Do not edit by hand unless you're certain you know what you are doing! ***

package lb

import (
	"context"
	"reflect"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/lb"
	"github.com/pulumi/pulumi-awsx/sdk/v2/go/awsx/awsx"
	"github.com/pulumi/pulumi-awsx/sdk/v2/go/awsx/internal"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// Provides an Application Load Balancer resource with listeners, default target group and default security group.
type ApplicationLoadBalancer struct {
	pulumi.ResourceState

	// Default security group, if auto-created
	DefaultSecurityGroup ec2.SecurityGroupOutput `pulumi:"defaultSecurityGroup"`
	// Default target group, if auto-created
	DefaultTargetGroup lb.TargetGroupOutput `pulumi:"defaultTargetGroup"`
	// Listeners created as part of this load balancer
	Listeners lb.ListenerArrayOutput `pulumi:"listeners"`
	// Underlying Load Balancer resource
	LoadBalancer lb.LoadBalancerOutput `pulumi:"loadBalancer"`
	// Id of the VPC in which this load balancer is operating
	VpcId pulumi.StringPtrOutput `pulumi:"vpcId"`
}

// NewApplicationLoadBalancer registers a new resource with the given unique name, arguments, and options.
func NewApplicationLoadBalancer(ctx *pulumi.Context,
	name string, args *ApplicationLoadBalancerArgs, opts ...pulumi.ResourceOption) (*ApplicationLoadBalancer, error) {
	if args == nil {
		args = &ApplicationLoadBalancerArgs{}
	}

	if args.DefaultSecurityGroup != nil {
		args.DefaultSecurityGroup = args.DefaultSecurityGroup.Defaults()
	}
	opts = internal.PkgResourceDefaultOpts(opts)
	var resource ApplicationLoadBalancer
	err := ctx.RegisterRemoteComponentResource("awsx:lb:ApplicationLoadBalancer", name, args, &resource, opts...)
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

type applicationLoadBalancerArgs struct {
	// Access Logs block. See below.
	AccessLogs *lb.LoadBalancerAccessLogs `pulumi:"accessLogs"`
	// Client keep alive value in seconds. The valid range is 60-604800 seconds. The default is 3600 seconds.
	ClientKeepAlive *int `pulumi:"clientKeepAlive"`
	// Connection Logs block. See below. Only valid for Load Balancers of type `application`.
	ConnectionLogs *lb.LoadBalancerConnectionLogs `pulumi:"connectionLogs"`
	// ID of the customer owned ipv4 pool to use for this load balancer.
	CustomerOwnedIpv4Pool *string `pulumi:"customerOwnedIpv4Pool"`
	// Options for creating a default security group if [securityGroups] not specified.
	DefaultSecurityGroup *awsx.DefaultSecurityGroup `pulumi:"defaultSecurityGroup"`
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
	// If true, deletion of the load balancer will be disabled via the AWS API. This will prevent this provider from deleting the load balancer. Defaults to `false`.
	EnableDeletionProtection *bool `pulumi:"enableDeletionProtection"`
	// Whether HTTP/2 is enabled in `application` load balancers. Defaults to `true`.
	EnableHttp2 *bool `pulumi:"enableHttp2"`
	// Whether the two headers (`x-amzn-tls-version` and `x-amzn-tls-cipher-suite`), which contain information about the negotiated TLS version and cipher suite, are added to the client request before sending it to the target. Only valid for Load Balancers of type `application`. Defaults to `false`
	EnableTlsVersionAndCipherSuiteHeaders *bool `pulumi:"enableTlsVersionAndCipherSuiteHeaders"`
	// Whether to allow a WAF-enabled load balancer to route requests to targets if it is unable to forward the request to AWS WAF. Defaults to `false`.
	EnableWafFailOpen *bool `pulumi:"enableWafFailOpen"`
	// Whether the X-Forwarded-For header should preserve the source port that the client used to connect to the load balancer in `application` load balancers. Defaults to `false`.
	EnableXffClientPort *bool `pulumi:"enableXffClientPort"`
	// Whether inbound security group rules are enforced for traffic originating from a PrivateLink. Only valid for Load Balancers of type `network`. The possible values are `on` and `off`.
	EnforceSecurityGroupInboundRulesOnPrivateLinkTraffic *string `pulumi:"enforceSecurityGroupInboundRulesOnPrivateLinkTraffic"`
	// Time in seconds that the connection is allowed to be idle. Only valid for Load Balancers of type `application`. Default: 60.
	IdleTimeout *int `pulumi:"idleTimeout"`
	// If true, the LB will be internal. Defaults to `false`.
	Internal *bool `pulumi:"internal"`
	// Type of IP addresses used by the subnets for your load balancer. The possible values are `ipv4` and `dualstack`.
	IpAddressType *string `pulumi:"ipAddressType"`
	// A listener to create. Only one of [listener] and [listeners] can be specified.
	Listener *Listener `pulumi:"listener"`
	// List of listeners to create. Only one of [listener] and [listeners] can be specified.
	Listeners []Listener `pulumi:"listeners"`
	// Name of the LB. This name must be unique within your AWS account, can have a maximum of 32 characters, must contain only alphanumeric characters or hyphens, and must not begin or end with a hyphen. If not specified, this provider will autogenerate a name beginning with `tf-lb`.
	Name *string `pulumi:"name"`
	// Creates a unique name beginning with the specified prefix. Conflicts with `name`.
	NamePrefix *string `pulumi:"namePrefix"`
	// Whether the Application Load Balancer should preserve the Host header in the HTTP request and send it to the target without any change. Defaults to `false`.
	PreserveHostHeader *bool `pulumi:"preserveHostHeader"`
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
	XffHeaderProcessingMode *string `pulumi:"xffHeaderProcessingMode"`
}

// The set of arguments for constructing a ApplicationLoadBalancer resource.
type ApplicationLoadBalancerArgs struct {
	// Access Logs block. See below.
	AccessLogs lb.LoadBalancerAccessLogsPtrInput
	// Client keep alive value in seconds. The valid range is 60-604800 seconds. The default is 3600 seconds.
	ClientKeepAlive pulumi.IntPtrInput
	// Connection Logs block. See below. Only valid for Load Balancers of type `application`.
	ConnectionLogs lb.LoadBalancerConnectionLogsPtrInput
	// ID of the customer owned ipv4 pool to use for this load balancer.
	CustomerOwnedIpv4Pool pulumi.StringPtrInput
	// Options for creating a default security group if [securityGroups] not specified.
	DefaultSecurityGroup *awsx.DefaultSecurityGroupArgs
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
	// If true, deletion of the load balancer will be disabled via the AWS API. This will prevent this provider from deleting the load balancer. Defaults to `false`.
	EnableDeletionProtection pulumi.BoolPtrInput
	// Whether HTTP/2 is enabled in `application` load balancers. Defaults to `true`.
	EnableHttp2 pulumi.BoolPtrInput
	// Whether the two headers (`x-amzn-tls-version` and `x-amzn-tls-cipher-suite`), which contain information about the negotiated TLS version and cipher suite, are added to the client request before sending it to the target. Only valid for Load Balancers of type `application`. Defaults to `false`
	EnableTlsVersionAndCipherSuiteHeaders pulumi.BoolPtrInput
	// Whether to allow a WAF-enabled load balancer to route requests to targets if it is unable to forward the request to AWS WAF. Defaults to `false`.
	EnableWafFailOpen pulumi.BoolPtrInput
	// Whether the X-Forwarded-For header should preserve the source port that the client used to connect to the load balancer in `application` load balancers. Defaults to `false`.
	EnableXffClientPort pulumi.BoolPtrInput
	// Whether inbound security group rules are enforced for traffic originating from a PrivateLink. Only valid for Load Balancers of type `network`. The possible values are `on` and `off`.
	EnforceSecurityGroupInboundRulesOnPrivateLinkTraffic pulumi.StringPtrInput
	// Time in seconds that the connection is allowed to be idle. Only valid for Load Balancers of type `application`. Default: 60.
	IdleTimeout pulumi.IntPtrInput
	// If true, the LB will be internal. Defaults to `false`.
	Internal pulumi.BoolPtrInput
	// Type of IP addresses used by the subnets for your load balancer. The possible values are `ipv4` and `dualstack`.
	IpAddressType pulumi.StringPtrInput
	// A listener to create. Only one of [listener] and [listeners] can be specified.
	Listener *ListenerArgs
	// List of listeners to create. Only one of [listener] and [listeners] can be specified.
	Listeners []ListenerArgs
	// Name of the LB. This name must be unique within your AWS account, can have a maximum of 32 characters, must contain only alphanumeric characters or hyphens, and must not begin or end with a hyphen. If not specified, this provider will autogenerate a name beginning with `tf-lb`.
	Name pulumi.StringPtrInput
	// Creates a unique name beginning with the specified prefix. Conflicts with `name`.
	NamePrefix pulumi.StringPtrInput
	// Whether the Application Load Balancer should preserve the Host header in the HTTP request and send it to the target without any change. Defaults to `false`.
	PreserveHostHeader pulumi.BoolPtrInput
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
	XffHeaderProcessingMode pulumi.StringPtrInput
}

func (ApplicationLoadBalancerArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*applicationLoadBalancerArgs)(nil)).Elem()
}

type ApplicationLoadBalancerInput interface {
	pulumi.Input

	ToApplicationLoadBalancerOutput() ApplicationLoadBalancerOutput
	ToApplicationLoadBalancerOutputWithContext(ctx context.Context) ApplicationLoadBalancerOutput
}

func (*ApplicationLoadBalancer) ElementType() reflect.Type {
	return reflect.TypeOf((**ApplicationLoadBalancer)(nil)).Elem()
}

func (i *ApplicationLoadBalancer) ToApplicationLoadBalancerOutput() ApplicationLoadBalancerOutput {
	return i.ToApplicationLoadBalancerOutputWithContext(context.Background())
}

func (i *ApplicationLoadBalancer) ToApplicationLoadBalancerOutputWithContext(ctx context.Context) ApplicationLoadBalancerOutput {
	return pulumi.ToOutputWithContext(ctx, i).(ApplicationLoadBalancerOutput)
}

// ApplicationLoadBalancerArrayInput is an input type that accepts ApplicationLoadBalancerArray and ApplicationLoadBalancerArrayOutput values.
// You can construct a concrete instance of `ApplicationLoadBalancerArrayInput` via:
//
//	ApplicationLoadBalancerArray{ ApplicationLoadBalancerArgs{...} }
type ApplicationLoadBalancerArrayInput interface {
	pulumi.Input

	ToApplicationLoadBalancerArrayOutput() ApplicationLoadBalancerArrayOutput
	ToApplicationLoadBalancerArrayOutputWithContext(context.Context) ApplicationLoadBalancerArrayOutput
}

type ApplicationLoadBalancerArray []ApplicationLoadBalancerInput

func (ApplicationLoadBalancerArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*ApplicationLoadBalancer)(nil)).Elem()
}

func (i ApplicationLoadBalancerArray) ToApplicationLoadBalancerArrayOutput() ApplicationLoadBalancerArrayOutput {
	return i.ToApplicationLoadBalancerArrayOutputWithContext(context.Background())
}

func (i ApplicationLoadBalancerArray) ToApplicationLoadBalancerArrayOutputWithContext(ctx context.Context) ApplicationLoadBalancerArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(ApplicationLoadBalancerArrayOutput)
}

// ApplicationLoadBalancerMapInput is an input type that accepts ApplicationLoadBalancerMap and ApplicationLoadBalancerMapOutput values.
// You can construct a concrete instance of `ApplicationLoadBalancerMapInput` via:
//
//	ApplicationLoadBalancerMap{ "key": ApplicationLoadBalancerArgs{...} }
type ApplicationLoadBalancerMapInput interface {
	pulumi.Input

	ToApplicationLoadBalancerMapOutput() ApplicationLoadBalancerMapOutput
	ToApplicationLoadBalancerMapOutputWithContext(context.Context) ApplicationLoadBalancerMapOutput
}

type ApplicationLoadBalancerMap map[string]ApplicationLoadBalancerInput

func (ApplicationLoadBalancerMap) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*ApplicationLoadBalancer)(nil)).Elem()
}

func (i ApplicationLoadBalancerMap) ToApplicationLoadBalancerMapOutput() ApplicationLoadBalancerMapOutput {
	return i.ToApplicationLoadBalancerMapOutputWithContext(context.Background())
}

func (i ApplicationLoadBalancerMap) ToApplicationLoadBalancerMapOutputWithContext(ctx context.Context) ApplicationLoadBalancerMapOutput {
	return pulumi.ToOutputWithContext(ctx, i).(ApplicationLoadBalancerMapOutput)
}

type ApplicationLoadBalancerOutput struct{ *pulumi.OutputState }

func (ApplicationLoadBalancerOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**ApplicationLoadBalancer)(nil)).Elem()
}

func (o ApplicationLoadBalancerOutput) ToApplicationLoadBalancerOutput() ApplicationLoadBalancerOutput {
	return o
}

func (o ApplicationLoadBalancerOutput) ToApplicationLoadBalancerOutputWithContext(ctx context.Context) ApplicationLoadBalancerOutput {
	return o
}

// Default security group, if auto-created
func (o ApplicationLoadBalancerOutput) DefaultSecurityGroup() ec2.SecurityGroupOutput {
	return o.ApplyT(func(v *ApplicationLoadBalancer) ec2.SecurityGroupOutput { return v.DefaultSecurityGroup }).(ec2.SecurityGroupOutput)
}

// Default target group, if auto-created
func (o ApplicationLoadBalancerOutput) DefaultTargetGroup() lb.TargetGroupOutput {
	return o.ApplyT(func(v *ApplicationLoadBalancer) lb.TargetGroupOutput { return v.DefaultTargetGroup }).(lb.TargetGroupOutput)
}

// Listeners created as part of this load balancer
func (o ApplicationLoadBalancerOutput) Listeners() lb.ListenerArrayOutput {
	return o.ApplyT(func(v *ApplicationLoadBalancer) lb.ListenerArrayOutput { return v.Listeners }).(lb.ListenerArrayOutput)
}

// Underlying Load Balancer resource
func (o ApplicationLoadBalancerOutput) LoadBalancer() lb.LoadBalancerOutput {
	return o.ApplyT(func(v *ApplicationLoadBalancer) lb.LoadBalancerOutput { return v.LoadBalancer }).(lb.LoadBalancerOutput)
}

// Id of the VPC in which this load balancer is operating
func (o ApplicationLoadBalancerOutput) VpcId() pulumi.StringPtrOutput {
	return o.ApplyT(func(v *ApplicationLoadBalancer) pulumi.StringPtrOutput { return v.VpcId }).(pulumi.StringPtrOutput)
}

type ApplicationLoadBalancerArrayOutput struct{ *pulumi.OutputState }

func (ApplicationLoadBalancerArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*ApplicationLoadBalancer)(nil)).Elem()
}

func (o ApplicationLoadBalancerArrayOutput) ToApplicationLoadBalancerArrayOutput() ApplicationLoadBalancerArrayOutput {
	return o
}

func (o ApplicationLoadBalancerArrayOutput) ToApplicationLoadBalancerArrayOutputWithContext(ctx context.Context) ApplicationLoadBalancerArrayOutput {
	return o
}

func (o ApplicationLoadBalancerArrayOutput) Index(i pulumi.IntInput) ApplicationLoadBalancerOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) *ApplicationLoadBalancer {
		return vs[0].([]*ApplicationLoadBalancer)[vs[1].(int)]
	}).(ApplicationLoadBalancerOutput)
}

type ApplicationLoadBalancerMapOutput struct{ *pulumi.OutputState }

func (ApplicationLoadBalancerMapOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*ApplicationLoadBalancer)(nil)).Elem()
}

func (o ApplicationLoadBalancerMapOutput) ToApplicationLoadBalancerMapOutput() ApplicationLoadBalancerMapOutput {
	return o
}

func (o ApplicationLoadBalancerMapOutput) ToApplicationLoadBalancerMapOutputWithContext(ctx context.Context) ApplicationLoadBalancerMapOutput {
	return o
}

func (o ApplicationLoadBalancerMapOutput) MapIndex(k pulumi.StringInput) ApplicationLoadBalancerOutput {
	return pulumi.All(o, k).ApplyT(func(vs []interface{}) *ApplicationLoadBalancer {
		return vs[0].(map[string]*ApplicationLoadBalancer)[vs[1].(string)]
	}).(ApplicationLoadBalancerOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*ApplicationLoadBalancerInput)(nil)).Elem(), &ApplicationLoadBalancer{})
	pulumi.RegisterInputType(reflect.TypeOf((*ApplicationLoadBalancerArrayInput)(nil)).Elem(), ApplicationLoadBalancerArray{})
	pulumi.RegisterInputType(reflect.TypeOf((*ApplicationLoadBalancerMapInput)(nil)).Elem(), ApplicationLoadBalancerMap{})
	pulumi.RegisterOutputType(ApplicationLoadBalancerOutput{})
	pulumi.RegisterOutputType(ApplicationLoadBalancerArrayOutput{})
	pulumi.RegisterOutputType(ApplicationLoadBalancerMapOutput{})
}
