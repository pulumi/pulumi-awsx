// // Copyright 2016-2018, Pulumi Corporation.
// //
// // Licensed under the Apache License, Version 2.0 (the "License");
// // you may not use this file except in compliance with the License.
// // You may obtain a copy of the License at
// //
// //     http://www.apache.org/licenses/LICENSE-2.0
// //
// // Unless required by applicable law or agreed to in writing, software
// // distributed under the License is distributed on an "AS IS" BASIS,
// // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// // See the License for the specific language governing permissions and
// // limitations under the License.

// import * as aws from "@pulumi/aws";
// import * as pulumi from "@pulumi/pulumi";
// import { RunError } from "@pulumi/pulumi/errors";
// import { getAvailabilityZone } from "./aws";
// import { ClusterNetworkArgs } from "./cluster";

// import { ifUndefined } from "./utils";

// /**
//  * Optional arguments that can be provided when creating a network.
//  *
//  * @deprecated Usages of awsx.Network should be migrated to awsx.ec2.Vpc.
//  */
// export interface NetworkArgs {
//     /**
//      * The maximum number of availability zones to use in the current region.  Defaults to '2' if
//      * unspecified.
//      */
//     readonly numberOfAvailabilityZones?: number;
//     readonly usePrivateSubnets?: boolean;

//     /**
//      * The CIDR block for the VPC.  Defaults to "10.10.0.0/16" if unspecified.
//      */
//     cidrBlock?: pulumi.Input<string>;

//     /**
//      * Whether or not to have DNS hostnames in the VPC. Defaults to 'true' if unspecified.
//      */
//     enableDnsHostnames?: pulumi.Input<boolean>;

//     /**
//      * Whether or not to have DNS support in the VPC.  Defaults to 'true' if unspecified.
//      */
//     enableDnsSupport?: pulumi.Input<boolean>;

//     /**
//      * A tenancy option for instances launched into the VPC.  Defaults to 'default' if unspecified.
//      */
//     instanceTenancy?: pulumi.Input<"default" | "dedicated">;
// }

// /**
//  * Arguments necessary when creating a network using Network.fromVpc.
//  *
//  * @deprecated Usages of awsx.Network should be migrated to awsx.ec2.Vpc.
//  */
// export interface NetworkVpcArgs {
//     /**
//      * The VPC id of the network for the cluster
//      */
//     readonly vpcId: pulumi.Input<string>;
//     /**
//      * The network subnets for the clusters
//      */
//     readonly subnetIds: pulumi.Input<string>[];
//     /**
//      * Whether the network includes private subnets.
//      */
//     readonly usePrivateSubnets: boolean;
//     /**
//      * The security group IDs for the network.
//      */
//     readonly securityGroupIds: pulumi.Input<string>[];
//     /**
//      * The public subnets for the VPC.  In case [usePrivateSubnets] == false, these are the same as [subnets].
//      */
//     readonly publicSubnetIds: pulumi.Input<string>[];
// }

// // The lazily initialized default network instance.
// let defaultNetwork: Network;

// /**
//  * Network encapsulates the configuration of an Amazon VPC.  Both [VPC with Public
//  * Subnet](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Scenario1.html) and [VPC with Public and Private
//  * Subnets (NAT)](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Scenario2.html) configurations are
//  * supported.
//  *
//  * @deprecated Usages of awsx.Network should be migrated to awsx.ec2.Vpc.
//  */
// export class Network extends pulumi.ComponentResource implements ClusterNetworkArgs {
//     /**
//      * The VPC id of the network.
//      */
//     public readonly vpcId: pulumi.Output<string>;
//     /**
//      * Whether the network includes private subnets.
//      */
//     public readonly usePrivateSubnets: boolean;
//     /**
//      * The security group IDs for the network.
//      */
//     public readonly securityGroupIds: pulumi.Output<string>[];
//     /**
//      * The subnets in which compute should run.  These are the private subnets if
//      * [usePrivateSubnets] == true, else these are the public subnets.
//      */
//     public readonly subnetIds: pulumi.Output<string>[];
//     /**
//      * The public subnets for the VPC.  In case [usePrivateSubnets] == false, these are the same as
//      * [subnets].
//      */
//     public readonly publicSubnetIds: pulumi.Output<string>[];

