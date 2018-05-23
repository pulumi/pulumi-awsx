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
import { RunError } from "@pulumi/pulumi/errors";
import { getAwsAz } from "./aws";
import { ClusterNetworkArgs } from "./cluster";

/**
 * Optional arguments that can be provided when creating a network.
 */
export interface NetworkArgs {
    readonly numberOfAvailabilityZones?: number;
    readonly usePrivateSubnets?: boolean;
}

/**
 * Arguments necessary when creating a network using Network.fromVpc.
 */
export interface NetworkVpcArgs {
    /**
     * The VPC id of the network for the cluster
     */
    readonly vpcId: pulumi.Input<string>;
    /**
     * The network subnets for the clusters
     */
    readonly subnetIds: pulumi.Input<string>[];
    /**
     * Whether the network includes private subnets.
     */
    readonly usePrivateSubnets: boolean;
    /**
     * The security group IDs for the network.
     */
    readonly securityGroupIds: pulumi.Input<string>[];
    /**
     * The public subnets for the VPC.  In case [usePrivateSubnets] == false, these are the same as [subnets].
     */
    readonly publicSubnetIds: pulumi.Input<string>[];
}

/**
 * Network encapsulates the configuration of an Amazon VPC.  Both [VPC with Public
 * Subnet](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Scenario1.html) and [VPC with Public and Private
 * Subnets (NAT)](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Scenario2.html) configurations are
 * supported.
 */
export class Network extends pulumi.ComponentResource implements ClusterNetworkArgs {
    /**
     * The VPC id of the network.
     */
    public readonly vpcId: pulumi.Output<string>;
    /**
     * Whether the network includes private subnets.
     */
    public readonly usePrivateSubnets: boolean;
    /**
     * The security group IDs for the network.
     */
    public readonly securityGroupIds: pulumi.Output<string>[];
    /**
     * The subnets in which compute should run.  These are the private subnets if [usePrivateSubnets] == true, else
     * these are the public subnets.
     */
    public readonly subnetIds: pulumi.Output<string>[];
    /**
     * The public subnets for the VPC.  In case [usePrivateSubnets] == false, these are the same as [subnets].
     */
    public readonly publicSubnetIds: pulumi.Output<string>[];

    // tslint:disable-next-line:member-ordering
    private static defaultNetwork: Network;

    /**
     * Gets the default VPC for the AWS account as a Network.  This first time this is called,
     * the default network will be lazily created, using whatever options are provided in opts.
     * All subsequent calls will return that same network even if different opts are provided.
     */
    public static getDefault(opts?: pulumi.ResourceOptions): Network {
        if (!this.defaultNetwork) {
            const vpc = aws.ec2.getVpc({default: true});
            const vpcId = vpc.then(v => v.id);
            const subnetIds = aws.ec2.getSubnetIds({ vpcId: vpcId }).then(subnets => subnets.ids);
            const defaultSecurityGroup = aws.ec2.getSecurityGroup({ name: "default", vpcId: vpcId }).then(sg => sg.id);
            const subnet0 = subnetIds.then(ids => ids[0]);
            const subnet1 = subnetIds.then(ids => ids[1]);

            this.defaultNetwork = this.fromVpc("default-vpc", {
                vpcId: vpcId,
                subnetIds: [ subnet0, subnet1 ],
                usePrivateSubnets: false,
                securityGroupIds: [ defaultSecurityGroup ],
                publicSubnetIds: [ subnet0, subnet1 ],
            }, opts);
        }

        return this.defaultNetwork;
    }

    /**
     * Creates a new network using the configuration values of an existing VPC.
     */
    public static fromVpc(name: string, vpcArgs: NetworkVpcArgs, opts?: pulumi.ResourceOptions): Network {
        if (!vpcArgs.vpcId) {
            throw new RunError("vpcArgs.vpcId must be provided.");
        }
        if (!vpcArgs.subnetIds) {
            throw new RunError("vpcArgs.subnetIds must be provided.");
        }
        if (!vpcArgs.securityGroupIds) {
            throw new RunError("vpcArgs.securityGroupIds must be provided.");
        }
        if (!vpcArgs.publicSubnetIds) {
            throw new RunError("vpcArgs.publicSubnetIds must be provided.");
        }

        return new Network(name, vpcArgs, opts);
    }

