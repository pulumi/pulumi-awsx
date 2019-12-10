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

import * as mod from ".";
import * as x from "..";
import * as utils from "./../utils";

export abstract class LoadBalancer extends pulumi.ComponentResource {
    public readonly loadBalancer: aws.lb.LoadBalancer;
    public readonly vpc: x.ec2.Vpc;
    public readonly securityGroups: x.ec2.SecurityGroup[];

    public readonly listeners: mod.Listener[] = [];
    public readonly targetGroups: mod.TargetGroup[] = [];

    constructor(type: string, name: string, args: LoadBalancerArgs, opts: pulumi.ComponentResourceOptions) {
        super(type, name, {}, opts);

        this.vpc = args.vpc || x.ec2.Vpc.getDefault({ parent: this });
        this.securityGroups = x.ec2.getSecurityGroups(this.vpc, name, args.securityGroups, { parent: this }) || [];

        const external = utils.ifUndefined(args.external, true);

        // We used to hash the name of an LB to keep the name short.  This was necessary back when
        // people didn't have direct control over creating the LB.  In awsx though creating the LB
        // is easy to do, so we just let the user pass in the name they want.  We simply add an
        // alias from the old name to the new one to keep things from being recreated.
        this.loadBalancer = new aws.lb.LoadBalancer(name, {
            ...args,
            subnets: getSubnets(args, this.vpc, external),
            internal: external.apply(ex => !ex),
            securityGroups: this.securityGroups.map(g => g.id),
            tags: utils.mergeTags(args.tags, { Name: name }),
        }, {
            parent: this,
            aliases: [{ name: args.name || utils.sha1hash(name) }],
        });
    }

    /**
     * Attaches a target to the first `listener` of this LoadBalancer.  If there are multiple
     * `listeners` you can add a target to specific listener to by calling `.attachTarget` directly
     * on it.
     */
    public attachTarget(
            name: string,
            args: LoadBalancerTarget,
            opts: pulumi.CustomResourceOptions = {}) {
        if (this.listeners.length === 0) {
            throw new pulumi.ResourceError("Load balancer must have at least one [Listener] in order to attach a target.", this);
        }

        return this.listeners[0].attachTarget(name, args, opts);
    }
}

function getSubnets(
    args: LoadBalancerArgs, vpc: x.ec2.Vpc, external: pulumi.Output<boolean>): pulumi.Input<pulumi.Input<string>[]> {

    // console.log("Getting subnets for LB");
    if (!args.subnets) {
        // console.log("no subnets provided");
        // No subnets requested.  Determine the subnets automatically from the vpc.
        return pulumi.all([vpc, external]).apply(([vpc, external]) => {
            if (external) {
                // console.log("Using public subnets:");
                return vpc.publicSubnetIds;
            } else {
                // console.log("Using private subnets:");
                return vpc.privateSubnetIds;
            }
        });
    }

    // console.log("subnets provided");

    return isLoadBalancerSubnets(args.subnets)
        ? args.subnets.subnets()
        : args.subnets;
}

export interface LoadBalancerArgs {
    /**
     * The vpc this load balancer will be used with.  Defaults to `[Vpc.getDefault]` if
     * unspecified.
     */
    vpc?: x.ec2.Vpc;

    /**
     * @deprecated Not used.  Supply the name you want for a LoadBalancer through the [name]
     * constructor arg.
     */
    name?: string;

    /**
     * Whether or not the load balancer is exposed to the internet. Defaults to `true` if
     * unspecified.
     */
    external?: boolean;

    /**
     * The type of load balancer to create. Possible values are `application` or `network`.
     */
    loadBalancerType: pulumi.Input<"application" | "network">;

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
     * The subnets to use for the load balancer.  If not provided, the appropriate external or
     * internal subnets of the [network] will be used.
     */
    subnets?: pulumi.Input<pulumi.Input<string>[]> | LoadBalancerSubnets;

    /**
     * A subnet mapping block as documented below.
     */
    subnetMappings?: aws.lb.LoadBalancerArgs["subnetMappings"];

    /**
     * A mapping of tags to assign to the resource.
     */
    tags?: pulumi.Input<aws.Tags>;

    /**
     * A list of security group IDs to assign to the LB. Only valid for Load Balancers of type
     * `application`.
     */
    securityGroups?: x.ec2.SecurityGroupOrId[];
}

export interface LoadBalancerSubnets {
    subnets(): pulumi.Input<pulumi.Input<string>[]>;
}

function isLoadBalancerSubnets(obj: any): obj is LoadBalancerSubnets {
    return obj && (<LoadBalancerSubnets>obj).subnets instanceof Function;
}

export interface LoadBalancerTargetInfo {
    /**
     * The ID of the target. This is the Instance ID for an `instance`, or the container ID for an
     * ECS container. If the target type is `ip`, specify an IP address. If the target type is
     * `lambda`, specify the arn of lambda.
     */
    targetId: string;
    /**
     * The Availability Zone where the IP address of the target is to be registered.
     */
    availabilityZone?: string;
    /**
     * The port on which targets receive traffic.
     */
    port?: number;
}

export interface LoadBalancerTargetInfoProvider {
    loadBalancerTargetInfo(targetType: pulumi.Input<mod.TargetType>): pulumi.Output<LoadBalancerTargetInfo>;
}

export function isLoadBalancerTargetInfoProvider(obj: any): obj is LoadBalancerTargetInfoProvider {
    return (<LoadBalancerTargetInfoProvider>obj).loadBalancerTargetInfo instanceof Function;
}

/**
 * The types of things that can be the target of a load balancer.
 *
 * Note: A lambda event handler can only be supplied if using an application load balancer.
 */
export type LoadBalancerTarget =
    pulumi.Input<LoadBalancerTargetInfo> |
    LoadBalancerTargetInfoProvider |
    aws.ec2.Instance |
    aws.lambda.EventHandler<x.apigateway.Request, x.apigateway.Response>;
