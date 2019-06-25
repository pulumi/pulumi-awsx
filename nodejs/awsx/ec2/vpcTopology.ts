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
import { Cidr32Block, getIPv4Address } from "./cidr";

/** @internal */
export interface AvailabilityZoneDescription {
    name: string;
    id: string;
}

/** @internal */
export class VpcTopology {
    private readonly vpcCidrBlock: Cidr32Block;
    private lastAllocatedSubnetCidrBlock?: Cidr32Block;

    constructor(private readonly vpcName: string,
                vpcCidr: string,
                private readonly availabilityZones: AvailabilityZoneDescription[],
                private readonly numberOfNatGateways: number) {

        this.vpcCidrBlock = Cidr32Block.fromCidrNotation(vpcCidr);
    }

    public createSubnetsAndNatGateways(subnetArgsArray: x.ec2.VpcSubnetArgs[]) {
        const maskedSubnets = subnetArgsArray.filter(s => s.cidrMask !== undefined);
        const unmaskedSubnets = subnetArgsArray.filter(s => s.cidrMask === undefined);

        const subnetDescriptions: SubnetDescription[] = [];

        // First, break up the available vpc cidr block to each subnet based on the amount of space
        // they request.
        for (const subnetArgs of maskedSubnets) {
            subnetDescriptions.push(...this.createSubnetsWorker(subnetArgs, subnetArgs.cidrMask!));
        }

        // Then, take the remaining subnets can break the remaining space up to them.
        const cidrMaskForUnmaskedSubnets = this.computeCidrMaskForSubnets(unmaskedSubnets, unmaskedSubnets.length > 0);
        for (const subnetArgs of unmaskedSubnets) {
            subnetDescriptions.push(...this.createSubnetsWorker(subnetArgs, cidrMaskForUnmaskedSubnets));
        }

        const natGatewayDescriptions = this.createNatGateways(subnetDescriptions);

        return { subnetDescriptions, ...natGatewayDescriptions };
    }

    private createNatGateways(subnetDescriptions: SubnetDescription[]) {
        const natGatewayDescriptions: NatGatewayDescription[] = [];
        const natRouteDescriptions: NatRouteDescription[] = [];
        const publicSubnets = subnetDescriptions.filter(d => d.type === "public");
        const privateSubnets = subnetDescriptions.filter(d => d.type === "private");

        // Create nat gateways if we have private subnets and we have public subnets to place them in.
        if (shouldCreateNatGateways(this.numberOfNatGateways, publicSubnets, privateSubnets)) {
            const numberOfAvailabilityZones = this.availabilityZones.length;
            if (this.numberOfNatGateways > numberOfAvailabilityZones) {
                throw new Error(`[numberOfNatGateways] cannot be greater than [numberOfAvailabilityZones]: ${this.numberOfNatGateways} > ${numberOfAvailabilityZones}`);
            }

            for (let i = 0; i < this.numberOfNatGateways; i++) {
                // Each public subnet was already created across all availability zones.  So, to
                // maximize coverage of availability zones, we can just walk the public subnets and
                // create a nat gateway for it's availability zone.  If more natgateways were
                // requested then we'll just round-robin them among the availability zones.

                // this indexing is safe since we would have created the any subnet across all
                // availability zones.
                const publicSubnetIndex = i % numberOfAvailabilityZones;
                natGatewayDescriptions.push({ name: `${this.vpcName}-${i}`, publicSubnet: publicSubnetIndex });
            }

            let roundRobinIndex = 0;

            // We created subnets 'numberOfAvailabilityZones' at a time.  So just jump through them in
            // chunks of that size.
            for (let i = 0, n = privateSubnets.length; i < n; i += numberOfAvailabilityZones) {
                // For each chunk of subnets, we will have spread them across all the availability
                // zones.  We also created a nat gateway per availability zone *up to*
                // numberOfNatGateways.  So for the subnets in an availability zone that we created a
                // nat gateway in, just route to that nat gateway.  For the other subnets that are
                // in an availability zone without a nat gateway, we just round-robin between any
                // nat gateway we created.
                for (let j = 0; j < numberOfAvailabilityZones; j++) {
                    const privateSubnetIndex = i + j;
                    const natGatewayIndex = j < this.numberOfNatGateways ? j : roundRobinIndex++;
                    natRouteDescriptions.push({ name: `nat-${j}`, privateSubnet: privateSubnetIndex, natGateway: natGatewayIndex});
                }
            }
        }

        return { natGatewayDescriptions, natRouteDescriptions };
    }

