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

// tslint:disable:max-line-length

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as mod from ".";
import * as x from "..";

export type ApplicationProtocol = "HTTP" | "HTTPS";

/**
 * A application load balancer serves as the single point of contact for clients. The load balancer
 * distributes incoming application traffic across multiple targets, such as EC2 instances, in
 * multiple Availability Zones. This increases the availability of your application. You add one or
 * more listeners to your load balancer.
 *
 * See https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html for
 * more details.
 */
export class ApplicationLoadBalancer extends mod.LoadBalancer {
    public readonly listeners: ApplicationListener[];
    public readonly targetGroups: ApplicationTargetGroup[];

    constructor(name: string, args: pulumi.WrappedObject<ApplicationLoadBalancerArgs> = {}, opts?: pulumi.ComponentResourceOptions) {
        const argsCopy: pulumi.WrappedObject<x.elasticloadbalancingv2.LoadBalancerArgs> = {
            ...args,
            loadBalancerType: "application",
        };

        super("awsx:x:elasticloadbalancingv2:ApplicationLoadBalancer", name, argsCopy, opts);

        this.listeners = [];
        this.targetGroups = [];

        this.registerOutputs({});
    }

    /**
     * Creates a new listener for this [ApplicationLoadBalancer] see ApplicationListener for more
     * details.
     */
    public createListener(name: string, args: pulumi.WrappedObject<ApplicationListenerArgs>, opts?: pulumi.ComponentResourceOptions) {
        return new ApplicationListener(name, {
            loadBalancer: this,
            ...args,
        }, opts || { parent: this });
    }

    /**
     * Creates a target group for this [ApplicationLoadBalancer] see ApplicationTargetGroup for more
     * details.
     */
    public createTargetGroup(name: string, args: pulumi.WrappedObject<ApplicationTargetGroupArgs>, opts?: pulumi.ComponentResourceOptions) {
        return new ApplicationTargetGroup(name, {
            loadBalancer: this,
            ...args,
        }, opts || { parent: this });
    }
}

/**
 * Each target group routes requests to one or more registered targets, such as EC2 instances, using
 * the protocol and port number that you specify. You can register a target with multiple target
 * groups. You can configure health checks on a per target group basis. Health checks are performed
 * on all targets registered to a target group that is specified in a listener rule for your load
 * balancer.
 */
export class ApplicationTargetGroup extends mod.TargetGroup {
    public readonly loadBalancer: ApplicationLoadBalancer;

    public readonly listeners: x.elasticloadbalancingv2.ApplicationListener[];

    constructor(name: string, args: pulumi.WrappedObject<ApplicationTargetGroupArgs> = {}, opts?: pulumi.ComponentResourceOptions) {
        const loadBalancer = args.loadBalancer || new ApplicationLoadBalancer(name, { vpc: args.vpc }, opts);
        const { port, protocol } = computePortInfo(args.port, args.protocol);

        super("awsx:x:elasticloadbalancingv2:ApplicationTargetGroup", name, {
            ...args,
            vpc: loadBalancer.vpc,
            port,
            protocol,
        }, opts);

        this.loadBalancer = loadBalancer;
        loadBalancer.targetGroups.push(this);

        this.registerOutputs({});
    }

    public createListener(name: string, args: pulumi.WrappedObject<ApplicationListenerArgs>,
                          opts?: pulumi.ComponentResourceOptions): ApplicationListener {
        return new ApplicationListener(name, {
            defaultAction: this,
            loadBalancer: this.loadBalancer,
            ...args,
        }, opts);
    }
}

function computePortInfo(
    port: pulumi.Input<number> | undefined,
    protocol: pulumi.Input<ApplicationProtocol> | undefined) {

    if (port === undefined && protocol === undefined) {
        throw new Error("At least one of [port] or [protocol] must be provided.");
    }

    port = pulumi.all([port, protocol]).apply(([port, protocol]) => {
        if (port !== undefined) {
            return port;
        }

        switch (protocol) {
            case "HTTP": return 80;
            case "HTTPS": return 443;
            default: throw new Error(
                `Could not automatically determine port for protocol ${JSON.stringify(protocol)}. Please provide an explicit port.`);
        }
    });

    protocol = pulumi.all([port, protocol]).apply(([port, protocol]) => {
        if (protocol !== undefined) {
            return protocol;
        }

        switch (port) {
            case 80: case 8000: case 8008: case 8080: return <ApplicationProtocol>"HTTP";
            case 443: case 8443: return <ApplicationProtocol>"HTTPS";
            default: throw new Error(
                `Could not automatically determine protocol for port ${JSON.stringify(port)}. Please specify either "HTTP" or "HTTPS"`);
        }
    });

    return { port, protocol };
}

