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
import * as utils from "./../utils";

export abstract class TargetGroup
    extends pulumi.ComponentResource
    implements x.ecs.ContainerPortMappingProvider,
    x.ecs.ContainerLoadBalancerProvider,
    x.elasticloadbalancingv2.ListenerDefaultAction {

    public readonly loadBalancer: mod.LoadBalancer;
    public readonly targetGroup: aws.elasticloadbalancingv2.TargetGroup;
    public readonly vpc: x.ec2.Vpc;

    public readonly listeners: x.elasticloadbalancingv2.Listener[] = [];

    constructor(type: string, name: string, loadBalancer: mod.LoadBalancer,
                args: TargetGroupArgs, opts: pulumi.ComponentResourceOptions = {}) {
        // We want our parent to the be the ALB by default if nothing else is specified.
        // Create an alias from our old name where we didn't parent by default to keep
        // resources from being created/destroyed.
        super(type, name, {}, {
            parent: loadBalancer,
            ...utils.withAlias(opts, pulumi.createUrn(name, type, opts.parent)),
        });

        const longName = `${name}`;
        const shortName = args.name || utils.sha1hash(`${longName}`);

        this.vpc = args.vpc;
        this.targetGroup = new aws.elasticloadbalancingv2.TargetGroup(shortName, {
            ...args,
            vpcId: this.vpc.id,
            protocol: utils.ifUndefined(args.protocol, "HTTP"),
            deregistrationDelay: utils.ifUndefined(args.deregistrationDelay, 300),
            targetType: utils.ifUndefined(args.targetType, "ip"),
            tags: utils.mergeTags(args.tags, { Name: longName }),
        }, { parent: this });

        this.loadBalancer = loadBalancer;
    }

    private dependencies() {
        // Return an output that depends on our listeners.  That way anything that depends on us
        // will only proceed once our load balancer connections have been created.
        return pulumi.output(this.listeners.map(r => r.listener.urn));
    }

    public containerPortMapping(): pulumi.Input<aws.ecs.PortMapping> {
        return pulumi.output([this.targetGroup.port, this.dependencies()]).apply(([port]) => ({
            containerPort: +port!,
        }));
    }

    public containerLoadBalancer(): pulumi.Input<x.ecs.ContainerLoadBalancer> {
        return this.dependencies().apply(_ => ({
            containerPort: this.targetGroup.port.apply(p => p!),
            targetGroupArn: this.targetGroup.arn,
        }));
    }

    public listenerDefaultAction(): pulumi.Input<mod.ListenerDefaultActionArgs> {
        return this.dependencies().apply(_ => ({
            targetGroupArn: this.targetGroup.arn,
            type: "forward",
        }));
    }

    /** Do not call directly.  Intended for use by [Listener] and [ListenerRule] */
    public registerListener(listener: x.elasticloadbalancingv2.Listener) {
        this.listeners.push(listener);
    }

    /**
     * Attaches a target to this target group.  See
     * [Register-Targets](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-register-targets.html)
     * for more details.
     */
    public attachTarget(name: string, args: mod.LoadBalancerTarget, opts: pulumi.CustomResourceOptions = {}) {
        return new mod.TargetGroupAttachment(name, this, args, opts);
    }
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
export interface TargetGroupHealthCheck {
    /**
     * The approximate amount of time, in seconds, between health checks of an individual
     * target. Minimum value 5 seconds, Maximum value 300 seconds. For lambda target groups, it
     * needs to be greater as the [timeout] of the underlying [lambda]. Default 30 seconds.
     */
    interval?: pulumi.Input<number>;

    /**
     * The HTTP codes to use when checking for a successful response from a target. You can specify
     * multiple values (for example, "200,202") or a range of values (for example, "200-299").
     * Applies to Application Load Balancers only (HTTP/HTTPS), not Network Load Balancers (TCP)
     */
    matcher?: pulumi.Input<string>;

    /**
     * (Required for HTTP/HTTPS ALB) The destination for the health check request. Applies to
     * Application Load Balancers only (HTTP/HTTPS), not Network Load Balancers (TCP).
     */
    path?: pulumi.Input<string>;

    /**
     * The port to use to connect with the target.
     */
    port?: pulumi.Input<string>;

    /**
     * The protocol to use to connect with the target. Defaults to HTTP. Not applicable when
     * target_type is [lambda].
     */
    protocol?: pulumi.Input<string>;

    /**
     * The amount of time, in seconds, during which no response means a failed health check. For
     * Application Load Balancers, the range is 2 to 60 seconds and the default is 5 seconds.
     * For Network Load Balancers, you cannot set a custom value, and the default is 10 seconds
     * for TCP and HTTPS health checks and 6 seconds for HTTP health checks.
     */
    timeout?: pulumi.Input<number>;

    /**
    * The number of consecutive health checks successes required before considering an
    * unhealthy target healthy. Defaults to 3.
    */
    healthyThreshold?: pulumi.Input<number>;

    /**
     * The number of consecutive health check failures required before considering the target
     * unhealthy . For Network Load Balancers, this value must be the same as the
     * healthy_threshold. Defaults to 3.
     */
    unhealthyThreshold?: pulumi.Input<number>;
}

export interface TargetGroupArgs {
    /**
     * The vpc for this target group.
     */
    vpc: x.ec2.Vpc;

    /**
     * The name of the TargetGroup. If not specified, the [name] parameter passed into the
     * TargetGroup constructor will be hashed and used as the name.
     */
    name?: string;

    /**
     * The amount time for Elastic Load Balancing to wait before changing the state of a
     * deregistering target from draining to unused. The range is 0-3600 seconds. The default value
     * is 300 seconds.
     */
    deregistrationDelay?: pulumi.Input<number>;

    /**
     * Health check parameters for this target group.
     */
    healthCheck?: pulumi.Input<TargetGroupHealthCheck>;

    /**
     * The port to use to connect with the target. Valid values are either ports 1-65536, or
     * `traffic-port`. Defaults to `traffic-port`.
     */
    port: pulumi.Input<number>;

    /**
     * The protocol to use to connect with the target.
     */
    protocol: pulumi.Input<"HTTP" | "HTTPS" | "TCP" | "TLS">;

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
     * specified by IP address) or `lambda` (targets are specified by lambda arn). The default is
     * `ip`. Note that you can't specify targets for a target group using both instance IDs
     * and IP addresses. If the target type is `ip`, specify IP addresses from the subnets of the
     * virtual private cloud (VPC) for the target group, the RFC 1918 range (10.0.0.0/8,
     * 172.16.0.0/12, and 192.168.0.0/16), and the RFC 6598 range (100.64.0.0/10). You can't specify
     * publicly routable IP addresses.
     */
    targetType?: pulumi.Input<TargetType>;
}

/**
 * The type of target that you must specify when registering targets with a target group. The
 * possible values are `instance` (targets are specified by instance ID) or `ip` (targets are
 * specified by IP address) or `lambda` (targets are specified by lambda arn). The default is `ip`.
 * Note that you can't specify targets for a target group using both instance IDs and IP addresses.
 * If the target type is `ip`, specify IP addresses from the subnets of the virtual private cloud
 * (VPC) for the target group, the RFC 1918 range (10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16),
 * and the RFC 6598 range (100.64.0.0/10). You can't specify publicly routable IP addresses.
 *
 * Network Load Balancers do not support the lambda target type, only Application Load Balancers
 * support the lambda target type. For more information, see
 * [Lambda-Functions-as-Targets](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/lambda-functions.html#register-lambda-function)
 * in the User Guide for Application Load Balancers.
 */
export type TargetType = "instance" | "ip" | "lambda";
