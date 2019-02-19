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

export class NetworkLoadBalancer extends mod.LoadBalancer {
    public readonly listeners: NetworkListener[];
    public readonly targetGroups: NetworkTargetGroup[];

    constructor(name: string, args: NetworkLoadBalancerArgs = {}, opts?: pulumi.ComponentResourceOptions) {
        const argsCopy: x.elasticloadbalancingv2.LoadBalancerArgs = {
            ...args,
            loadBalancerType: "network",
        };

        super("awsx:x:elasticloadbalancingv2:NetworkLoadBalancer", name, argsCopy, opts);

        this.listeners = [];
        this.targetGroups = [];

        this.registerOutputs({});
    }

    public createListener(name: string, args: NetworkListenerArgs, opts?: pulumi.ComponentResourceOptions) {
        return new NetworkListener(name, {
            loadBalancer: this,
            ...args,
        }, opts || { parent: this });
    }

    public createTargetGroup(name: string, args: NetworkTargetGroupArgs, opts?: pulumi.ComponentResourceOptions) {
        return new NetworkTargetGroup(name, {
            loadBalancer: this,
            ...args,
        }, opts || { parent: this });
    }
}

/**
 * Each target group is used to route requests to one or more registered targets. When you create
 * each listener rule, you specify a target group and conditions. When a rule condition is met,
 * traffic is forwarded to the corresponding target group. You can create different target groups
 * for different types of requests. For example, create one target group for general requests and
 * other target groups for requests to the microservices for your application.

 * You define health check settings for your load balancer on a per target group basis. Each target
 * group uses the default health check settings, unless you override them when you create the target
 * group or modify them later on. After you specify a target group in a rule for a listener, the
 * load balancer continually monitors the health of all targets registered with the target group
 * that are in an Availability Zone enabled for the load balancer. The load balancer routes requests
 * to the registered targets that are healthy.
 *
 * See https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
 * for more details.
 */
export class NetworkTargetGroup extends mod.TargetGroup {
    public readonly loadBalancer: NetworkLoadBalancer;

    public readonly listeners: x.elasticloadbalancingv2.NetworkListener[];

    constructor(name: string, args: NetworkTargetGroupArgs, opts?: pulumi.ComponentResourceOptions) {
        const loadBalancer = args.loadBalancer || new NetworkLoadBalancer(name, { vpc: args.vpc }, opts);
        super("awsx:x:elasticloadbalancingv2:NetworkTargetGroup", name, {
            ...args,
            vpc: loadBalancer.vpc,
            protocol: "TCP",
        }, opts || { parent: loadBalancer });

        this.loadBalancer = loadBalancer;
        loadBalancer.targetGroups.push(this);

        this.registerOutputs({});
    }

    public createListener(name: string, args: NetworkListenerArgs,
                          opts?: pulumi.ComponentResourceOptions): NetworkListener {
        return new NetworkListener(name, {
            defaultAction: this,
            loadBalancer: this.loadBalancer,
            ...args,
        }, opts || { parent: this });
    }
}

/**
 * A listener is a process that checks for connection requests, using the protocol and port that you
 * configure. The rules that you define for a listener determine how the load balancer routes
 * requests to the targets in one or more target groups.
 *
 * See https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-listeners.html
 * for more details.
 */
