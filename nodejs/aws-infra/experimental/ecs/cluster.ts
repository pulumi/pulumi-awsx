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

import { Network } from "./../../network";

import * as utils from "../../utils";

import * as ecs from ".";
import * as x from "..";

/**
 * A Cluster is a general purpose ECS cluster configured to run in a provided Network.
 */
export class Cluster
        extends pulumi.ComponentResource
        implements x.autoscaling.AutoScalingUserData {
    public readonly instance: aws.ecs.Cluster;

    /**
     * The network in which to create this cluster.
     */
    public readonly network: Network;
    /**
     * Security groups associated with this this ECS Cluster.
     */
    public readonly securityGroups: x.ec2.SecurityGroup[];

    public readonly extraBootcmdLines: () => pulumi.Input<x.autoscaling.UserDataLine[]>;

    public readonly autoScalingGroups: x.autoscaling.AutoScalingGroup[] = [];

    constructor(name: string, args: ClusterArgs, opts: pulumi.ComponentResourceOptions = {}) {
        super("awsinfra:x:ecs:Cluster", name, args, opts);

        // First create an ECS cluster.
        const parentOpts = { parent: this };
        const instance = args.instance || new aws.ecs.Cluster(name, args, parentOpts);

        const network = args.network || Network.getDefault();

        // IDEA: Can we re-use the network's default security group instead of creating a specific
        // new security group in the Cluster layer?  This may allow us to share a single Security Group
        // across both instance and Lambda compute.
        const securityGroups = args.securityGroups ||
            [Cluster.createDefaultSecurityGroup(name, network, parentOpts)];

        this.extraBootcmdLines = () => instance.id.apply(clusterId =>
            [{ contents: `- echo ECS_CLUSTER='${clusterId}' >> /etc/ecs/ecs.config` }]);

        this.instance = instance;
        this.network = network;
        this.securityGroups = securityGroups;

        this.registerOutputs({
            instance,
            network,
            securityGroups,
        });
    }

    public addAutoScalingGroup(group: x.autoscaling.AutoScalingGroup) {
        this.autoScalingGroups.push(group);
    }

    /**
     * Creates a new autoscaling group and adds it to the list of autoscaling groups targeting this
     * cluster.  The autoscaling group will be created with is network set to the same network as
     * this cluster as well as using this cluster to initialize both its securityGroups and
     * launchConfiguration userData.
     */
    public createAndAddAutoScalingGroup(
            name: string,
            args?: x.autoscaling.AutoScalingGroupArgs,
            opts?: pulumi.ResourceOptions) {

        args = args || { network: this.network };

        args.launchConfigurationArgs = args.launchConfigurationArgs || {};
        const launchConfigurationArgs = args.launchConfigurationArgs;
        launchConfigurationArgs.securityGroups = this.securityGroups;
        launchConfigurationArgs.userData = this;

        const group = new x.autoscaling.AutoScalingGroup(name, args, opts || { parent: this });
        this.addAutoScalingGroup(group);

        return group;
    }

    public static createDefaultSecurityGroup(
            name: string,
            network?: Network,
            opts?: pulumi.ComponentResourceOptions): x.ec2.SecurityGroup {

        network = network || Network.getDefault();
        const securityGroup = new x.ec2.SecurityGroup(name, {
            network,
            tags: { Name: name },
        }, opts);

        Cluster.createDefaultSecurityGroupEgressRules(securityGroup);
        Cluster.createDefaultSecurityGroupIngressRules(securityGroup);

        return securityGroup;
    }

    public static createDefaultSecurityGroupEgressRules(securityGroup: x.ec2.SecurityGroup) {
        securityGroup.createEgressRule("egress", {
            fromPort: 0,
            toPort: 0,
            protocol: "-1",  // all
            cidrBlocks: [ "0.0.0.0/0" ],
        });
    }

    public static createDefaultSecurityGroupIngressRules(securityGroup: x.ec2.SecurityGroup) {
        securityGroup.createIngressRule("ssh", {
            fromPort: 22,
            toPort: 22,
            protocol: "TCP",
            cidrBlocks: [ "0.0.0.0/0" ],
        });

        // Expose ephemeral container ports to Internet.
        // TODO: Limit to load balancer(s).
        securityGroup.createIngressRule("containers", {
            fromPort: 0,
            toPort: 65535,
            protocol: "TCP",
            cidrBlocks: [ "0.0.0.0/0" ],
        });
    }
}

// The shape we want for ClusterArgs.  We don't export this as 'Overwrite' types are not pleasant to
// work with. However, they internally allow us to succinctly express the shape we're trying to
// provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<aws.ecs.ClusterArgs, {
    network?: Network;
    securityGroups?: x.ec2.SecurityGroup[];
}>;

/**
 * Arguments bag for creating infrastructure for a new Cluster.
 */
export interface ClusterArgs {
    /**
     * The network in which to create this cluster.  If not provided, Network.getDefault() will be
     * used.
     */
    network?: Network;

    /**
     * An existing Cluster to use for this awsinfra Cluster.  If not provided, a default one will
     * be created.
     */
    instance?: aws.ecs.Cluster;

    /**
     * The name of the cluster (up to 255 letters, numbers, hyphens, and underscores)
     */
    name?: pulumi.Input<string>;

    /**
     * The security group to place new instances into.  If not provided, a default will be
     * created.
     */
    securityGroups?: x.ec2.SecurityGroup[];
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteShape, ClusterArgs>();
