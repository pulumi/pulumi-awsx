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

// import { getAvailabilityZones, getAvailabilityZone } from "./aws";
// // import { ClusterNetworkArgs } from "./cluster";

// /**
//  * Optional arguments that can be provided when creating a network.
//  */
// export interface NetworkArgs {
//     /**
//      * The CIDR block for the VPC.  Defaults to "10.10.0.0/16" if unspecified.
//      */
//     cidrBlock?: pulumi.Input<string>;

//     /**
//      * The maximum number of availability zones to use in the current region.  Defaults to '2' if
//      * unspecified.
//      */
//     numberOfAvailabilityZones?: pulumi.Input<number>;

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

//     /**
//      * How many of the public-subnets of this network will have a NAT gateway.  Private subnets will
//      * target whatever NAT gateway is in their availability zone, or will otherwise round-robin
//      * between the other NAT gateways in other zones if there are none in its zone.
//      */
//     natGateways?: pulumi.Input<number>;

//     /**
//      * The types of subnets to create per availability zone.
//      */
//     subnets?: SubnetArgs[];
// }

// export interface SubnetArgs {
//     /**
//      * The name to use for this particular subnet.  If left off, it will be named based on the type
//      * of the subnet this is and which availability zone it is in.
//      */
//     name?: pulumi.Input<string>;

//     /**
//      * The type of subnet this is.  Must be provided.
//      */
//     type: pulumi.Input<"public" | "private">;
// }

// export interface Subnet {
//     subnetId: pulumi.Input<string>;
//     availabilityZone: pulumi.Input<string>;
// }

// /**
//  * Arguments necessary when creating a network using Network.fromVpc.
//  */
// export interface NetworkDescription {
//     /**
//      * The VPC id of the network for the cluster
//      */
//     vpcId: pulumi.Input<string>;
//     /**
//      * The network subnets for the clusters
//      */
//     publicSubnets: pulumi.Input<pulumi.Input<Subnet>[]>;
//     /**
//      * The network subnets for the clusters
//      */
//     privateSubnets: pulumi.Input<pulumi.Input<Subnet>[]>;
//     /**
//      *
//      */
//     availabilityZones: pulumi.Input<pulumi.Input<string>[]>;

//     /**
//      * The security groups for this Network.  Services attached to this network can use this security
//      * group if they need one and do not have one provided for them.
//      */
//     securityGroupIds: pulumi.Input<pulumi.Input<string>[]>;

//     // // /**
//     // //  * Whether the network includes private subnets.
//     // //  */
//     // // readonly usePrivateSubnets: boolean;
//     // /**
//     //  * The security group IDs for the network.
//     //  */
//     // readonly securityGroupIds: pulumi.Input<string>[];
//     // /**
//     //  * The public subnets for the VPC.  In case [usePrivateSubnets] == false, these are the same as [subnets].
//     //  */
//     // readonly publicSubnetIds: pulumi.Input<string>[];
// }

// // The lazily initialized default network instance.
// let defaultNetwork: Network;

// /**
//  * Network encapsulates the configuration of an Amazon VPC.  Both [VPC with Public
//  * Subnet](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Scenario1.html) and [VPC with Public and Private
//  * Subnets (NAT)](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Scenario2.html) configurations are
//  * supported.
//  */
// export class Network extends pulumi.ComponentResource /*implements ClusterNetworkArgs*/ {
//     /**
//      * The VPC id of the network.
//      */
//     public readonly vpcId: pulumi.Output<string>;
//     // /**
//     //  * Whether the network includes private subnets.
//     //  */
//     // public readonly usePrivateSubnets: boolean;
//     /**
//      * The security group IDs for the network.
//      */
//     public readonly securityGroupIds: pulumi.Output<string[]>;

//     /**
//      * The network subnets for the clusters
//      */
//     public readonly publicSubnets: pulumi.Output<Subnet[]>;
//     /**
//      * The network subnets for the clusters
//      */
//     public readonly privateSubnets: pulumi.Output<Subnet[]>;
//     /**
//      *
//      */
//     public availabilityZones: pulumi.Output<string[]>;

//     // /**
//     //  * The default security group for this Network.  Services attached to this network can use this
//     //  * security group if they need one and do not have one provided for them.
//     //  */
//     // securityGroupId: pulumi.Input<string>;

//     // /**
//     //  * The subnets in which compute should run.  These are the private subnets if [usePrivateSubnets] == true, else
//     //  * these are the public subnets.
//     //  */
//     // public readonly subnetIds: pulumi.Output<string>[];
//     // /**
//     //  * The public subnets for the VPC.  In case [usePrivateSubnets] == false, these are the same as [subnets].
//     //  */
//     // public readonly publicSubnetIds: pulumi.Output<string>[];
//     // /**
//     //  * The public subnet route table for the VPC.
//     //  */
//     // public readonly publicRouteTableId: pulumi.Output<string>;
//     // /**
//     //  * The private subnet route tables for the VPC.  In case [usePrivateSubnets] == false, this will be empty.
//     //  */
//     // public readonly privateRouteTableIds: pulumi.Output<string>[];

