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
import * as utils from "../utils";

let defaultCluster: Cluster;

/**
 * A Cluster is a general purpose ECS cluster configured to run in a provided Network.
 */
export class Cluster
        extends pulumi.ComponentResource
        implements x.autoscaling.AutoScalingUserData {
    public readonly cluster: aws.ecs.Cluster;
    public readonly id: pulumi.Output<string>;

    /**
     * The network in which to create this cluster.
     */
    public readonly vpc: x.ec2.Vpc;
    /**
     * Security groups associated with this this ECS Cluster.
     */
    public readonly securityGroups: x.ec2.SecurityGroup[];

    public readonly extraBootcmdLines: () => pulumi.Input<x.autoscaling.UserDataLine[]>;

    public readonly autoScalingGroups: x.autoscaling.AutoScalingGroup[] = [];

    constructor(name: string, args: ClusterArgs = {}, opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:x:ecs:Cluster", name, {}, opts);

        // First create an ECS cluster.
        const parentOpts = { parent: this };
        const cluster = args.cluster || new aws.ecs.Cluster(name, args, parentOpts);
        this.cluster = cluster;
        this.id = cluster.id;

        this.vpc = args.vpc || x.ec2.Vpc.getDefault();

        // IDEA: Can we re-use the network's default security group instead of creating a specific
        // new security group in the Cluster layer?  This may allow us to share a single Security Group
        // across both instance and Lambda compute.
        this.securityGroups = x.ec2.getSecurityGroups(this.vpc, name, args.securityGroups, parentOpts) ||
            [Cluster.createDefaultSecurityGroup(name, this.vpc, parentOpts)];

        this.extraBootcmdLines = () => cluster.id.apply(clusterId =>
            [{ contents: `- echo ECS_CLUSTER='${clusterId}' >> /etc/ecs/ecs.config` }]);

        this.registerOutputs({});
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
    public createAutoScalingGroup(
            name: string,
            args: x.autoscaling.AutoScalingGroupArgs = {},
            opts?: pulumi.ComponentResourceOptions) {

        args.vpc = args.vpc || this.vpc;
        args.launchConfigurationArgs = args.launchConfigurationArgs || {};

        const launchConfigurationArgs = args.launchConfigurationArgs;
        launchConfigurationArgs.securityGroups = this.securityGroups;
        launchConfigurationArgs.userData = this;

        const group = new x.autoscaling.AutoScalingGroup(name, args, opts || { parent: this });
        this.addAutoScalingGroup(group);

        return group;
    }

    /**
     * Gets or creates a cluster that can be used by default for the current aws account and region.
     * The cluster will use the default Vpc for the account and will be provisioned with a security
     * group created by [createDefaultSecurityGroup].
     */
    public static getDefault(opts?: pulumi.ComponentResourceOptions): Cluster {
        if (!defaultCluster) {
            defaultCluster = new Cluster("default-cluster", { }, opts);
        }

        return defaultCluster;
    }

    public static createDefaultSecurityGroup(
            name: string,
            vpc?: x.ec2.Vpc,
            opts?: pulumi.ComponentResourceOptions): x.ec2.SecurityGroup {

        vpc = vpc || x.ec2.Vpc.getDefault();
        const securityGroup = new x.ec2.SecurityGroup(name, {
            vpc,
            tags: { Name: name },
        }, opts);

        Cluster.createDefaultSecurityGroupEgressRules(name, securityGroup);
        Cluster.createDefaultSecurityGroupIngressRules(name, securityGroup);

        return securityGroup;
    }

    public static createDefaultSecurityGroupEgressRules(name: string, securityGroup: x.ec2.SecurityGroup) {
        return [x.ec2.SecurityGroupRule.egress(`${name}-egress`, securityGroup,
            new x.ec2.AnyIPv4Location(),
            new x.ec2.AllTraffic(),
            "allow output to any ipv4 address using any protocol")];
    }

    public static createDefaultSecurityGroupIngressRules(name: string, securityGroup: x.ec2.SecurityGroup) {
        return [x.ec2.SecurityGroupRule.ingress(`${name}-ssh`, securityGroup,
                    new x.ec2.AnyIPv4Location(),
                    new x.ec2.TcpPorts(22),
                    "allow ssh in from any ipv4 address"),

                // Expose ephemeral container ports to Internet.
                // TODO: Limit to load balancer(s).
                x.ec2.SecurityGroupRule.ingress(`${name}-containers`, securityGroup,
                    new x.ec2.AnyIPv4Location(),
                    new x.ec2.AllTcpPorts(),
                    "allow incoming tcp on any port from any ipv4 address")];
    }
}

// The shape we want for ClusterArgs.  We don't export this as 'Overwrite' types are not pleasant to
// work with. However, they internally allow us to succinctly express the shape we're trying to
// provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<aws.ecs.ClusterArgs, {
    vpc?: x.ec2.Vpc;
    securityGroups?: x.ec2.SecurityGroupOrId[];
}>;

/**
 * Arguments bag for creating infrastructure for a new Cluster.
 */
export interface ClusterArgs {
    /**
     * The network in which to create this cluster.  If not provided, Vpc.getDefault() will be
     * used.
     */
    vpc?: x.ec2.Vpc;

    /**
     * An existing Cluster to use for this awsx Cluster.  If not provided, a default one will
     * be created.
     */
    cluster?: aws.ecs.Cluster;

    /**
     * The name of the cluster (up to 255 letters, numbers, hyphens, and underscores)
     */
    name?: pulumi.Input<string>;

    /**
     * The security group to place new instances into.  If not provided, a default will be
     * created.
     */
    securityGroups?: x.ec2.SecurityGroupOrId[];
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteShape, ClusterArgs>();
