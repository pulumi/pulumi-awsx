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
    public readonly loadBalancer: aws.elasticloadbalancingv2.LoadBalancer;
    public readonly vpc: x.ec2.Vpc;
    public readonly securityGroups: x.ec2.SecurityGroup[];

    public readonly listeners: mod.Listener[] = [];
    public readonly targetGroups: mod.TargetGroup[] = [];

    constructor(type: string, name: string, args: LoadBalancerArgs, opts?: pulumi.ComponentResourceOptions) {
        super(type, name, {}, opts);

        const longName = `${name}`;
        const shortName = args.name || utils.sha1hash(`${longName}`);

        const parentOpts = { parent: this };

        this.vpc = args.vpc || x.ec2.Vpc.getDefault();
        this.securityGroups = x.ec2.getSecurityGroups(this.vpc, name, args.securityGroups, parentOpts) || [];

        const external = utils.ifUndefined(args.external, true);
        this.loadBalancer = new aws.elasticloadbalancingv2.LoadBalancer(shortName, {
            ...args,
            subnets: getSubnets(args, this.vpc, external),
            internal: external.apply(ex => !ex),
            securityGroups: this.securityGroups.map(g => g.id),
            tags: utils.mergeTags(args.tags, { Name: longName }),
        }, parentOpts);
    }

    public attachTarget(
            name: string,
            args: pulumi.Input<LoadBalancerTarget> | LoadBalancerTargetProvider | aws.ec2.Instance,
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
        return external.apply(e => {
            if (e) {
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
    subnetMappings?: aws.elasticloadbalancingv2.LoadBalancerArgs["subnetMappings"];

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

export interface LoadBalancerTarget {
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

export interface LoadBalancerTargetProvider {
    loadBalancerTarget(targetType: pulumi.Input<mod.TargetType>): pulumi.Output<LoadBalancerTarget>;
}

export function isLoadBalancerTargetProvider(obj: any): obj is LoadBalancerTargetProvider {
    return (<LoadBalancerTargetProvider>obj).loadBalancerTarget instanceof Function;
}

/**
 * Allows an EC2 instance to simply be used as the target of an ALB or NLB.  To use, just call:
 *
 * ```ts
 *  lb.attachTarget(new Ec2InstanceTarget(instance));
 * ```
 */
export class Ec2InstanceTarget implements LoadBalancerTargetProvider {
    constructor(public readonly instance: aws.ec2.Instance) {
    }

    public loadBalancerTarget(targetType: pulumi.Input<mod.TargetType>): pulumi.Output<LoadBalancerTarget> {
        const result = pulumi.output([targetType, this.instance.id, this.instance.privateIp, this.instance.availabilityZone])
                             .apply(([targetType, instanceId, privateIp, availabilityZone]) => {
            return {
                targetId: targetType === "instance" ? instanceId : privateIp,
                availabilityZone: availabilityZone,
            };
        });

        return result;
    }
}
