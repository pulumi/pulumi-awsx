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
import { getAvailabilityZone } from "./../aws";
import { VpcTopology } from "./vpcTopology";

import * as utils from "./../utils";

let defaultVpc: Vpc;

export class Vpc extends pulumi.ComponentResource {
    // Convenience properties.  Equivalent to getting the IDs from teh corresponding XxxSubnets
    // properties.
    public readonly publicSubnetIds: pulumi.Output<string>[] = [];
    public readonly privateSubnetIds: pulumi.Output<string>[] = [];
    public readonly isolatedSubnetIds: pulumi.Output<string>[] = [];

    public readonly vpc: aws.ec2.Vpc;
    public readonly id: pulumi.Output<string>;

    public readonly publicSubnets: x.ec2.Subnet[] = [];
    public readonly privateSubnets: x.ec2.Subnet[] = [];
    public readonly isolatedSubnets: x.ec2.Subnet[] = [];

    /**
     * The internet gateway created to allow traffic to/from the internet to the public subnets.
     * Only available if this was created using [VpcArgs].
     */
    public internetGateway?: x.ec2.InternetGateway;

    /**
     * The nat gateways created to allow private subnets access to the internet.
     * Only available if this was created using [VpcArgs].
     */
    public readonly natGateways: x.ec2.NatGateway[] = [];

    constructor(name: string, args?: VpcArgs, opts?: pulumi.ComponentResourceOptions);
    constructor(name: string, args?: ExistingVpcArgs, opts?: pulumi.ComponentResourceOptions);
    constructor(name: string, args: VpcArgs | ExistingVpcArgs = {}, opts?: pulumi.ComponentResourceOptions) {
        super("awsx:x:ec2:Vpc", name, {}, opts);

        if (isExistingVpcArgs(args)) {
            this.vpc = args.vpc;
            this.id = this.vpc.id;
        }
        else {
            const cidrBlock = args.cidrBlock === undefined ? "10.0.0.0/16" : args.cidrBlock;
            const numberOfAvailabilityZones = getNumberOfAvailabilityZones(this, args.numberOfAvailabilityZones);

            const numberOfNatGateways = args.numberOfNatGateways === undefined ? numberOfAvailabilityZones : args.numberOfNatGateways;
            if (numberOfNatGateways > numberOfAvailabilityZones) {
                throw new Error(`[numberOfNatGateways] cannot be greater than [numberOfAvailabilityZones]: ${numberOfNatGateways} > ${numberOfAvailabilityZones}`);
            }

            const assignGeneratedIpv6CidrBlock = utils.ifUndefined(args.assignGeneratedIpv6CidrBlock, false);
            this.vpc = new aws.ec2.Vpc(name, {
                ...args,
                cidrBlock,
                enableDnsHostnames: utils.ifUndefined(args.enableDnsHostnames, true),
                enableDnsSupport: utils.ifUndefined(args.enableDnsSupport, true),
                instanceTenancy: utils.ifUndefined(args.instanceTenancy, "default"),
                assignGeneratedIpv6CidrBlock,
            });
            this.id = this.vpc.id;

            // Create the appropriate subnets.  Default to a single public and private subnet for each
            // availability zone if none were specified.
            const topology = new VpcTopology(name, cidrBlock, numberOfAvailabilityZones);
            const subnetDescriptions = topology.createSubnets(args.subnets || [
                { type: "public" },
                { type: "private" },
            ]);

            for (const desc of subnetDescriptions) {
                const type = desc.type;
                const subnetName = desc.subnetName;

                const subnet = new x.ec2.Subnet(subnetName, this, {
                    cidrBlock: desc.cidrBlock,
                    availabilityZone: getAvailabilityZone(desc.availabilityZone),

                    // Allow the individual subnet to decide if it wants to be mapped.  If not
                    // specified, default to mapping a public-ip open if the type is 'public', and
                    // not mapping otherwise.
                    mapPublicIpOnLaunch: utils.ifUndefined(desc.mapPublicIpOnLaunch, type === "public"),

                    // Allow the individual subnet to decide it if wants an ipv6 address assigned at
                    // creation. If not specified, assign by default if the Vpc has ipv6 assigned to
                    // it, don't assign otherwise.
                    assignIpv6AddressOnCreation: utils.ifUndefined(desc.assignIpv6AddressOnCreation, assignGeneratedIpv6CidrBlock);

                    // merge some good default tags, with whatever the user wants.  Their choices should
                    // always win out over any defaults we pick.
                    tags: utils.mergeTags({ type, Name: subnetName }, desc.tags),
                }, opts);

                this.getSubnets(type).push(subnet);
                this.getSubnetIds(type).push(subnet.id);
            }

            // Create an internet gateway if we have public subnets.
            this.addInternetGateway(name, this.publicSubnets);

            // Create nat gateways if we have private subnets.
            createNatGateways(name, this, numberOfAvailabilityZones, numberOfNatGateways);
        }

        this.registerOutputs();
    }

