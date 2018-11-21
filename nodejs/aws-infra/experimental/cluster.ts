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

import { Network } from "./../network";

import * as utils from "../utils";

/**
 * Arguments bag for creating infrastructure for a new Cluster.
 */
export type ClusterArgs = utils.Overwrite<aws.ecs.ClusterArgs, {
    /**
     * The network in which to create this cluster.  If not provided, Network.getDefault() will be
     * used.
     */
    network?: Network;

    /**
     * The security group to place new instances into.  If not provided, a default will be
     * created.
     */
    instanceSecurityGroup?: aws.ec2.SecurityGroup;
}>;

/**
 * A Cluster is a general purpose ECS cluster configured to run in a provided Network.
 */
export class Cluster extends pulumi.ComponentResource {
    public readonly instance: aws.ecs.Cluster;

    /**
     * The network in which to create this cluster.
     */
    public readonly network: Network;
    /**
     * The ECS Cluster's Security Group.
     */
    public readonly instanceSecurityGroup: aws.ec2.SecurityGroup;

    constructor(name: string, args: ClusterArgs = {}, opts: pulumi.ComponentResourceOptions = {}) {
        super("aws-infra:x:Cluster", name, {
            ...args,
        }, opts);

        // First create an ECS cluster.
        const parentOpts = { parent: this };
        const instance = new aws.ecs.Cluster(name, args, parentOpts);

        const network = args.network || Network.getDefault();

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
        const instanceSecurityGroup = args.instanceSecurityGroup || new aws.ec2.SecurityGroup(name, {
            vpcId: network.vpcId,
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

        this.instance = instance;
        this.network = network;
        this.instanceSecurityGroup = instanceSecurityGroup;

        this.registerOutputs({
            instance,
            network,
            instanceSecurityGroup,
        });
    }

    // public createFileSystem(name: string, args?: mod.ClusterFileSystemArgs, opts?: pulumi.ResourceOptions) {
    //     return new mod.ClusterFileSystem(name, this, args, opts || { parent: this });
    // }

    // /**
    //  * Create an auto-scaling group for this cluster.
    //  */
    // public createAutoScalingGroup(
    //         name: string, args?: mod.ClusterAutoScalingGroupArgs, opts?: pulumi.ResourceOptions) {
    //     return new mod.ClusterAutoScalingGroup(name, this, args, opts || { parent: this });
    // }

    // /**
    //  * Creates a launch configuration that can be used to easily create an auto-scaling group.
    //  */
    // public createAutoScalingLaunchConfig(
    //         name: string, args?: mod.ClusterAutoScalingLaunchConfigurationArgs, opts?: pulumi.ResourceOptions) {
    //     return new mod.ClusterAutoScalingLaunchConfiguration(name, this, args, opts || { parent: this });
    // }

    /**
     * Creates an ALB or NLB for this cluster
     */
    public createLoadBalancer(name: string, args: mod.ClusterLoadBalancerArgs, opts?: pulumi.ResourceOptions) {
        return new mod.ClusterLoadBalancer(name, this, args, opts || { parent: this });
    }

    // public createFargateTaskDefinition(
    //         name: string, args: mod.FargateTaskDefinitionArgs, opts?: pulumi.ResourceOptions) {
    //     return new mod.FargateTaskDefinition(name, this, args, opts || { parent: this });
    // }

    // public createEC2TaskDefinition(name: string, args: mod.EC2TaskDefinitionArgs, opts?: pulumi.ResourceOptions) {
    //     return new mod.EC2TaskDefinition(name, this, args, opts || { parent: this });
    // }

    // public createFargateService(name: string, args: mod.FargateServiceArgs, opts?: pulumi.ResourceOptions) {
    //     return new mod.FargateService(name, this, args, opts || { parent: this });
    // }

    // public createEC2Service(name: string, args: mod.EC2ServiceArgs, opts?: pulumi.ResourceOptions) {
    //     return new mod.EC2Service(name, this, args, opts || { parent: this });
    // }
}

(<any>Cluster).doNotCapture = true;
