// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import { input as inputs, output as outputs, enums } from "../types";
import * as utilities from "../utilities";

import * as pulumiAws from "@pulumi/aws";

export class Vpc extends pulumi.ComponentResource {
    /** @internal */
    public static readonly __pulumiType = 'awsx:ec2:Vpc';

    /**
     * Returns true if the given object is an instance of Vpc.  This is designed to work even
     * when multiple copies of the Pulumi SDK have been loaded into the same process.
     */
    public static isInstance(obj: any): obj is Vpc {
        if (obj === undefined || obj === null) {
            return false;
        }
        return obj['__pulumiType'] === Vpc.__pulumiType;
    }

    /**
     * The EIPs for any NAT Gateways for the VPC. If no NAT Gateways are specified, this will be an empty list.
     */
    public /*out*/ readonly eips!: pulumi.Output<pulumiAws.ec2.Eip[]>;
    /**
     * The Internet Gateway for the VPC.
     */
    public /*out*/ readonly internetGateway!: pulumi.Output<pulumiAws.ec2.InternetGateway>;
    public /*out*/ readonly isolatedSubnetIds!: pulumi.Output<string[]>;
    /**
     * The NAT Gateways for the VPC. If no NAT Gateways are specified, this will be an empty list.
     */
    public readonly natGateways!: pulumi.Output<pulumiAws.ec2.NatGateway[]>;
    public /*out*/ readonly privateSubnetIds!: pulumi.Output<string[]>;
    public /*out*/ readonly publicSubnetIds!: pulumi.Output<string[]>;
    /**
     * The Route Table Associations for the VPC.
     */
    public /*out*/ readonly routeTableAssociations!: pulumi.Output<pulumiAws.ec2.RouteTableAssociation[]>;
    /**
     * The Route Tables for the VPC.
     */
    public /*out*/ readonly routeTables!: pulumi.Output<pulumiAws.ec2.RouteTable[]>;
    /**
     * The Routes for the VPC.
     */
    public /*out*/ readonly routes!: pulumi.Output<pulumiAws.ec2.Route[]>;
    /**
     * The VPC's subnets.
     */
    public /*out*/ readonly subnets!: pulumi.Output<pulumiAws.ec2.Subnet[]>;
    /**
     * The VPC.
     */
    public /*out*/ readonly vpc!: pulumi.Output<pulumiAws.ec2.Vpc>;
    /**
     * The VPC Endpoints that are enabled
     */
    public /*out*/ readonly vpcEndpoints!: pulumi.Output<pulumiAws.ec2.VpcEndpoint[]>;
    public /*out*/ readonly vpcId!: pulumi.Output<string>;

    /**
     * Create a Vpc resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args?: VpcArgs, opts?: pulumi.ComponentResourceOptions) {
        let resourceInputs: pulumi.Inputs = {};
        opts = opts || {};
        if (!opts.id) {
            resourceInputs["assignGeneratedIpv6CidrBlock"] = args ? args.assignGeneratedIpv6CidrBlock : undefined;
            resourceInputs["availabilityZoneNames"] = args ? args.availabilityZoneNames : undefined;
            resourceInputs["cidrBlock"] = args ? args.cidrBlock : undefined;
            resourceInputs["enableClassiclink"] = args ? args.enableClassiclink : undefined;
            resourceInputs["enableClassiclinkDnsSupport"] = args ? args.enableClassiclinkDnsSupport : undefined;
            resourceInputs["enableDnsHostnames"] = args ? args.enableDnsHostnames : undefined;
            resourceInputs["enableDnsSupport"] = args ? args.enableDnsSupport : undefined;
            resourceInputs["instanceTenancy"] = args ? args.instanceTenancy : undefined;
            resourceInputs["ipv4IpamPoolId"] = args ? args.ipv4IpamPoolId : undefined;
            resourceInputs["ipv4NetmaskLength"] = args ? args.ipv4NetmaskLength : undefined;
            resourceInputs["ipv6CidrBlock"] = args ? args.ipv6CidrBlock : undefined;
            resourceInputs["ipv6CidrBlockNetworkBorderGroup"] = args ? args.ipv6CidrBlockNetworkBorderGroup : undefined;
            resourceInputs["ipv6IpamPoolId"] = args ? args.ipv6IpamPoolId : undefined;
            resourceInputs["ipv6NetmaskLength"] = args ? args.ipv6NetmaskLength : undefined;
            resourceInputs["natGateways"] = args ? args.natGateways : undefined;
            resourceInputs["numberOfAvailabilityZones"] = args ? args.numberOfAvailabilityZones : undefined;
            resourceInputs["subnetSpecs"] = args ? args.subnetSpecs : undefined;
            resourceInputs["tags"] = args ? args.tags : undefined;
            resourceInputs["vpcEndpointSpecs"] = args ? args.vpcEndpointSpecs : undefined;
            resourceInputs["eips"] = undefined /*out*/;
            resourceInputs["internetGateway"] = undefined /*out*/;
            resourceInputs["isolatedSubnetIds"] = undefined /*out*/;
            resourceInputs["privateSubnetIds"] = undefined /*out*/;
            resourceInputs["publicSubnetIds"] = undefined /*out*/;
            resourceInputs["routeTableAssociations"] = undefined /*out*/;
            resourceInputs["routeTables"] = undefined /*out*/;
            resourceInputs["routes"] = undefined /*out*/;
            resourceInputs["subnets"] = undefined /*out*/;
            resourceInputs["vpc"] = undefined /*out*/;
            resourceInputs["vpcEndpoints"] = undefined /*out*/;
            resourceInputs["vpcId"] = undefined /*out*/;
        } else {
            resourceInputs["eips"] = undefined /*out*/;
            resourceInputs["internetGateway"] = undefined /*out*/;
            resourceInputs["isolatedSubnetIds"] = undefined /*out*/;
            resourceInputs["natGateways"] = undefined /*out*/;
            resourceInputs["privateSubnetIds"] = undefined /*out*/;
            resourceInputs["publicSubnetIds"] = undefined /*out*/;
            resourceInputs["routeTableAssociations"] = undefined /*out*/;
            resourceInputs["routeTables"] = undefined /*out*/;
            resourceInputs["routes"] = undefined /*out*/;
            resourceInputs["subnets"] = undefined /*out*/;
            resourceInputs["vpc"] = undefined /*out*/;
            resourceInputs["vpcEndpoints"] = undefined /*out*/;
            resourceInputs["vpcId"] = undefined /*out*/;
        }
        opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
        super(Vpc.__pulumiType, name, resourceInputs, opts, true /*remote*/);
    }
}