//     /**
//      * The public subnet route table for the VPC.
//      */
//     public readonly publicRouteTableId: pulumi.Output<string> | undefined;
//     /**
//      * Gets the default VPC for the AWS account as a Network.  This first time this is called, the
//      * default network will be lazily created, using whatever options are provided in opts. All
//      * subsequent calls will return that same network even if different opts are provided.
//      */
//     public static getDefault(opts?: pulumi.ComponentResourceOptions): Network {
//         if (!defaultNetwork) {
//             const vpc = aws.ec2.getVpc({default: true});
//             const vpcId = vpc.id;
//             const subnetIds = aws.ec2.getSubnetIds({ vpcId }).ids;
//             const defaultSecurityGroup = aws.ec2.getSecurityGroup(
//                 { name: "default", vpcId },
//             ).id;
//             const subnet0 = subnetIds[0];
//             const subnet1 = subnetIds[1];

//             defaultNetwork = this.fromVpc("default-vpc", {
//                 vpcId: vpcId,
//                 subnetIds: [ subnet0, subnet1 ],
//                 usePrivateSubnets: false,
//                 securityGroupIds: [ defaultSecurityGroup ],
//                 publicSubnetIds: [ subnet0, subnet1 ],
//             }, opts);
//         }

//         return defaultNetwork;
//     }

//     /**
//      * Creates a new network using the configuration values of an existing VPC.
//      */
//     public static fromVpc(name: string, vpcArgs: NetworkVpcArgs, opts?: pulumi.ComponentResourceOptions): Network {
//         if (!vpcArgs.vpcId) {
//             throw new RunError("vpcArgs.vpcId must be provided.");
//         }
//         if (!vpcArgs.subnetIds) {
//             throw new RunError("vpcArgs.subnetIds must be provided.");
//         }
//         if (!vpcArgs.securityGroupIds) {
//             throw new RunError("vpcArgs.securityGroupIds must be provided.");
//         }
//         if (!vpcArgs.publicSubnetIds) {
//             throw new RunError("vpcArgs.publicSubnetIds must be provided.");
//         }

//         return new Network(name, vpcArgs, opts);
//     }

//     constructor(name: string, args?: NetworkArgs, opts?: pulumi.ComponentResourceOptions);
//     constructor(name: string, mergedArgs: NetworkArgs | NetworkVpcArgs = {}, opts: pulumi.ComponentResourceOptions = {}) {
//         super("awsx:network:Network", name, {}, opts);

//         // IDEA: default to the number of availability zones in this region, rather than 2.  To do this requires
//         // invoking the provider, which requires that we "go async" at a very inopportune time here.  When
//         // pulumi/pulumi#331 lands, this will be much easier to do, and we can improve this situation.

//         const parentOpts = { parent: this };
//         const vpcArgs = <NetworkVpcArgs>mergedArgs;

//         if (vpcArgs.vpcId) {
//             this.vpcId = pulumi.output(vpcArgs.vpcId);
//             this.subnetIds = vpcArgs.subnetIds.map(id => pulumi.output(id));
//             this.usePrivateSubnets = vpcArgs.usePrivateSubnets;
//             this.securityGroupIds = vpcArgs.securityGroupIds.map(id => pulumi.output(id));
//             this.publicSubnetIds = vpcArgs.publicSubnetIds.map(id => pulumi.output(id));
//             return;
//         }

//         const args = <NetworkArgs>mergedArgs;
//         const numberOfAvailabilityZones = args.numberOfAvailabilityZones || 2;
//         if (numberOfAvailabilityZones < 1 || numberOfAvailabilityZones > 4) {
//             throw new RunError(
//                 `Unsupported number of availability zones for network: ${numberOfAvailabilityZones}`);
//         }

//         const tags = { Name: name };

//         this.usePrivateSubnets = args.usePrivateSubnets || false;

//         const vpc = new aws.ec2.Vpc(name, {
//             cidrBlock: ifUndefined(args.cidrBlock, "10.10.0.0/16"),
//             enableDnsHostnames: ifUndefined(args.enableDnsHostnames, true),
//             enableDnsSupport: ifUndefined(args.enableDnsSupport, true),
//             tags,
//         }, parentOpts);

//         this.vpcId = vpc.id;

