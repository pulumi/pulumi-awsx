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
import * as autoscaling from "../autoscaling";
import * as ec2 from "../ec2";

import * as utils from "../utils";

let defaultCluster: Cluster;

/**
 * A Cluster is a general purpose ECS cluster configured to run in a provided Network.
 */
export class Cluster
        extends pulumi.ComponentResource
        implements autoscaling.AutoScalingUserData {
    public readonly cluster: aws.ecs.Cluster;
    public readonly id: pulumi.Output<string>;

    /**
     * The network in which to create this cluster.
     */
    public readonly vpc: ec2.Vpc;
    /**
     * Security groups associated with this this ECS Cluster.
     */
    public readonly securityGroups: ec2.SecurityGroup[];

    public readonly extraBootcmdLines: () => pulumi.Input<autoscaling.UserDataLine[]>;

    public readonly autoScalingGroups: autoscaling.AutoScalingGroup[] = [];

    constructor(name: string, args: ClusterArgs = {}, opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:x:ecs:Cluster", name, {}, opts);

        // First create an ECS cluster.
        const cluster = getOrCreateCluster(name, args, this);
        this.cluster = cluster;
        this.id = cluster.id;

        this.vpc = args.vpc || ec2.Vpc.getDefault({ parent: this });

        // IDEA: Can we re-use the network's default security group instead of creating a specific
        // new security group in the Cluster layer?  This may allow us to share a single Security Group
        // across both instance and Lambda compute.
        this.securityGroups = ec2.getSecurityGroups(this.vpc, name, args.securityGroups, { parent: this }) ||
            [Cluster.createDefaultSecurityGroup(name, this.vpc, { parent: this })];

        this.extraBootcmdLines = () => cluster.id.apply(clusterId =>
            [{ contents: `- echo ECS_CLUSTER='${clusterId}' >> /etc/ecs/ecs.config` }]);

        this.registerOutputs();
    }

    public addAutoScalingGroup(group: autoscaling.AutoScalingGroup) {
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
            args: autoscaling.AutoScalingGroupArgs = {},
            opts: pulumi.ComponentResourceOptions = {}) {

        args.vpc = args.vpc || this.vpc;
        args.launchConfigurationArgs = {
            // default to our security groups if the caller didn't provide their own.
            securityGroups: this.securityGroups,
            userData: this,
            ...args.launchConfigurationArgs,
        };

        const group = new autoscaling.AutoScalingGroup(name, args, { parent: this, ...opts });
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
            vpc?: ec2.Vpc,
            opts: pulumi.ComponentResourceOptions = {}): ec2.SecurityGroup {

        vpc = vpc || ec2.Vpc.getDefault(opts);
        const securityGroup = new ec2.SecurityGroup(name, {
            vpc,
            tags: { Name: name },
        }, opts);

        Cluster.createDefaultSecurityGroupEgressRules(name, securityGroup);
        Cluster.createDefaultSecurityGroupIngressRules(name, securityGroup);

        return securityGroup;
    }

    public static createDefaultSecurityGroupEgressRules(name: string, securityGroup: ec2.SecurityGroup) {
        return [ec2.SecurityGroupRule.egress(`${name}-egress`, securityGroup,
            new ec2.AnyIPv4Location(),
            new ec2.AllTraffic(),
            "allow output to any ipv4 address using any protocol")];
    }

    public static createDefaultSecurityGroupIngressRules(name: string, securityGroup: ec2.SecurityGroup) {
        return [ec2.SecurityGroupRule.ingress(`${name}-ssh`, securityGroup,
                    new ec2.AnyIPv4Location(),
                    new ec2.TcpPorts(22),
                    "allow ssh in from any ipv4 address"),

                // Expose ephemeral container ports to Internet.
                // TODO: Limit to load balancer(s).
                ec2.SecurityGroupRule.ingress(`${name}-containers`, securityGroup,
                    new ec2.AnyIPv4Location(),
                    new ec2.AllTcpPorts(),
                    "allow incoming tcp on any port from any ipv4 address")];
    }
}

utils.Capture(Cluster.prototype).createAutoScalingGroup.doNotCapture = true;

function getOrCreateCluster(name: string, args: ClusterArgs, parent: Cluster) {
    if (args.cluster === undefined) {
        return new aws.ecs.Cluster(name, args, { parent });
    }

    if (pulumi.Resource.isInstance(args.cluster)) {
        return args.cluster;
    }

    return aws.ecs.Cluster.get(name, args.cluster, undefined, { parent });
}

// The shape we want for ClusterArgs.  We don't export this as 'Overwrite' types are not pleasant to
// work with. However, they internally allow us to succinctly express the shape we're trying to
// provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<aws.ecs.ClusterArgs, {
    vpc?: ec2.Vpc;
    cluster?: aws.ecs.Cluster | pulumi.Input<string>;
    securityGroups?: ec2.SecurityGroupOrId[];
    tags?: pulumi.Input<aws.Tags>;
}>;

/**
 * Arguments bag for creating infrastructure for a new Cluster.
 */
export interface ClusterArgs {

    /**
     * List of short names of one or more capacity providers to associate with the cluster.
     * Valid values also include `FARGATE` and `FARGATE_SPOT`.
     */
    capacityProviders?: aws.ecs.ClusterArgs["capacityProviders"];

    /**
     * The capacity provider strategy to use by default for the cluster. Can be one or more.
     */
    defaultCapacityProviderStrategies?: aws.ecs.ClusterArgs["defaultCapacityProviderStrategies"];

    /**
     * Configuration block(s) with cluster settings. For example, this can be used to enable CloudWatch Container Insights for a cluster.
     */
    settings?: aws.ecs.ClusterArgs["settings"];

    /**
     * The network in which to create this cluster.  If not provided, Vpc.getDefault() will be
     * used.
     */
    vpc?: ec2.Vpc;

    /**
     * An existing aws.ecs.Cluster (or the name of an existing aws.ecs.Cluster) to use for this
     * awsx.ecs.Cluster.  If not provided, a default one will be created.
     *
     * Note: If passing a string, use the *name* of an existing ECS Cluster instead of its *id*.
     */
    cluster?: aws.ecs.Cluster | pulumi.Input<string>;

    /**
     * The name of the cluster (up to 255 letters, numbers, hyphens, and underscores)
     */
    name?: pulumi.Input<string>;

    /**
     * The security group to place new instances into.  If not provided, a default will be
     * created. Pass an empty array to create no security groups.
     */
    securityGroups?: ec2.SecurityGroupOrId[];

    /**
     * Key-value mapping of resource tags
     */
    tags?: pulumi.Input<aws.Tags>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteShape, ClusterArgs>();
