// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as inputs from "../types/input";
import * as outputs from "../types/output";
import * as enums from "../types/enums";
import * as utilities from "../utilities";

import * as pulumiAws from "@pulumi/aws";

/**
 * Provides a Network Load Balancer resource with listeners and default target group.
 */
export class NetworkLoadBalancer extends pulumi.ComponentResource {
    /** @internal */
    public static readonly __pulumiType = 'awsx:lb:NetworkLoadBalancer';

    /**
     * Returns true if the given object is an instance of NetworkLoadBalancer.  This is designed to work even
     * when multiple copies of the Pulumi SDK have been loaded into the same process.
     */
    public static isInstance(obj: any): obj is NetworkLoadBalancer {
        if (obj === undefined || obj === null) {
            return false;
        }
        return obj['__pulumiType'] === NetworkLoadBalancer.__pulumiType;
    }

    /**
     * Default target group, if auto-created
     */
    public readonly defaultTargetGroup!: pulumi.Output<pulumiAws.lb.TargetGroup>;
    /**
     * Listeners created as part of this load balancer
     */
    public readonly listeners!: pulumi.Output<pulumiAws.lb.Listener[] | undefined>;
    /**
     * Underlying Load Balancer resource
     */
    public /*out*/ readonly loadBalancer!: pulumi.Output<pulumiAws.lb.LoadBalancer>;
    /**
     * Id of the VPC in which this load balancer is operating
     */
    public /*out*/ readonly vpcId!: pulumi.Output<string | undefined>;

    /**
     * Create a NetworkLoadBalancer resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args?: NetworkLoadBalancerArgs, opts?: pulumi.ComponentResourceOptions) {
        let resourceInputs: pulumi.Inputs = {};
        opts = opts || {};
        if (!opts.id) {
            resourceInputs["accessLogs"] = args ? args.accessLogs : undefined;
            resourceInputs["clientKeepAlive"] = args ? args.clientKeepAlive : undefined;
            resourceInputs["connectionLogs"] = args ? args.connectionLogs : undefined;
            resourceInputs["customerOwnedIpv4Pool"] = args ? args.customerOwnedIpv4Pool : undefined;
            resourceInputs["defaultTargetGroup"] = args ? args.defaultTargetGroup : undefined;
            resourceInputs["defaultTargetGroupPort"] = args ? args.defaultTargetGroupPort : undefined;
            resourceInputs["desyncMitigationMode"] = args ? args.desyncMitigationMode : undefined;
            resourceInputs["dnsRecordClientRoutingPolicy"] = args ? args.dnsRecordClientRoutingPolicy : undefined;
            resourceInputs["dropInvalidHeaderFields"] = args ? args.dropInvalidHeaderFields : undefined;
            resourceInputs["enableCrossZoneLoadBalancing"] = args ? args.enableCrossZoneLoadBalancing : undefined;
            resourceInputs["enableDeletionProtection"] = args ? args.enableDeletionProtection : undefined;
            resourceInputs["enableTlsVersionAndCipherSuiteHeaders"] = args ? args.enableTlsVersionAndCipherSuiteHeaders : undefined;
            resourceInputs["enableWafFailOpen"] = args ? args.enableWafFailOpen : undefined;
            resourceInputs["enableXffClientPort"] = args ? args.enableXffClientPort : undefined;
            resourceInputs["enableZonalShift"] = args ? args.enableZonalShift : undefined;
            resourceInputs["enforceSecurityGroupInboundRulesOnPrivateLinkTraffic"] = args ? args.enforceSecurityGroupInboundRulesOnPrivateLinkTraffic : undefined;
            resourceInputs["idleTimeout"] = args ? args.idleTimeout : undefined;
            resourceInputs["internal"] = args ? args.internal : undefined;
            resourceInputs["ipAddressType"] = args ? args.ipAddressType : undefined;
            resourceInputs["listener"] = args ? args.listener : undefined;
            resourceInputs["listeners"] = args ? args.listeners : undefined;
            resourceInputs["name"] = args ? args.name : undefined;
            resourceInputs["namePrefix"] = args ? args.namePrefix : undefined;
            resourceInputs["preserveHostHeader"] = args ? args.preserveHostHeader : undefined;
            resourceInputs["securityGroups"] = args ? args.securityGroups : undefined;
            resourceInputs["subnetIds"] = args ? args.subnetIds : undefined;
            resourceInputs["subnetMappings"] = args ? args.subnetMappings : undefined;
            resourceInputs["subnets"] = args ? args.subnets : undefined;
            resourceInputs["tags"] = args ? args.tags : undefined;
            resourceInputs["xffHeaderProcessingMode"] = args ? args.xffHeaderProcessingMode : undefined;
            resourceInputs["loadBalancer"] = undefined /*out*/;
            resourceInputs["vpcId"] = undefined /*out*/;
        } else {
            resourceInputs["defaultTargetGroup"] = undefined /*out*/;
            resourceInputs["listeners"] = undefined /*out*/;
            resourceInputs["loadBalancer"] = undefined /*out*/;
            resourceInputs["vpcId"] = undefined /*out*/;
        }
        opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
        super(NetworkLoadBalancer.__pulumiType, name, resourceInputs, opts, true /*remote*/);
    }
}

