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
import { getSubnetSpecsLegacy, SubnetSpec, validateRanges } from "./subnetDistributorLegacy";
import { knownWorkingSubnets } from "./knownWorkingSubnets";

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

          const result = getSubnetSpecsLegacy("vpcName", vpcCidr, azs, subnetSpecs);

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

          const result = getSubnetSpecsLegacy("vpcName", vpcCidr, ["us-east-1a"], [subnetSpec]);

          expect(result.length).toBe(1);
          expect(result[0].cidrBlock).toBe(vpcCidr);
        },
      ),
    );
  });

  it("should use default values if VPC is large", () => {
    fc.assert(
      fc.property(
        fc.record({
          vpcCidrMask: cidrMask({ max: 17 }),
          subnetSpec: subnetSpecNoMask(),
        }),
        ({ vpcCidrMask }) => {
          const vpcCidr = `10.0.0.0/${vpcCidrMask}`;

          const result = getSubnetSpecsLegacy(
            "vpcName",
            vpcCidr,
            ["us-east-1a"],
            [{ type: "Public" }, { type: "Private" }, { type: "Isolated" }],
          );

          expect(result).toMatchObject([
            {
              cidrBlock: "10.0.0.0/19",
              subnetName: "vpcName-private-1",
              type: "Private",
            },
            {
              cidrBlock: "10.0.32.0/20",
              subnetName: "vpcName-public-1",
              type: "Public",
            },
            {
              cidrBlock: "10.0.48.0/24",
              subnetName: "vpcName-isolated-1",
              type: "Isolated",
            },
          ]);
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

          const result = getSubnetSpecsLegacy("vpcName", vpcCidr, ["us-east-1a"], subnetSpecs);

          validateRanges(result);
        },
      ),
    );
  });

  describe("known working subnets", () => {
    for (const knownCase of knownWorkingSubnets) {
      it(`should work for ${knownCase.vpcCidr} with subnets ${knownCase.subnetSpecs
        .map((s) => `${s.type}:${s.cidrMask}`)
        .join(", ")}`, () => {
        const result = getSubnetSpecsLegacy(
          "vpcName",
          knownCase.vpcCidr,
          ["us-east-1a"],
          knownCase.subnetSpecs,
        );
        const actual = result.map((s) => s.cidrBlock);

        expect(actual).toEqual(knownCase.result);
      });
    }
  });
});

function getCidrMask(cidrBlock: string): number {
  return parseInt(cidrBlock.split("/")[1], 10);
}

describe("getSubnetSpecs", () => {
  const azs = ["us-east-1a", "us-east-1b", "us-east-1c"];
  const vpcCidr = "10.0.0.0/16";
  const vpcName = "vpcname";

  it("should return the default subnets with no parameters and 3 AZs", () => {
    const result = getSubnetSpecsLegacy(vpcName, vpcCidr, azs);
    const expected: SubnetSpec[] = [
      {
        type: "Private",
        cidrBlock: "10.0.0.0/19",
        azName: "us-east-1a",
        subnetName: "vpcname-private-1",
      },
      {
        type: "Private",
        cidrBlock: "10.0.64.0/19",
        azName: "us-east-1b",
        subnetName: "vpcname-private-2",
      },
      {
        type: "Private",
        cidrBlock: "10.0.128.0/19",
        azName: "us-east-1c",
        subnetName: "vpcname-private-3",
      },
      {
        type: "Public",
        cidrBlock: "10.0.32.0/20",
        azName: "us-east-1a",
        subnetName: "vpcname-public-1",
      },
      {
        type: "Public",
        cidrBlock: "10.0.96.0/20",
        azName: "us-east-1b",
        subnetName: "vpcname-public-2",
      },
      {
        type: "Public",
        cidrBlock: "10.0.160.0/20",
        azName: "us-east-1c",
        subnetName: "vpcname-public-3",
      },
    ];
    expect(result).toEqual(expected);
  });

  describe.each<SubnetTypeInputs>(["Private", "Public", "Isolated"])(
    "with 1 type of subnet",
    (type: SubnetTypeInputs) => {
      const inputs = [
        {
          cidrMask: 19,
          type: type,
          name: "foo",
          tags: {
            Name: "test",
            Owner: "user1",
          },
        },
      ];

      const expected = [
        {
          type: type,
          cidrBlock: "10.0.0.0/19",
          azName: "us-east-1a",
          subnetName: "vpcname-foo-1",
          tags: {
            Name: "test",
            Owner: "user1",
          },
        },
        {
          type: type,
          cidrBlock: "10.0.64.0/19",
          azName: "us-east-1b",
          subnetName: "vpcname-foo-2",
          tags: {
            Name: "test",
            Owner: "user1",
          },
        },
        {
          type: type,
          cidrBlock: "10.0.128.0/19",
          azName: "us-east-1c",
          subnetName: "vpcname-foo-3",
          tags: {
            Name: "test",
            Owner: "user1",
          },
        },
      ];

      expect(getSubnetSpecsLegacy(vpcName, vpcCidr, azs, inputs)).toEqual(expected);
    },
  );

  describe.each<SubnetTypeInputs[]>([
    ["Private", "Public"],
    ["Public", "Isolated"],
    ["Private", "Isolated"],
  ])("with 2 types of subnets", (slash19Type: SubnetTypeInputs, slash20Type: SubnetTypeInputs) => {
    const inputs = [
      {
        cidrMask: 19,
        type: slash19Type,
        name: "foo",
      },
      {
        cidrMask: 20,
        type: slash20Type,
        name: "bar",
      },
    ];

    const expected = [
      {
        type: slash19Type,
        cidrBlock: "10.0.0.0/19",
        azName: "us-east-1a",
        subnetName: "vpcname-foo-1",
      },
      {
        type: slash20Type,
        cidrBlock: "10.0.32.0/20",
        azName: "us-east-1a",
        subnetName: "vpcname-bar-1",
      },
      {
        type: slash19Type,
        cidrBlock: "10.0.64.0/19",
        azName: "us-east-1b",
        subnetName: "vpcname-foo-2",
      },
      {
        type: slash20Type,
        cidrBlock: "10.0.96.0/20",
        azName: "us-east-1b",
        subnetName: "vpcname-bar-2",
      },
      {
        type: slash19Type,
        cidrBlock: "10.0.128.0/19",
        azName: "us-east-1c",
        subnetName: "vpcname-foo-3",
      },
      {
        type: slash20Type,
        cidrBlock: "10.0.160.0/20",
        azName: "us-east-1c",
        subnetName: "vpcname-bar-3",
      },
    ];

    expect(getSubnetSpecsLegacy(vpcName, vpcCidr, azs, inputs)).toEqual(expected);
  });
});