//     /**
//      * Gets the default VPC for the AWS account as a Network.  This first time this is called,
//      * the default network will be lazily created, using whatever options are provided in opts.
//      * All subsequent calls will return that same network even if different opts are provided.
//      */
//     public static getDefault(opts?: pulumi.ResourceOptions): Network {
//         if (!defaultNetwork) {
//             const args = getNetworkDescriptionAsync();

//             defaultNetwork = this.fromDescription("default-vpc", {
//                 vpcId: args.then(a => a.vpcId),
//                 securityGroupIds: args.then(a => [a.defaultSecurityGroupId]),
//                 publicSubnets: args.then(a => a.publicSubnets),
//                 privateSubnets: args.then(a => a.privateSubnets),
//                 availabilityZones: args.then(a => a.availabilityZones),
//             }, opts);
//         }

//         return defaultNetwork;

//         async function getNetworkDescriptionAsync() {
//             const vpc = await aws.ec2.getVpc({default: true});
//             const vpcId = vpc.id;

//             // TODO(cyrusn): Should we try to get all the security groups, filter to this
//             // VPC and return that entire set?
//             const defaultSecurityGroup = await aws.ec2.getSecurityGroup({ vpcId, name: "default" });
//             const defaultSecurityGroupId = defaultSecurityGroup.id;

//             const subnetIdsResult = await aws.ec2.getSubnetIds({ vpcId: vpc.id });
//             const subnetIds = subnetIdsResult.ids;

//             const publicSubnets: Subnet[] = [];
//             const privateSubnets: Subnet[] = [];
//             const availabilityZones = new Set<string>();
//             for (const subnetId of subnetIds) {
//                 const subnetResult = await aws.ec2.getSubnet({ vpcId, id: subnetId });
//                 const availabilityZone = subnetResult.availabilityZone;
//                 availabilityZones.add(availabilityZone);

//                 const subnet: Subnet = { subnetId, availabilityZone };

//                 if (subnetResult.mapPublicIpOnLaunch) {
//                     publicSubnets.push(subnet);
//                 }
//                 else {
//                     privateSubnets.push(subnet);
//                 }
//             }

//             return {
//                 vpcId,
//                 defaultSecurityGroupId,
//                 publicSubnets,
//                 privateSubnets,
//                 availabilityZones: [...availabilityZones].sort(),
//             };
//         }
//     }

//     /**
//      * Creates a new network using the configuration values of an existing VPC.
//      */
//     public static fromDescription(
//             name: string, description: NetworkDescription, opts?: pulumi.ResourceOptions): Network {
//         if (!description.vpcId) {
//             throw new RunError("description.vpcId must be provided.");
//         }
//         if (!description.publicSubnets) {
//             throw new RunError("description.publicSubnets must be provided.");
//         }
//         if (!description.privateSubnets) {
//             throw new RunError("description.privateSubnets must be provided.");
//         }
//         if (!description.availabilityZones) {
//             throw new RunError("description.availabilityZones must be provided.");
//         }
//         if (!description.securityGroupIds) {
//             throw new RunError("description.securityGroupIds must be provided.");
//         }

//         return new Network(name, description, opts);
//     }

//     constructor(name: string, description: NetworkDescription, opts?: pulumi.ResourceOptions);
//     constructor(name: string, args: NetworkArgs, opts?: pulumi.ResourceOptions);
//     constructor(name: string, argsOrDescription: NetworkArgs | NetworkDescription, opts?: pulumi.ResourceOptions) {
//         super("aws-infra:network:Network", name, {}, opts);

//         const description = <NetworkDescription>argsOrDescription;
//         if (description.vpcId) {
//             // simply case. They're just populating this network with already known values.
//             this.vpcId = pulumi.output(description.vpcId);
//             this.publicSubnets = pulumi.output(description.publicSubnets);
//             this.privateSubnets = pulumi.output(description.privateSubnets);
//             this.securityGroupIds = pulumi.output(description.securityGroupIds);
//             this.availabilityZones = pulumi.output(description.availabilityZones);
//             return;
//         }

//         const args = <NetworkArgs>argsOrDescription;

//         // IDEA: default to the number of availability zones in this region, rather than 2.  To do
//         // this requires invoking the provider, which requires that we "go async" at a very
//         // inopportune time here.

//         const numberOfAvailabilityZones = args.numberOfAvailabilityZones || 2;
//         if (numberOfAvailabilityZones < 1) {
//             throw new RunError(
//                 `Unsupported number of availability zones for network: ${numberOfAvailabilityZones}`);
//         }

//         // this.usePrivateSubnets = args.usePrivateSubnets || false;

