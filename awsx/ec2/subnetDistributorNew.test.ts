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
import {
  defaultSubnetInputs,
  getSubnetSpecs,
  getSubnetSpecsExplicit,
  mergeWithDefaultSubnetSpecs,
  nextNetmask,
  validSubnetSizes,
  validateAndNormalizeSubnetInputs,
} from "./subnetDistributorNew";
import { Netmask } from "netmask";
import { getOverlappingSubnets, validateNoGaps, validateSubnets } from "./vpc";
import { getSubnetSpecsLegacy } from "./subnetDistributorLegacy";
import { validatePartialSubnetSpecs } from "./subnetSpecs";

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
  describe("when no layout specified", () => {
    it.each([16, 17, 18, 19, 20, 21, 22, 23, 24])(
      "/%i AZ creates single private & public with staggered sizes",
      (azCidrMask) => {
        const vpcCidr = `10.0.0.0/${azCidrMask}`;
        const result = getSubnetSpecs("vpcName", vpcCidr, ["us-east-1a"], undefined);

        validatePartialSubnetSpecs(result, (ss) => {
          const x = ss.map((s) => ({ type: s.type, cidrMask: getCidrMask(s.cidrBlock) }));
          expect(x).toMatchObject([
            {
              type: "Private",
              cidrMask: azCidrMask + 1,
            },
            {
              type: "Public",
              cidrMask: azCidrMask + 2,
            },
          ]);
        });
      },
    );
  });

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

          const specs = getSubnetSpecs("vpcName", vpcCidr, azs, subnetSpecs);
          validatePartialSubnetSpecs(specs, (result) => {
            for (const subnet of result) {
              const subnetMask = getCidrMask(subnet.cidrBlock);
              // Larger mask means smaller subnet
              expect(subnetMask).toBeGreaterThan(vpcCidrMask);
            }
          });
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

  describe("default sizes for private, public and isolated subnet", () => {
    it.each([16, 17, 18, 19, 20, 21, 22, 23, 24])(
      "/%i AZ evenly distributes space",
      (azCidrMask) => {
        const vpcCidr = `10.0.0.0/${azCidrMask}`;
        const result = getSubnetSpecs(
          "vpcName",
          vpcCidr,
          ["us-east-1a"],
          [{ type: "Private" }, { type: "Public" }, { type: "Isolated" }],
        );
        validatePartialSubnetSpecs(result, (ss) => {
          const masks = ss.map((s) => ({ type: s.type, cidrMask: getCidrMask(s.cidrBlock) }));
          expect(masks).toMatchObject([
            {
              type: "Private",
              cidrMask: azCidrMask + 2,
            },
            {
              type: "Public",
              cidrMask: azCidrMask + 2,
            },
            {
              type: "Isolated",
              cidrMask: azCidrMask + 2,
            },
          ]);
        });
      },
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

          validatePartialSubnetSpecs(result, (ss) => validateSubnets(ss, getOverlappingSubnets));
        },
      ),
    );
  });
  it("can override az cidr mask", () => {
    const vpcCidr = "10.0.0.0/16";
    const result = getSubnetSpecs("vpcName", vpcCidr, ["us-east-1a"], [{ type: "Public" }], 19);
    expect(result[0].cidrBlock).toBe("10.0.0.0/19"); // Would default to /16 as only a single AZ and single subnet
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
      validatePartialSubnetSpecs(result, (ss) => validateNoGaps(vpcCidr, ss));
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

describe("subnet tags", () => {
  it("should propagate subnet tags for regular subnet layout", () => {
    const tags = { Name: "my-subnet" };
    const result = getSubnetSpecs(
      "vpcName",
      "10.0.0.0/16",
      ["us-east-1a", "us-east-1b"],
      [
        {
          type: "Public",
          tags: { Name: "my-public-subnet" },
        },
        {
          type: "Private",
          tags: { Name: "my-private-subnet" },
        },
      ],
    );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tags: { Name: "my-public-subnet" } }),
        expect.objectContaining({ tags: { Name: "my-private-subnet" } }),
      ]),
    );
  });
  it("should propagate subnet tags for explicit subnet layout", () => {
    const tags = { Name: "my-subnet" };
    const result = getSubnetSpecsExplicit(
      "vpcName",
      ["us-east-1a", "us-east-1b"],
      [
        {
          type: "Public",
          cidrBlocks: ["10.0.0.0/18", "10.0.64.0/19"],
          tags: { Name: "my-public-subnet" },
        },
        {
          type: "Private",
          cidrBlocks: ["10.0.96.0/19", "10.0.128.0/20"],
          tags: { Name: "my-private-subnet" },
        },
      ],
    );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tags: { Name: "my-public-subnet" } }),
        expect.objectContaining({ tags: { Name: "my-private-subnet" } }),
        expect.objectContaining({ tags: { Name: "my-public-subnet" } }),
        expect.objectContaining({ tags: { Name: "my-private-subnet" } }),
      ]),
    );
  });
});

