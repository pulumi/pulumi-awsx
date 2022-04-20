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

    constructor(name: string, args: ApplicationLoadBalancerArgs = {}, opts: pulumi.ComponentResourceOptions = {}) {
        const argsCopy: x.lb.LoadBalancerArgs = {
            vpc: args.vpc || x.ec2.Vpc.getDefault(opts),
            ...args,
            loadBalancerType: "application",
        };

        if (!argsCopy.securityGroups) {
            argsCopy.securityGroups = [new x.ec2.SecurityGroup(name, {
                description: `Default security group for ALB: ${name}`,
                vpc: argsCopy.vpc,
            }, opts)];
        }

        super("aws:lb:ApplicationLoadBalancer", name, argsCopy,
            pulumi.mergeOptions(opts, { aliases: [{ type: "awsx:x:elasticloadbalancingv2:ApplicationLoadBalancer"}] }));

        this.listeners = [];
        this.targetGroups = [];

        this.registerOutputs();
    }

    /**
     * Creates a new listener for this [ApplicationLoadBalancer] see ApplicationListener for more
     * details.
     */
    public createListener(name: string, args: ApplicationListenerArgs, opts: pulumi.ComponentResourceOptions = {}) {
        return new ApplicationListener(name, {
            loadBalancer: this,
            ...args,
        }, { parent: this, ...opts });
    }

    /**
     * Creates a target group for this [ApplicationLoadBalancer] see ApplicationTargetGroup for more
     * details.
     */
    public createTargetGroup(name: string, args: ApplicationTargetGroupArgs, opts: pulumi.ComponentResourceOptions = {}) {
        return new ApplicationTargetGroup(name, {
            loadBalancer: this,
            ...args,
        }, { parent: this, ...opts });
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

    public readonly listeners: x.lb.ApplicationListener[];

    /** @internal */
    // tslint:disable-next-line:variable-name
    public readonly __isApplicationTargetGroup: boolean;

    constructor(name: string, args: ApplicationTargetGroupArgs = {}, opts: pulumi.ComponentResourceOptions = {}) {
        const loadBalancer = args.loadBalancer || new ApplicationLoadBalancer(name, {
            vpc: args.vpc,
            name: args.name,
        }, opts);
        const { port, protocol } = args.targetGroup ? { port: undefined, protocol: undefined} : computePortInfo(args.port, args.protocol);

        opts = pulumi.mergeOptions(opts, { aliases: [{ type: "awsx:x:elasticloadbalancingv2:ApplicationTargetGroup" }] });
        super("awsx:lb:ApplicationTargetGroup", name, loadBalancer, {
            ...args,
            vpc: loadBalancer.vpc,
            port,
            protocol,
        }, opts);

        this.__isApplicationTargetGroup = true;

        this.listeners = [];
        this.loadBalancer = loadBalancer;
        loadBalancer.targetGroups.push(this);

        this.registerOutputs();
    }

    public createListener(name: string, args: ApplicationListenerArgs,
                          opts: pulumi.ComponentResourceOptions = {}): ApplicationListener {
        // We didn't use to parent the listener to the target group.  Now we do.  Create an alias
        // from the old parent to the current one if this moves over.
        return new ApplicationListener(name, {
            defaultAction: this,
            loadBalancer: this.loadBalancer,
            ...args,
        }, {
            parent: this,
            ...pulumi.mergeOptions(opts, { aliases: [{ parent: opts.parent }] }),
        });
    }

    public static isInstance(obj: any): obj is ApplicationTargetGroup {
        return utils.isInstance<ApplicationTargetGroup>(obj, "__isApplicationTargetGroup");
    }
}