//         const vpc = new aws.ec2.Vpc(name, {
//             cidrBlock: pulumi.output(args.cidrBlock).apply(b => b || "10.10.0.0/16"),
//             enableDnsHostnames: pulumi.output(args.enableDnsHostnames).apply(n => n !== undefined ? n : true),
//             enableDnsSupport: pulumi.output(args.enableDnsSupport).apply(n => n !== undefined ? n : true),
//             instanceTenancy: pulumi.output(args.instanceTenancy).apply(t => t || "default"),
//             tags: { Name: name },
//         }, { parent: this });

//         this.vpcId = vpc.id;
//         this.securityGroupIds = vpc.defaultSecurityGroupId.apply(i => [i]);

//         const subnets = args.subnets || [];

//         this.privateRouteTableIds = [];

//         const internetGateway = new aws.ec2.InternetGateway(name, {
//             vpcId: vpc.id,
//             tags: { Name: name },
//         }, { parent: this });

//         const publicRouteTable = new aws.ec2.RouteTable(name, {
//             vpcId: vpc.id,
//             routes: [
//                 {
//                     cidrBlock: "0.0.0.0/0",
//                     gatewayId: internetGateway.id,
//                 },
//             ],
//             tags: {
//                 Name: name,
//             },
//         }, { parent: this });

//         this.publicRouteTableId = publicRouteTable.id;

//         this.subnetIds = [];
//         this.publicSubnetIds = [];

//         for (let i = 0; i < numberOfAvailabilityZones; i++) {
//             const subnetName = `${name}-${i}`;
//             // Create the subnet for this AZ - either - either public or private
//             const subnet = new aws.ec2.Subnet(subnetName, {
//                 vpcId: vpc.id,
//                 availabilityZone: getAwsAz(i),
//                 cidrBlock: `10.10.${i}.0/24`,         // IDEA: Consider larger default CIDR block sizing
//                 mapPublicIpOnLaunch: !this.usePrivateSubnets, // Only assign public IP if we are exposing public subnets
//                 tags: {
//                     Name: subnetName,
//                 },
//             }, { parent: this });

//             // We will use a different route table for this subnet depending on
//             // whether we are in a public or private subnet
//             let subnetRouteTable: aws.ec2.RouteTable;

//             if (this.usePrivateSubnets) {
//                 // We need a public subnet for the NAT Gateway
//                 const natName = `${name}-nat-${i}`;
//                 const natGatewayPublicSubnet = new aws.ec2.Subnet(natName, {
//                     vpcId: vpc.id,
//                     availabilityZone: getAwsAz(i),
//                     cidrBlock: `10.10.${i+64}.0/24`, // Use top half of the subnet space
//                     mapPublicIpOnLaunch: true,        // Always assign a public IP in NAT subnet
//                     tags: {
//                         Name: natName,
//                     },
//                 }, { parent: this });

//                 // And we need to route traffic from that public subnet to the Internet Gateway
//                 const natGatewayRoutes = new aws.ec2.RouteTableAssociation(natName, {
//                     subnetId: natGatewayPublicSubnet.id,
//                     routeTableId: publicRouteTable.id,
//                 }, { parent: this });

//                 // Record the subnet id, but depend on the RouteTableAssociation
//                 const natGatewayPublicSubnetId =
//                     pulumi.all([natGatewayPublicSubnet.id, natGatewayRoutes.id]).apply(([id, _]) => id);
//                 this.publicSubnetIds.push(natGatewayPublicSubnetId);

//                 // We need an Elastic IP for the NAT Gateway
//                 const eip = new aws.ec2.Eip(natName, {}, { parent: this });

//                 // And we need a NAT Gateway to be able to access the Internet
//                 const natGateway = new aws.ec2.NatGateway(natName, {
//                     subnetId: natGatewayPublicSubnet.id,
//                     allocationId: eip.id,
//                     tags: {
//                         Name: natName,
//                     },
//                 }, { parent: this });

//                 const natRouteTable = new aws.ec2.RouteTable(natName, {
//                     vpcId: vpc.id,
//                     routes: [{
//                         cidrBlock: "0.0.0.0/0",
//                         natGatewayId: natGateway.id,
//                     }],
//                     tags: {
//                         Name: natName,
//                     },
//                 }, { parent: this });
//                 this.privateRouteTableIds.push(natRouteTable.id);

//                 // Route through the NAT gateway for the private subnet
//                 subnetRouteTable = natRouteTable;
//             } else /* !privateSubnets */{
//                 // Route directly to the Internet Gateway for the public subnet
//                 subnetRouteTable = publicRouteTable;
//                 // The subnet is public, so register it as our public subnet
//                 this.publicSubnetIds.push(subnet.id);
//             }

//             const routeTableAssociation = new aws.ec2.RouteTableAssociation(`${name}-${i}`, {
//                 subnetId: subnet.id,
//                 routeTableId: subnetRouteTable.id,
//             }, { parent: this });

//             // Record the subnet id, but depend on the RouteTableAssociation
//             const subnetId = pulumi.all([subnet.id, routeTableAssociation.id]).apply(([id, _]) => id);
//             this.subnetIds.push(subnetId);
//         }
//     }
// }

// (<any>Network).doNotCapture = true;