    private computeCidrMaskForSubnets(subnets: x.ec2.VpcSubnetArgs[], checkResult: boolean): number {
        // We need one cidr block for each of these subnets in each availability zone.
        const requiredCidrBlockCount = subnets.length * this.availabilityZones.length;

        const firstAvailableIp = this.getNextCidrBlockStartingAddress();
        const availableIps = this.vpcCidrBlock.endIpAddressExclusive - firstAvailableIp;
        const ipsPerBlock = Math.floor(availableIps / requiredCidrBlockCount);

        // ipsPerBlock is going to be some random integer.  However, we need to get the number of
        // mask bits that corresponds to the closest power of 2 that is smaller.  for example If we
        // can split the remaining space into 300 ips per block, then we need to actually only
        // allocate 256 ips per block.  If we were to allocate 512, we'd run out of space.  So
        // we get the log base 2, and round down so that we get 8 in this case.
        //
        // However, that value corresponds to the trailing mask bits, whereas we want the leading
        // bits.  So take that value and subtract from 32 to get the final amount we need.
        const result = 32 - Math.floor(Math.log2(ipsPerBlock));
        if (checkResult) {
            if (result > 28) {
                // subnets cannot be this small as per: https://aws.amazon.com/vpc/faqs/ The minimum
                // size of a subnet is a /28 (or 14 IP addresses.) for IPv4. Subnets cannot be
                // larger than the VPC in which they are created.
                throw new Error(
`Not enough address space in VPC to create desired subnet config.
VPC has ${availableIps} IPs, but is being asked to split into a total of ${requiredCidrBlockCount} subnets.
${requiredCidrBlockCount} subnets are necessary to have ${this.availabilityZones.length} AZ(s) each with ${subnets.length} subnet(s) in them.
This needs ${ipsPerBlock} IPs/subnet, which is smaller than the minimum (16) allowed by AWS.`);
            }
        }

        return result;
    }

    private getNextCidrBlockStartingAddress() {
        // If we are allocating our first subnet block.  It starts where our vpc cidr block starts.
        // Otherwise, it will start where our last block ends.

        return !this.lastAllocatedSubnetCidrBlock
            ? this.vpcCidrBlock.startIpAddressInclusive
            : this.lastAllocatedSubnetCidrBlock.endIpAddressExclusive;
    }

    private assignNextAvailableCidrBlock(mask: number): Cidr32Block {
        // If we are allocating our first subnet block.  It starts where our vpc cidr block starts.
        // Otherwise, it will start where our last block ends.

        const nextStartIpAddressInclusive = this.getNextCidrBlockStartingAddress();
        const nextCidrBlock = new Cidr32Block(nextStartIpAddressInclusive, mask);

        // Make sure this latest block doesn't go past the end of the cidr block of the vpc.
        if (nextCidrBlock.endIpAddressExclusive > this.vpcCidrBlock.endIpAddressExclusive) {
            const lastAllocatedIpAddress = getIPv4Address(nextCidrBlock.endIpAddressExclusive);
            const lastVpcIpAddress = getIPv4Address(this.vpcCidrBlock.endIpAddressExclusive);
            throw new Error(
`Subnet cidr block end ip address extends past that last legal ip address for the vpc.
${lastAllocatedIpAddress} > ${lastVpcIpAddress}`);
        }

        this.lastAllocatedSubnetCidrBlock = nextCidrBlock;
        return nextCidrBlock;
    }

    private createSubnetsWorker(subnetArgs: x.ec2.VpcSubnetArgs, cidrMask: number) {
        if (cidrMask < 16 || cidrMask > 28) {
            throw new Error(`Cidr mask must be between "16" and "28" but was ${cidrMask}`);
        }

        const result: SubnetDescription[] = [];

        const type = subnetArgs.type;

        for (let i = 0; i < this.availabilityZones.length; i++) {
            const subnetName = getSubnetName(this.vpcName, subnetArgs, i);

            result.push({
                type,
                subnetName,
                availabilityZone: this.availabilityZones[i],
                cidrBlock: this.assignNextAvailableCidrBlock(cidrMask).toString(),
                mapPublicIpOnLaunch: subnetArgs.mapPublicIpOnLaunch,
                assignIpv6AddressOnCreation: subnetArgs.assignIpv6AddressOnCreation,
                tags: subnetArgs.tags,
            });
        }

        return result;

        function getSubnetName(vpcName: string, subnetArgs: x.ec2.VpcSubnetArgs, i: number) {
            let subnetName = `${subnetArgs.type}-${i}`;
            if (subnetArgs.name) {
                subnetName = `${subnetArgs.name}-` + subnetName;
            }

            return `${vpcName}-${subnetName}`;
        }
    }
}

function shouldCreateNatGateways(
        numberOfNatGateways: number, publicSubnets: SubnetDescription[], privateSubnets: SubnetDescription[]) {
    // To make natgateways:
    // 1. we have to have at least been asked to make some nat gateways.
    // 2. we need public subnets to actually place the nat gateways in.
    // 3. we need private subnets that will actually be connected to the nat gateways.
    return  numberOfNatGateways > 0 && publicSubnets.length > 0 && privateSubnets.length > 0;
}

/** @internal */
export interface SubnetDescription {
    type: x.ec2.VpcSubnetType;
    subnetName: string;
    availabilityZone: AvailabilityZoneDescription;
    cidrBlock: string;
    tags?: pulumi.Input<aws.Tags>;
    mapPublicIpOnLaunch?: pulumi.Input<boolean>;
    assignIpv6AddressOnCreation?: pulumi.Input<boolean>;
}


/** @internal */
export interface NatGatewayDescription {
    name: string;

    /** index of the public subnet that this nat gateway should live in. */
    publicSubnet: number;
}

/** @internal */
export interface NatRouteDescription {
    name: string;

    /** The index of the private subnet that is getting the route */
    privateSubnet: number;

    /** The index of the nat gateway this private subnet is getting a route to. */
    natGateway: number;
}
