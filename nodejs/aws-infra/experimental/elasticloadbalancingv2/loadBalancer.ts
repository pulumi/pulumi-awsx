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

export abstract class LoadBalancer extends pulumi.ComponentResource {
    public readonly targetGroups: x.elasticloadbalancingv2.TargetGroup[] = [];
    public readonly listeners: x.elasticloadbalancingv2.Listener[] = [];

    public readonly instance: aws.elasticloadbalancingv2.LoadBalancer;
    public readonly network: Network;

    constructor(type: string, name: string, args: LoadBalancerArgs, opts?: pulumi.ComponentResourceOptions) {
        super(type, name, LoadBalancer.withoutProviders(args), opts);

        const parentOpts = { parent: this };

        const network = args.network || Network.getDefault();
        const external = utils.ifUndefined(args.external, false);
        const subnets = getSubnets(args, network, external);
        const instance = new aws.elasticloadbalancingv2.LoadBalancer(name, {
            ...args,
            subnets,
            internal: external.apply(e => !e),
            securityGroups: args.securityGroups ? args.securityGroups.map(g => g.id) : undefined,
        }, parentOpts);

        this.instance = instance;
        this.network = network;

        this.registerOutputs({
            instance,
            network,
        });
    }
}

function getSubnets(
    args: LoadBalancerArgs, network: Network, external: pulumi.Output<boolean>): pulumi.Input<pulumi.Input<string>[]> {

    if (!args.subnets) {
        // No subnets requested.  Determine the subnets automatically from the network.
        return external.apply(e => e ? network.publicSubnetIds : network.subnetIds);
    }

    const loadBalancerSubnets = <LoadBalancerSubnets>args.subnets;
    if (loadBalancerSubnets.subnets) {
        return loadBalancerSubnets.subnets();
    }

    return <pulumi.Input<pulumi.Input<string>[]>>args.subnets;
}

export interface LoadBalancerArgs {
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
    securityGroups?: aws.ec2.SecurityGroup[];
}

export interface LoadBalancerSubnets {
    subnets(): pulumi.Input<pulumi.Input<string>[]>;
}