//         this.securityGroupIds = [ vpc.defaultSecurityGroupId ];
//         this.subnetIds = [];
//         this.publicSubnetIds = [];

//         const internetGateway = new aws.ec2.InternetGateway(name, {
//             vpcId: vpc.id,
//             tags,
//         }, parentOpts);

//         const publicRouteTable = new aws.ec2.RouteTable(name, {
//             vpcId: vpc.id,
//             routes: [{
//                     cidrBlock: "0.0.0.0/0",
//                     gatewayId: internetGateway.id,
//                 }],
//             tags,
//         }, parentOpts);
//         this.publicRouteTableId = publicRouteTable.id;

//         for (let i = 0; i < numberOfAvailabilityZones; i++) {
//             const subnetName = `${name}-${i}`;
//             // Create the subnet for this AZ - either - either public or private
//             const subnet = new aws.ec2.Subnet(subnetName, {
//                 vpcId: vpc.id,
//                 availabilityZone: getAvailabilityZone(i),
//                 cidrBlock: `10.10.${i}.0/24`,         // IDEA: Consider larger default CIDR block sizing
//                 mapPublicIpOnLaunch: !this.usePrivateSubnets, // Only assign public IP if we are exposing public subnets
//                 tags: { Name: subnetName },
//             }, parentOpts);

//             // We will use a different route table for this subnet depending on
//             // whether we are in a public or private subnet
//             const subnetRouteTable = createSubnetRouteTable(
//                 this, publicRouteTable, subnet, name, i);

//             const routeTableAssociation = new aws.ec2.RouteTableAssociation(`${name}-${i}`, {
//                 subnetId: subnet.id,
//                 routeTableId: subnetRouteTable.id,
//             }, parentOpts);

//             // Record the subnet id, but depend on the RouteTableAssociation
//             const subnetId = pulumi.all([subnet.id, routeTableAssociation.id]).apply(([id]) => id);
//             this.subnetIds.push(subnetId);
//         }
//     }
// }

// function createSubnetRouteTable(
//         network: Network, publicRouteTable: aws.ec2.RouteTable,
//         subnet: aws.ec2.Subnet, name: string, index: number) {
//     const parentOpts = { parent: network };

//     if (!network.usePrivateSubnets) {
//         // The subnet is public, so register it as our public subnet
//         network.publicSubnetIds.push(subnet.id);
//         return publicRouteTable;
//     }

//     // We need a public subnet for the NAT Gateway
//     const natName = `${name}-nat-${index}`;
//     const tags = { Name: natName };

//     const natGatewayPublicSubnet = new aws.ec2.Subnet(natName, {
//         vpcId: network.vpcId,
//         availabilityZone: getAvailabilityZone(index),
//         cidrBlock: `10.10.${index+64}.0/24`, // Use top half of the subnet space
//         mapPublicIpOnLaunch: true,        // Always assign a public IP in NAT subnet
//         tags,
//     }, parentOpts);

//     // And we need to route traffic from that public subnet to the Internet Gateway
//     const natGatewayRoutes = new aws.ec2.RouteTableAssociation(natName, {
//         subnetId: natGatewayPublicSubnet.id,
//         routeTableId: publicRouteTable.id,
//     }, parentOpts);

//     // Record the subnet id, but depend on the RouteTableAssociation
//     const natGatewayPublicSubnetId =
//         pulumi.all([natGatewayPublicSubnet.id, natGatewayRoutes.id]).apply(([id]) => id);
//     network.publicSubnetIds.push(natGatewayPublicSubnetId);

//     // We need an Elastic IP for the NAT Gateway
//     const eip = new aws.ec2.Eip(natName, {}, parentOpts);

//     // And we need a NAT Gateway to be able to access the Internet
//     const natGateway = new aws.ec2.NatGateway(natName, {
//         subnetId: natGatewayPublicSubnet.id,
//         allocationId: eip.id,
//         tags,
//     }, parentOpts);

//     const natRouteTable = new aws.ec2.RouteTable(natName, {
//         vpcId: network.vpcId,
//         routes: [{
//             cidrBlock: "0.0.0.0/0",
//             natGatewayId: natGateway.id,
//         }],
//         tags,
//     }, parentOpts);

//     // Route through the NAT gateway for the private subnet
//     return natRouteTable;
// }
