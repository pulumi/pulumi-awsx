// Copyright 2016-2018, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as x from "..";
import { Network } from "./../../network";

import * as utils from "./../../utils";

export type ApplicationProtocol = "HTTP" | "HTTPS";

export class ApplicationLoadBalancer extends x.elasticloadbalancingv2.LoadBalancer {
    public readonly targetGroups: ApplicationTargetGroup[];
    public readonly listeners: ApplicationListener[];

    constructor(name: string, args: ApplicationLoadBalancerArgs, opts?: pulumi.ComponentResourceOptions) {
        const argsCopy: x.elasticloadbalancingv2.LoadBalancerArgs = {
            ...args,
            loadBalancerType: "application",
        };

        super("awsinfra:x:elasticloadbalancingv2:ApplicationLoadBalancer", name, argsCopy, opts);
    }

    /**
     * Creates a new ApplicationListener and adds it to [listeners].
     */
    public createAndAddListener(
            name: string, args: ApplicationListenerArgs, opts?: pulumi.ComponentResourceOptions): ApplicationListener {

        return new ApplicationListener(name, {
            ...args,
            loadBalancer: this,
        }, opts || { parent: this });
    }

    /**
     * Creates a new ApplicationTargetGroup and adds it to [targetGroups].
     */
    public createAndAddTargetGroup(
        name: string, args: ApplicationTargetGroupArgs,
        opts?: pulumi.ComponentResourceOptions): ApplicationTargetGroup {

        return new ApplicationTargetGroup(name, {
            ...args,
            loadBalancer: this,
        }, opts || { parent: this });
    }
}

export class ApplicationTargetGroup extends x.elasticloadbalancingv2.TargetGroup {
    public readonly loadBalancer: ApplicationLoadBalancer;

    public readonly listeners: ApplicationListener[];

    constructor(name: string, args: ApplicationTargetGroupArgs, opts?: pulumi.ComponentResourceOptions) {
        const { port, protocol } = computePortInfo(args.port, args.protocol);

        super("awsinfra:x:elasticloadbalancingv2:ApplicationTargetGroup", name, {
            ...args,
            network: args.loadBalancer.network,
            port,
            protocol,
        }, opts);

        const loadBalancer = args.loadBalancer;
        loadBalancer.targetGroups.push(this);

        this.loadBalancer = loadBalancer;
    }

    /**
     * Creates a new ApplicationListener and adds it to [listeners] and [loadBalancer.listeners].
     */
    public createAndAddListener(
            name: string, args: ApplicationListenerArgs,
            opts?: pulumi.ComponentResourceOptions): ApplicationListener {

        return new ApplicationListener(name, {
            ...args,
            targetGroup: this,
            loadBalancer: this.loadBalancer,
        }, opts || { parent: this });
    }
}

function computePortInfo(
    port: pulumi.Input<number> | undefined,
    protocol: pulumi.Input<ApplicationProtocol> | undefined) {

    if (port === undefined && protocol === undefined) {
        throw new Error("At least one of [port] or [protocol] must be provided.");
    }

    port = utils.ifUndefined(port,
        pulumi.output(protocol).apply(p => {
            switch (p) {
                case "HTTP": return 80;
                case "HTTPS": return 443;
                default: throw new Error("Unknown protocol: " + JSON.stringify(p));
            }
        }));

    protocol = utils.ifUndefined(protocol,
        pulumi.output(port).apply(p => {
            switch (p) {
                case 80: case 8000: case 8008: case 8080: return <ApplicationProtocol>"HTTP";
                case 443: case 8443: return <ApplicationProtocol>"HTTPS";
                default: throw new Error("Invalid port: " + JSON.stringify(p));
            }
        }));

    return { port, protocol };
}

export class ApplicationListener extends x.elasticloadbalancingv2.Listener {
    public readonly targetGroup: ApplicationTargetGroup;

