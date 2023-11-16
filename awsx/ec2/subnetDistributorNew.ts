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
import { Netmask } from "netmask";

export interface SubnetSpec {
  cidrBlock: string;
  type: SubnetTypeInputs;
  azName: string;
  subnetName: string;
  tags?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;
}

export function getSubnetSpecs(
  vpcName: string,
  vpcCidr: string,
  azNames: string[],
  subnetInputs: SubnetSpecInputs[] | undefined,
): SubnetSpec[] {
  const vpcNetmask = new Netmask(vpcCidr);
  const newBitsPerAZ = Math.log2(nextPow2(azNames.length));
  const azBitmask = vpcNetmask.bitmask + newBitsPerAZ;

  const subnetSpecs = subnetInputs ?? defaultSubnetInputs(azBitmask);
  if (subnetSpecs.length === 0) {
    throw new Error("No subnets specified");
  }

  const defaultNewBitsPerSubnet = Math.log2(nextPow2(subnetSpecs.length));
  const defaultSubnetBitmask = azBitmask + defaultNewBitsPerSubnet;

  const azSize = new Netmask(vpcNetmask.base, azBitmask).size;
  const totalSubnetSize = subnetSpecs.reduce(
    (acc, spec) => acc + new Netmask(vpcNetmask.base, spec.cidrMask ?? defaultSubnetBitmask).size,
    0,
  );

  if (totalSubnetSize > azSize) {
    throw new Error(
      `Subnets are too large for VPC. VPC has ${azSize} addresses, but subnets require ${totalSubnetSize} addresses.`,
    );
  }

  let currentAzNetmask = new Netmask(`${vpcNetmask.base}/${azBitmask}`);
  const subnets: SubnetSpec[] = [];
  for (let azIndex = 0; azIndex < azNames.length; azIndex++) {
    const azName = azNames[azIndex];
    const azNum = azIndex + 1;
    let currentSubnetNetmask: Netmask | undefined;
    for (const subnetSpec of subnetSpecs) {
      let subnetCidr = subnetSpec.cidrBlocks?.[azIndex];
      if (subnetCidr === undefined) {
        if (currentSubnetNetmask === undefined) {
          currentSubnetNetmask = new Netmask(
            currentAzNetmask.base,
            subnetSpec.cidrMask ?? defaultSubnetBitmask,
          );
        } else {
          currentSubnetNetmask = nextNetmask(
            currentSubnetNetmask,
            subnetSpec.cidrMask ?? defaultSubnetBitmask,
          );
        }
        subnetCidr = currentSubnetNetmask.toString();
      }
      const specName = subnetSpec.name ?? subnetSpec.type.toLowerCase();
      const subnetName = `${vpcName}-${specName}-${azNum}`;
      subnets.push({
        cidrBlock: subnetCidr,
        type: subnetSpec.type,
        azName,
        subnetName,
      });
    }

    currentAzNetmask = currentAzNetmask.next();
  }

  return subnets;
}

export function defaultSubnetInputs(azBitmask: number): SubnetSpecInputs[] {
  // For a large VPC (up to /17), the layout will be:
  // Private:  /19 (10.0.0.0  - 10.0.31.255), 8190 addresses
  // Public:   /20 (10.0.32.0 - 10.0.47.255), 4094 addresses
  // Isolated: /24 (10.0.48.0 - 10.0.48.255), 254 addresses
  // Unallocated:  (10.0.49.0 - 10.0.127.255)

  // Don't allow default subnets to go smaller than a /28.
  if (azBitmask > 26) {
    throw new Error(
      `Automatic subnet creation requires a VPC with at least /26 available per AZ, but only /${azBitmask} is available.` +
        `If you do need very small subnets, please specify them explicitly.`,
    );
  }
  // Even if we've got more than /16, only use the first /16 for the default subnets.
  // Leave the rest for the user to add later if needed.
  const maxBitmask = Math.max(azBitmask, 16);
  return [
    {
      type: "Private",
      cidrMask: maxBitmask + 1,
    },
    {
      type: "Public",
      cidrMask: maxBitmask + 2,
    },
  ];
}

