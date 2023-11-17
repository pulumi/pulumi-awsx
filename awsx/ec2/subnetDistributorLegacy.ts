// Copyright 2016-2022, Pulumi Corporation.
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

// Code adapted from https://github.com/jen20/pulumi-aws-vpc/blob/master/nodejs/src/subnetDistributor.ts
// and used in accordance with MPL v2.0 license

import * as pulumi from "@pulumi/pulumi";
import { SubnetSpecInputs, SubnetTypeInputs } from "../schema-types";
import * as ipAddress from "ip-address";
import { BigInteger } from "jsbn";

export interface SubnetSpec {
  cidrBlock: string;
  type: SubnetTypeInputs;
  azName: string;
  subnetName: string;
  tags?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;
}

export function getSubnetSpecsLegacy(
  vpcName: string,
  vpcCidr: string,
  azNames: string[],
  subnetInputs?: SubnetSpecInputs[],
  azCidrMask?: number,
): SubnetSpec[] {
  // Design:
  // 1. Split the VPC CIDR block evenly between the AZs.
  // 2. Assign private subnets within each AZ using /19 (or user specified) blocks if possible.
  // 3. Assign public subnets within each AZ using /20 (or user specified) blocks if possible.
  // 4. Assign isolated subnets within each AZ using /24 (or user specified) blocks if possible.

  // Selection of the next block uses two strategies to maintain compatibility while fixing overlapping subnets:
  // 1. Attempt to use the legacy method (cidrSubnetV4) to get the next block.
  // 2. Check if the generated next block overlaps with the previous block.
  // 3. If there's overlap, use the new method (nextBlock) to get the next block.
  const newBitsPerAZ =
    azCidrMask !== undefined
      ? azCidrMask - new ipAddress.Address4(vpcCidr).subnetMask
      : Math.log2(nextPow2(azNames.length));

  const azBases: string[] = [];
  for (let i = 0; i < azNames.length; i++) {
    azBases.push(cidrSubnetV4(vpcCidr, newBitsPerAZ, i));
  }

  if (subnetInputs === undefined) {
    return generateDefaultSubnets(vpcName, vpcCidr, azNames, azBases);
  }

  const ipv4 = new ipAddress.Address4(azBases[0]);
  const baseSubnetMask = ipv4.subnetMask;

  const privateSubnetsIn = subnetInputs.filter((x) => x.type.toLowerCase() === "private");
  const publicSubnetsIn = subnetInputs.filter((x) => x.type.toLowerCase() === "public");
  const isolatedSubnetsIn = subnetInputs.filter((x) => x.type.toLowerCase() === "isolated");

  let subnetsOut: SubnetSpec[] = [];

  // How many bits do we need if just dividing up evenly?
  const newBitsPerSubnet = Math.log2(nextPow2(subnetInputs.length));

  for (let i = 0; i < azNames.length; i++) {
    const privateSubnetsOut: SubnetSpec[] = [];
    const publicSubnetsOut: SubnetSpec[] = [];
    const isolatedSubnetsOut: SubnetSpec[] = [];

    // Start at one address before the base address for the AZ:
    let currentAddress = ipAddress.Address4.fromBigInteger(
      new ipAddress.Address4(azBases[i]).startAddress().bigInteger().subtract(BigInteger.ONE),
    );

    for (let j = 0; j < privateSubnetsIn.length; j++) {
      const privateCidrMask: number =
        privateSubnetsIn[j].cidrMask ?? Math.max(baseSubnetMask + newBitsPerSubnet, 19);
      const newBits = privateCidrMask - baseSubnetMask;

      // The "j" input to cidrSubnetV4 below covers the case where we have
      // multiple subnets of each type per AZ. In this case, we need the
      // nth subnet of size newBits in the block for the AZ. The other
      // subnet types below have similar logic.
      let nextAddress = new ipAddress.Address4(cidrSubnetV4(azBases[i], newBits, j));
      if (isOverlapping(currentAddress, nextAddress)) {
        nextAddress = nextBlock(currentAddress, privateCidrMask);
      }
      privateSubnetsOut.push({
        azName: azNames[i],
        cidrBlock: nextAddress.address,
        type: "Private",
        subnetName: `${vpcName}-${privateSubnetsIn[j].name ?? "private"}-${i + 1}`,
        tags: privateSubnetsIn[j].tags,
      });
      currentAddress = nextAddress;
    }

    for (let j = 0; j < publicSubnetsIn.length; j++) {
      // If we declared any private subnets in this AZ, we want our public
      // subnet to start after the last private subnet. If not, we can
      // start with the CIDR block for the AZ:
      const baseCidr =
        privateSubnetsOut.length > 0
          ? privateSubnetsOut[privateSubnetsOut.length - 1].cidrBlock
          : azBases[i];

      const baseIp = new ipAddress.Address4(baseCidr);

      const splitBase = privateSubnetsOut.length > 0 ? cidrSubnetV4(baseCidr, 0, 1) : azBases[i];
      const publicCidrMask: number =
        publicSubnetsIn[j].cidrMask ?? Math.max(baseSubnetMask + newBitsPerSubnet, 20);
      const newBits = publicCidrMask - baseIp.subnetMask;

      let nextAddress = new ipAddress.Address4(cidrSubnetV4(splitBase, newBits, j));
      if (isOverlapping(currentAddress, nextAddress)) {
        nextAddress = nextBlock(currentAddress, publicCidrMask);
      }

      publicSubnetsOut.push({
        azName: azNames[i],
        cidrBlock: nextAddress.address,
        type: "Public",
        subnetName: `${vpcName}-${publicSubnetsIn[j].name ?? "public"}-${i + 1}`,
        tags: publicSubnetsIn[j].tags,
      });
      currentAddress = nextAddress;
    }

    for (let j = 0; j < isolatedSubnetsIn.length; j++) {
      // Similar to above, if we declared any public subnets in this AZ,
      // we want our isolated subnet to start after the last public
      // subnet. If no public subnets, then after the last private subnet.
      // If no private subnets either, use the base CIDR block for the AZ:
      let baseCidr: string;
      if (publicSubnetsOut.length > 0) {
        baseCidr = publicSubnetsOut[publicSubnetsOut.length - 1].cidrBlock;
      } else if (privateSubnetsOut.length > 0) {
        baseCidr = privateSubnetsOut[privateSubnetsOut.length - 1].cidrBlock;
      } else {
        baseCidr = azBases[i];
      }

      const baseIp = new ipAddress.Address4(baseCidr);

      let splitBase: string;
      if (publicSubnetsOut.length > 0 || privateSubnetsOut.length > 0) {
        splitBase = cidrSubnetV4(baseCidr, 0, 1);
      } else {
        splitBase = azBases[i];
      }

      const isolatedCidrMask: number =
        isolatedSubnetsIn[j].cidrMask ?? Math.max(baseSubnetMask + newBitsPerSubnet, 24);
      const newBits = isolatedCidrMask - baseIp.subnetMask;
      let nextAddress = new ipAddress.Address4(cidrSubnetV4(splitBase, newBits, j));
      if (isOverlapping(currentAddress, nextAddress)) {
        nextAddress = nextBlock(currentAddress, isolatedCidrMask);
      }

      isolatedSubnetsOut.push({
        azName: azNames[i],
        cidrBlock: nextAddress.address,
        type: "Isolated",
        subnetName: `${vpcName}-${isolatedSubnetsIn[j].name ?? "isolated"}-${i + 1}`,
        tags: isolatedSubnetsIn[j].tags,
      });
      currentAddress = nextAddress;
    }

    subnetsOut = subnetsOut.concat(privateSubnetsOut, publicSubnetsOut, isolatedSubnetsOut);
  }

  return subnetsOut;
}

