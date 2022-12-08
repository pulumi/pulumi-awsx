// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Ec2
{
    [AwsxResourceType("awsx:ec2:Vpc")]
    public partial class Vpc : Pulumi.ComponentResource
    {
        /// <summary>
        /// The EIPs for any NAT Gateways for the VPC. If no NAT Gateways are specified, this will be an empty list.
        /// </summary>
        [Output("eips")]
        public Output<ImmutableArray<Pulumi.Aws.Ec2.Eip>> Eips { get; private set; } = null!;

        /// <summary>
        /// The Internet Gateway for the VPC.
        /// </summary>
        [Output("internetGateway")]
        public Output<Pulumi.Aws.Ec2.InternetGateway> InternetGateway { get; private set; } = null!;

        [Output("isolatedSubnetIds")]
        public Output<ImmutableArray<string>> IsolatedSubnetIds { get; private set; } = null!;

        /// <summary>
        /// The NAT Gateways for the VPC. If no NAT Gateways are specified, this will be an empty list.
        /// </summary>
        [Output("natGateways")]
        public Output<ImmutableArray<Pulumi.Aws.Ec2.NatGateway>> NatGateways { get; private set; } = null!;

        [Output("privateSubnetIds")]
        public Output<ImmutableArray<string>> PrivateSubnetIds { get; private set; } = null!;

        [Output("publicSubnetIds")]
        public Output<ImmutableArray<string>> PublicSubnetIds { get; private set; } = null!;

        /// <summary>
        /// The Route Table Associations for the VPC.
        /// </summary>
        [Output("routeTableAssociations")]
        public Output<ImmutableArray<Pulumi.Aws.Ec2.RouteTableAssociation>> RouteTableAssociations { get; private set; } = null!;

        /// <summary>
        /// The Route Tables for the VPC.
        /// </summary>
        [Output("routeTables")]
        public Output<ImmutableArray<Pulumi.Aws.Ec2.RouteTable>> RouteTables { get; private set; } = null!;

        /// <summary>
        /// The Routes for the VPC.
        /// </summary>
        [Output("routes")]
        public Output<ImmutableArray<Pulumi.Aws.Ec2.Route>> Routes { get; private set; } = null!;

        /// <summary>
        /// The VPC's subnets.
        /// </summary>
        [Output("subnets")]
        public Output<ImmutableArray<Pulumi.Aws.Ec2.Subnet>> Subnets { get; private set; } = null!;

        /// <summary>
        /// The VPC.
        /// </summary>
        [Output("vpc")]
        public Output<Pulumi.Aws.Ec2.Vpc> AwsVpc { get; private set; } = null!;

        /// <summary>
        /// The VPC Endpoints that are enabled
        /// </summary>
        [Output("vpcEndpoints")]
        public Output<ImmutableArray<Pulumi.Aws.Ec2.VpcEndpoint>> VpcEndpoints { get; private set; } = null!;

        [Output("vpcId")]
        public Output<string> VpcId { get; private set; } = null!;


        /// <summary>
        /// Create a Vpc resource with the given unique name, arguments, and options.
        /// </summary>
        ///
        /// <param name="name">The unique name of the resource</param>
        /// <param name="args">The arguments used to populate this resource's properties</param>
        /// <param name="options">A bag of options that control this resource's behavior</param>
        public Vpc(string name, VpcArgs? args = null, ComponentResourceOptions? options = null)
            : base("awsx:ec2:Vpc", name, args ?? new VpcArgs(), MakeResourceOptions(options, ""), remote: true)
        {
        }

        private static ComponentResourceOptions MakeResourceOptions(ComponentResourceOptions? options, Input<string>? id)
        {
            var defaultOptions = new ComponentResourceOptions
            {
                Version = Utilities.Version,
            };
            var merged = ComponentResourceOptions.Merge(defaultOptions, options);
            // Override the ID if one was specified for consistency with other language SDKs.
            merged.Id = id ?? merged.Id;
            return merged;
        }
    }

    public sealed class VpcArgs : Pulumi.ResourceArgs
    {
        /// <summary>
        /// Requests an Amazon-provided IPv6 CIDR block with a /56 prefix length for the VPC. You cannot specify the range of IP addresses, or the size of the CIDR block. Default is `false`. Conflicts with `ipv6_ipam_pool_id`
        /// </summary>
        [Input("assignGeneratedIpv6CidrBlock")]
        public Input<bool>? AssignGeneratedIpv6CidrBlock { get; set; }

        [Input("availabilityZoneNames")]
        private List<string>? _availabilityZoneNames;

        /// <summary>
        /// A list of availability zone names to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
        /// </summary>
        public List<string> AvailabilityZoneNames
        {
            get => _availabilityZoneNames ?? (_availabilityZoneNames = new List<string>());
            set => _availabilityZoneNames = value;
        }

        /// <summary>
        /// The CIDR block for the VPC. Optional. Defaults to 10.0.0.0/16.
        /// </summary>
        [Input("cidrBlock")]
        public string? CidrBlock { get; set; }

        /// <summary>
        /// A boolean flag to enable/disable ClassicLink
        /// for the VPC. Only valid in regions and accounts that support EC2 Classic.
        /// See the [ClassicLink documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/vpc-classiclink.html) for more information. Defaults false.
        /// </summary>
        [Input("enableClassiclink")]
        public Input<bool>? EnableClassiclink { get; set; }

        /// <summary>
        /// A boolean flag to enable/disable ClassicLink DNS Support for the VPC.
        /// Only valid in regions and accounts that support EC2 Classic.
        /// </summary>
        [Input("enableClassiclinkDnsSupport")]
        public Input<bool>? EnableClassiclinkDnsSupport { get; set; }

        /// <summary>
        /// A boolean flag to enable/disable DNS hostnames in the VPC. Defaults false.
        /// </summary>
        [Input("enableDnsHostnames")]
        public Input<bool>? EnableDnsHostnames { get; set; }

        /// <summary>
        /// A boolean flag to enable/disable DNS support in the VPC. Defaults to true.
        /// </summary>
        [Input("enableDnsSupport")]
        public Input<bool>? EnableDnsSupport { get; set; }

        /// <summary>
        /// Indicates whether Network Address Usage metrics are enabled for your VPC. Defaults to false.
        /// </summary>
        [Input("enableNetworkAddressUsageMetrics")]
        public Input<bool>? EnableNetworkAddressUsageMetrics { get; set; }

        /// <summary>
        /// A tenancy option for instances launched into the VPC. Default is `default`, which ensures that EC2 instances launched in this VPC use the EC2 instance tenancy attribute specified when the EC2 instance is launched. The only other option is `dedicated`, which ensures that EC2 instances launched in this VPC are run on dedicated tenancy instances regardless of the tenancy attribute specified at launch. This has a dedicated per region fee of $2 per hour, plus an hourly per instance usage fee.
        /// </summary>
        [Input("instanceTenancy")]
        public Input<string>? InstanceTenancy { get; set; }

        /// <summary>
        /// The ID of an IPv4 IPAM pool you want to use for allocating this VPC's CIDR. IPAM is a VPC feature that you can use to automate your IP address management workflows including assigning, tracking, troubleshooting, and auditing IP addresses across AWS Regions and accounts. Using IPAM you can monitor IP address usage throughout your AWS Organization.
        /// </summary>
        [Input("ipv4IpamPoolId")]
        public Input<string>? Ipv4IpamPoolId { get; set; }

        /// <summary>
        /// The netmask length of the IPv4 CIDR you want to allocate to this VPC. Requires specifying a `ipv4_ipam_pool_id`.
        /// </summary>
        [Input("ipv4NetmaskLength")]
        public Input<int>? Ipv4NetmaskLength { get; set; }

        /// <summary>
        /// IPv6 CIDR block to request from an IPAM Pool. Can be set explicitly or derived from IPAM using `ipv6_netmask_length`.
        /// </summary>
        [Input("ipv6CidrBlock")]
        public Input<string>? Ipv6CidrBlock { get; set; }

        /// <summary>
        /// By default when an IPv6 CIDR is assigned to a VPC a default ipv6_cidr_block_network_border_group will be set to the region of the VPC. This can be changed to restrict advertisement of public addresses to specific Network Border Groups such as LocalZones.
        /// </summary>
        [Input("ipv6CidrBlockNetworkBorderGroup")]
        public Input<string>? Ipv6CidrBlockNetworkBorderGroup { get; set; }

        /// <summary>
        /// IPAM Pool ID for a IPv6 pool. Conflicts with `assign_generated_ipv6_cidr_block`.
        /// </summary>
        [Input("ipv6IpamPoolId")]
        public Input<string>? Ipv6IpamPoolId { get; set; }

        /// <summary>
        /// Netmask length to request from IPAM Pool. Conflicts with `ipv6_cidr_block`. This can be omitted if IPAM pool as a `allocation_default_netmask_length` set. Valid values: `56`.
        /// </summary>
        [Input("ipv6NetmaskLength")]
        public Input<int>? Ipv6NetmaskLength { get; set; }

        /// <summary>
        /// Configuration for NAT Gateways. Optional. If private and public subnets are both specified, defaults to one gateway per availability zone. Otherwise, no gateways will be created.
        /// </summary>
        [Input("natGateways")]
        public Inputs.NatGatewayConfigurationArgs? NatGateways { get; set; }

        /// <summary>
        /// A number of availability zones to which the subnets defined in subnetSpecs will be deployed. Optional, defaults to the first 3 AZs in the current region.
        /// </summary>
        [Input("numberOfAvailabilityZones")]
        public int? NumberOfAvailabilityZones { get; set; }

        [Input("subnetSpecs")]
        private List<Inputs.SubnetSpecArgs>? _subnetSpecs;

        /// <summary>
        /// A list of subnet specs that should be deployed to each AZ specified in availabilityZoneNames. Optional. Defaults to a (smaller) public subnet and a (larger) private subnet based on the size of the CIDR block for the VPC.
        /// </summary>
        public List<Inputs.SubnetSpecArgs> SubnetSpecs
        {
            get => _subnetSpecs ?? (_subnetSpecs = new List<Inputs.SubnetSpecArgs>());
            set => _subnetSpecs = value;
        }

        [Input("tags")]
        private InputMap<string>? _tags;

        /// <summary>
        /// A map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        /// </summary>
        public InputMap<string> Tags
        {
            get => _tags ?? (_tags = new InputMap<string>());
            set => _tags = value;
        }

        [Input("vpcEndpointSpecs")]
        private List<Inputs.VpcEndpointSpecArgs>? _vpcEndpointSpecs;

        /// <summary>
        /// A list of VPC Endpoints specs to be deployed as part of the VPC
        /// </summary>
        public List<Inputs.VpcEndpointSpecArgs> VpcEndpointSpecs
        {
            get => _vpcEndpointSpecs ?? (_vpcEndpointSpecs = new List<Inputs.VpcEndpointSpecArgs>());
            set => _vpcEndpointSpecs = value;
        }

        public VpcArgs()
        {
        }
    }
}
