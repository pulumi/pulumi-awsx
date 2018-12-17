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

import * as x from "..";
import { Network } from "./../../network";

import * as utils from "./../../utils";

export abstract class TargetGroup
        extends pulumi.ComponentResource
        implements x.ecs.ContainerPortMappings, x.elasticloadbalancingv2.ListenerDefaultAction {

    public readonly instance: aws.elasticloadbalancingv2.TargetGroup;
    public readonly network: Network;

    public readonly listeners: x.elasticloadbalancingv2.Listener[] = [];

    constructor(type: string, name: string, args: TargetGroupArgs, opts?: pulumi.ComponentResourceOptions) {
        super(type, name, {}, opts);

        const parentOpts = { parent: this };

        const longName = `${name}`;
        const shortName = utils.sha1hash(`${longName}`);

        this.network = args.network;
        this.instance = new aws.elasticloadbalancingv2.TargetGroup(shortName, {
            ...args,
            vpcId: this.network.vpcId,
            protocol: utils.ifUndefined(args.protocol, "HTTP"),
            deregistrationDelay: utils.ifUndefined(args.deregistrationDelay, 300),
            targetType: utils.ifUndefined(args.targetType, "ip"),
            tags: utils.mergeTags(args.tags, { Name: longName }),
        }, parentOpts);
    }

    private dependencies() {
        // Return an output that depends on our listeners.  That way anything that depends on us
        // will only proceed once our load balancer connections have been created.
        return pulumi.output(this.listeners.map(r => r.instance.urn));
    }

    public containerPortMappings(): pulumi.Input<pulumi.Input<aws.ecs.PortMapping>[]> {
        return pulumi.output([this.instance.port, this.dependencies()]).apply(([port]) => [{
            containerPort: +port,
        }]);
    }

    public containerLoadBalancers(): pulumi.Input<pulumi.Input<x.ecs.ContainerLoadBalancer>[]> {
        return this.dependencies().apply(_ => [{
            containerPort: this.instance.port,
            targetGroupArn: this.instance.arn,
        }]);
    }

    public listenerDefaultAction(): aws.elasticloadbalancingv2.ListenerArgs["defaultAction"] {
        return this.dependencies().apply(_ => ({
            targetGroupArn: this.instance.arn,
            type: "forward",
        }));
    }

    /** Do not call directly.  Intended for use by [Listener] and [ListenerRule] */
    public registerListener(listener: x.elasticloadbalancingv2.Listener) {
        this.listeners.push(listener);
    }
}

export interface TargetGroupArgs {
    /**
     * The network for this target group.
     */
    network: Network;

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
     * The port to use to connect with the target. Valid values are either ports 1-65536, or
     * `traffic-port`. Defaults to `traffic-port`.
     */
    port: pulumi.Input<number>;

    /**
     * The protocol to use to connect with the target.
     */
    protocol: pulumi.Input<"HTTP" | "HTTPS" | "TCP">;

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
}