    public getSubnets(type: VpcSubnetType) {
        switch (type) {
            case "public": return this.publicSubnets;
            case "private": return this.privateSubnets;
            case "isolated": return this.isolatedSubnets;
            default: throw new Error("Unexpected subnet type: " + type);
        }
    }

    public getSubnetIds(type: VpcSubnetType) {
        switch (type) {
            case "public": return this.publicSubnetIds;
            case "private": return this.privateSubnetIds;
            case "isolated": return this.isolatedSubnetIds;
            default: throw new Error("Unexpected subnet type: " + type);
        }
    }

    /**
     * Adds an [awsx.ec2.InternetGateway] to this VPC.  Will fail if this Vpc already has an
     * InternetGateway.
     *
     * @param subnets The subnets to route the InternetGateway to.  Will default to the [public]
     *        subnets of this Vpc if not specified.
     */
    public addInternetGateway(name: string, subnets?: x.ec2.Subnet[],
                              args: aws.ec2.InternetGatewayArgs = {}, opts: pulumi.ComponentResourceOptions = {}) {

        if (this.internetGateway) {
            throw new Error("Cannot add InternetGateway to Vpc that already has one.");
        }

        opts = { parent: this, ...opts };

        // See https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html#Add_IGW_Attach_Gateway
        // for more details.
        this.internetGateway = new x.ec2.InternetGateway(name, this, args, opts);

        subnets = subnets || this.publicSubnets;
        for (const subnet of subnets) {
            subnet.createRoute("ig", this.internetGateway);
        }

        return this.internetGateway;
    }

    /**
     * Adds an [awsx.ec2.NatGateway] to this VPC. The NatGateway must be supplied a subnet (normally
     * public) to be placed in.  After adding the NatGateway you should update the route table
     * associated with one or more of your private subnets to point Internet-bound traffic to the
     * NAT gateway. This enables instances in your private subnets to communicate with the internet.
     *
     * This can be done by calling [subnet.createRoute] and passing in the newly created NatGateway.
     */
    public addNatGateway(name: string, args: x.ec2.NatGatewayArgs, opts: pulumi.ComponentResourceOptions = {}) {
        const natGateway = new x.ec2.NatGateway(name, this, args, opts);
        this.natGateways.push(natGateway);
        return natGateway;
    }

    /**
     * Gets the default vpc for the current aws account and region.
     *
     * See https://docs.aws.amazon.com/vpc/latest/userguide/default-vpc.html for more details.
     */
    public static getDefault(opts?: pulumi.ComponentResourceOptions): Vpc {
        if (defaultVpc) {
            return defaultVpc;
        }

        const vpc = aws.ec2.getVpc({ default: true }, opts);
        const vpcId = vpc.then(v => v.id);

        // The default VPC will contain at least two public subnets (one per availability zone).
        // See https://docs.aws.amazon.com/vpc/latest/userguide/images/default-vpc-diagram.png for
        // more information.
        const subnetIds = vpcId.then(id => aws.ec2.getSubnetIds({ vpcId: id }))
            .then(subnets => subnets.ids);
        const subnet0 = subnetIds.then(ids => ids[0]);
        const subnet1 = subnetIds.then(ids => ids[1]);
        const publicSubnetIds = [subnet0, subnet1];

        defaultVpc = Vpc.fromExistingIds("default-vpc", { vpcId, publicSubnetIds }, opts);
        return defaultVpc;
    }

