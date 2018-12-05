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

export class NetworkLoadBalancer extends x.elasticloadbalancingv2.LoadBalancer {
    constructor(name: string, args: NetworkLoadBalancerArgs, opts?: pulumi.ComponentResourceOptions) {
        const argsCopy: x.elasticloadbalancingv2.LoadBalancerArgs = {
            ...args,
            loadBalancerType: "network",
        };

        super("awsinfra:x:elasticloadbalancingv2:NetworkLoadBalancer", name, argsCopy, opts);
    }
}

export interface NetworkLoadBalancerArgs {
    // Properties from LoadBalancerArgs

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
