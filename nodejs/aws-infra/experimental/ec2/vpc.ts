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
import { VpcTopology } from "./vpcTopology";

import * as utils from "./../../utils";

let defaultVpc: Vpc;

export class Vpc extends pulumi.ComponentResource {
    /**
     * Id for the underlying [aws.ec2.Vpc] instance.
     */
    public readonly vpcId: pulumi.Output<string>;
    public readonly publicSubnetIds: pulumi.Output<string>[];
    public readonly privateSubnetIds: pulumi.Output<string>[];
    public readonly isolatedSubnetIds: pulumi.Output<string>[];
    // tslint:disable-next-line:variable-name
    private __instance: aws.ec2.Vpc;

    public readonly instance: () => aws.ec2.Vpc;

    /**
     * Only available if this was created using [VpcArgs].
     */
    public readonly publicSubnets: x.ec2.Subnet[] = [];
    public readonly privateSubnets: x.ec2.Subnet[] = [];
    public readonly isolatedSubnets: x.ec2.Subnet[] = [];

    constructor(name: string, args: VpcArgs, opts?: pulumi.ComponentResourceOptions);
    constructor(name: string, args: ExistingVpcArgs, opts?: pulumi.ComponentResourceOptions);
    constructor(name: string, args: VpcArgs | ExistingVpcArgs, opts?: pulumi.ComponentResourceOptions) {
        super("awsinfra:x:ec2:Vpc", name, {}, opts);

        this.instance = () => {
            if (!this.__instance) {
                this.__instance = aws.ec2.Vpc.get(name, this.vpcId);
            }

            return this.__instance;
        };

        if (isExistingVpcArgs(args)) {
            this.vpcId = pulumi.output(args.vpcId);
            this.publicSubnetIds = createOutputs(args.publicSubnetIds);
            this.privateSubnetIds = createOutputs(args.privateSubnetIds);
            this.isolatedSubnetIds = createOutputs(args.isolatedSubnetIds);
            return;
        }

        const cidrBlock = args.cidrBlock === undefined ? "10.0.0.0/16" : args.cidrBlock;
        const numberOfAvailabilityZones = args.numberOfAvailabilityZones === undefined ? 2 : args.numberOfAvailabilityZones;
        this.__instance = new aws.ec2.Vpc(name, {
            ...args,
            cidrBlock,
            enableDnsHostnames: utils.ifUndefined(args.enableDnsHostnames, true),
            enableDnsSupport: utils.ifUndefined(args.enableDnsSupport, true),
            instanceTenancy: utils.ifUndefined(args.instanceTenancy, "default"),
        });

        const topology = new VpcTopology(this, name, cidrBlock, numberOfAvailabilityZones, opts);

        // Create the appropriate subnets.  Default to a single public and private subnet for each
        // availability zone if none were specified.
        const subnetArgs = args.subnets || [
            { type: "public" },
            { type: "private"},
        ];

        topology.createSubnets(subnetArgs);

        createGateways(subnetArgs);

        this.registerOutputs();
    }

    /**
     * Gets the default vpc for the current aws account and region.
     *
     * See https://docs.aws.amazon.com/vpc/latest/userguide/default-vpc.html for more details.
     */
    public static getDefault(opts?: pulumi.ComponentResourceOptions): Vpc {
        if (!defaultVpc) {
            return defaultVpc;
        }

        const vpc = aws.ec2.getVpc({default: true});
        const vpcId = vpc.then(v => v.id);

        // The default VPC will contain at least two public subnets (one per availability zone).
        // See https://docs.aws.amazon.com/vpc/latest/userguide/images/default-vpc-diagram.png for
        // more information.
        const subnetIds = vpcId.then(id => aws.ec2.getSubnetIds({ vpcId: id }))
                               .then(subnets => subnets.ids);
        const subnet0 = subnetIds.then(ids => ids[0]);
        const subnet1 = subnetIds.then(ids => ids[1]);

        defaultVpc = new Vpc("default-vpc", {
            vpcId,
            publicSubnetIds: [subnet0, subnet1],
        }, opts);

        return defaultVpc;
    }
}

function createOutputs(inputs: pulumi.Input<string>[] | undefined) {
    if (!inputs) {
        return [];
    }

    return inputs.map(i => pulumi.output(i));
}