describe("explicit subnet layouts", () => {
  it("should produce specified subnets", () => {
    const result = getSubnetSpecsExplicit(
      "vpcName",
      ["us-east-1a", "us-east-1b"],
      [
        { type: "Public", cidrBlocks: ["10.0.0.0/18", "10.0.64.0/19"] },
        { type: "Private", cidrBlocks: ["10.0.96.0/19", "10.0.128.0/20"] },
      ],
    );
    expect(result).toEqual([
      {
        azName: "us-east-1a",
        cidrBlock: "10.0.0.0/18",
        subnetName: "vpcName-public-1",
        type: "Public",
      },
      {
        azName: "us-east-1a",
        cidrBlock: "10.0.96.0/19",
        subnetName: "vpcName-private-1",
        type: "Private",
      },
      {
        azName: "us-east-1b",
        cidrBlock: "10.0.64.0/19",
        subnetName: "vpcName-public-2",
        type: "Public",
      },
      {
        azName: "us-east-1b",
        cidrBlock: "10.0.128.0/20",
        subnetName: "vpcName-private-2",
        type: "Private",
      },
    ]);
  });
});

describe("merging SubnetSpecs with defaults for Auto strategy", () => {
  it("should add missing default types when user only specifies Public with tags", () => {
    const userSpecs: SubnetSpecInputs[] = [
      { type: "Public", tags: { "kubernetes.io/role/elb": "1" } },
    ];
    const merged = mergeWithDefaultSubnetSpecs(userSpecs);
    expect(merged).toHaveLength(2);
    expect(merged).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "Public", tags: { "kubernetes.io/role/elb": "1" } }),
        expect.objectContaining({ type: "Private" }),
      ]),
    );
  });

  it("should add missing default types when user only specifies Private with tags", () => {
    const userSpecs: SubnetSpecInputs[] = [
      { type: "Private", tags: { "custom-tag": "value" } },
    ];
    const merged = mergeWithDefaultSubnetSpecs(userSpecs);
    expect(merged).toHaveLength(2);
    expect(merged).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "Private", tags: { "custom-tag": "value" } }),
        expect.objectContaining({ type: "Public" }),
      ]),
    );
  });

  it("should not add duplicates when user specifies all default types", () => {
    const userSpecs: SubnetSpecInputs[] = [
      { type: "Public", tags: { "kubernetes.io/role/elb": "1" } },
      { type: "Private", tags: { "custom-tag": "value" } },
    ];
    const merged = mergeWithDefaultSubnetSpecs(userSpecs);
    expect(merged).toHaveLength(2);
    expect(merged).toEqual([
      { type: "Public", tags: { "kubernetes.io/role/elb": "1" } },
      { type: "Private", tags: { "custom-tag": "value" } },
    ]);
  });

  it("should preserve additional non-default types", () => {
    const userSpecs: SubnetSpecInputs[] = [
      { type: "Public", tags: { "kubernetes.io/role/elb": "1" } },
      { type: "Isolated" },
    ];
    const merged = mergeWithDefaultSubnetSpecs(userSpecs);
    expect(merged).toHaveLength(3);
    expect(merged).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "Public", tags: { "kubernetes.io/role/elb": "1" } }),
        expect.objectContaining({ type: "Isolated" }),
        expect.objectContaining({ type: "Private" }),
      ]),
    );
  });

  it("should produce correct subnet specs when used with getSubnetSpecs", () => {
    // User only specifies Public with tags - Private should be auto-added
    const userSpecs: SubnetSpecInputs[] = [
      { type: "Public", tags: { "kubernetes.io/role/elb": "1" } },
    ];
    const merged = mergeWithDefaultSubnetSpecs(userSpecs);
    const result = getSubnetSpecs("vpcName", "10.0.0.0/16", ["us-east-1a", "us-east-1b"], merged);

    validatePartialSubnetSpecs(result, (ss) => {
      // Should have 4 subnets: 2 AZs * 2 types (Public + Private)
      expect(ss).toHaveLength(4);
      const publicSubnets = ss.filter((s) => s.type === "Public");
      const privateSubnets = ss.filter((s) => s.type === "Private");
      expect(publicSubnets).toHaveLength(2);
      expect(privateSubnets).toHaveLength(2);
      // Public subnets should have the user's tags
      for (const pub of publicSubnets) {
        expect(pub.tags).toEqual({ "kubernetes.io/role/elb": "1" });
      }
      // Private subnets should have no extra tags
      for (const priv of privateSubnets) {
        expect(priv.tags).toBeUndefined();
      }
    });
  });
});

