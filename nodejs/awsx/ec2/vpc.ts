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
import * as topology from "./vpcTopology";

import * as utils from "./../utils";

// Mapping from vpcId to Vpc.
const defaultVpcs = new Map<string, Vpc>();

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
    constructor(name: string, args: VpcArgs | ExistingVpcArgs = {}, opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:x:ec2:Vpc", name, {}, opts);

        if (isExistingVpcArgs(args)) {
            this.vpc = args.vpc;
            this.id = this.vpc.id;
        }
        else {
            const cidrBlock = args.cidrBlock === undefined ? "10.0.0.0/16" : args.cidrBlock;
            const availabilityZones = getAvailabilityZones(this, args.numberOfAvailabilityZones);

            const numberOfNatGateways = args.numberOfNatGateways === undefined ? availabilityZones.length : args.numberOfNatGateways;
            const assignGeneratedIpv6CidrBlock = utils.ifUndefined(args.assignGeneratedIpv6CidrBlock, false);

            // We previously did not parent the underlying Vpc to this component. We now do. Provide
            // an alias so this doesn't cause resources to be destroyed/recreated for existing
            // stacks.
            this.vpc = new aws.ec2.Vpc(name, {
                ...args,
                cidrBlock,
                enableDnsHostnames: utils.ifUndefined(args.enableDnsHostnames, true),
                enableDnsSupport: utils.ifUndefined(args.enableDnsSupport, true),
                instanceTenancy: utils.ifUndefined(args.instanceTenancy, "default"),
                assignGeneratedIpv6CidrBlock,
            }, { parent: this, aliases: [{ parent: pulumi.rootStackResource }] });
            this.id = this.vpc.id;

            const subnets = args.subnets || [
                { type: "public" },
                { type: "private" },
            ];

            this.partition(
                name, cidrBlock, availabilityZones, numberOfNatGateways,
                assignGeneratedIpv6CidrBlock, subnets, opts);

            // Create an internet gateway if we have public subnets.
            this.addInternetGateway(name, this.publicSubnets);
        }

        this.registerOutputs();
    }

    private partition(
            name: string, cidrBlock: CidrBlock, availabilityZones: topology.AvailabilityZoneDescription[],
            numberOfNatGateways: number, assignGeneratedIpv6CidrBlock: pulumi.Output<boolean>,
            subnetArgs: VpcSubnetArgs[], opts: pulumi.ComponentResourceOptions) {
        // Create the appropriate subnets.  Default to a single public and private subnet for each
        // availability zone if none were specified.
        const { subnets, natGateways, natRoutes } = topology.create(
            this, name, cidrBlock, this.vpc.ipv6CidrBlock, availabilityZones,
            numberOfNatGateways, assignGeneratedIpv6CidrBlock, subnetArgs);

        for (const desc of subnets) {
            // We previously did not parent the subnet to this component. We now do. Provide an
            // alias so this doesn't cause resources to be destroyed/recreated for existing
            // stacks.
            // Only set one of availabilityZone or availabilityZoneId
            const availabilityZone = desc.args.availabilityZone;
            const availabilityZoneId = availabilityZone ? undefined : desc.args.availabilityZoneId;

            const subnet = new x.ec2.Subnet(desc.subnetName, this, {
                ...desc.args,
                availabilityZone,
                availabilityZoneId,
                tags: utils.mergeTags({ type: desc.type, Name: desc.subnetName }, desc.args.tags),
            }, { aliases: [{ parent: opts.parent }], parent: this });

            this.addSubnet(desc.type, subnet);
        }

        for (const desc of natGateways) {
            const publicSubnet = this.publicSubnets.find(s => s.subnetName === desc.publicSubnet);
            if (!publicSubnet) {
                throw new pulumi.ResourceError(`Could not find public subnet named ${desc.publicSubnet}`, this);
            }

            this.addNatGateway(desc.name, { subnet: publicSubnet });
        }

        for (const desc of natRoutes) {
            const privateSubnet = this.privateSubnets.find(s => s.subnetName === desc.privateSubnet);
            if (!privateSubnet) {
                throw new pulumi.ResourceError(`Could not find private subnet named ${desc.privateSubnet}`, this);
            }

            const natGateway = this.natGateways.find(g => g.natGatewayName === desc.natGateway);
            if (!natGateway) {
                throw new pulumi.ResourceError(`Could not find nat gateway named ${desc.natGateway}`, this);
            }

            privateSubnet.createRoute(desc.name, natGateway);
        }
    }

    private addSubnet(type: VpcSubnetType, subnet: x.ec2.Subnet) {
        this.getSubnets(type).push(subnet);
        this.getSubnetIds(type).push(subnet.id);
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
     *
     * Note: the no-arg version of this call is not recommended.  It will acquire the default Vpc
     * for the current region and cache it.  Instead, it is recommended that the `getDefault(opts)`
     * version be used instead.  This version will properly respect providers.
     */
    public static getDefault(opts: pulumi.InvokeOptions = {}): Vpc {
        // Pull out the provider to ensure we're looking up the default vpc in the right location.
        // Note that we do not pass 'parent' along as we want the default vpc to always be parented
        // logically by hte stack.
        const provider = opts.provider ? opts.provider :
                         opts.parent   ? opts.parent.getProvider("aws::") : undefined;

        // And we want to be able to return the same Vpc object instance if it represents the same
        // logical default vpc instance for the AWS account.  Fortunately Vpcs have unique ids for
        // an account.  So we just map from the id to the Vpc instance we hydrate.  If asked again
        // for the same id we can just return the same instance.
        const vpcId = aws.ec2.getVpc({ default: true }, { provider }).id;
        let vpc = defaultVpcs.get(vpcId);
        if (!vpc) {
            // back compat.  We always would just use the first two public subnets of the region
            // we're in.  So preserve that, even though we could get all of them here.  Pulling in
            // more than the two we pulled in before could have deep implications for clients as
            // those subnets are used to make many downstream resource-creating decisions.
            const publicSubnetIds = aws.ec2.getSubnetIds({ vpcId }, { provider }).ids.slice(0, 2);

            // Generate the name as `default-` + the actual name.  For back compat with how we
            // previously named things, also create an alias from "default-vpc" to this name for
            // the very first default Vpc we create as that's how we used to name them.
            const vpcName = "default-" + vpcId;

            const aliases = defaultVpcs.size === 0
                ? [{ name: "default-vpc" }]
                : [];

            vpc = Vpc.fromExistingIds(vpcName, { vpcId, publicSubnetIds }, { aliases, provider });

            defaultVpcs.set(vpcId, vpc);
        }

        return vpc;
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

        getExistingSubnets(vpc, name, "public", idArgs.publicSubnetIds);
        getExistingSubnets(vpc, name, "private", idArgs.privateSubnetIds);
        getExistingSubnets(vpc, name, "isolated", idArgs.isolatedSubnetIds);

        // Pass along aliases so that the previously unparented resources are now properly parented
        // to the vpc.
        if (idArgs.internetGatewayId) {
            const igName = `${name}-ig`;
            vpc.internetGateway = new x.ec2.InternetGateway(igName, vpc, {
                internetGateway: aws.ec2.InternetGateway.get(igName, idArgs.internetGatewayId, {}, { parent: vpc }),
            }, { parent: vpc, aliases: [{ parent: pulumi.rootStackResource }] });
        }

        if (idArgs.natGatewayIds) {
            for (let i = 0, n = idArgs.natGatewayIds.length; i < n; i++) {
                const natGatewayId = idArgs.natGatewayIds[i];
                const natName = `${name}-nat-${i}`;
                vpc.natGateways.push(new x.ec2.NatGateway(natName, vpc, {
                    natGateway: aws.ec2.NatGateway.get(natName, natGatewayId, {}, { parent: vpc }),
                }, { parent: vpc, aliases: [{ parent: pulumi.rootStackResource }] }));
            }
        }

        return vpc;
    }
}