    /**
     * Get an existing Vpc resource's state with the given name and IDs of its relevant
     * sub-resources. This will not cause a VPC (or any sub-resources) to be created, and removing
     * this Vpc from your pulumi application will not cause the existing cloud resource (or
     * sub-resources) to be destroyed.
     */
    public static fromExistingIds(name: string, idArgs: ExistingVpcIdArgs, opts?: pulumi.ComponentResourceOptions) {
        const vpc = new Vpc(name, {
            vpc: aws.ec2.Vpc.get(name, idArgs.vpcId, {}, opts),
        }, opts);

        createSubnets(vpc, name, "public", idArgs.publicSubnetIds);
        createSubnets(vpc, name, "private", idArgs.privateSubnetIds);
        createSubnets(vpc, name, "isolated", idArgs.isolatedSubnetIds);

        if (idArgs.internetGatewayId) {
            const igName = `${name}-ig`;
            vpc.internetGateway = new x.ec2.InternetGateway(igName, vpc, {
                internetGateway: aws.ec2.InternetGateway.get(igName, idArgs.internetGatewayId),
            });
        }

        if (idArgs.natGatewayIds) {
            for (let i = 0, n = idArgs.natGatewayIds.length; i < n; i++) {
                const natGatewayId = idArgs.natGatewayIds[i];
                const natName = `${name}-nat-${i}`;
                vpc.natGateways.push(new x.ec2.NatGateway(natName, vpc, {
                    natGateway: aws.ec2.NatGateway.get(natName, natGatewayId),
                }));
            }
        }

        return vpc;
    }
}

(<any>Vpc.prototype.addInternetGateway).doNotCapture = true;
(<any>Vpc.prototype.addNatGateway).doNotCapture = true;

function getNumberOfAvailabilityZones(vpc: Vpc, requestedCount: "all" | number | undefined) {
    if (typeof requestedCount === "number") {
        return requestedCount;
    }

    if (requestedCount === "all") {
        const availabilityZones = utils.promiseResult(aws.getAvailabilityZones(/*args:*/undefined, { parent: vpc }));
        if (availabilityZones && availabilityZones.names && availabilityZones.names.length > 0) {
            return availabilityZones.names.length;
        }
    }

    return 2;
}

function createNatGateways(vpcName: string, vpc: Vpc, numberOfAvailabilityZones: number, numberOfNatGateways: number) {
    // Create nat gateways if we have private subnets and we have public subnets to place them in.
    if (vpc.privateSubnets.length === 0 || numberOfNatGateways === 0 || vpc.publicSubnets.length === 0) {
        return;
    }

    for (let i = 0; i < numberOfNatGateways; i++) {
        // Each public subnet was already created across all availability zones.  So, to
        // maximize coverage of availability zones, we can just walk the public subnets and
        // create a nat gateway for it's availability zone.  If more natgateways were
        // requested then we'll just round-robin them among the availability zones.
        const availabilityZone = i % numberOfAvailabilityZones;

        // this indexing is safe since we would have created the any subnet across all
        // availability zones.
        const publicSubnet = vpc.publicSubnets[availabilityZone];

        vpc.addNatGateway(`${vpcName}-${i}`, { subnet: publicSubnet });
    }

    let roundRobinIndex = 0;

    // We created subnets 'numberOfAvailabilityZones' at a time.  So just jump through them in
    // chunks of that size.
    for (let i = 0, n = vpc.privateSubnets.length; i < n; i += numberOfAvailabilityZones) {
        // For each chunk of subnets, we will have spread them across all the availability
        // zones.  We also created a nat gateway per availability zone *up to*
        // numberOfNatGateways.  So for the subnets in an availability zone that we created a
        // nat gateway in, just route to that nat gateway.  For the other subnets that are
        // in an availability zone without a nat gateway, we just round-robin between any
        // nat gateway we created.
        for (let j = 0; j < numberOfAvailabilityZones; j++) {
            const privateSubnet = vpc.privateSubnets[i + j];
            const natGateway = j < numberOfNatGateways
                ? vpc.natGateways[j]
                : vpc.natGateways[roundRobinIndex++];

            privateSubnet.createRoute(`nat-${j}`, natGateway);
        }
    }
}