function generateDefaultSubnets(
  vpcName: string,
  vpcCidr: string,
  azNames: string[],
  azBases: string[],
): SubnetSpec[] {
  const privateSubnets: SubnetSpec[] = [];

  for (let i = 0; i < azNames.length; i++) {
    privateSubnets.push({
      azName: azNames[i],
      cidrBlock: cidrSubnetV4(azBases[i], 1, 0),
      type: "Private",
      subnetName: `${vpcName}-private-${i + 1}`,
    });
  }

  const publicSubnets: SubnetSpec[] = [];

  for (let i = 0; i < azNames.length; i++) {
    const splitBase = cidrSubnetV4(privateSubnets[i].cidrBlock, 0, 1);

    publicSubnets.push({
      azName: azNames[i],
      cidrBlock: cidrSubnetV4(splitBase, 1, 0),
      type: "Public",
      subnetName: `${vpcName}-public-${i + 1}`,
    });
  }

  return Array.prototype.concat(privateSubnets, publicSubnets);
}

function cidrSubnetV4(ipRange: string, newBits: number, netNum: number): string {
  const BigInteger = require("jsbn").BigInteger;

  const ipv4 = new ipAddress.Address4(ipRange);

  const newSubnetMask = ipv4.subnetMask + newBits;
  if (newSubnetMask > 32) {
    throw new Error(
      `Requested ${newBits} new bits, but ` + `only ${32 - ipv4.subnetMask} are available.`,
    );
  }

  const addressBI = ipv4.bigInteger();
  const newAddressBase = Math.pow(2, 32 - newSubnetMask);
  const netNumBI = new BigInteger(netNum.toString());

  const newAddressBI = addressBI.add(new BigInteger(newAddressBase.toString()).multiply(netNumBI));
  const newAddress = ipAddress.Address4.fromBigInteger(newAddressBI).address;

  return `${newAddress}/${newSubnetMask}`;
}

