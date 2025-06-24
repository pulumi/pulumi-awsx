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
import { getOverlappingSubnets } from ".";
import {
  NatGatewayStrategyInputs,
  SubnetTypeInputs,
  SubnetAllocationStrategyInputs,
} from "../schema-types";
import { getSubnetSpecsLegacy } from "./subnetDistributorLegacy";
import {
  compareSubnetSpecs,
  findSubnetGap,
  OverlappingSubnet,
  shouldCreateNatGateway,
  validateEips,
  validateNatGatewayStrategy,
  validateSubnets,
  Vpc,
} from "./vpc";
import { Netmask, long2ip, ip2long } from "netmask";
import * as runtime from "@pulumi/pulumi/runtime";
import * as pulumiAws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

describe("validateEips", () => {
  it("should not throw an exception if NAT Gateway strategy is Single and no EIPs are supplied", () => {
    expect(() => validateEips("Single", [])).not.toThrowError();
  });

  it("should throw an exception if NAT Gateway strategy is None and EIPs are supplied", () => {
    expect(() => validateEips("None", ["abc123"])).toThrowError("cannot be specified");
  });

  it("should throw an exception if NAT Gateway strategy is Single and more than 1 EIP is supplied", () => {
    expect(() => validateEips("Single", ["abc123", "def456"])).toThrowError("Exactly one");
  });

  it("should throw an exception if NAT Gateway strategy is OnePerAz and too few EIPs are supplied", () => {
    expect(() =>
      validateEips("OnePerAz", ["abc123", "def456"], ["us-east-1a", "us-east-1b", "us-east-1c"]),
    ).toThrowError("must match the number");
  });

  it("should throw an exception if NAT Gateway strategy is OnePerAz and too many EIPs are supplied", () => {
    expect(() =>
      validateEips("OnePerAz", ["abc123", "def456", "ghi789"], ["us-east-1a", "us-east-1b"]),
    ).toThrowError("must match the number");
  });
});

describe("validateNatGatewayStrategy", () => {
  const runTest = (
    strategy: NatGatewayStrategyInputs,
    inputs: SubnetTypeInputs[],
    expectException: boolean,
    expectedMessage?: string,
  ) => {
    const specs = inputs.map((x) => {
      return {
        type: x,
        subnetName: "dummy",
        cidrBlock: "dummy",
        azName: "us-dummy-1a",
      };
    });

    if (expectException) {
      expect(() => validateNatGatewayStrategy(strategy, specs)).toThrowError(expectedMessage);
    } else {
      expect(() => validateNatGatewayStrategy(strategy, specs)).not.toThrowError();
    }
  };

  describe.each<NatGatewayStrategyInputs>(["OnePerAz", "Single"])(
    "strategy is OnePerAz or Single",
    (strategy: NatGatewayStrategyInputs) => {
      it("should succeed if there's public and private subnets", () =>
        runTest(strategy, ["Public", "Private"], false));

      it("should throw an exception if there are only isolated subnets", () =>
        runTest(strategy, ["Isolated"], true, "both private and public subnets"));

      it("should throw an exception if there are only private subnets", () =>
        runTest(strategy, ["Private"], true, "both private and public subnets"));

      it("should throw an exception if there are only public subnets", () =>
        runTest(strategy, ["Public"], true, "both private and public subnets"));
    },
  );

  describe("strategy is None", () => {
    // We cannot throw an exception in this case because egress for the private
    // subnets may be accomplished by methods other than a NAT gateway. Examples
    // include: NAT instances and centralized egress via TGW in a hub-and-spoke
    // architecture.
    it("should not throw an exception if any private subnets are specified", () =>
      runTest("None", ["Private"], false));

    it("should succeed if only public and isolated subnets are specified", () =>
      runTest("None", ["Public", "Isolated"], false));
  });
});