(<any>Vpc.prototype.addInternetGateway).doNotCapture = true;
(<any>Vpc.prototype.addNatGateway).doNotCapture = true;
(<any>Vpc.prototype).partition.doNotCapture = true;

function getAvailabilityZones(vpc: Vpc, requestedCount: "all" | number | undefined): topology.AvailabilityZoneDescription[] {
    const result = aws.getAvailabilityZones(/*args:*/ undefined, { parent: vpc });
    if (result.names.length !== result.zoneIds.length) {
        throw new pulumi.ResourceError("Availability zones for region had mismatched names and ids.", vpc);
    }

    const descriptions: topology.AvailabilityZoneDescription[] = [];
    for (let i = 0, n = result.names.length; i < n; i++) {
        descriptions.push({ name: result.names[i], id: result.zoneIds[i] });
    }

    const count =
        typeof requestedCount === "number" ? requestedCount :
        requestedCount === "all" ? descriptions.length : 2;

    return descriptions.slice(0, count);
}

function getExistingSubnets(vpc: Vpc, vpcName: string, type: VpcSubnetType, inputs: pulumi.Input<string>[] = []) {
    const subnets = vpc.getSubnets(type);
    const subnetIds = vpc.getSubnetIds(type);

    for (let i = 0, n = inputs.length; i < n; i++) {
        const subnetName = `${vpcName}-${type}-${i}`;
        const subnet = new x.ec2.Subnet(subnetName, vpc, {
            subnet: aws.ec2.Subnet.get(subnetName, inputs[i], /*state:*/undefined, { parent: vpc }),
        }, { parent: vpc });

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
 * Information that controls how each vpc subnet should be created for each availability zone. By
 * default, the Vpc will control actually creating the appropriate subnets in each zone depending on
 * the values specified in this type.  This help ensure that each subnet will reside entirely within
 * one Availability Zone and cannot span zones.
 *
 * For finer control of the locations of the subnets, specify the [location] property for all the
 * subnets.
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
     *
     * If this property is provided, [location] cannot be provided.
     */
    cidrMask?: number;

    /**
     * More precise information about the location of this subnet.  Can either be a simple CidrBlock
     * (i.e. 10.0.0.0/24), or a richer object describing the CidrBlocks and Availability Zone for
     * the subnet.
     *
     * If this property is provided, [cidrMask] cannot be provided.
     *
     * If only a CidrBlock is provided here, then the subnet will be placed in the first
     * availability zone for the region.
     *
     * If this property is provided for one subnet, it must be provided for all subnets.
     */
    location?: CidrBlock | VpcSubnetLocation;

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

/**
 * Alias for a cidr block.
 */
export type CidrBlock = string;

export interface VpcSubnetLocation {
    /**
     * The AZ for the subnet.
     */
    availabilityZone?: string;
    /**
     * The AZ ID of the subnet.
     */
    availabilityZoneId?: string;
    /**
     * The CIDR block for the subnet.
     */
    cidrBlock: pulumi.Input<CidrBlock>;
    /**
     * The IPv6 network range for the subnet, in CIDR notation. The subnet size must use a /64
     * prefix length.
     */
    ipv6CidrBlock?: pulumi.Input<string>;
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

export interface ExistingVpcArgs {
    /** The id of the VPC. */
    vpc: aws.ec2.Vpc;
}

function isExistingVpcArgs(obj: any): obj is ExistingVpcArgs {
    return !!(<ExistingVpcArgs>obj).vpc;
}

type OverwriteShape = utils.Overwrite<aws.ec2.VpcArgs, {
    cidrBlock?: CidrBlock;
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
     * The max number of NAT gateways to create if there are any private subnets created.  A NAT
     * gateway enables instances in a private subnet to connect to the internet or other AWS
     * services, but prevent the internet from initiating a connection with those instances. A
     * minimum of '1' gateway is needed if an instance is to be allowed connection to the internet.
     *
     * If this is not set, a nat gateway will be made for each availability zone in the current
     * region. The first public subnet for that availability zone will be the one used to place the
     * nat gateway in.  If less gateways are requested than availability zones, then only that many
     * nat gateways will be created.
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
    cidrBlock?: CidrBlock;
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