    constructor(name: string, args?: NetworkArgs, opts?: pulumi.ResourceOptions);
    constructor(name: string, mergedArgs?: NetworkArgs | NetworkVpcArgs, opts?: pulumi.ResourceOptions) {
        // IDEA: default to the number of availability zones in this region, rather than 2.  To do this requires
        // invoking the provider, which requires that we "go async" at a very inopportune time here.  When
        // pulumi/pulumi#331 lands, this will be much easier to do, and we can improve this situation.
        if (!mergedArgs) {
            mergedArgs = {};
        }

        super("aws-infra:network:Network", name, {}, opts);

        const vpcArgs = <NetworkVpcArgs>mergedArgs;
        if (vpcArgs.vpcId) {
            this.vpcId = pulumi.output(vpcArgs.vpcId);
            this.subnetIds = vpcArgs.subnetIds.map(id => pulumi.output(id));
            this.usePrivateSubnets = vpcArgs.usePrivateSubnets;
            this.securityGroupIds = vpcArgs.securityGroupIds.map(id => pulumi.output(id));
            this.publicSubnetIds = vpcArgs.publicSubnetIds.map(id => pulumi.output(id));
            return;
        }

        const args = <NetworkArgs>mergedArgs;
        const numberOfAvailabilityZones = args.numberOfAvailabilityZones || 2;
        if (numberOfAvailabilityZones < 1 || numberOfAvailabilityZones > 4) {
            throw new RunError(
                `Unsupported number of availability zones for network: ${numberOfAvailabilityZones}`);
        }

        this.usePrivateSubnets = args.usePrivateSubnets || false;

        const vpc = new aws.ec2.Vpc(name, {
            cidrBlock: "10.10.0.0/16",
            enableDnsHostnames: true,
            enableDnsSupport: true,
            tags: {
                Name: name,
            },
        }, { parent: this });

        this.vpcId = vpc.id;
        this.securityGroupIds = [ vpc.defaultSecurityGroupId ];

        const internetGateway = new aws.ec2.InternetGateway(name, {
            vpcId: vpc.id,
            tags: {
                Name: name,
            },
        }, { parent: this });

        const publicRouteTable = new aws.ec2.RouteTable(name, {
            vpcId: vpc.id,
            routes: [
                {
                    cidrBlock: "0.0.0.0/0",
                    gatewayId: internetGateway.id,
                },
            ],
            tags: {
                Name: name,
            },
        }, { parent: this });

        this.subnetIds = [];
        this.publicSubnetIds = [];

        for (let i = 0; i < numberOfAvailabilityZones; i++) {
            const subnetName = `${name}-${i}`;
            // Create the subnet for this AZ - either - either public or private
            const subnet = new aws.ec2.Subnet(subnetName, {
                vpcId: vpc.id,
                availabilityZone: getAwsAz(i),
                cidrBlock: `10.10.${i}.0/24`,         // IDEA: Consider larger default CIDR block sizing
                mapPublicIpOnLaunch: !this.usePrivateSubnets, // Only assign public IP if we are exposing public subnets
                tags: {
                    Name: subnetName,
                },
            }, { parent: this });

            // We will use a different route table for this subnet depending on
            // whether we are in a public or private subnet
            let subnetRouteTable: aws.ec2.RouteTable;

            if (this.usePrivateSubnets) {
                // We need a public subnet for the NAT Gateway
                const natName = `${name}-nat-${i}`;
                const natGatewayPublicSubnet = new aws.ec2.Subnet(natName, {
                    vpcId: vpc.id,
                    availabilityZone: getAwsAz(i),
                    cidrBlock: `10.10.${i+64}.0/24`, // Use top half of the subnet space
                    mapPublicIpOnLaunch: true,        // Always assign a public IP in NAT subnet
                    tags: {
                        Name: natName,
                    },
                }, { parent: this });

                // And we need to route traffic from that public subnet to the Internet Gateway
                const natGatewayRoutes = new aws.ec2.RouteTableAssociation(natName, {
                    subnetId: natGatewayPublicSubnet.id,
                    routeTableId: publicRouteTable.id,
                }, { parent: this });

                // Record the subnet id, but depend on the RouteTableAssociation
                const natGatewayPublicSubnetId =
                    pulumi.all([natGatewayPublicSubnet.id, natGatewayRoutes.id]).apply(([id, _]) => id);
                this.publicSubnetIds.push(natGatewayPublicSubnetId);

                // We need an Elastic IP for the NAT Gateway
                const eip = new aws.ec2.Eip(natName, {}, { parent: this });

                // And we need a NAT Gateway to be able to access the Internet
                const natGateway = new aws.ec2.NatGateway(natName, {
                    subnetId: natGatewayPublicSubnet.id,
                    allocationId: eip.id,
                    tags: {
                        Name: natName,
                    },
                }, { parent: this });

                const natRouteTable = new aws.ec2.RouteTable(natName, {
                    vpcId: vpc.id,
                    routes: [{
                        cidrBlock: "0.0.0.0/0",
                        natGatewayId: natGateway.id,
                    }],
                    tags: {
                        Name: natName,
                    },
                }, { parent: this });

                // Route through the NAT gateway for the private subnet
                subnetRouteTable = natRouteTable;
            } else /* !privateSubnets */{
                // Route directly to the Internet Gateway for the public subnet
                subnetRouteTable = publicRouteTable;
                // The subnet is public, so register it as our public subnet
                this.publicSubnetIds.push(subnet.id);
            }

            const routeTableAssociation = new aws.ec2.RouteTableAssociation(`${name}-${i}`, {
                subnetId: subnet.id,
                routeTableId: subnetRouteTable.id,
            }, { parent: this });

            // Record the subnet id, but depend on the RouteTableAssociation
            const subnetId = pulumi.all([subnet.id, routeTableAssociation.id]).apply(([id, _]) => id);
            this.subnetIds.push(subnetId);
        }
    }
}

(<any>Network).doNotCapture = true;
