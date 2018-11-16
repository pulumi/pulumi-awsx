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

import { ClusterAutoScalingGroup, ClusterAutoScalingGroupArgs,
         ClusterAutoScalingLaunchConfiguration, ClusterAutoScalingLaunchConfigurationArgs } from "./clusterAutoScaling";
import { ClusterFileSystem, ClusterFileSystemArgs } from "./clusterFileSystem";
import { ClusterLoadBalancer, ClusterLoadBalancerArgs } from "./clusterLoadBalancer";

import { Network } from "./../network";

/**
 * Arguments bag for creating infrastructure for a new Cluster.
 */
export interface ClusterArgs2 {
    /**
     * The network in which to create this cluster.
     */
    network: Network;

    /**
     * The security group to place new instances into.  If not provided, a default will be
     * created.
     */
    instanceSecurityGroup?: aws.ec2.SecurityGroup;
}

/**
 * A Cluster is a general purpose ECS cluster configured to run in a provided Network.
 */
export class Cluster2 extends pulumi.ComponentResource {
    /**
     * The network in which to create this cluster.
     */
    public readonly network: Network;
    /**
     * The Underlying ECS Cluster.
     */
    public readonly resource: aws.ecs.Cluster;
    /**
     * The ECS Cluster's Security Group.
     */
    public readonly instanceSecurityGroup: aws.ec2.SecurityGroup;

    constructor(name: string, args: ClusterArgs2, opts?: pulumi.ResourceOptions) {
        if (!args.network) {
            throw new pulumi.RunError("Expected a valid Network to use for creating Cluster");
        }

        super("aws-infra:cluster:Cluster", name, args, opts);

        this.network = args.network;

        // First create an ECS cluster.
        const parentOpts = { parent: this };
        const cluster = new aws.ecs.Cluster(name, {}, parentOpts);
        this.resource = cluster;

        // Create the EC2 instance security group
        const ALL = {
            fromPort: 0,
            toPort: 0,
            protocol: "-1",  // all
            cidrBlocks: [ "0.0.0.0/0" ],
        };

        // IDEA: Can we re-use the network's default security group instead of creating a specific
        // new security group in the Cluster layer?  This may allow us to share a single Security Group
        // across both instance and Lambda compute.
        this.instanceSecurityGroup = args.instanceSecurityGroup || new aws.ec2.SecurityGroup(name, {
            vpcId: args.network.vpcId,
            ingress: [
                // Expose SSH
                {
                    fromPort: 22,
                    toPort: 22,
                    protocol: "TCP",
                    cidrBlocks: [ "0.0.0.0/0" ],
                },
                // Expose ephemeral container ports to Internet.
                // TODO: Limit to load balancer(s).
                {
                    fromPort: 0,
                    toPort: 65535,
                    protocol: "TCP",
                    cidrBlocks: [ "0.0.0.0/0" ],
                },
            ],
            egress: [ ALL ],  // See TerraformEgressNote
            tags: { Name: name },
        }, parentOpts);

        this.registerOutputs({
            network: this.network,
            resource: this.resource,
            instanceSecurityGroup: this.instanceSecurityGroup,
        });
    }

    public createFileSystem(name: string, args?: ClusterFileSystemArgs) {
        return new ClusterFileSystem(name, this, args, { parent: this });
    }

    /**
     * Create an auto-scaling group for this cluster.
     */
    public createAutoScalingGroup(name: string, args?: ClusterAutoScalingGroupArgs) {
        return new ClusterAutoScalingGroup(name, this, args, { parent: this });
    }

    /**
     * Creates a launch configuration that can be used to easily create an auto-scaling group.
     */
    public createAutoScalingLaunchConfig(name: string, args?: ClusterAutoScalingLaunchConfigurationArgs) {
        return new ClusterAutoScalingLaunchConfiguration(name, this, args, { parent: this });
    }

    /**
     * Creates an ALB or NLB for this cluster
     */
    public createLoadBalancer(name: string, args: ClusterLoadBalancerArgs): ClusterLoadBalancer {
        return new ClusterLoadBalancer(name, this, args, { parent: this });
    }
}

(<any>Cluster2).doNotCapture = true;