describe("shouldCreateNatGateway", () => {
  describe.each([
    { strategy: "OnePerAz", numGateways: 0, azIndex: 0, expected: true },
    { strategy: "OnePerAz", numGateways: 1, azIndex: 0, expected: false },
    { strategy: "OnePerAz", numGateways: 1, azIndex: 1, expected: true },
    { strategy: "OnePerAz", numGateways: 2, azIndex: 1, expected: false },
    { strategy: "Single", numGateways: 0, azIndex: 0, expected: true },
    { strategy: "Single", numGateways: 1, azIndex: 0, expected: false },
    { strategy: "Single", numGateways: 1, azIndex: 1, expected: false },
    { strategy: "None", numGateways: 0, azIndex: 0, expected: false },
  ])(
    "based off strategy, number of NAT Gateways already created, and the current AZ index",
    ({ strategy, numGateways, azIndex, expected }) => {
      const result = shouldCreateNatGateway(
        strategy as NatGatewayStrategyInputs,
        numGateways,
        azIndex,
      );
      expect(result).toBe(expected);
    },
  );
});

describe("compareSubnetSpecs", () => {
  describe.each([
    { input: ["Private", "Public"], expected: ["Public", "Private"] },
    { input: ["Isolated", "Public"], expected: ["Public", "Isolated"] },
    {
      input: ["Private", "Public", "Public"],
      expected: ["Public", "Public", "Private"],
    },
    {
      input: ["Isolated", "Public", "Private"],
      expected: ["Public", "Private", "Isolated"],
    },
    {
      input: ["Private", "Public", "Public"],
      expected: ["Public", "Public", "Private"],
    },
  ])("should sort Public first, then Private, then Isolated", (data) => {
    const specs = data.input.map((x) => {
      return {
        type: x as SubnetTypeInputs,
        azName: "dummy",
        subnetName: "dummy",
        cidrBlock: "dummy",
      };
    });

    const result = specs.sort(compareSubnetSpecs).map((x) => x.type);

    expect(result).toEqual(data.expected.map((x) => x as SubnetTypeInputs));
  });
});

describe("getOverlappingSubnets", () => {
  const subnet1 = {
    cidrBlock: "10.0.0.0/16",
    subnetName: "subnet1",
  };

  // Named thus because it's contained in subnet1:
  const subnet1a = {
    cidrBlock: "10.0.0.0/24",
    subnetName: "subnet1",
  };

  const subnet2 = {
    cidrBlock: "10.1.0.0/16",
    subnetName: "subnet2",
  };

  const subnet2a = {
    cidrBlock: "10.1.0.0/20",
    subnetName: "subnet2",
  };

  const subnet3 = {
    cidrBlock: "10.2.0.0/16",
    subnetName: "subnet2",
  };

  it("should return nothing for subnets that do not overlap", () => {
    expect(getOverlappingSubnets([subnet1, subnet2])).toEqual([]);
  });

  it("should return both subnets if they overlap", () => {
    expect(getOverlappingSubnets([subnet1, subnet1a])).toEqual([subnet1, subnet1a]);
  });

  it("should return all subnets that overlap with each other in a deterministic order when give 5 subnets", () => {
    expect(getOverlappingSubnets([subnet1, subnet2, subnet3, subnet1a, subnet2a])).toEqual([
      subnet1,
      subnet2,
      subnet1a,
      subnet2a,
    ]);

    expect(getOverlappingSubnets([subnet3, subnet2a, subnet1, subnet1a, subnet2])).toEqual([
      subnet2a,
      subnet1,
      subnet1a,
      subnet2,
    ]);
  });
});

describe("validateSubnets", () => {
  it("should not throw an error no overlapping subnets are returned", () => {
    const subnets = [
      {
        type: "Public" as SubnetTypeInputs,
        cidrBlock: "10.0.0.0/16",
        subnetName: "subnet1",
        azName: "us-east-1a",
      },
      {
        type: "Private" as SubnetTypeInputs,
        cidrBlock: "10.0.1.0/16",
        subnetName: "subnet2",
        azName: "us-east-1a",
      },
    ];

    const mockFunc = (input: OverlappingSubnet[]) => {
      return [];
    };

    expect(() => validateSubnets(subnets, mockFunc)).not.toThrow();
  });

  it("should have a detailed error when overlapping subnets are returned", () => {
    const subnets = [
      {
        type: "Public" as SubnetTypeInputs,
        cidrBlock: "10.0.0.0/16",
        subnetName: "subnet1",
        azName: "us-east-1a",
      },
      {
        type: "Private" as SubnetTypeInputs,
        cidrBlock: "10.0.0.0/24",
        subnetName: "subnet2",
        azName: "us-east-1a",
      },
    ];

    const mockFunc = (input: OverlappingSubnet[]) => {
      return subnets;
    };

    // TODO: Change this assertion from a literal string to a regex with set of words, all of which must match:
    const msg =
      "The following subnets overlap with at least one other subnet. Make the CIDR for the VPC larger, reduce the size of the subnets per AZ, or use less Availability Zones:\n\n" +
      "1. subnet1: 10.0.0.0/16\n" +
      "2. subnet2: 10.0.0.0/24\n";

    expect(() => validateSubnets(subnets, mockFunc)).toThrow(msg);
  });
});

