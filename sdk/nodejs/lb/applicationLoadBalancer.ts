// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import { input as inputs, output as outputs, enums } from "../types";
import * as utilities from "../utilities";

import * as pulumiAws from "@pulumi/aws";

export class ApplicationLoadBalancer extends pulumi.ComponentResource {
    /** @internal */
    public static readonly __pulumiType = 'awsx:lb:ApplicationLoadBalancer';

    /**
     * Returns true if the given object is an instance of ApplicationLoadBalancer.  This is designed to work even
     * when multiple copies of the Pulumi SDK have been loaded into the same process.
     */
    public static isInstance(obj: any): obj is ApplicationLoadBalancer {
        if (obj === undefined || obj === null) {
            return false;
        }
        return obj['__pulumiType'] === ApplicationLoadBalancer.__pulumiType;
    }

    /**
     * Default security group, if auto-created
     */
    public readonly defaultSecurityGroup!: pulumi.Output<pulumiAws.ec2.SecurityGroup | undefined>;
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
     * Create a ApplicationLoadBalancer resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args?: ApplicationLoadBalancerArgs, opts?: pulumi.ComponentResourceOptions) {
        let resourceInputs: pulumi.Inputs = {};
        opts = opts || {};
        if (!opts.id) {
            resourceInputs["accessLogs"] = args ? args.accessLogs : undefined;
            resourceInputs["customerOwnedIpv4Pool"] = args ? args.customerOwnedIpv4Pool : undefined;
            resourceInputs["defaultSecurityGroup"] = args ? (args.defaultSecurityGroup ? inputs.awsx.defaultSecurityGroupArgsProvideDefaults(args.defaultSecurityGroup) : undefined) : undefined;
            resourceInputs["defaultTargetGroup"] = args ? args.defaultTargetGroup : undefined;
            resourceInputs["desyncMitigationMode"] = args ? args.desyncMitigationMode : undefined;
            resourceInputs["dropInvalidHeaderFields"] = args ? args.dropInvalidHeaderFields : undefined;
            resourceInputs["enableDeletionProtection"] = args ? args.enableDeletionProtection : undefined;
            resourceInputs["enableHttp2"] = args ? args.enableHttp2 : undefined;
            resourceInputs["enableWafFailOpen"] = args ? args.enableWafFailOpen : undefined;
            resourceInputs["idleTimeout"] = args ? args.idleTimeout : undefined;
            resourceInputs["internal"] = args ? args.internal : undefined;
            resourceInputs["ipAddressType"] = args ? args.ipAddressType : undefined;
            resourceInputs["listener"] = args ? args.listener : undefined;
            resourceInputs["listeners"] = args ? args.listeners : undefined;
            resourceInputs["name"] = args ? args.name : undefined;
            resourceInputs["namePrefix"] = args ? args.namePrefix : undefined;
            resourceInputs["securityGroups"] = args ? args.securityGroups : undefined;
            resourceInputs["subnetIds"] = args ? args.subnetIds : undefined;
            resourceInputs["subnetMappings"] = args ? args.subnetMappings : undefined;
            resourceInputs["subnets"] = args ? args.subnets : undefined;
            resourceInputs["tags"] = args ? args.tags : undefined;
            resourceInputs["loadBalancer"] = undefined /*out*/;
            resourceInputs["vpcId"] = undefined /*out*/;
        } else {
            resourceInputs["defaultSecurityGroup"] = undefined /*out*/;
            resourceInputs["defaultTargetGroup"] = undefined /*out*/;
            resourceInputs["listeners"] = undefined /*out*/;
            resourceInputs["loadBalancer"] = undefined /*out*/;
            resourceInputs["vpcId"] = undefined /*out*/;
        }
        opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
        super(ApplicationLoadBalancer.__pulumiType, name, resourceInputs, opts, true /*remote*/);
    }
}

/**
 * The set of arguments for constructing a ApplicationLoadBalancer resource.
 */
export interface ApplicationLoadBalancerArgs {
    /**
     * An Access Logs block. Access Logs documented below.
     */
    accessLogs?: pulumi.Input<pulumiAws.types.input.lb.LoadBalancerAccessLogs>;
    /**
     * The ID of the customer owned ipv4 pool to use for this load balancer.
     */
    customerOwnedIpv4Pool?: pulumi.Input<string>;
    /**
     * Options for creating a default security group if [securityGroups] not specified.
     */
    defaultSecurityGroup?: inputs.awsx.DefaultSecurityGroupArgs;
    /**
     * Options creating a default target group.
     */
    defaultTargetGroup?: inputs.lb.TargetGroupArgs;
    /**
     * Determines how the load balancer handles requests that might pose a security risk to an application due to HTTP desync. Valid values are `monitor`, `defensive` (default), `strictest`.
     */
    desyncMitigationMode?: pulumi.Input<string>;
    /**
     * Indicates whether HTTP headers with header fields that are not valid are removed by the load balancer (true) or routed to targets (false). The default is false. Elastic Load Balancing requires that message header names contain only alphanumeric characters and hyphens. Only valid for Load Balancers of type `application`.
     */
    dropInvalidHeaderFields?: pulumi.Input<boolean>;
    /**
     * If true, deletion of the load balancer will be disabled via
     * the AWS API. This will prevent this provider from deleting the load balancer. Defaults to `false`.
     */
    enableDeletionProtection?: pulumi.Input<boolean>;
    /**
     * Indicates whether HTTP/2 is enabled in `application` load balancers. Defaults to `true`.
     */
    enableHttp2?: pulumi.Input<boolean>;
    /**
     * Indicates whether to allow a WAF-enabled load balancer to route requests to targets if it is unable to forward the request to AWS WAF. Defaults to `false`.
     */
    enableWafFailOpen?: pulumi.Input<boolean>;
    /**
     * The time in seconds that the connection is allowed to be idle. Only valid for Load Balancers of type `application`. Default: 60.
     */
    idleTimeout?: pulumi.Input<number>;
    /**
     * If true, the LB will be internal.
     */
    internal?: pulumi.Input<boolean>;
    /**
     * The type of IP addresses used by the subnets for your load balancer. The possible values are `ipv4` and `dualstack`
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
     * The name of the LB. This name must be unique within your AWS account, can have a maximum of 32 characters,
     * must contain only alphanumeric characters or hyphens, and must not begin or end with a hyphen. If not specified,
     * this provider will autogenerate a name beginning with `tf-lb`.
     */
    name?: pulumi.Input<string>;
    /**
     * Creates a unique name beginning with the specified prefix. Conflicts with `name`.
     */
    namePrefix?: pulumi.Input<string>;
    /**
     * A list of security group IDs to assign to the LB. Only valid for Load Balancers of type `application`.
     */
    securityGroups?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * A list of subnet IDs to attach to the LB. Subnets
     * cannot be updated for Load Balancers of type `network`. Changing this value
     * for load balancers of type `network` will force a recreation of the resource.
     */
    subnetIds?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * A subnet mapping block as documented below.
     */
    subnetMappings?: pulumi.Input<pulumi.Input<pulumiAws.types.input.lb.LoadBalancerSubnetMapping>[]>;
    /**
     * A list of subnets to attach to the LB. Only one of [subnets], [subnetIds] or [subnetMappings] can be specified
     */
    subnets?: pulumi.Input<pulumi.Input<pulumiAws.ec2.Subnet>[]>;
    /**
     * A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
     */
    tags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
}
