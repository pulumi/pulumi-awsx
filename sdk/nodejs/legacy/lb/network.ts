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

import * as utils from "../utils";

export type NetworkProtocol = "HTTP" | "HTTPS" | "TCP" | "TLS" | "GENEVE" | "UDP" | "TCP_UDP";

export class NetworkLoadBalancer extends mod.LoadBalancer {
    public readonly listeners: NetworkListener[];
    public readonly targetGroups: NetworkTargetGroup[];

    constructor(name: string, args: NetworkLoadBalancerArgs = {}, opts: pulumi.ComponentResourceOptions = {}) {
        const argsCopy: x.lb.LoadBalancerArgs = {
            ...args,
            loadBalancerType: "network",
        };

        opts = pulumi.mergeOptions(opts, { aliases: [{ type: "awsx:x:elasticloadbalancingv2:NetworkLoadBalancer" }] });
        super("awsx:lb:NetworkLoadBalancer", name, argsCopy, opts);

        this.listeners = [];
        this.targetGroups = [];

        this.registerOutputs();
    }

    public createListener(name: string, args: NetworkListenerArgs, opts: pulumi.ComponentResourceOptions = {}) {
        return new NetworkListener(name, {
            loadBalancer: this,
            ...args,
        }, { parent: this, ...opts });
    }

