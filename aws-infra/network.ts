// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { RunError } from "@pulumi/pulumi/errors";

import { getAwsAz } from "./aws";

export interface NetworkArgs {
    numberOfAvailabilityZones?: number;
    usePrivateSubnets?: boolean;
}

/**
 * Network encapsulates the configuration of an Amazon VPC.  Both [VPC with Public
 * Subnet](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Scenario1.html) and [VPC with Public and Private
 * Subnets (NAT)](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Scenario2.html) configurations are
 * supported.
 */
export class Network extends pulumi.ComponentResource {
    /**
     * The VPC id of the network.
     */
    public readonly vpcId: pulumi.Output<string>;
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

    public readonly numberOfAvailabilityZones: pulumi.Output<number>;
    public readonly usePrivateSubnets: pulumi.Output<boolean>;

    constructor(name: string, args?: NetworkArgs, opts?: pulumi.ResourceOptions) {
        // IDEA: default to the number of availability zones in this region, rather than 2.  To do this requires
        // invoking the provider, which requires that we "go async" at a very inopportune time here.  When
        // pulumi/pulumi#331 lands, this will be much easier to do, and we can improve this situation.
        if (!args) {
            args = {};
        }

        const numberOfAvailabilityZones = args.numberOfAvailabilityZones || 2;
        if (numberOfAvailabilityZones < 1 || numberOfAvailabilityZones > 4) {
            throw new RunError(
                `Unsupported number of availability zones for network: ${numberOfAvailabilityZones}`);
        }
        const usePrivateSubnets = args.usePrivateSubnets || false;

        super("aws-infra:network:Network", name, {
            numberOfAvailabilityZones: numberOfAvailabilityZones,
            usePrivateSubnets: usePrivateSubnets,
        }, opts);

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
                mapPublicIpOnLaunch: !usePrivateSubnets, // Only assign public IP if we are exposing public subnets
                tags: {
                    Name: subnetName,
                },
            }, { parent: this });

            // We will use a different route table for this subnet depending on
            // whether we are in a public or private subnet
            let subnetRouteTable: aws.ec2.RouteTable;

            if (usePrivateSubnets) {
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
