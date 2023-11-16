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

import fc from "fast-check";
import { SubnetSpecInputs, SubnetTypeInputs } from "../schema-types";
import { defaultSubnetInputs, getSubnetSpecs, nextNetmask } from "./subnetDistributorNew";
import { Netmask } from "netmask";
import { getOverlappingSubnets, validateNoGaps, validateSubnets } from "./vpc";
import { getSubnetSpecsLegacy } from "./subnetDistributorLegacy";

function cidrMask(args?: { min?: number; max?: number }): fc.Arbitrary<number> {
  return fc.integer({ min: args?.min ?? 16, max: args?.max ?? 27 });
}

function subnetSpecNoMask() {
  return fc.constantFrom("Private", "Public", "Isolated").map(
    (type): SubnetSpecInputs => ({
      type: type as SubnetTypeInputs,
    }),
  );
}

function subnetSpec() {
  return fc
    .record({ type: fc.constantFrom("Private", "Public", "Isolated"), cidrMask: cidrMask() })
    .map(
      ({ type, cidrMask }): SubnetSpecInputs => ({
        type: type as SubnetTypeInputs,
        cidrMask,
      }),
    );
}

describe("default subnet layout", () => {
  it("should have smaller subnets than the vpc", () => {
    fc.assert(
      fc.property(
        fc.record({
          vpcCidrMask: cidrMask(),
          azs: fc.array(fc.string({ size: "xsmall" }), { minLength: 2, maxLength: 4 }),
          subnetSpecs: fc.array(subnetSpecNoMask(), { minLength: 1, maxLength: 5 }),
        }),
        ({ vpcCidrMask, azs, subnetSpecs }) => {
          const vpcCidr = `10.0.0.0/${vpcCidrMask}`;

          const result = getSubnetSpecs("vpcName", vpcCidr, azs, subnetSpecs);

          for (const subnet of result) {
            const subnetMask = getCidrMask(subnet.cidrBlock);
            // Larger mask means smaller subnet
            expect(subnetMask).toBeGreaterThan(vpcCidrMask);
          }
        },
      ),
    );
  });

  it("should use whole space if there's only one subnet and VPC is small", () => {
    fc.assert(
      fc.property(
        fc.record({
          vpcCidrMask: cidrMask({ min: 24 }),
          subnetSpec: subnetSpecNoMask(),
        }),
        ({ vpcCidrMask, subnetSpec }) => {
          const vpcCidr = `10.0.0.0/${vpcCidrMask}`;

          const result = getSubnetSpecs("vpcName", vpcCidr, ["us-east-1a"], [subnetSpec]);

          expect(result.length).toBe(1);
          expect(result[0].cidrBlock).toBe(vpcCidr);
        },
      ),
    );
  });

  it("should not have overlapping ranges", () => {
    fc.assert(
      fc.property(
        fc
          .record({
            vpcCidrMask: cidrMask(),
            // We're just focusing on the logic of choosing the next range, so we don't need large numbers of specs.
            // Similarly, we only need a single AZ because AZs are always split evenly.
            subnetSpecs: fc.array(subnetSpec(), { minLength: 1, maxLength: 2 }),
          })
          .filter(({ vpcCidrMask, subnetSpecs }) => {
            for (const subnetSpec of subnetSpecs) {
              // Requite subnet to be smaller than VPC
              if (subnetSpec.cidrMask! <= vpcCidrMask) {
                return false;
              }
            }
            return true;
          }),
        ({ vpcCidrMask, subnetSpecs }) => {
          const vpcCidr = `10.0.0.0/${vpcCidrMask}`;

          const result = getSubnetSpecs("vpcName", vpcCidr, ["us-east-1a"], subnetSpecs);

          validateSubnets(result, getOverlappingSubnets);
        },
      ),
    );
  });
});

function getCidrMask(cidrBlock: string): number {
  return parseInt(cidrBlock.split("/")[1], 10);
}

describe("nextNetmask", () => {
  it("handles /16 -> /17", () => {
    const previous = new Netmask("10.0.0.0/16");
    const next = nextNetmask(previous, 17);
    expect(next.toString()).toBe("10.1.0.0/17");
  });

  it("handles /17 -> /16", () => {
    // This finishes at 10.0.127.255 but we can't use 10.0.128.0/16
    // because that's actually the same as 10.0.0.0/16 which overlaps with the previous block.
    const previous = new Netmask("10.0.0.0/17");
    const next = nextNetmask(previous, 16);
    expect(next.toString()).toBe("10.1.0.0/16");
  });
});