    public createTargetGroup(name: string, args: NetworkTargetGroupArgs, opts: pulumi.ComponentResourceOptions = {}) {
        return new NetworkTargetGroup(name, {
            loadBalancer: this,
            ...args,
        }, { parent: this, ...opts });
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

    public readonly listeners: x.lb.NetworkListener[];

    constructor(name: string, args: NetworkTargetGroupArgs, opts: pulumi.ComponentResourceOptions = {}) {
        const loadBalancer = args.loadBalancer || new NetworkLoadBalancer(name, {
            vpc: args.vpc,
            name: args.name,
        }, opts);
        const protocol = utils.ifUndefined(args.protocol, "TCP" as NetworkProtocol);

        opts = pulumi.mergeOptions(opts, { aliases: [{ type: "awsx:x:elasticloadbalancingv2:NetworkTargetGroup" }] });
        super("awsx:lb:NetworkTargetGroup", name, loadBalancer, {
            ...args,
            protocol,
            vpc: loadBalancer.vpc,
        }, { parent: loadBalancer, ...opts });

        this.listeners = [];
        this.loadBalancer = loadBalancer;
        loadBalancer.targetGroups.push(this);

        this.registerOutputs();
    }

    public createListener(name: string, args: NetworkListenerArgs,
                          opts: pulumi.ComponentResourceOptions = {}): NetworkListener {
        return new NetworkListener(name, {
            defaultAction: this,
            loadBalancer: this.loadBalancer,
            ...args,
        }, { parent: this, ...opts });
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
    public readonly defaultTargetGroup?: x.lb.NetworkTargetGroup;

    // tslint:disable-next-line:variable-name
    private readonly __isNetworkListenerInstance: boolean;

    constructor(name: string,
                args: NetworkListenerArgs,
                opts: pulumi.ComponentResourceOptions = {}) {

        const argCount = (args.defaultAction ? 1 : 0) +
                         (args.defaultActions ? 1 : 0) +
                         (args.targetGroup ? 1 : 0);

        if (argCount >= 2) {
            throw new Error("Only provide one of [defaultAction], [defaultActions] or [targetGroup].");
        }

        const loadBalancer = pulumi.Resource.isInstance(args.loadBalancer)
            ? args.loadBalancer
            : new NetworkLoadBalancer(name, {
                ...args.loadBalancer,
                vpc: args.vpc,
                name: args.name,
            }, opts);

        const { defaultActions, defaultListener } = getDefaultActions(name, loadBalancer, args, opts);
        const protocol = utils.ifUndefined(args.protocol, "TCP" as NetworkProtocol);

        opts = pulumi.mergeOptions(opts, { aliases: [{ type: "awsx:x:elasticloadbalancingv2:NetworkListener" }] });
        super("awsx:lb:NetworkListener", name, defaultListener, {
            ...args,
            protocol,
            loadBalancer,
            defaultActions,
        }, opts);

        this.__isNetworkListenerInstance = true;
        this.loadBalancer = loadBalancer;
        loadBalancer.listeners.push(this);

        this.registerOutputs();
    }

    /** @internal */
    public static isNetworkListenerInstance(obj: any): obj is NetworkListener {
        return obj && !!(<NetworkListener>obj).__isNetworkListenerInstance;
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

function getDefaultActions(
        name: string,
        loadBalancer: NetworkLoadBalancer,
        args: NetworkListenerArgs,
        opts: pulumi.ComponentResourceOptions | undefined) {

    if (args.defaultActions) {
        return { defaultActions: args.defaultActions, defaultListener: undefined };
    }

    if (args.defaultAction) {
        return x.lb.isListenerDefaultAction(args.defaultAction)
            ? { defaultActions: [args.defaultAction.listenerDefaultAction()], defaultListener: args.defaultAction }
            : { defaultActions: [args.defaultAction], defaultListener: undefined };
    }

    // User didn't provide default actions for this listener.  Create a reasonable target group for
    // us and use that as our default action.
    const targetGroup = createTargetGroup();

    return { defaultActions: [targetGroup.listenerDefaultAction()], defaultListener: targetGroup };

    function createTargetGroup() {
        // Use the target group if provided by the client.  Otherwise, create a reasonable default
        // one for our LB that will connect to this listener's port.
        if (pulumi.Resource.isInstance(args.targetGroup)) {
            return args.targetGroup;
        }
        else if (args.targetGroup) {
            return new NetworkTargetGroup(name, {
                ...args.targetGroup,
                loadBalancer,
            }, opts);
        }
        else {
            return new NetworkTargetGroup(name, {
                loadBalancer,
                name: args.name,
                port: args.port,
            }, opts);
        }
    }
}

export interface NetworkLoadBalancerArgs {
    // Properties from LoadBalancerArgs

    /**
     * An existing aws.lb.LoadBalancer to use for this awsx.lb.LoadBalancer.
     * If this value is set then all other arguments are ignored.
     * If not provided, one will be created.
     */
    loadBalancer?: aws.lb.LoadBalancer;

    /**
     * The vpc this load balancer will be used with.  Defaults to `[Vpc.getDefault]` if
     * unspecified.
     */
    vpc?: x.ec2.Vpc;

    /**
     * The name of the LoadBalancer. This name must be unique within your AWS account, can have a
     * maximum of 32 characters, must contain only alphanumeric characters or hyphens, and must not
     * begin or end with a hyphen. If not specified, the [name] parameter passed into the
     * LoadBalancer constructor will be hashed and used as the name.
     */
    name?: string;

    /**
     * Whether or not the load balancer is exposed to the internet. Defaults to `true` if
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
    subnetMappings?: aws.lb.LoadBalancerArgs["subnetMappings"];

    /**
     * A list of subnet IDs to attach to the LB. Subnets cannot be updated for Load Balancers of
     * type `network`. Changing this value for load balancers of type `network` will force a
     * recreation of the resource.
     */
    subnets?: pulumi.Input<pulumi.Input<string>[]> | x.lb.LoadBalancerSubnets;

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

/**
 * A Health Check block.
 *
 * The Health Check parameters you can set vary by the protocol of the Target Group. Many
 * parameters cannot be set to custom values for network load balancers at this time. See
 * http://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_CreateTargetGroup.html
 * for a complete reference. Keep in mind, that health checks produce actual requests to the
 * backend. The underlying function is invoked when target_type is set to lambda.
 */
export interface NetworkTargetGroupHealthCheck extends mod.TargetGroupHealthCheck {
    /**
     * For Network Load Balancers, you cannot set a custom value, and the default is 10 seconds
     * for TCP and HTTPS health checks and 6 seconds for HTTP health checks.
     */
    timeout?: never;
}

export interface NetworkTargetGroupArgs {
    /**
     * An existing aws.lb.TargetGroup to use for this awsx.lb.TargetGroup.
     * If not provided, one will be created.
     */
    targetGroup?: aws.lb.TargetGroup;

    /**
     * The vpc this load balancer will be used with.  Defaults to `[Vpc.getDefault]` if
     * unspecified.
     */
    vpc?: x.ec2.Vpc;

    /**
     * The name of the TargetGroup. If not specified, the [name] parameter passed into the
     * TargetGroup constructor will be hashed and used as the name.  If a [loadBalancer] is not
     * provided, this name will be used to name that resource as well.
     */
    name?: string;

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
     * The protocol for connections from clients to the load balancer. Valid values are TCP, TLS,
     * HTTP and HTTPS. Defaults to TCP.
     */
    protocol?: pulumi.Input<NetworkProtocol>;

    /**
     * The amount time for Elastic Load Balancing to wait before changing the state of a
     * deregistering target from draining to unused. The range is 0-3600 seconds. The default value
     * is 300 seconds.
     */
    deregistrationDelay?: pulumi.Input<number>;

    /**
     * A Health Check block. Health Check blocks are documented below.
     */
    healthCheck?: pulumi.Input<NetworkTargetGroupHealthCheck>;

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
    stickiness?: aws.lb.TargetGroupArgs["stickiness"];

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
     * An existing aws.lb.Listener to use for this awsx.lb.Listener.
     * If not provided, one will be created.
     */
    listener?: aws.lb.Listener;

    /**
     * The vpc this load balancer will be used with.  Defaults to `[Vpc.getDefault]` if
     * unspecified.
     */
    vpc?: x.ec2.Vpc;

    /**
     * An explicit name to use for dependent resources.  Specifically, if a LoadBalancer or
     * TargetGroup is not provided, this name will be used to name those resources.
     */
    name?: string;

    /**
     * The load balancer this listener is associated with.  If not provided, a new load balancer
     * will be automatically created.
     */
    loadBalancer?: NetworkLoadBalancer | NetworkLoadBalancerArgs;

    /**
     * The port. Specify a value from `1` to `65535`.
     */
    port: pulumi.Input<number>;

    /**
     * The protocol for connections from clients to the load balancer. Valid values are TCP, TLS,
     * HTTP and HTTPS. Defaults to TCP.
     */
    protocol?: pulumi.Input<NetworkProtocol>;

    /**
     * An Action block. If neither this nor [defaultActions] is provided, a suitable defaultAction
     * will be chosen that forwards to a new [NetworkTargetGroup] created from [port].
     *
     * Only provide one of [defaultAction], [defaultActions] or [targetGroup]
     */
    defaultAction?: pulumi.Input<mod.ListenerDefaultActionArgs> | x.lb.ListenerDefaultAction;

    /**
     * An list of Action blocks. If neither this nor [defaultAction] is provided, a suitable
     * defaultAction will be chosen that forwards to a new [NetworkTargetGroup] created from
     * [port].
     *
     * Only provide one of [defaultAction], [defaultActions] or [targetGroup]
     */
    defaultActions?: pulumi.Input<pulumi.Input<mod.ListenerDefaultActionArgs>[]>;

    /**
     * Target group this listener is associated with.  This is used to determine the [defaultAction]
     * for the listener.
     *
     * Only provide one of [defaultAction], [defaultActions] or [targetGroup]
     */
    targetGroup?: x.lb.NetworkTargetGroup | x.lb.NetworkTargetGroupArgs;

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