function computePortInfo(
    port?: pulumi.Input<number | undefined>,
    protocol?: pulumi.Input<ApplicationProtocol>) {

    if (port === undefined && protocol === undefined) {
        throw new Error("At least one of [port] or [protocol] must be provided.");
    }

    const computedPort = pulumi.all([port, protocol]).apply(([port, protocol]) => {
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

    return { port: computedPort, protocol };
}

export class ApplicationListener extends mod.Listener {
    public readonly loadBalancer: ApplicationLoadBalancer;
    public readonly defaultTargetGroup?: x.lb.ApplicationTargetGroup;

    // tslint:disable-next-line:variable-name
    private readonly __isApplicationListenerInstance: boolean;

    constructor(name: string,
                args: ApplicationListenerArgs,
                opts: pulumi.ComponentResourceOptions = {}) {

        const argCount = (args.defaultAction ? 1 : 0) +
                         (args.defaultActions ? 1 : 0) +
                         (args.targetGroup ? 1 : 0);

        if (argCount >= 2) {
            throw new Error("Only provide one of [defaultAction], [defaultActions] or [targetGroup].");
        }

        const loadBalancer = pulumi.Resource.isInstance(args.loadBalancer)
            ? args.loadBalancer
            : new ApplicationLoadBalancer(name, {
                ...args.loadBalancer,
                vpc: args.vpc,
                name: args.name,
            }, opts);

        const { port, protocol } = computePortInfo(args.port || args.listener?.port,
            args.protocol || (args.listener?.protocol as (pulumi.Output<ApplicationProtocol> | undefined)));
        const { defaultActions, defaultListener } = getDefaultActions(
            name, loadBalancer, args, port, protocol, opts);

        // Pass along the target as the defaultTarget for this listener.  This allows this listener
        // to defer to it for ContainerPortMappings information.  this allows this listener to be
        // passed in as the portMappings information needed for a Service.

        opts = pulumi.mergeOptions(opts, { aliases: [{ type: "awsx:x:elasticloadbalancingv2:ApplicationListener" }] });
        super("awsx:lb:ApplicationListener", name, defaultListener, {
            ...args,
            defaultActions,
            loadBalancer,
            port,
            protocol,
        }, opts);

        this.__isApplicationListenerInstance = true;
        this.loadBalancer = loadBalancer;
        loadBalancer.listeners.push(this);

        // As per https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-update-security-groups.html
        //
        // Whenever you add a listener to your load balancer or update the health check port for a
        // target group used by the load balancer to route requests, you must verify that the
        // security groups associated with the load balancer allow traffic on the new port in both
        // directions.
        if (!args.listener && args.external !== false) {
            const args = {
                location: new x.ec2.AnyIPv4Location(),
                ports: new x.ec2.TcpPorts(port),
                description: pulumi.interpolate`Externally available at port ${port}`,
            };

            for (let i = 0, n = this.loadBalancer.securityGroups.length; i < n; i++) {
                const securityGroup = this.loadBalancer.securityGroups[i];
                securityGroup.createIngressRule(`${name}-external-${i}-ingress`, args, { parent: this });
                securityGroup.createEgressRule(`${name}-external-${i}-egress`, args, { parent: this });
            }
        }

        this.registerOutputs();
    }

    /** @internal */
    public static isApplicationListenerInstance(obj: any): obj is ApplicationListener {
        return obj && !!(<ApplicationListener>obj).__isApplicationListenerInstance;
    }
}

function getDefaultActions(
        name: string, loadBalancer: ApplicationLoadBalancer,
        args: ApplicationListenerArgs,
        port: pulumi.Input<number>,
        protocol: pulumi.Input<ApplicationProtocol>,
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
        // one for our LB that will connect to this listener's port using our app protocol.
        if (pulumi.Resource.isInstance(args.targetGroup)) {
            return args.targetGroup;
        }
        else if (args.targetGroup) {
            return new ApplicationTargetGroup(name, {
                ...args.targetGroup,
                loadBalancer,
            }, opts);
        }
        else {
            return new ApplicationTargetGroup(name, {
                port,
                protocol,
                loadBalancer,
                name: args.name,
            }, opts);
        }
    }
}

export interface ApplicationLoadBalancerArgs {
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
     * An Access Logs block. Access Logs documented below.
     */
    accessLogs?: aws.lb.LoadBalancerArgs["accessLogs"];

    /**
     * Indicates whether HTTP/2 is enabled. Defaults to `true`.
     */
    enableHttp2?: pulumi.Input<boolean>;

    /**
     * The time in seconds that the connection is allowed to be idle. Default: 60.
     */
    idleTimeout?: pulumi.Input<number>;

    /**
     * A list of security group IDs to assign to the ALB.  If not provided, a default instance will
     * be created for the ALB.  To prevent a default instance from being created, pass in an empty
     * array here.
     */
    securityGroups?: x.ec2.SecurityGroupOrId[];
}

/**
 * A Health Check block.
 *
 * The Health Check parameters you can set vary by the protocol of the Target Group. See
 * http://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_CreateTargetGroup.html
 * for a complete reference. Keep in mind, that health checks produce actual requests to the
 * backend. The underlying function is invoked when target_type is set to lambda.
 */
export interface ApplicationTargetGroupHealthCheck extends mod.TargetGroupHealthCheck {
    /**
     * (Required for HTTP/HTTPS ALB) The destination for the health check request.
     */
    path: pulumi.Input<string>;

    /**
     * The amount of time, in seconds, during which no response means a failed health check. For
     * Application Load Balancers, the range is 2 to 60 seconds and the default is 5 seconds.
     */
    timeout?: pulumi.Input<number>;

    /**
     * The number of consecutive health check failures required before considering the target
     * unhealthy. Defaults to 3.
     */
    unhealthyThreshold?: pulumi.Input<number>;
}

export interface ApplicationTargetGroupArgs {
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
    loadBalancer?: ApplicationLoadBalancer;

    // Copied from TargetGroupArgs

    /**
     * The amount time for Elastic Load Balancing to wait before changing the state of a
     * deregistering target from draining to unused. The range is 0-3600 seconds. The default value
     * is 300 seconds.
     */
    deregistrationDelay?: pulumi.Input<number>;

    /**
     * A Health Check block.
     */
    healthCheck?: pulumi.Input<ApplicationTargetGroupHealthCheck>;

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
     * specified by IP address) or `lambda` (targets are specified by lambda arn). The default is
     * `ip`. Note that you can't specify targets for a target group using both instance IDs and IP
     * addresses. If the target type is `ip`, specify IP addresses from the subnets of the virtual
     * private cloud (VPC) for the target group, the RFC 1918 range (10.0.0.0/8, 172.16.0.0/12, and
     * 192.168.0.0/16), and the RFC 6598 range (100.64.0.0/10). You can't specify publicly routable
     * IP addresses.
     */
    targetType?: pulumi.Input<mod.TargetType>;

    // Changed by us:

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

export interface ApplicationListenerArgs {

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
    loadBalancer?: ApplicationLoadBalancer | ApplicationLoadBalancerArgs;

    /**
     * The port. Specify a value from `1` to `65535`.  Computed from "protocol" if not provided.
     */
    port?: pulumi.Input<number>;

    /**
     * The protocol. Valid values are `HTTP`, `HTTPS`.  Computed from "port" if not provided.
     */
    protocol?: pulumi.Input<ApplicationProtocol>;

    /**
     * An Action block. If neither this nor [defaultActions] is provided, a suitable defaultAction
     * will be chosen that forwards to a new [ApplicationTargetGroup] created from [port].
     *
     * Only provide one of [defaultAction], [defaultActions] or [targetGroup]
     */
    defaultAction?: pulumi.Input<mod.ListenerDefaultActionArgs> | x.lb.ListenerDefaultAction;

    /**
     * An list of Action blocks. If neither this nor [defaultActions] is provided, a suitable
     * defaultAction will be chosen that forwards to a new [ApplicationTargetGroup] created from
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
    targetGroup?: x.lb.ApplicationTargetGroup | x.lb.ApplicationTargetGroupArgs;

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

    /**
     * If the listener should be available externally.
     *
     * If this is [true] and the LoadBalancer for this Listener is [external=true], then this
     * listener is available to the entire internet.  If this is [true] and the LoadBalancer is
     * [external=false], then this listener is available to everything in the LoadBalancer's VPC. In
     * both cases, the security groups for the ALB will all get ingress rules to the port for this
     * listener from any IPv4 location.
     *
     * If this is [false] then access will controlled entirely by the egress and ingress rules of
     * the security groups of the LoadBalancer.  No changes will be made to the security groups of
     * the ALB.
     *
     * Defaults to [true].
     */
    external?: boolean;
}