export class ApplicationListener extends mod.Listener {
    public readonly loadBalancer: ApplicationLoadBalancer;
    public readonly defaultTargetGroup?: x.elasticloadbalancingv2.ApplicationTargetGroup;

    constructor(name: string,
                args: pulumi.WrappedObject<ApplicationListenerArgs>,
                opts?: pulumi.ComponentResourceOptions) {

        const loadBalancer = args.loadBalancer || new ApplicationLoadBalancer(name, { vpc: args.vpc }, opts);

        const { port, protocol } = computePortInfo(args.port, args.protocol);
        const { defaultAction, defaultListener } = getDefaultAction(
            name, loadBalancer, args, port, protocol, opts);

        // Pass along the target as the defaultTarget for this listener.  This allows this listener
        // to defer to it for ContainerPortMappings information.  this allows this listener to be
        // passed in as the portMappings information needed for a Service.
        super("awsx:x:elasticloadbalancingv2:ApplicationListener", name, defaultListener, {
            ...args,
            defaultAction,
            loadBalancer,
            port,
            protocol,
        }, opts);

        const parentOpts = { parent: this };

        // If the listener is externally available, then open it's port both for ingress
        // in the load balancer's security groups.
        if (args.external !== false) {
            const args = x.ec2.SecurityGroupRule.ingressArgs(
                new x.ec2.AnyIPv4Location(), new x.ec2.TcpPorts(port),
                `Externally available at port ${port}`);

            for (let i = 0, n = this.loadBalancer.securityGroups.length; i < n; i++) {
                const securityGroup = this.loadBalancer.securityGroups[i];
                securityGroup.createIngressRule(`${name}-external-${i}-ingress`, args, parentOpts);
            }
        }

        this.loadBalancer = loadBalancer;
        loadBalancer.listeners.push(this);

        this.registerOutputs({});
    }
}

function getDefaultAction(
        name: string, loadBalancer: ApplicationLoadBalancer,
        args: pulumi.WrappedObject<ApplicationListenerArgs>,
        port: pulumi.Input<number>,
        protocol: pulumi.Input<ApplicationProtocol>,
        opts: pulumi.ComponentResourceOptions | undefined) {

    if (args.defaultAction) {
        return x.elasticloadbalancingv2.isListenerDefaultAction(args.defaultAction)
            ? { defaultAction: args.defaultAction.listenerDefaultAction(), defaultListener: args.defaultAction }
            : { defaultAction: <aws.elasticloadbalancingv2.ListenerArgs["defaultAction"]>args.defaultAction, defaultListener: undefined };
    }

    const targetGroup = new ApplicationTargetGroup(name, { loadBalancer, port, protocol }, opts);
    return { defaultAction: targetGroup.listenerDefaultAction(), defaultListener: targetGroup };
}

export interface ApplicationLoadBalancerArgs {
    // Properties from LoadBalancerArgs

    /**
     * The vpc this load balancer will be used with.  Defaults to `[Vpc.getDefault]` if
     * unspecified.
     */
    vpc?: x.ec2.Vpc;

    /**
     * Whether or not the load balancer is exposed to the internet. Defaults to `false` if
     * unspecified.
     */
    external?: boolean;

    /**
     * If true, deletion of the load balancer will be disabled via the AWS API. This will prevent
     * Terraform from deleting the load balancer. Defaults to `false`.
     */
    enableDeletionProtection?: boolean;

    /**
     * The type of IP addresses used by the subnets for your load balancer. The possible values are
     * `ipv4` and `dualstack`
     */
    ipAddressType?: "ipv4" | "dualstack";

    /**
     * A subnet mapping block as documented below.
     */
    subnetMappings?: aws.elasticloadbalancingv2.LoadBalancerArgs["subnetMappings"];

    /**
     * A list of subnet IDs to attach to the LB. Subnets cannot be updated for Load Balancers of
     * type `network`. Changing this value for load balancers of type `network` will force a
     * recreation of the resource.
     */
    subnets?: string[] | x.elasticloadbalancingv2.LoadBalancerSubnets;

    /**
     * A mapping of tags to assign to the resource.
     */
    tags?: aws.Tags;

    // Properties added here.

    /**
     * An Access Logs block. Access Logs documented below.
     */
    accessLogs?: aws.elasticloadbalancingv2.LoadBalancerArgs["accessLogs"];

    /**
     * Indicates whether HTTP/2 is enabled. Defaults to `true`.
     */
    enableHttp2?: boolean;

    /**
     * The time in seconds that the connection is allowed to be idle. Default: 60.
     */
    idleTimeout?: number;

