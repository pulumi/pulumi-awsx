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
import * as utils from "./../utils";

export abstract class LoadBalancer extends pulumi.ComponentResource {
    public readonly loadBalancer: aws.elasticloadbalancingv2.LoadBalancer;
    public readonly vpc: x.ec2.Vpc;
    public readonly securityGroups: x.ec2.SecurityGroup[];

    constructor(type: string, name: string, args: LoadBalancerArgs, opts?: pulumi.ComponentResourceOptions) {
        super(type, name, {}, opts);

        const longName = `${name}`;
        const shortName = utils.sha1hash(`${longName}`);

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
    return obj && !!(<LoadBalancerSubnets>obj).subnets;
}