/**
 * The set of arguments for constructing a NetworkLoadBalancer resource.
 */
export interface NetworkLoadBalancerArgs {
    /**
     * Access Logs block. See below.
     */
    accessLogs?: pulumi.Input<pulumiAws.types.input.lb.LoadBalancerAccessLogs>;
    /**
     * Client keep alive value in seconds. The valid range is 60-604800 seconds. The default is 3600 seconds.
     */
    clientKeepAlive?: pulumi.Input<number>;
    /**
     * Connection Logs block. See below. Only valid for Load Balancers of type `application`.
     */
    connectionLogs?: pulumi.Input<pulumiAws.types.input.lb.LoadBalancerConnectionLogs>;
    /**
     * ID of the customer owned ipv4 pool to use for this load balancer.
     */
    customerOwnedIpv4Pool?: pulumi.Input<string>;
    /**
     * Options creating a default target group.
     */
    defaultTargetGroup?: inputs.lb.TargetGroupArgs;
    /**
     * Port to use to connect with the target. Valid values are ports 1-65535. Defaults to 80.
     */
    defaultTargetGroupPort?: pulumi.Input<number>;
    /**
     * How the load balancer handles requests that might pose a security risk to an application due to HTTP desync. Valid values are `monitor`, `defensive` (default), `strictest`.
     */
    desyncMitigationMode?: pulumi.Input<string>;
    /**
     * How traffic is distributed among the load balancer Availability Zones. Possible values are `any_availability_zone` (default), `availability_zone_affinity`, or `partial_availability_zone_affinity`. See   [Availability Zone DNS affinity](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html#zonal-dns-affinity) for additional details. Only valid for `network` type load balancers.
     */
    dnsRecordClientRoutingPolicy?: pulumi.Input<string>;
    /**
     * Whether HTTP headers with header fields that are not valid are removed by the load balancer (true) or routed to targets (false). The default is false. Elastic Load Balancing requires that message header names contain only alphanumeric characters and hyphens. Only valid for Load Balancers of type `application`.
     */
    dropInvalidHeaderFields?: pulumi.Input<boolean>;
    /**
     * If true, cross-zone load balancing of the load balancer will be enabled. For `network` and `gateway` type load balancers, this feature is disabled by default (`false`). For `application` load balancer this feature is always enabled (`true`) and cannot be disabled. Defaults to `false`.
     */
    enableCrossZoneLoadBalancing?: pulumi.Input<boolean>;
    /**
     * If true, deletion of the load balancer will be disabled via the AWS API. This will prevent this provider from deleting the load balancer. Defaults to `false`.
     */
    enableDeletionProtection?: pulumi.Input<boolean>;
    /**
     * Whether the two headers (`x-amzn-tls-version` and `x-amzn-tls-cipher-suite`), which contain information about the negotiated TLS version and cipher suite, are added to the client request before sending it to the target. Only valid for Load Balancers of type `application`. Defaults to `false`
     */
    enableTlsVersionAndCipherSuiteHeaders?: pulumi.Input<boolean>;
    /**
     * Whether to allow a WAF-enabled load balancer to route requests to targets if it is unable to forward the request to AWS WAF. Defaults to `false`.
     */
    enableWafFailOpen?: pulumi.Input<boolean>;
    /**
     * Whether the X-Forwarded-For header should preserve the source port that the client used to connect to the load balancer in `application` load balancers. Defaults to `false`.
     */
    enableXffClientPort?: pulumi.Input<boolean>;
    /**
     * Whether zonal shift is enabled. Defaults to `false`.
     */
    enableZonalShift?: pulumi.Input<boolean>;
    /**
     * Whether inbound security group rules are enforced for traffic originating from a PrivateLink. Only valid for Load Balancers of type `network`. The possible values are `on` and `off`.
     */
    enforceSecurityGroupInboundRulesOnPrivateLinkTraffic?: pulumi.Input<string>;
    /**
     * Time in seconds that the connection is allowed to be idle. Only valid for Load Balancers of type `application`. Default: 60.
     */
    idleTimeout?: pulumi.Input<number>;
    /**
     * If true, the LB will be internal. Defaults to `false`.
     */
    internal?: pulumi.Input<boolean>;
    /**
     * Type of IP addresses used by the subnets for your load balancer. The possible values depend upon the load balancer type: `ipv4` (all load balancer types), `dualstack` (all load balancer types), and `dualstack-without-public-ipv4` (type `application` only).
     */
    ipAddressType?: pulumi.Input<string>;
    /**
     * A listener to create. Only one of [listener] and [listeners] can be specified.
     */
    listener?: inputs.lb.ListenerArgs;
    /**
     * List of listeners to create. Only one of [listener] and [listeners] can be specified.
     */
    listeners?: inputs.lb.ListenerArgs[];
    /**
     * Name of the LB. This name must be unique within your AWS account, can have a maximum of 32 characters, must contain only alphanumeric characters or hyphens, and must not begin or end with a hyphen. If not specified, this provider will autogenerate a name beginning with `tf-lb`.
     */
    name?: pulumi.Input<string>;
    /**
     * Creates a unique name beginning with the specified prefix. Conflicts with `name`.
     */
    namePrefix?: pulumi.Input<string>;
    /**
     * Whether the Application Load Balancer should preserve the Host header in the HTTP request and send it to the target without any change. Defaults to `false`.
     */
    preserveHostHeader?: pulumi.Input<boolean>;
    /**
     * List of security group IDs to assign to the LB. Only valid for Load Balancers of type `application` or `network`. For load balancers of type `network` security groups cannot be added if none are currently present, and cannot all be removed once added. If either of these conditions are met, this will force a recreation of the resource.
     */
    securityGroups?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * List of subnet IDs to attach to the LB. For Load Balancers of type `network` subnets can only be added (see [Availability Zones](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html#availability-zones)), deleting a subnet for load balancers of type `network` will force a recreation of the resource.
     */
    subnetIds?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * Subnet mapping block. See below. For Load Balancers of type `network` subnet mappings can only be added.
     */
    subnetMappings?: pulumi.Input<pulumi.Input<pulumiAws.types.input.lb.LoadBalancerSubnetMapping>[]>;
    /**
     * A list of subnets to attach to the LB. Only one of [subnets], [subnetIds] or [subnetMappings] can be specified
     */
    subnets?: pulumi.Input<pulumi.Input<pulumiAws.ec2.Subnet>[]>;
    /**
     * Map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
     */
    tags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * Determines how the load balancer modifies the `X-Forwarded-For` header in the HTTP request before sending the request to the target. The possible values are `append`, `preserve`, and `remove`. Only valid for Load Balancers of type `application`. The default is `append`.
     */
    xffHeaderProcessingMode?: pulumi.Input<string>;
}
