// Copyright 2016-2026, Pulumi Corporation.
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

import { SubnetNameTagStrategyInputs, SubnetSpecInputs } from "../schema-types";

/**
 * Matches the region portion of an availability zone name, up to but not including the region's
 * number. Stripping it from `us-east-1a` leaves `1a`; from the Los Angeles local zone
 * `us-west-2-lax-1a` it leaves `2-lax-1a`.
 *
 * The leading `[a-z]{2}` is the partition-ish prefix (`us`, `eu`, `ap`, `cn`, `il`, `mx`, ...) and
 * `(?:-[a-z]+)+` covers the remaining all-alphabetic segments, which is what lets it handle the
 * longer GovCloud (`us-gov-west-1a`) and ISO (`us-iso-east-1b`, `eu-isoe-west-1a`) region names.
 * It cannot run past the region number because `-[a-z]+` requires a letter after the hyphen.
 *
 * Because every AZ in a region shares this prefix exactly, stripping it preserves uniqueness: two
 * AZs in the same region can never reduce to the same suffix.
 */
const azRegionPrefix = /^[a-z]{2}(?:-[a-z]+)+-/;

/**
 * The portion of an availability zone name used to name subnets under
 * `subnetNameTagStrategy="AvailabilityZone"`, e.g. `us-east-1a` -> `1a`.
 *
 * Falls back to the full availability zone name for anything that doesn't parse, which keeps the
 * result unique (AZ names are unique) at the cost of being verbose.
 */
export function azSuffix(azName: string): string {
  return azRegionPrefix.test(azName) ? azName.replace(azRegionPrefix, "") : azName;
}

/**
 * A generated subnet's name under a given strategy: the vpc name, the spec name and an
 * availability-zone suffix that is either the AZ's 1-based index or the AZ itself.
 */
export function subnetName(
  vpcName: string,
  spec: Pick<SubnetSpecInputs, "name" | "type">,
  azNum: number,
  azName: string,
  strategy: SubnetNameTagStrategyInputs,
): string {
  const specName = spec.name ?? spec.type.toLowerCase();
  const suffix = strategy === "AvailabilityZone" ? azSuffix(azName) : `${azNum}`;
  return `${vpcName}-${specName}-${suffix}`;
}

/**
 * Both names for a generated subnet: `resourceName`, the index-based Pulumi resource name, and
 * `nameTag`, the strategy-dependent AWS "Name" tag. See `SubnetSpec` for how each is used.
 */
export function subnetNames(
  vpcName: string,
  spec: Pick<SubnetSpecInputs, "name" | "type">,
  azNum: number,
  azName: string,
  strategy: SubnetNameTagStrategyInputs,
): { resourceName: string; nameTag: string } {
  return {
    resourceName: subnetName(vpcName, spec, azNum, azName, "Legacy"),
    nameTag: subnetName(vpcName, spec, azNum, azName, strategy),
  };
}

/**
 * Rejects availability zones whose suffixes collide, which would otherwise produce two subnets of
 * the same type with the same name. Real AZs in a single region can't collide - see
 * `azRegionPrefix` - so this guards the fallback path and hand-supplied `availabilityZoneNames`.
 */
export function validateAzSuffixes(azNames: string[]): void {
  const seen = new Map<string, string>();
  for (const azName of azNames) {
    const suffix = azSuffix(azName);
    const collidesWith = seen.get(suffix);
    if (collidesWith !== undefined) {
      throw new Error(
        `subnetNameTagStrategy="AvailabilityZone" requires availability zones with distinct suffixes, but ` +
          `"${collidesWith}" and "${azName}" both reduce to "${suffix}".`,
      );
    }
    seen.set(suffix, azName);
  }
}