export class NetworkListener
        extends mod.Listener
        implements x.apigateway.IntegrationRouteTargetProvider {

    public readonly loadBalancer: NetworkLoadBalancer;
    public readonly defaultTargetGroup?: x.elasticloadbalancingv2.NetworkTargetGroup;

    constructor(name: string,
                args: NetworkListenerArgs,
                opts?: pulumi.ComponentResourceOptions) {
        const loadBalancer = args.loadBalancer || new NetworkLoadBalancer(name, { vpc: args.vpc }, opts);
        const { defaultAction, defaultListener } = getDefaultAction(name, loadBalancer, args, opts);

        super("awsx:x:elasticloadbalancingv2:NetworkListener", name, defaultListener, {
            ...args,
            defaultAction,
            loadBalancer,
            protocol: "TCP",
        }, opts || { parent: loadBalancer });

        this.loadBalancer = loadBalancer;
        loadBalancer.listeners.push(this);

        this.registerOutputs({});
    }

    public target(name: string, parent: pulumi.Resource): pulumi.Input<x.apigateway.IntegrationTarget> {
        // create a VpcLink to the load balancer in the VPC
        const vpcLink = new aws.apigateway.VpcLink(name, {
            targetArn: this.loadBalancer.loadBalancer.arn,
        }, { parent });

        return this.endpoint.apply(ep => ({
            uri: `http://${ep.hostname}:${ep.port}/`,
            type: <x.apigateway.IntegrationType>"http_proxy",
            connectionType: <x.apigateway.IntegrationConnectionType>"VPC_LINK",
            connectionId: vpcLink.id,
        }));
    }
}

function getDefaultAction(
        name: string,
        loadBalancer: NetworkLoadBalancer,
        args: NetworkListenerArgs,
        opts: pulumi.ComponentResourceOptions | undefined) {
    if (args.defaultAction) {
        return x.elasticloadbalancingv2.isListenerDefaultAction(args.defaultAction)
            ? { defaultAction: args.defaultAction.listenerDefaultAction(), defaultListener: args.defaultAction }
            : { defaultAction: args.defaultAction, defaultListener: undefined };
    }

    const targetGroup = new NetworkTargetGroup(name, { loadBalancer, port: args.port }, opts);
    return { defaultAction: targetGroup.listenerDefaultAction(), defaultListener: targetGroup };
}

export interface NetworkLoadBalancerArgs {
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
     * If true, cross-zone load balancing of the load balancer will be enabled.  Defaults to `false`.
     */
    enableCrossZoneLoadBalancing?: pulumi.Input<boolean>;
}

export interface NetworkTargetGroupArgs {
    /**
     * The vpc this load balancer will be used with.  Defaults to `[Vpc.getDefault]` if
     * unspecified.
     */
    vpc?: x.ec2.Vpc;

    /**
     * The load balancer this target group is associated with.  If not provided, a new load balancer
     * will be automatically created.
     */
    loadBalancer?: NetworkLoadBalancer;

    // Copied from TargetGroupArgs.

    /**
     * The port to use to connect with the target. Valid values are either ports 1-65536, or
     * `traffic-port`. Defaults to `traffic-port`.
     */
    port: pulumi.Input<number>;

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
     * specified by IP address). The default is `ip`.
     *
     * Note that you can't specify targets for a target group using both instance IDs and IP
     * addresses. If the target type is `ip`, specify IP addresses from the subnets of the virtual
     * private cloud (VPC) for the target group, the RFC 1918 range (10.0.0.0/8, 172.16.0.0/12, and
     * 192.168.0.0/16), and the RFC 6598 range (100.64.0.0/10). You can't specify publicly routable
     * IP addresses.
     */
    targetType?: pulumi.Input<"instance" | "ip">;
}

export interface NetworkListenerArgs {
    /**
     * The vpc this load balancer will be used with.  Defaults to `[Vpc.getDefault]` if
     * unspecified.
     */
    vpc?: x.ec2.Vpc;

    /**
     * The load balancer this listener is associated with.  If not provided, a new load balancer
     * will be automatically created.
     */
    loadBalancer?: NetworkLoadBalancer;

    /**
     * The port. Specify a value from `1` to `65535`.
     */
    port: pulumi.Input<number>;

    /**
     * An Action block. Action blocks are documented below.  If not provided, a suitable
     * defaultAction will be chosen that forwards to a new [NetworkTargetGroup] created from [port].
     */
    defaultAction?: aws.elasticloadbalancingv2.ListenerArgs["defaultAction"] | x.elasticloadbalancingv2.ListenerDefaultAction;
}