describe("valid subnet sizes", () => {
  const sizes = validSubnetSizes;
  expect(sizes.length).toBe(31);
  for (let index = 0; index < sizes.length; index++) {
    const size = sizes[index];
    // Index is also the netmask
    expect(size).toEqual(4294967296 / 2 ** index);
  }
});

describe("validating and normalizing inputs", () => {
  it("detects invalid sizes", () => {
    expect(() => validateAndNormalizeSubnetInputs([{ type: "Public", size: 100 }], 1)).toThrowError(
      "The following subnet sizes are invalid: 100. Valid sizes are: ",
    );
  });
  it("detects mismatched size and netmask", () => {
    expect(() =>
      validateAndNormalizeSubnetInputs([{ type: "Public", size: 4096, cidrMask: 21 }], 1),
    ).toThrowError("Subnet size 4096 does not match the expected size for a /21 subnet (2048).");
  });
  it("allows size only", () => {
    const result = validateAndNormalizeSubnetInputs([{ type: "Public", size: 1024 }], 1);
    expect(result!.normalizedSpecs).toEqual([{ type: "Public", size: 1024, cidrMask: 22 }]);
  });
  it("allows cidrMask only", () => {
    const result = validateAndNormalizeSubnetInputs([{ type: "Public", cidrMask: 23 }], 1);
    expect(result!.normalizedSpecs).toEqual([{ type: "Public", size: 512, cidrMask: 23 }]);
  });
  it("allows cidrMask and size when matching", () => {
    const result = validateAndNormalizeSubnetInputs(
      [{ type: "Public", cidrMask: 24, size: 256 }],
      1,
    );
    expect(result!.normalizedSpecs).toEqual([{ type: "Public", size: 256, cidrMask: 24 }]);
  });
  describe("explicit layouts", () => {
    it("detects block count mismatching AZ count", () => {
      expect(() =>
        validateAndNormalizeSubnetInputs([{ type: "Public", cidrBlocks: ["10.0.0.0/16"] }], 2),
      ).toThrowError(
        "The number of CIDR blocks in subnetSpecs[0] must match the number of availability zones (2).",
      );
    });
    it("detects partially specified blocks", () => {
      expect(() =>
        validateAndNormalizeSubnetInputs(
          [{ type: "Public", cidrBlocks: ["10.0.0.0/16"] }, { type: "Private" }],
          1,
        ),
      ).toThrowError(
        "If any subnet spec has explicit cidrBlocks, all subnets must have explicit cidrBlocks.",
      );
    });
    it("detects cidr blocks with mismatched netmask", () => {
      expect(() =>
        validateAndNormalizeSubnetInputs(
          [{ type: "Public", cidrBlocks: ["10.0.0.0/16"], cidrMask: 17 }],
          1,
        ),
      ).toThrowError(
        "The cidrMask in subnetSpecs[0] must match all cidrBlocks or be left undefined.",
      );
    });
    it("detects cidr blocks with mismatched netmask", () => {
      expect(() =>
        validateAndNormalizeSubnetInputs(
          [{ type: "Public", cidrBlocks: ["10.0.0.0/16"], size: 1024 }],
          1,
        ),
      ).toThrowError("The size in subnetSpecs[0] must match all cidrBlocks or be left undefined.");
    });
    it("allows all argument to be in agreement", () => {
      validateAndNormalizeSubnetInputs(
        [
          {
            type: "Public",
            cidrBlocks: ["10.0.0.0/20", "10.0.16.0/20"],
            size: 4096,
            cidrMask: 20,
          },
          {
            type: "Public",
            cidrBlocks: ["10.0.32.0/21", "10.0.40.0/21"],
            size: 2048,
            cidrMask: 21,
          },
        ],
        2,
      );
    });
  });
});
