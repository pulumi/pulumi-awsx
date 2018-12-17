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
import { getAvailabilityZone } from "./../../aws";
import { Cidr32Block, getIPv4Address } from "./cidr";

import * as utils from "./../../utils";

/** @internal */
export class VpcTopology {
    private readonly vpcCidrBlock: Cidr32Block;
    private lastAllocatedSubnetCidrBlock?: Cidr32Block;

    constructor(private readonly vpc: x.ec2.Vpc,
                private readonly vpcName: string,
                vpcCidr: string,
                private readonly numberOfAvailabilityZones: number,
                private readonly opts: pulumi.ComponentResourceOptions | undefined) {

        this.vpcCidrBlock = Cidr32Block.fromCidrNotation(vpcCidr);
    }

    public createSubnets(subnetArgsArray: x.ec2.VpcSubnetArgs[]) {
        const maskedSubnets = subnetArgsArray.filter(s => s.cidrMask !== undefined);
        const unmaskedSubnets = subnetArgsArray.filter(s => s.cidrMask === undefined);

        // First, break up the available vpc cidr block to each subnet based on the amount of space
        // they request.
        for (const subnetArgs of maskedSubnets) {
            this.createSubnet(subnetArgs, subnetArgs.cidrMask!);
        }

        // Then, take the remaining subnets can break the remaining space up to them.
        const cidrMaskForUnmaskedSubnets = this.computeCidrMaskForSubnets(unmaskedSubnets);
        for (const subnetArgs of unmaskedSubnets) {
            this.createSubnet(subnetArgs, cidrMaskForUnmaskedSubnets);
        }
    }

    private computeCidrMaskForSubnets(subnets: x.ec2.VpcSubnetArgs[]): number {
        // We need one cidr block for each of these subnets in each availability zone.
        const requiredCidrBlockCount = subnets.length * this.numberOfAvailabilityZones;

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
        return 32 - Math.floor(Math.log2(ipsPerBlock));
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

    private createSubnet(subnetArgs: x.ec2.VpcSubnetArgs, cidrMask: number) {
        if (cidrMask < 16 || cidrMask > 28) {
            throw new Error(`Cidr mask must be between "16" and "28" but was ${cidrMask}`);
        }

        for (let i = 0; i < this.numberOfAvailabilityZones; i++) {
            const subnetName = `${this.vpcName}-${subnetArgs.type}-${i}`;
            const subnet = new x.ec2.Subnet(subnetName, this.vpc, {
                availabilityZone: getAvailabilityZone(i),
                cidrBlock: this.assignNextAvailableCidrBlock(cidrMask).toString(),
                mapPublicIpOnLaunch: subnetArgs.type === "public",
                tags: utils.mergeTags(subnetArgs.tags, {
                    type: subnetArgs.type,
                }),
            }, this.opts);

            const [subnets, subnetIds] = getSubnets(this.vpc, subnetArgs.type);
            subnets.push(subnet);
            subnetIds.push(subnet.instance.id);
        }

        return;

        function getSubnets(vpc: x.ec2.Vpc, type: x.ec2.VpcSubnetType): [x.ec2.Subnet[], pulumi.Output<String>[]] {
            switch (type) {
                case "public": return [vpc.publicSubnets, vpc.publicSubnetIds];
                case "private": return [vpc.privateSubnets, vpc.privateSubnetIds];
                case "isolated": return [vpc.isolatedSubnets, vpc.isolatedSubnetIds];
                default: throw new Error("Unexpected subnet type: " + subnetArgs.type);
            }
        }
    }
}