function createSubnets(vpc: Vpc, vpcName: string, type: VpcSubnetType, inputs: pulumi.Input<string>[] = []) {
    const parentOpts = { parent: vpc };
    const subnets = vpc.getSubnets(type);
    const subnetIds = vpc.getSubnetIds(type);

    for (let i = 0, n = inputs.length; i < n; i++) {
        const subnetName = `${vpcName}-${type}-${i}`;
        const subnet = new x.ec2.Subnet(subnetName, vpc, {
            subnet: aws.ec2.Subnet.get(subnetName, inputs[i], /*state:*/undefined, parentOpts),
        }, parentOpts);

        subnets.push(subnet);
        subnetIds.push(subnet.id);
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
     * An optional name to use as part of the subnet name.  If not provided, will be set to
     * "public"/"private"/"isolated" depending on the [type] of this subnet.  Required if making
     * multiple subnets with the same type.
     */
    name?: string;

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

    /**
     * Specify true to indicate that network interfaces created in the specified subnet should be
     * assigned an IPv6 address. Defaults to the value of VpcArgs.assignGeneratedIpv6CidrBlock.
     */
    assignIpv6AddressOnCreation?: pulumi.Input<boolean>;

    /**
     * Specify true to indicate that instances launched into the subnet should be assigned a public
     * IP address. Default's to `true` if `type` is `public`.  `false` otherwise.
     */
    mapPublicIpOnLaunch?: pulumi.Input<boolean>;

    tags?: pulumi.Input<aws.Tags>;
}

export interface ExistingVpcIdArgs {
    /** The id of the VPC. */
    vpcId: pulumi.Input<string>;
    /** The public subnets for the vpc. */
    publicSubnetIds?: pulumi.Input<string>[];
    /** The private subnets for the vpc. */
    privateSubnetIds?: pulumi.Input<string>[];
    /** The isolated subnets for the vpc. */
    isolatedSubnetIds?: pulumi.Input<string>[];
    /** The id of the internet gateway for this VPC */
    internetGatewayId?: pulumi.Input<string>;
    /** The ids of the nat gateways for this VPC */
    natGatewayIds?: pulumi.Input<string>[];
}

function isExistingVpcIdArgs(obj: any): obj is ExistingVpcIdArgs {
    return !!(<ExistingVpcIdArgs>obj).vpcId;
}

export interface ExistingVpcArgs {
    /** The id of the VPC. */
    vpc: aws.ec2.Vpc;
}

function isExistingVpcArgs(obj: any): obj is ExistingVpcArgs {
    return !!(<ExistingVpcArgs>obj).vpc;
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
     * The maximum number of availability zones to use in the current region.  Defaults to `2` if
     * unspecified.  Use `"all"` to use all the availability zones in the current region.
     */
    numberOfAvailabilityZones?: number | "all";

    /**
     * The number of NAT gateways to create if there are any private subnets created.  A NAT gateway
     * enables instances in a private subnet to connect to the internet or other AWS services, but
     * prevent the internet from initiating a connection with those instances. A minimum of '1'
     * gateway is needed if an instance is to be allowed connection to the internet.
     *
     * If this is set, a nat gateway will be made for each availability zone in the current region.
     * The first public subnet for that availability zone will be the one used to place the nat
     * gateway in.  If less gateways are requested than availability zones, then only
     * that many nat gateways will be created.
     *
     * Private subnets in an availability zone that contains a nat gateway will route through that
     * gateway.  Private subnets in an availability zone that does not contain a nat gateway will be
     * routed to the other nat gateways in a round-robin fashion.
     *
     * See https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html for more details.
     *
     * Defaults to [numberOfAvailabilityZones].
     */
    numberOfNatGateways?: number;

    /**
     * Requests an Amazon-provided IPv6 CIDR block with a /56 prefix length for the VPC. You cannot
     * specify the range of IP addresses, or the size of the CIDR block. Default is `false`.  If set
     * to `true`, then subnets created will default to `assignIpv6AddressOnCreation: true` as well.
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