describe("finding subnet gaps", () => {
  it("comparison between any subnets", () => {
    const vpcSpace = new Netmask("10.0.0.0", 7);
    const minIpLong = ip2long(vpcSpace.first);
    const maxIpLong = ip2long(vpcSpace.last);
    fc.assert(
      fc.property(
        fc.record({
          fromIpLong: fc.integer({ min: minIpLong, max: maxIpLong }),
          fromCidrMask: fc.integer({ min: 8, max: 32 }),
          toIpLong: fc.integer({ min: minIpLong, max: maxIpLong }),
          toCidrMask: fc.integer({ min: 8, max: 32 }),
        }),
        ({ fromIpLong: fromIp, fromCidrMask, toIpLong: toIp, toCidrMask }) => {
          const from = new Netmask(long2ip(fromIp), fromCidrMask);
          const to = new Netmask(long2ip(toIp), toCidrMask);
          const gap = findSubnetGap(from, to);
          expect(gap.length).toBeGreaterThanOrEqual(0);
          expect(gap.length).toBeLessThan(32);
        },
      ),
    );
  });
});

describe("picking subnet allocator", () => {
  it("picks legacy allocator for the legacy strategy", () => {
    const a = Vpc.pickSubnetAllocator(undefined, "Legacy");
    expect(a.allocator).toBe("LegacyAllocator");
  });

  it("picks NewAllocator for the auto strategy with no specs", () => {
    const a = Vpc.pickSubnetAllocator(undefined, "Auto");
    expect(a.allocator).toBe("NewAllocator");
  });

  // This behavior looks like a degenerate case perhaps marking the strategy as invalid and failing could be preferable.
  it("picks legacy allocator for the exact strategy with no specs", () => {
    const a = Vpc.pickSubnetAllocator(undefined, "Exact");
    expect(a.allocator).toBe("LegacyAllocator");
  });

  it("picks explicit allocator for explicit layout unless legacy is asked for", () => {
    const f = (strat: SubnetAllocationStrategyInputs) =>
      Vpc.pickSubnetAllocator(
        {
          normalizedSpecs: [{ type: "Private", cidrBlocks: ["10.2.0.0/16"] }],
          isExplicitLayout: true,
        },
        strat,
      ).allocator;
    expect(f("Legacy")).toBe("LegacyAllocator");
    expect(f("Auto")).toBe("ExplicitAllocator");
    expect(f("Exact")).toBe("ExplicitAllocator");
  });

  it("picks new allocator for non-explicit layout unless legacy is asked for", () => {
    const f = (strat: SubnetAllocationStrategyInputs) =>
      Vpc.pickSubnetAllocator(
        {
          normalizedSpecs: [{ type: "Private" }],
          isExplicitLayout: false,
        },
        strat,
      ).allocator;
    expect(f("Legacy")).toBe("LegacyAllocator");
    expect(f("Auto")).toBe("NewAllocator");
    expect(f("Exact")).toBe("NewAllocator"); // this case is a bit suspect
  });
});