describe("validating exact layouts", () => {
  it("should pass for a single subnet", () => {
    validateNoGaps("10.0.0.0/16", [
      {
        azName: "az",
        type: "Public",
        cidrBlock: "10.0.0.0/16",
        subnetName: "sub1",
      },
    ]);
  });

  it("should highlight a gap", () => {
    expect(() =>
      validateNoGaps("10.0.0.0/16", [
        {
          azName: "",
          type: "Public",
          cidrBlock: "10.0.0.0/18",
          subnetName: "sub1",
        },
        // "10.0.1.0/16" is missing
        {
          azName: "",
          type: "Public",
          cidrBlock: "10.0.128.0/17",
          subnetName: "sub2",
        },
      ]),
    ).toThrowError(
      "There are gaps in the subnet ranges. Please fix the following gaps: sub1 (10.0.0.0/18) <=> sub2 (10.0.128.0/17)",
    );
  });

  it("highlights gaps at end of VPC", () => {
    const vpcCidr = "10.0.0.0/16";
    const result = getSubnetSpecs(
      "vpcName",
      vpcCidr,
      ["us-east-1a"],
      // 3 subnets to leave a gap at the end when dividing evenly.
      [{ type: "Public" }, { type: "Private" }, { type: "Isolated" }],
    );
    expect(() => {
      validateNoGaps(vpcCidr, result);
    }).toThrowError(
      "Please fix the following gaps: vpcName-isolated-1 (ending 10.0.191.254) ends before VPC ends (at 10.0.255.254})",
    );
  });

  it("highlights a gap at the start of the VPC", () => {
    expect(() =>
      validateNoGaps("10.0.0.0/16", [
        {
          azName: "",
          type: "Public",
          cidrBlock: "10.0.128.0/17",
          subnetName: "sub1",
        },
      ]),
    ).toThrowError(
      "Please fix the following gaps: sub1 (10.0.128.0/17) does not start at the beginning of the VPC (10.0.0.0/16)",
    );
  });

  it("Has same default layout as legacy", () => {
    fc.assert(
      fc.property(
        fc.record({
          // Allow space for 2 bits to be used for AZs
          vpcCidrMask: cidrMask({ max: 24 }),
          azs: fc.array(fc.string({ size: "xsmall" }), { minLength: 1, maxLength: 4 }),
        }),
        ({ vpcCidrMask, azs }) => {
          const vpcCidr = `10.0.0.0/${vpcCidrMask}`;

          const newResult = getSubnetSpecs("vpcName", vpcCidr, azs, undefined);
          const legacyResult = getSubnetSpecsLegacy("vpcName", vpcCidr, azs, undefined);

          expect(newResult).toEqual(expect.arrayContaining(legacyResult));
        },
      ),
    );
  });

  describe("Default subnet layouts", () => {
    it("has fixed size for /16 or larger", () => {
      fc.assert(
        fc.property(cidrMask({ max: 16 }), (azCidrMask) => {
          const result = defaultSubnetInputs(azCidrMask);
          expect(result).toEqual([
            {
              type: "Private",
              cidrMask: 17,
            },
            {
              type: "Public",
              cidrMask: 18,
            },
          ]);
        }),
      );
    });
    it("has relative size for /16 to /26", () => {
      fc.assert(
        fc.property(cidrMask({ min: 16, max: 26 }), (azCidrMask) => {
          const result = defaultSubnetInputs(azCidrMask);
          expect(result).toEqual([
            {
              type: "Private",
              cidrMask: azCidrMask + 1,
            },
            {
              type: "Public",
              cidrMask: azCidrMask + 2,
            },
          ]);
        }),
      );
    });
    it("fails for larger than /26", () => {
      fc.assert(
        fc.property(cidrMask({ min: 27 }), (azCidrMask) => {
          expect(() => {
            defaultSubnetInputs(azCidrMask);
          }).toThrowError();
        }),
      );
    });
  });
});