/**
 * The set of arguments for constructing a Vpc resource.
 */
export interface VpcArgs {
    /**
     * Requests an Amazon-provided IPv6 CIDR block with a /56 prefix length for the VPC. You cannot specify the range of IP addresses, or the size of the CIDR block. Default is `false`. Conflicts with `ipv6_ipam_pool_id`
     */
    assignGeneratedIpv6CidrBlock?: pulumi.Input<boolean>;
    /**
     * A list of availability zone names to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
     */
    availabilityZoneNames?: string[];
    /**
     * The CIDR block for the VPC. Optional. Defaults to 10.0.0.0/16.
     */
    cidrBlock?: string;
    /**
     * A boolean flag to enable/disable ClassicLink
     * for the VPC. Only valid in regions and accounts that support EC2 Classic.
     * See the [ClassicLink documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/vpc-classiclink.html) for more information. Defaults false.
     */
    enableClassiclink?: pulumi.Input<boolean>;
    /**
     * A boolean flag to enable/disable ClassicLink DNS Support for the VPC.
     * Only valid in regions and accounts that support EC2 Classic.
     */
    enableClassiclinkDnsSupport?: pulumi.Input<boolean>;
    /**
     * A boolean flag to enable/disable DNS hostnames in the VPC. Defaults false.
     */
    enableDnsHostnames?: pulumi.Input<boolean>;
    /**
     * A boolean flag to enable/disable DNS support in the VPC. Defaults true.
     */
    enableDnsSupport?: pulumi.Input<boolean>;
    /**
     * A tenancy option for instances launched into the VPC. Default is `default`, which ensures that EC2 instances launched in this VPC use the EC2 instance tenancy attribute specified when the EC2 instance is launched. The only other option is `dedicated`, which ensures that EC2 instances launched in this VPC are run on dedicated tenancy instances regardless of the tenancy attribute specified at launch. This has a dedicated per region fee of $2 per hour, plus an hourly per instance usage fee.
     */
    instanceTenancy?: pulumi.Input<string>;
    /**
     * The ID of an IPv4 IPAM pool you want to use for allocating this VPC's CIDR. IPAM is a VPC feature that you can use to automate your IP address management workflows including assigning, tracking, troubleshooting, and auditing IP addresses across AWS Regions and accounts. Using IPAM you can monitor IP address usage throughout your AWS Organization.
     */
    ipv4IpamPoolId?: pulumi.Input<string>;
    /**
     * The netmask length of the IPv4 CIDR you want to allocate to this VPC. Requires specifying a `ipv4_ipam_pool_id`.
     */
    ipv4NetmaskLength?: pulumi.Input<number>;
    /**
     * IPv6 CIDR block to request from an IPAM Pool. Can be set explicitly or derived from IPAM using `ipv6_netmask_length`.
     */
    ipv6CidrBlock?: pulumi.Input<string>;
    /**
     * By default when an IPv6 CIDR is assigned to a VPC a default ipv6_cidr_block_network_border_group will be set to the region of the VPC. This can be changed to restrict advertisement of public addresses to specific Network Border Groups such as LocalZones.
     */
    ipv6CidrBlockNetworkBorderGroup?: pulumi.Input<string>;
    /**
     * IPAM Pool ID for a IPv6 pool. Conflicts with `assign_generated_ipv6_cidr_block`.
     */
    ipv6IpamPoolId?: pulumi.Input<string>;
    /**
     * Netmask length to request from IPAM Pool. Conflicts with `ipv6_cidr_block`. This can be omitted if IPAM pool as a `allocation_default_netmask_length` set. Valid values: `56`.
     */
    ipv6NetmaskLength?: pulumi.Input<number>;
    /**
     * Configuration for NAT Gateways. Optional. If private and public subnets are both specified, defaults to one gateway per availability zone. Otherwise, no gateways will be created.
     */
    natGateways?: inputs.ec2.NatGatewayConfigurationArgs;
    /**
     * A number of availability zones to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
     */
    numberOfAvailabilityZones?: number;
    /**
     * A list of subnet specs that should be deployed to each AZ specified in availabilityZoneNames. Optional. Defaults to a (smaller) public subnet and a (larger) private subnet based on the size of the CIDR block for the VPC.
     */
    subnetSpecs?: inputs.ec2.SubnetSpecArgs[];
    /**
     * A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
     */
    tags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * A list of VPC Endpoints specs to be deployed as part of the VPC
     */
    vpcEndpointSpecs?: inputs.ec2.VpcEndpointSpecArgs[];
}