describe("validating vpc args", () => {
  it("permits ipv4IpamPoolId with cidrBlock", () => {
    Vpc.validateVpcArgs({ ipv4IpamPoolId: "pool", cidrBlock: "10.0.0.0/16" });
  });
  it("permits ipv4IpamPoolId with mask", () => {
    Vpc.validateVpcArgs({ ipv4IpamPoolId: "pool", ipv4NetmaskLength: 24 });
  });
  it("rejects ipv4IpamPoolId without mask or cidrBlock", () => {
    expect(() => Vpc.validateVpcArgs({ ipv4IpamPoolId: "pool" })).toThrowError();
  });
  it("rejects ipv4IpamPoolId with both mask and cidrBlock", () => {
    expect(() =>
      Vpc.validateVpcArgs({
        ipv4IpamPoolId: "pool",
        cidrBlock: "10.0.0.0/24",
        ipv4NetmaskLength: 24,
      }),
    ).toThrowError();
  });
});

describe("child resource api", () => {
  function unwrap<T>(x: pulumi.Output<T> | T): Promise<T> {
    return new Promise((resolve) => (pulumi.Output.isInstance(x) ? x.apply(resolve) : resolve(x)));
  }

  beforeAll(async () => {
    await runtime.setMocks({
      call(args) {
        switch (args.token) {
          case "aws:index/getAvailabilityZones:getAvailabilityZones":
            const result: pulumiAws.GetAvailabilityZonesResult = {
              id: "mocked-az-result",
              zoneIds: [1, 2, 3].map((i) => `${pulumiAws.Region.USEast1}${i}`),
              names: [1, 2, 3].map((i) => `${pulumiAws.Region.USEast1}${i}`),
              groupNames: [1, 2, 3].map((i) => `${pulumiAws.Region.USEast1}${i}`),
              region: pulumiAws.Region.USEast1,
            };
            return result;
          default:
            throw new Error(`Mock not implemented: ${args.token}`);
        }
      },
      newResource(args) {
        return {
          id: `mocked::${args.type}::${args.name}-id`,
          state: args.inputs,
        };
      },
    });
  });

  let vpc: Vpc;
  beforeEach(() => {
    vpc = new Vpc("test", {
      tags: {
        share1: "parent",
        share2: "parent",
      },
      vpcEndpointSpecs: [{ serviceName: "test", tags: { share2: "override" } }],
      subnetStrategy: "Auto",
      subnetSpecs: [
        { type: "Public", tags: { share2: "override" } },
        { type: "Private", tags: { share2: "override" } },
      ],
    });
  });

  it("internetGateway", async () => {
    const igw = await unwrap(vpc.internetGateway);
    const igwTags = await unwrap(igw.tags);
    expect(igwTags?.share1).toBe("parent");
    expect(igwTags?.share2).toBe("parent");
  });

  it("natGateway", async () => {
    const ngs = await unwrap(vpc.natGateways);
    expect(ngs).toHaveLength(3);
    for (const ng of ngs) {
      const ngTags = await unwrap(ng.tags);
      expect(ngTags?.share1).toBe("parent");
      expect(ngTags?.share2).toBe("parent");
    }
  });

  it("vpcEndpoints", async () => {
    const endpoints = await unwrap(vpc.vpcEndpoints);
    expect(endpoints).toHaveLength(1);
    for (const endpoint of endpoints) {
      const tags = await unwrap(endpoint.tags);
      expect(tags?.share1).toBe("parent");
      expect(tags?.share2).toBe("override");
    }
  });

  it("subnets", async () => {
    const subnets = await unwrap(vpc.subnets);
    expect(subnets).toHaveLength(6);
    for (const subnet of subnets) {
      const tags = await unwrap(subnet.tags);
      expect(tags?.share1).toBe("parent");
      expect(tags?.share2).toBe("override");
    }
  });

  it("eips", async () => {
    const eips = await unwrap(vpc.eips);
    expect(eips).toHaveLength(3);
    for (const eip of eips) {
      const tags = await unwrap(eip.tags);
      expect(tags?.share1).toBe("parent");
      expect(tags?.share2).toBe("parent");
    }
  });

  it("routeTables", async () => {
    const routeTables = await unwrap(vpc.routeTables);
    expect(routeTables).toHaveLength(6);
    for (const routeTable of routeTables) {
      const tags = await unwrap(routeTable.tags);
      expect(tags?.share1).toBe("parent");
      expect(tags?.share2).toBe("parent");
    }
  });
});