export function nextNetmask(previous: Netmask, nextBitmask: number): Netmask {
  // 1. Get the last address in the previous block.
  const lastAddress = previous.last;
  // 2. Change the size of the block to the new size in case the block is wider and overlaps.
  const lastAddressInNewSizeBlock = new Netmask(lastAddress, nextBitmask);
  return lastAddressInNewSizeBlock.next();
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

/* Ensure all inputs are consistent and fill in missing values with defaults
 * Ensure any specified, netmask, size or blocks are in agreement.
 */
export function validateAndNormalizeSubnetInputs(
  subnetArgs: SubnetSpecInputs[] | undefined,
  availabilityZoneCount: number,
): { normalizedSpecs: SubnetSpecInputs[]; isExplicitLayout: boolean } | undefined {
  if (subnetArgs === undefined) {
    return undefined;
  }

  const issues: string[] = [];

  // All sizes must be valid.
  const invalidSizes = subnetArgs.filter(
    (spec) => spec.size !== undefined && !validSubnetSizes.includes(spec.size),
  );
  if (invalidSizes.length > 0) {
    issues.push(
      `The following subnet sizes are invalid: ${invalidSizes
        .map((spec) => spec.size)
        .join(", ")}. Valid sizes are: ${validSubnetSizes.join(", ")}.`,
    );
  }

  const hasExplicitLayouts = subnetArgs.some((subnet) => subnet.cidrBlocks !== undefined);
  if (hasExplicitLayouts) {
    // If any subnet spec has explicit cidrBlocks, all subnets must have explicit cidrBlocks.
    const hasMissingExplicitLayouts = subnetArgs.some((subnet) => subnet.cidrBlocks === undefined);
    if (hasMissingExplicitLayouts) {
      issues.push(
        "If any subnet spec has explicit cidrBlocks, all subnets must have explicit cidrBlocks.",
      );
    }

    // Number of cidrBlocks must match the number of availability zones.
    for (let specIndex = 0; specIndex < subnetArgs.length; specIndex++) {
      const spec = subnetArgs[specIndex];
      if (spec.cidrBlocks !== undefined && spec.cidrBlocks.length !== availabilityZoneCount) {
        issues.push(
          `The number of CIDR blocks in subnetSpecs[${specIndex}] must match the number of availability zones (${availabilityZoneCount}).`,
        );
      }
    }

    // Any size or cidrMask must be in agreement with the cidrBlocks.
    for (let specIndex = 0; specIndex < subnetArgs.length; specIndex++) {
      const spec = subnetArgs[specIndex];
      if (spec.cidrBlocks === undefined) {
        continue;
      }
      const blockMasks = spec.cidrBlocks!.map((b) => new Netmask(b));
      if (spec.cidrMask !== undefined) {
        if (!blockMasks.every((b) => b.bitmask === spec.cidrMask)) {
          issues.push(
            `The cidrMask in subnetSpecs[${specIndex}] must match all cidrBlocks or be left undefined.`,
          );
        }
      }
      if (spec.size !== undefined) {
        if (!blockMasks.every((b) => b.size === spec.size!)) {
          issues.push(
            `The size in subnetSpecs[${specIndex}] must match all cidrBlocks or be left undefined.`,
          );
        }
      }
    }

    if (issues.length === 0) {
      return { normalizedSpecs: subnetArgs, isExplicitLayout: true };
    }
  } else {
    const normalizedSpecs = subnetArgs.map((spec) => {
      // Ensure size and cidrMask are in agreement.
      const cidrMask =
        spec.cidrMask ?? (spec.size ? validSubnetSizes.indexOf(spec.size!) : undefined);
      const expectedSize = cidrMask ? validSubnetSizes[cidrMask] : undefined;
      if (spec.size !== undefined && expectedSize !== undefined && expectedSize !== spec.size) {
        issues.push(
          `Subnet size ${spec.size} does not match the expected size for a /${cidrMask} subnet (${expectedSize}).`,
        );
      }
      // Set both cidrMask and size to the resolved values, if either was provided.
      return {
        ...spec,
        cidrMask: cidrMask,
        size: expectedSize,
      };
    });

    if (issues.length === 0) {
      return { normalizedSpecs, isExplicitLayout: false };
    }
  }

  throw new Error(`Invalid subnet specifications:\n - ${issues.join("\n - ")}`);
}

// The index of the array is the corresponding netmask.
export const validSubnetSizes: readonly number[] = [
  4294967296, 2147483648, 1073741824, 536870912, 268435456, 134217728, 67108864, 33554432, 16777216,
  8388608, 4194304, 2097152, 1048576, 524288, 262144, 131072, 65536, 32768, 16384, 8192, 4096, 2048,
  1024, 512, 256, 128, 64, 32, 16, 8, 4,
];
