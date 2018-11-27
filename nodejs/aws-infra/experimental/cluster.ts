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

import { Network } from "./../network";

import * as utils from "../utils";

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
     * Security groups associated with this this ECS Cluster.
     */
    public readonly instanceSecurityGroups: aws.ec2.SecurityGroup[];

    constructor(name: string, args: ClusterArgs, opts: pulumi.ComponentResourceOptions = {}) {
        super("aws-infra:x:Cluster", name, {
            ...args,
        }, opts);

        // First create an ECS cluster.
        const parentOpts = { parent: this };
        const instance = args.instance || new aws.ecs.Cluster(name, args, parentOpts);

        const network = args.network || Network.getDefault();

        // IDEA: Can we re-use the network's default security group instead of creating a specific
        // new security group in the Cluster layer?  This may allow us to share a single Security Group
        // across both instance and Lambda compute.
        const instanceSecurityGroups = args.instanceSecurityGroups || [new aws.ec2.SecurityGroup(name, {
            vpcId: network.vpcId,
            ingress: Cluster.defaultSecurityGroupIngress(),
            egress: Cluster.defaultSecurityGroupEgress(),
            tags: { Name: name },
        }, parentOpts)];

        this.instance = instance;
        this.network = network;
        this.instanceSecurityGroups = instanceSecurityGroups;

        this.registerOutputs({
            instance,
            network,
            instanceSecurityGroups,
        });
    }

    public static defaultSecurityGroupEgress() {
        return [{
            fromPort: 0,
            toPort: 0,
            protocol: "-1",  // all
            cidrBlocks: [ "0.0.0.0/0" ],
        }];
    }

    public static defaultSecurityGroupIngress() {
        return [
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
        ];
    }
}

(<any>Cluster).doNotCapture = true;

// The shape we want for ClusterArgs.  We don't export this as 'Overwrite' types are not pleasant to
// work with. However, they internally allow us to succinctly express the shape we're trying to
// provide. Code later on will ensure these types are compatible.
type OverwriteShape = utils.Overwrite<aws.ecs.ClusterArgs, {
    network?: Network;
    instanceSecurityGroups?: aws.ec2.SecurityGroup[];
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
     * An existing to cluster to use for this awsinfra Cluster.  If not provided, a default one will
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
    instanceSecurityGroups?: aws.ec2.SecurityGroup[];
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
let overwriteShape: OverwriteShape = undefined!;
let argsShape: ClusterArgs = undefined!;
argsShape = overwriteShape;
overwriteShape = argsShape;
