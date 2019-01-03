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
import * as utils from "./../../utils";

export class Subnet extends pulumi.ComponentResource {
    public readonly vpc: x.ec2.Vpc;
    public readonly subnetName: string;
    public readonly subnetId: pulumi.Output<string>;
    public readonly instance: aws.ec2.Subnet;
    public readonly routeTable: aws.ec2.RouteTable;
    public readonly routeTableAssociation: aws.ec2.RouteTableAssociation;

    public readonly routes: aws.ec2.Route[] = [];

    constructor(name: string, vpc: x.ec2.Vpc, args: SubnetArgs, opts?: pulumi.ComponentResourceOptions);
    constructor(name: string, vpc: x.ec2.Vpc, args: ExistingSubnetArgs, opts?: pulumi.ComponentResourceOptions);
    constructor(name: string, vpc: x.ec2.Vpc, args: SubnetArgs | ExistingSubnetArgs, opts?: pulumi.ComponentResourceOptions) {
        super("awsinfra:x:ec2:Subnet", name, {}, opts || { parent: vpc });

        this.vpc = vpc;
        this.subnetName = name;

        const parentOpts = { parent: this };
        if (isExistingSubnetArgs(args)) {
            this.instance = args.instance;
            this.subnetId = args.instance.id;
            // TODO(cyrusn): We should be able to find the existing RouteTable and RouteTableAssociation
            // when importing a subnet.
        }
        else {
            this.instance = new aws.ec2.Subnet(name, {
                vpcId: vpc.instance.id,
                ...args,
            }, parentOpts);

            this.routeTable = new aws.ec2.RouteTable(name, {
                vpcId: vpc.instance.id,
            }, parentOpts);

            this.routeTableAssociation = new aws.ec2.RouteTableAssociation(name, {
                routeTableId: this.routeTable.id,
                subnetId: this.instance.id,
            }, parentOpts);

            this.subnetId = pulumi.all([this.instance.id, this.routeTableAssociation.id])
                                .apply(([id]) => id);
        }

        this.registerOutputs();
    }

    public createRoute(name: string, args: RouteArgs, opts?: pulumi.ComponentResourceOptions) {
        this.routes.push(new aws.ec2.Route(`${this.subnetName}-${name}`, {
            ...args,
            routeTableId: this.routeTable.id,
        }, opts || { parent: this }));
    }
}

(<any>Subnet.prototype.createRoute).doNotCapture = true;

export interface ExistingSubnetArgs {
    /**
     * Optional existing instance to use to make the awsinfra Subnet out of.  If this is provided No
     * RouteTable or RouteTableAssociation will be automatically be created.
     */
    instance: aws.ec2.Subnet;
}

function isExistingSubnetArgs(obj: any): obj is ExistingSubnetArgs {
    return !!(<ExistingSubnetArgs>obj).instance;
}

type RouteArgsShape = utils.Overwrite<aws.ec2.RouteArgs, {
    routeTableId?: never;
}>;

/**
 * The set of arguments for constructing a Route resource.
 */
export interface RouteArgs {
    /**
     * The destination CIDR block.
     */
    destinationCidrBlock?: pulumi.Input<string>;
    /**
     * The destination IPv6 CIDR block.
     */
    destinationIpv6CidrBlock?: pulumi.Input<string>;
    /**
     * Identifier of a VPC Egress Only Internet Gateway.
     */
    egressOnlyGatewayId?: pulumi.Input<string>;
    /**
     * Identifier of a VPC internet gateway or a virtual private gateway.
     */
    gatewayId?: pulumi.Input<string>;
    /**
     * Identifier of an EC2 instance.
     */
    instanceId?: pulumi.Input<string>;
    /**
     * Identifier of a VPC NAT gateway.
     */
    natGatewayId?: pulumi.Input<string>;
    /**
     * Identifier of an EC2 network interface.
     */
    networkInterfaceId?: pulumi.Input<string>;
    /**
     * Identifier of an EC2 Transit Gateway.
     */
    transitGatewayId?: pulumi.Input<string>;
    /**
     * Identifier of a VPC peering connection.
     */
    vpcPeeringConnectionId?: pulumi.Input<string>;
}

type SubnetArgsShape = utils.Overwrite<aws.ec2.SubnetArgs, {
    vpcId?: never;
}>;

export interface SubnetArgs {
    /**
     * The CIDR block for the subnet.
     */
    cidrBlock: pulumi.Input<string>;
    /**
     * Specify true to indicate
     * that network interfaces created in the specified subnet should be
     * assigned an IPv6 address. Default is `false`
     */
    assignIpv6AddressOnCreation?: pulumi.Input<boolean>;
    /**
     * The AZ for the subnet.
     */
    availabilityZone?: pulumi.Input<string>;
    /**
     * The AZ ID of the subnet.
     */
    availabilityZoneId?: pulumi.Input<string>;
    /**
     * The IPv6 network range for the subnet,
     * in CIDR notation. The subnet size must use a /64 prefix length.
     */
    ipv6CidrBlock?: pulumi.Input<string>;
    /**
     * Specify true to indicate
     * that instances launched into the subnet should be assigned
     * a public IP address. Default is `false`.
     */
    mapPublicIpOnLaunch?: pulumi.Input<boolean>;
    /**
     * A mapping of tags to assign to the resource.
     */
    tags?: pulumi.Input<aws.Tags>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<SubnetArgsShape, SubnetArgs>();
const test2: string = utils.checkCompat<RouteArgsShape, RouteArgs>();
