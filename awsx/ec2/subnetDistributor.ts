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

// TODO: Appropriately credit James Nugent

import { SubnetSpecInputs, SubnetTypeInputs } from "../schema-types";

export interface SubnetSpec {
    cidrBlock: string;
    type: SubnetTypeInputs;
    azName: string;
    subnetName: string;
}

export function getSubnetSpecs(
    vpcName: string,
    vpcCidr: string,
    azNames: string[],
    subnetInputs?: SubnetSpecInputs[],
): SubnetSpec[] {
    const newBitsPerAZ = Math.log2(nextPow2(azNames.length));

    const azBases: string[] = [];
    for (let i = 0; i < azNames.length; i++) {
        azBases.push(cidrSubnetV4(vpcCidr, newBitsPerAZ, i));
    }

    if (subnetInputs === undefined) {
        return generateDefaultSubnets(vpcName, vpcCidr, azNames, azBases);
    }

    const ipAddress = require("ip-address");
    const ipv4 = new ipAddress.Address4(azBases[0]);
    const baseSubnetMask = ipv4.subnetMask;

    const privateSubnets: SubnetSpec[] = [];
    const publicSubnets: SubnetSpec[] = [];
    const isolatedSubnets: SubnetSpec[] = [];

    for (let i = 0; i < azNames.length; i++) {
        subnetInputs
            .filter((x) => x.type === "Private")
            .forEach((privateSubnet) => {
                const newBits = privateSubnet.cidrMask - baseSubnetMask;
                const privateSubnetCidrBlock = cidrSubnetV4(
                    azBases[i],
                    newBits,
                    0,
                );
                privateSubnets.push({
                    azName: azNames[i],
                    cidrBlock: privateSubnetCidrBlock,
                    type: "Private",
                    subnetName: `${vpcName}-${
                        privateSubnet.name ?? "private"
                    }-${i + 1}`,
                });
            });

        subnetInputs
            .filter((x) => x.type === "Public")
            .forEach((publicSubnet) => {
                const baseCidr =
                    privateSubnets.length > 0
                        ? privateSubnets[i].cidrBlock
                        : azBases[i];

                const baseIp = new ipAddress.Address4(baseCidr);

                const splitBase =
                    privateSubnets.length > 0
                        ? cidrSubnetV4(baseCidr, 0, 1)
                        : azBases[i];
                const newBits = publicSubnet.cidrMask - baseIp.subnetMask;

                const publicSubnetCidrBlock = cidrSubnetV4(
                    splitBase,
                    newBits,
                    0,
                );
                publicSubnets.push({
                    azName: azNames[i],
                    cidrBlock: publicSubnetCidrBlock,
                    type: "Public",
                    subnetName: `${vpcName}-${publicSubnet.name ?? "public"}-${
                        i + 1
                    }`,
                });
            });

        subnetInputs
            .filter((x) => x.type === "Isolated")
            .forEach((isolatedSubnet) => {
                let baseCidr: string;
                if (publicSubnets.length > 0) {
                    baseCidr = publicSubnets[i].cidrBlock;
                } else if (privateSubnets.length > 0) {
                    baseCidr = privateSubnets[i].cidrBlock;
                } else {
                    baseCidr = azBases[i];
                }

                const baseIp = new ipAddress.Address4(baseCidr);

                let splitBase: string;
                if (publicSubnets.length > 0 || privateSubnets.length > 0) {
                    splitBase = cidrSubnetV4(baseCidr, 0, 1);
                } else {
                    splitBase = azBases[i];
                }

                const newBits = isolatedSubnet.cidrMask - baseIp.subnetMask;

                const isolatedSubnetCidrBlock = cidrSubnetV4(
                    splitBase,
                    newBits,
                    0,
                );
                isolatedSubnets.push({
                    azName: azNames[i],
                    cidrBlock: isolatedSubnetCidrBlock,
                    type: "Isolated",
                    subnetName: `${vpcName}-${
                        isolatedSubnet.name ?? "isolated"
                    }-${i + 1}`,
                });
            });
    }

    return Array.prototype.concat(
        privateSubnets,
        publicSubnets,
        isolatedSubnets,
    );
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

function cidrSubnetV4(
    ipRange: string,
    newBits: number,
    netNum: number,
): string {
    const ipAddress = require("ip-address");
    const BigInteger = require("jsbn").BigInteger;

    const ipv4 = new ipAddress.Address4(ipRange);

    const newSubnetMask = ipv4.subnetMask + newBits;
    if (newSubnetMask > 32) {
        throw new Error(
            `Requested ${newBits} new bits, but ` +
                `only ${32 - ipv4.subnetMask} are available.`,
        );
    }

    const addressBI = ipv4.bigInteger();
    const newAddressBase = Math.pow(2, 32 - newSubnetMask);
    const netNumBI = new BigInteger(netNum.toString());

    const newAddressBI = addressBI.add(
        new BigInteger(newAddressBase.toString()).multiply(netNumBI),
    );
    const newAddress = ipAddress.Address4.fromBigInteger(newAddressBI).address;

    return `${newAddress}/${newSubnetMask}`;
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