    /**
     * A list of security group IDs to assign to the LB.
     */
    securityGroups?: x.ec2.SecurityGroupOrId[];
}

export interface ApplicationTargetGroupArgs {
    /**
     * The vpc this load balancer will be used with.  Defaults to `[Vpc.getDefault]` if
     * unspecified.
     */
    vpc?: x.ec2.Vpc;

    /**
     * The load balancer this target group is associated with.  If not provided, a new load balancer
     * will be automatically created.
     */
    loadBalancer?: ApplicationLoadBalancer;

    // Copied from TargetGroupArgs

    /**
     * The amount time for Elastic Load Balancing to wait before changing the state of a
     * deregistering target from draining to unused. The range is 0-3600 seconds. The default value
     * is 300 seconds.
     */
    deregistrationDelay?: number;

    /**
     * A Health Check block. Health Check blocks are documented below.
     */
    healthCheck?: aws.elasticloadbalancingv2.TargetGroupArgs["healthCheck"];

    /**
     * Boolean to enable / disable support for proxy protocol v2 on Network Load Balancers. See
     * [doc](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html#proxy-protocol)
     * for more information.
     */
    proxyProtocolV2?: boolean;

    /**
     * The amount time for targets to warm up before the load balancer sends them a full share of
     * requests. The range is 30-900 seconds or 0 to disable. The default value is 0 seconds.
     */
    slowStart?: number;

    /**
     * A Stickiness block. Stickiness blocks are documented below. `stickiness` is only valid if
     * used with Load Balancers of type `Application`
     */
    stickiness?: aws.elasticloadbalancingv2.TargetGroupArgs["stickiness"];

    /**
     * A mapping of tags to assign to the resource.
     */
    tags?: aws.Tags;

    /**
     * The type of target that you must specify when registering targets with this target group. The
     * possible values are `instance` (targets are specified by instance ID) or `ip` (targets are
     * specified by IP address). The default is `ip`.
     *
     * Note that you can't specify targets for a target group using both instance IDs and IP
     * addresses. If the target type is `ip`, specify IP addresses from the subnets of the virtual
     * private cloud (VPC) for the target group, the RFC 1918 range (10.0.0.0/8, 172.16.0.0/12, and
     * 192.168.0.0/16), and the RFC 6598 range (100.64.0.0/10). You can't specify publicly routable
     * IP addresses.
     */
    targetType?: "instance" | "ip";

    // Changed by us:

    /**
     * The port to use to connect with the target. Valid values are either ports 1-65536. If
     * unspecified will be inferred from the [protocol].
     */
    port?: number;

    /**
     * The protocol to use to connect with the target.  If unspecified will be inferred from [port].
     */
    protocol?: ApplicationProtocol;
}

export interface ApplicationListenerArgs {
    /**
     * The vpc this load balancer will be used with.  Defaults to `[Vpc.getDefault]` if
     * unspecified.
     */
    vpc?: x.ec2.Vpc;

    /**
     * The load balancer this listener is associated with.  If not provided, a new load balancer
     * will be automatically created.
     */
    loadBalancer?: ApplicationLoadBalancer;

    /**
     * The port. Specify a value from `1` to `65535`.  Computed from "protocol" if not provided.
     */
    port?: number;

    /**
     * The protocol. Valid values are `HTTP`, `HTTPS`.  Computed from "port" if not provided.
     */
    protocol?: ApplicationProtocol;

    /**
     * An Action block. Action blocks are documented below.  If not provided, a suitable
     * defaultAction will be chosen that forwards to a new [NetworkTargetGroup] created from [port].
     */
    defaultAction?: aws.elasticloadbalancingv2.ListenerArgs["defaultAction"] | x.elasticloadbalancingv2.ListenerDefaultAction;

    // TODO: consider extracting out an HttpsApplicationListener.

    /**
     * The ARN of the default SSL server certificate. Exactly one certificate is required if the
     * protocol is HTTPS. For adding additional SSL certificates, see the
     * [`aws_lb_listener_certificate`
     * resource](https://www.terraform.io/docs/providers/aws/r/lb_listener_certificate.html).
     */
    certificateArn?: string;

    /**
     * The name of the SSL Policy for the listener. Required if `protocol` is `HTTPS`.
     */
    sslPolicy?: string;

    /**
     * If the listener should be available externally.  If this is [true] and the LoadBalancer for
     * this Listener is [external=true], then this listener is available to the entire internet.  If
     * this is [tru]e and the LoadBalancer is [external=false], then this listener is available to
     * everything in the LoadBalancer's VPC.
     *
     * If this is [false] then access will controlled entirely by the egress an ingress rules of the
     * security groups of the LoadBalancer.
     *
     * Defaults to [true].
     */
    external?: boolean;
}