export function validateRanges(specs: SubnetSpec[]) {
  const ranges = specs
    .map((spec) => new ipAddress.Address4(spec.cidrBlock))
    .map((addr) => {
      const start = addr.startAddress().bigInteger();
      const end = addr.endAddress().bigInteger();
      return { addr, start, end };
    });
  let previous = ranges[0];
  for (const current of ranges.slice(1)) {
    if (isOverlapping(previous.addr, current.addr)) {
      throw new Error(
        `Subnet ranges must not overlap. ${previous.addr.address} (from ${
          previous.addr.startAddress().address
        } to ${previous.addr.endAddress().address}) and ${current.addr.address} (from ${
          previous.addr.startAddress().address
        } to ${previous.addr.endAddress().address}) overlap.)`,
      );
    }
    previous = current;
  }
}

function isOverlapping(a: ipAddress.Address4, b: ipAddress.Address4): boolean {
  const aStart = a.startAddress().bigInteger();
  const aEnd = a.endAddress().bigInteger();
  const bStart = b.startAddress().bigInteger();
  const bEnd = b.endAddress().bigInteger();

  return aStart.compareTo(bEnd) <= 0 && bStart.compareTo(aEnd) <= 0;
}

export function nextBlock(
  previousCidr: ipAddress.Address4,
  nextCidrMask: number,
): ipAddress.Address4 {
  // 1. Get the last address in the previous block.
  const lastAddress = previousCidr.endAddress().address;
  // 2. Change the size of the block to the new size in case the block is wider and overlaps.
  const lastAddressInNewMask = new ipAddress.Address4(lastAddress + "/" + nextCidrMask);
  // 3. Now find the last address in the new sized block.
  const lastAddressInNewSizeBlock = lastAddressInNewMask.endAddress();
  // 4. Add 1 to get the first address in the next block.
  const nextAddressNumber = lastAddressInNewSizeBlock.bigInteger().add(BigInteger.ONE);
  // 5. Create the next block and add the new mask.
  const nextAddress = ipAddress.Address4.fromBigInteger(nextAddressNumber);
  return new ipAddress.Address4(nextAddress.address + "/" + nextCidrMask);
}

/**
 * nextPow2 returns the next integer greater or equal to n which is a power of 2.
 * @param {number} n input number
 * @returns {number} next power of 2 to n (>= n)
 */
function nextPow2(n: number): number {
  if (n === 0) {
    return 1;
  }

  n--;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;

  return n + 1;
}