function createGateways(subnetArgs: VpcSubnetArgs[]) {
    const isolatedSubnets = subnetArgs.filter(s => s.type === "isolated");

    // if all the subnets are isolated, we don't have to create any gateways for them.
    if (isolatedSubnets.length === subnetArgs.length) {
        return;
    }


}

/**
 * The type of this subet.
 *
 * 1. A "public" subnet will route traffic to an [InternetGateway].  If you specify a public subnet
 *    this InternetGateway will be created on your behalf and traffic will be routed accordingly.
 * 2. A "private" subnet is similar to "public" except that the subnet will not have a route to the
 *    [InternetGateway].  Instead, there will be a route entry setup for the NatGateway in that
 *    availability zone to the subnet.
 * 3. Unlike "public" or "private" subnets, an "isolated" subnet has no routing specified at all.
 */
export type VpcSubnetType = "public" | "private" | "isolated";

/**
 * Information that controls how each vpc subnet should be created for each availability zone. The
 * vpc will control actually creating the appropriate subnets in each zone depending on the values
 * specified in this type.  This help ensure that each subnet will reside entirely within one
 * Availability Zone and cannot span zones.
 *
 * See https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html for more details.
 */
export interface VpcSubnetArgs {
    /**
     * The type of subnet to make in each availability zone.
     */
    type: VpcSubnetType;

    /**
     * The number of leading bits in the Vpc cidrBlock to use to define the cidrBlock for this
     * subnet. By providing masking bits, this can be computed in a way that ensures that each
     * subnet has a distinct block.
     *
     * If this is not provided, the cidrBlock for the vpc will be appropriately split based on the
     * number of subnets and availability zones there are.
     *
     * The allowed mask size is between a 28 netmask and 16 netmask.  See
     * https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html for more details.
     */
    cidrMask?: number;

    tags?: pulumi.Input<aws.Tags>;
}

export interface ExistingVpcArgs {
    /** The id of the VPC. */
    vpcId: pulumi.Input<string>;
    /** The public subnets for the vpc. */
    publicSubnetIds?: pulumi.Input<string>[];
    /** The private subnets for the vpc. */
    privateSubnetIds?: pulumi.Input<string>[];
    /** The isolated subnets for the vpc. */
    isolatedSubnetIds?: pulumi.Input<string>[];
}

function isExistingVpcArgs(obj: any): obj is ExistingVpcArgs {
    return !!(<ExistingVpcArgs>obj).vpcId;
}

type OverwriteShape = utils.Overwrite<aws.ec2.VpcArgs, {
    cidrBlock?: string;
}>;

export interface VpcArgs {
    /**
     * The information about what subnets to create per availability zone.  Defaults to one public and
     * one private subnet if unspecified.
     */
    subnets?: VpcSubnetArgs[];

    /**
     * The maximum number of availability zones to use in the current region.  Defaults to '2' if
     * unspecified.
     */
    numberOfAvailabilityZones?: number;
    /**
     * Requests an Amazon-provided IPv6 CIDR
     * block with a /56 prefix length for the VPC. You cannot specify the range of IP addresses, or
     * the size of the CIDR block. Default is `false`.
     */
    assignGeneratedIpv6CidrBlock?: pulumi.Input<boolean>;
    /**
     * The CIDR block for the VPC.  Defaults to "10.0.0.0/16" if unspecified.
     */
    cidrBlock?: string;
    /**
     * A boolean flag to enable/disable ClassicLink
     * for the VPC. Only valid in regions and accounts that support EC2 Classic.
     * See the [ClassicLink documentation][1] for more information. Defaults false.
     */
    enableClassiclink?: pulumi.Input<boolean>;
    /**
     * A boolean flag to enable/disable ClassicLink DNS Support for the VPC.
     * Only valid in regions and accounts that support EC2 Classic.
     */
    enableClassiclinkDnsSupport?: pulumi.Input<boolean>;
    /**
     * A boolean flag to enable/disable DNS hostnames in the VPC. Defaults to true if unspecified.
     */
    enableDnsHostnames?: pulumi.Input<boolean>;
    /**
     * A boolean flag to enable/disable DNS support in the VPC. Defaults true if unspecified.
     */
    enableDnsSupport?: pulumi.Input<boolean>;
    /**
     * A tenancy option for instances launched into the VPC.  Defaults to "default" if unspecified.
     */
    instanceTenancy?: pulumi.Input<"default" | "dedicated">;
    /**
     * A mapping of tags to assign to the resource.
     */
    tags?: pulumi.Input<aws.Tags>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteShape, VpcArgs>();
