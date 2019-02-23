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

export class NatGateway
        extends pulumi.ComponentResource
        implements x.ec2.SubnetRouteProvider {

    public readonly vpc: x.ec2.Vpc;
    public readonly elasticIP: aws.ec2.Eip;
    public readonly natGateway: aws.ec2.NatGateway;

    constructor(name: string, vpc: x.ec2.Vpc, args: pulumi.WrappedObject<NatGatewayArgs>, opts?: pulumi.ComponentResourceOptions);
    constructor(name: string, vpc: x.ec2.Vpc, args: pulumi.WrappedObject<ExistingNatGatewayArgs>, opts?: pulumi.ComponentResourceOptions);
    constructor(name: string, vpc: x.ec2.Vpc, args: pulumi.WrappedObject<NatGatewayArgs> | pulumi.WrappedObject<ExistingNatGatewayArgs>, opts?: pulumi.ComponentResourceOptions) {
        super("awsx:x:ec2:NatGateway", name, {}, opts || { parent: vpc });

        const parentOpts = { parent: this };

        this.vpc = vpc;
        if (isExistingNatGatewayArgs(args)) {
            this.natGateway = args.natGateway;
        }
        else {
            // from https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
            //
            // you must also specify an Elastic IP address to associate with the NAT gateway
            // when you create it. After you've created a NAT gateway, you must update the route
            // table associated with one or more of your private subnets to point Internet-bound
            // traffic to the NAT gateway. This enables instances in your private subnets to
            // communicate with the internet.

            this.elasticIP = new aws.ec2.Eip(name, {
                tags: { Name: name },
            }, parentOpts);

            const subnetId = x.ec2.Subnet.isSubnetInstance(args.subnet)
                ? args.subnet.id
                : args.subnet;

            this.natGateway = new aws.ec2.NatGateway(name, {
                ...args,
                subnetId,
                allocationId: this.elasticIP.id,
            }, parentOpts);
        }

        this.registerOutputs();
    }

    public route(name: string, opts: pulumi.ComponentResourceOptions): pulumi.WrappedObject<x.ec2.RouteArgs> {
        return {
            // From https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html#nat-gateway-create-route
            // Choose Add another route. For Destination, type 0.0.0.0/0. For Target, select the ID
            // of your NAT gateway.
            destinationCidrBlock: "0.0.0.0/0",
            gatewayId: this.natGateway.id,
        };
    }
}

export interface NatGatewayArgs {
    /**
     * The subnet the NatGateway should be placed in.
     */
    subnet: x.ec2.SubnetOrId;

    /**
     * A mapping of tags to assign to the resource.
     */
    tags?: { [key: string]: any; };
}

export interface ExistingNatGatewayArgs {
    natGateway: aws.ec2.NatGateway;
}

function isExistingNatGatewayArgs(obj: any): obj is ExistingNatGatewayArgs {
    return !!(<ExistingNatGatewayArgs>obj).natGateway;
}
