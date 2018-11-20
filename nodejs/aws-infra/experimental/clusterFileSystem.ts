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

import * as utils from "../utils";

/**
 * Arguments for creating a file system for a cluster.
 */
export type ClusterFileSystemArgs = utils.Overwrite<aws.efs.FileSystemArgs, {
    /**
     * The security group to use for the file system.  If not provided, a default one that allows
     * ingress for the cluster's VPC from port 2049 will be created.
     */
    securityGroup?: aws.ec2.SecurityGroup;

    /**
     * The subnets to mount the file system against.  If not provided, file system will be mounted
     * for every subnet in the cluster's network.
     */
    subnetIds?: pulumi.Input<string>[];

    /**
     * Path to mount file system at when a cluster is connected to an autoscaling group.  If not
     * provided, the default mountPath will be "/mnt/efs"
     */
    mountPath?: pulumi.Input<string>;
}>;

export class ClusterFileSystem extends pulumi.ComponentResource {
    public readonly instance: aws.efs.FileSystem;
    public readonly cluster: mod.Cluster;
    public readonly securityGroup: aws.ec2.SecurityGroup;
    public readonly mountTargets: aws.efs.MountTarget[];
    public readonly mountPath: pulumi.Output<string>;

    constructor(name: string, cluster: mod.Cluster,
                args: ClusterFileSystemArgs = {}, opts: pulumi.CustomResourceOptions = {}) {
        super("aws-infra:x:ClusterFileSystem", name, {
            ...args,
        }, opts);

        const parentOpts = { parent: this };

        this.instance = new aws.efs.FileSystem(name, args, parentOpts);

        this.cluster = cluster;
        this.mountTargets = [];
        this.mountPath = pulumi.output(args.mountPath).apply(p => p || "/mnt/efs");

        // If requested, add EFS file system and mount targets in each subnet.

        const efsSecurityGroupName = `${name}-fs`;
        this.securityGroup = args.securityGroup || new aws.ec2.SecurityGroup(efsSecurityGroupName, {
            vpcId: cluster.network.vpcId,
            ingress: [
                // Allow NFS traffic from the instance security group
                {
                    securityGroups: [ cluster.instanceSecurityGroup.id ],
                    protocol: "TCP",
                    fromPort: 2049,
                    toPort: 2049,
                },
            ],
            tags: { Name: efsSecurityGroupName },
        }, parentOpts);

        const subnetIds = args.subnetIds || cluster.network.subnetIds;
        for (let i = 0; i < subnetIds.length; i++) {
            const subnetId = subnetIds[i];
            this.mountTargets.push(new aws.efs.MountTarget(`${name}-${i}`, {
                fileSystemId: this.instance.id,
                subnetId: subnetId,
                securityGroups: [ this.securityGroup.id ],
            }, parentOpts));
        }
    }

    /**
     * Creates a launch configuration that can be used to easily create an auto-scaling group.
     * The launch configuration will be set to use this file system.
     */
    public createAutoScalingLaunchConfig(
            name: string, args: mod.ClusterAutoScalingLaunchConfigurationArgs = {}, opts?: pulumi.ResourceOptions) {
        if (args.fileSystem) {
            throw new Error("[args.fileSystem] should not be provided.");
        }

        return new mod.ClusterAutoScalingLaunchConfiguration(name, this.cluster, {
            ...args,
            fileSystem: this,
        }, opts || { parent: this });
    }

    /**
     * Creates a auto-scaling group, using this file system within its launch configuration
     * The launch configuration will be set to use this file system.
     */
    public createAutoScalingGroup(
            name: string, args: mod.ClusterAutoScalingGroupArgs = {}, opts?: pulumi.ResourceOptions) {

        if (args.launchConfiguration) {
            throw new Error("[args.launchConfiguration] must not be set.");
        }

        const launchConfigurationArgs = args.launchConfigurationArgs || {};
        if (launchConfigurationArgs.fileSystem) {
            throw new Error("[args.launchConfigurationArgs.fileSystem] should not be provided.");
        }

        launchConfigurationArgs.fileSystem = this;

        return new mod.ClusterAutoScalingGroup(name, this.cluster, {
            ...args,
            launchConfigurationArgs,
        }, opts || { parent: this });
    }
}

(<any>ClusterFileSystem).doNotCapture = true;
(<any>ClusterFileSystem.prototype.createAutoScalingGroup).doNotCapture = true;
(<any>ClusterFileSystem.prototype.createAutoScalingLaunchConfig).doNotCapture = true;