    constructor(name: string, args: ApplicationListenerArgs, opts?: pulumi.ComponentResourceOptions) {
        if (args.targetGroup === undefined && args.targetGroupArgs === undefined && args.port === undefined) {
            throw new Error(
"One of [targetGroup] or [targetGroupArgs] or [port] must be provided when creating a NetworkListener.");
        }

        const targetGroup = getTargetGroup(name, args, opts);
        const loadBalancer = args.loadBalancer || targetGroup.loadBalancer;
        if (loadBalancer !== targetGroup.loadBalancer) {
            throw new Error("Listener's [loadBalancer] was not the same as its [targetGroup]'s load balancer.");
        }

        const defaultAction = pulumi.output(args.defaultAction).apply(
            d => d || {
                targetGroupArn: targetGroup.instance.arn,
                type: "forward",
            });

        const { port, protocol } = computePortInfo(
            utils.ifUndefined(args.port, targetGroup.instance.port),
            utils.ifUndefined(args.protocol, <pulumi.Output<ApplicationProtocol>>targetGroup.instance.protocol));

        super("awsinfra:x:elasticloadbalancingv2:ApplicationListener", name, {
            ...args,
            defaultAction,
            loadBalancer,
            port,
            protocol,
        }, opts);

        this.targetGroup = targetGroup;

        targetGroup.listeners.push(this);
        targetGroup.loadBalancer.listeners.push(this);
    }
}

function getTargetGroup(name: string, args: ApplicationListenerArgs, opts: pulumi.ComponentResourceOptions) {
    if (args.targetGroup) {
        return args.targetGroup;
    }

    let targetGroupArgs = args.targetGroupArgs;
    if (!targetGroupArgs) {
        if (args.loadBalancer === undefined) {
            throw new Error("[loadBalancer] must be provided if [targetGroup] and [targetGroupArgs] are not provided.");
        }

        targetGroupArgs =  { loadBalancer: args.loadBalancer, port: args.port, protocol: args.protocol };
    }

    return new ApplicationTargetGroup(name, targetGroupArgs, opts);
}

export interface ApplicationLoadBalancerArgs {
    // Properties from LoadBalancerArgs

    /**
     * The network this load balancer will be used with.  Defaults to `[Network.getDefault]` if
     * unspecified.
     */
    network?: Network;

    /**
     * Whether or not the load balancer is exposed to the internet. Defaults to `false` if
     * unspecified.
     */
    external?: boolean;

    /**
     * If true, deletion of the load balancer will be disabled via the AWS API. This will prevent
     * Terraform from deleting the load balancer. Defaults to `false`.
     */
    enableDeletionProtection?: pulumi.Input<boolean>;

    /**
     * The type of IP addresses used by the subnets for your load balancer. The possible values are
     * `ipv4` and `dualstack`
     */
    ipAddressType?: pulumi.Input<"ipv4" | "dualstack">;

    /**
     * A subnet mapping block as documented below.
     */
    subnetMappings?: aws.elasticloadbalancingv2.LoadBalancerArgs["subnetMappings"];

    /**
     * A list of subnet IDs to attach to the LB. Subnets cannot be updated for Load Balancers of
     * type `network`. Changing this value for load balancers of type `network` will force a
     * recreation of the resource.
     */
    subnets?: pulumi.Input<pulumi.Input<string>[]> | x.elasticloadbalancingv2.LoadBalancerSubnets;

    /**
     * A mapping of tags to assign to the resource.
     */
    tags?: pulumi.Input<aws.Tags>;

    // Properties added here.

    /**
     * An Access Logs block. Access Logs documented below.
     */
    accessLogs?: aws.elasticloadbalancingv2.LoadBalancerArgs["accessLogs"];

    /**
     * Indicates whether HTTP/2 is enabled. Defaults to `true`.
     */
    enableHttp2?: pulumi.Input<boolean>;

    /**
     * The time in seconds that the connection is allowed to be idle. Default: 60.
     */
    idleTimeout?: pulumi.Input<number>;

    /**
     * A list of security group IDs to assign to the LB.
     */
    securityGroups: aws.ec2.SecurityGroup[];
}

export interface ApplicationTargetGroupArgs {
    // Copied from TargetGroupArgs

