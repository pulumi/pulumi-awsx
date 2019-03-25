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
import * as utils from "./../utils";

export class Subnet extends pulumi.ComponentResource {
    // tslint:disable-next-line:variable-name
    private readonly __isSubnetInstance = true;

    public readonly vpc: x.ec2.Vpc;
    public readonly subnetName: string;

    /**
     * Underlying id for the aws subnet.  This should be used over [this.subnet.id] as this
     * Output will only resolve once the route table and all associations are resolved.
     */
    public readonly id: pulumi.Output<string>;
    public readonly subnet: aws.ec2.Subnet;
    public readonly routeTable: aws.ec2.RouteTable;
    public readonly routeTableAssociation: aws.ec2.RouteTableAssociation;

    public readonly routes: aws.ec2.Route[] = [];

    constructor(name: string, vpc: x.ec2.Vpc, args: SubnetArgs, opts?: pulumi.ComponentResourceOptions);
    constructor(name: string, vpc: x.ec2.Vpc, args: ExistingSubnetArgs, opts?: pulumi.ComponentResourceOptions);
    constructor(name: string, vpc: x.ec2.Vpc, args: SubnetArgs | ExistingSubnetArgs, opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:x:ec2:Subnet", name, {}, { parent: vpc, ...opts });

        this.vpc = vpc;
        this.subnetName = name;

        const parentOpts = { parent: this };
        if (isExistingSubnetArgs(args)) {
            this.subnet = args.subnet;
            this.id = args.subnet.id;
            // TODO(cyrusn): We should be able to find the existing RouteTable and RouteTableAssociation
            // when importing a subnet.
        }
        else {
            this.subnet = new aws.ec2.Subnet(name, {
                vpcId: vpc.id,
                ...args,
            }, parentOpts);

            this.routeTable = new aws.ec2.RouteTable(name, {
                vpcId: vpc.id,
            }, parentOpts);

            this.routeTableAssociation = new aws.ec2.RouteTableAssociation(name, {
                routeTableId: this.routeTable.id,
                subnetId: this.subnet.id,
            }, parentOpts);

            this.id = pulumi.all([this.subnet.id, this.routeTableAssociation.id])
                            .apply(([id]) => id);
        }

        this.registerOutputs({});
    }

    /** @internal */
    public static isSubnetInstance(obj: any): obj is Subnet {
        return !!(<Subnet>obj).__isSubnetInstance;
    }

    public createRoute(name: string, args: RouteArgs, opts?: pulumi.ComponentResourceOptions): void;
    public createRoute(name: string, provider: SubnetRouteProvider, opts?: pulumi.ComponentResourceOptions): void;
    public createRoute(name: string, argsOrProvider: RouteArgs | SubnetRouteProvider, opts: pulumi.ComponentResourceOptions = {}): void {
        opts = { parent: this, ...opts };

        const args = isSubnetRouteProvider(argsOrProvider)
            ? argsOrProvider.route(name, opts)
            : argsOrProvider;

        this.routes.push(new aws.ec2.Route(`${this.subnetName}-${name}`, {
            ...args,
            routeTableId: this.routeTable.id,
        }, opts));
    }
}

export interface SubnetRouteProvider {
    route(name: string, opts: pulumi.ComponentResourceOptions): RouteArgs;
}

function isSubnetRouteProvider(obj: any): obj is SubnetRouteProvider {
    return !!(<SubnetRouteProvider>obj).route;
}

export type SubnetOrId = Subnet | pulumi.Input<string>;

(<any>Subnet.prototype.createRoute).doNotCapture = true;

export interface ExistingSubnetArgs {
    /**
     * Optional existing instance to use to make the awsx Subnet out of.  If this is provided No
     * RouteTable or RouteTableAssociation will be automatically be created.
     */
    subnet: aws.ec2.Subnet;
}

function isExistingSubnetArgs(obj: any): obj is ExistingSubnetArgs {
    return !!(<ExistingSubnetArgs>obj).subnet;
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