    /**
     * The amount time for Elastic Load Balancing to wait before changing the state of a
     * deregistering target from draining to unused. The range is 0-3600 seconds. The default value
     * is 300 seconds.
     */
    deregistrationDelay?: pulumi.Input<number>;

    /**
     * A Health Check block. Health Check blocks are documented below.
     */
    healthCheck?: aws.elasticloadbalancingv2.TargetGroupArgs["healthCheck"];

    /**
     * Boolean to enable / disable support for proxy protocol v2 on Network Load Balancers. See
     * [doc](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html#proxy-protocol)
     * for more information.
     */
    proxyProtocolV2?: pulumi.Input<boolean>;

    /**
     * The amount time for targets to warm up before the load balancer sends them a full share of
     * requests. The range is 30-900 seconds or 0 to disable. The default value is 0 seconds.
     */
    slowStart?: pulumi.Input<number>;

    /**
     * A Stickiness block. Stickiness blocks are documented below. `stickiness` is only valid if
     * used with Load Balancers of type `Application`
     */
    stickiness?: aws.elasticloadbalancingv2.TargetGroupArgs["stickiness"];

    /**
     * A mapping of tags to assign to the resource.
     */
    tags?: pulumi.Input<aws.Tags>;

    /**
     * The type of target that you must specify when registering targets with this target group. The
     * possible values are `instance` (targets are specified by instance ID) or `ip` (targets are
     * specified by IP address). The default is `instance`. Note that you can't specify targets for
     * a target group using both instance IDs and IP addresses. If the target type is `ip`, specify
     * IP addresses from the subnets of the virtual private cloud (VPC) for the target group, the
     * RFC 1918 range (10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16), and the RFC 6598 range
     * (100.64.0.0/10). You can't specify publicly routable IP addresses.
     */
    targetType?: pulumi.Input<"instance" | "ip">;

    // Changed by us:

    /**
     * The load balancer this is a target group for.
     */
    loadBalancer: ApplicationLoadBalancer;

    /**
     * The port to use to connect with the target. Valid values are either ports 1-65536. If
     * unspecified will be inferred from the [protocol].
     */
    port?: pulumi.Input<number>;

    /**
     * The protocol to use to connect with the target.  If unspecified will be inferred from [port].
     */
    protocol?: pulumi.Input<ApplicationProtocol>;
}

interface ApplicationListenerArgs {
    /**
     * The load balancer this listener is associated with.s
     */
    loadBalancer?: ApplicationLoadBalancer;

    /**
     * Target group of this listener. One of [targetGroup] or [targetGroupArgs] or [port] must be
     * specified.
     */
    targetGroup?: ApplicationTargetGroup;

    /**
     * Arguments to create a target group. One of [targetGroup] or [targetGroupArgs] or [port] must be
     * specified.
     */
    targetGroupArgs?: ApplicationTargetGroupArgs;

    /**
     * The port. Specify a value from `1` to `65535`. One of [targetGroup] or [targetGroupArgs] or
     * [port] must be specified.  Can be inferred from [targetGroup] or [targetGroupArgs] or
     * [protocol] if not provided.
     */
    port?: pulumi.Input<number>;

    /**
     * The protocol. Valid values are `HTTP`, `HTTPS`.  Computed from "port" if not provided.
     */
    protocol?: pulumi.Input<ApplicationProtocol>;

    /**
     * An Action block. Action blocks are documented below.  If not provided, a suitable
     * defaultAction will be chosen that forwards to the [targetGroup] for this listener.
     */
    defaultAction?: aws.elasticloadbalancingv2.Listener["defaultAction"];

    // TODO: consider extracting out an HttpsApplicationListener.

    /**
     * The ARN of the default SSL server certificate. Exactly one certificate is required if the
     * protocol is HTTPS. For adding additional SSL certificates, see the
     * [`aws_lb_listener_certificate`
     * resource](https://www.terraform.io/docs/providers/aws/r/lb_listener_certificate.html).
     */
    certificateArn?: pulumi.Input<string>;

    /**
     * The name of the SSL Policy for the listener. Required if `protocol` is `HTTPS`.
     */
    sslPolicy?: pulumi.Input<string>;
}
