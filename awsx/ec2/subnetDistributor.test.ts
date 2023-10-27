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
import { getSubnetSpecs, SubnetSpec } from "./subnetDistributor";

describe("subnet ranges", () => {
  it("should have smaller subnets than the vpc", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 16, max: 27 }), // vpc mask
        fc.integer({ min: 2, max: 4 }), // az count
        fc.integer({ min: 1, max: 4 }), // subnet count
        (vpcMask, azCount, subnetCount) => {
          const vpcCidr = `10.0.0.0/${vpcMask}`;
          const azs: string[] = [];
          for (let index = 0; index < azCount; index++) {
            azs.push("us-east-1" + String.fromCharCode("c".charCodeAt(0) + index));
          }
          const subnetTypes: SubnetTypeInputs[] = ["Private", "Public", "Isolated"];
          const specs: SubnetSpecInputs[] = [];
          for (let index = 0; index < subnetCount; index++) {
            specs.push({ type: subnetTypes[index % 3] });
          }
          const result = getSubnetSpecs("vpcName", vpcCidr, azs, specs);
          for (const subnet of result) {
            const subnetMask = getCidrMask(subnet.cidrBlock);
            // Larger mask means smaller subnet
            expect(subnetMask).toBeGreaterThan(vpcMask);
          }
        },
      ),
    );
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
    const result = getSubnetSpecs(vpcName, vpcCidr, azs);
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

      expect(getSubnetSpecs(vpcName, vpcCidr, azs, inputs)).toEqual(expected);
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

    expect(getSubnetSpecs(vpcName, vpcCidr, azs, inputs)).toEqual(expected);
  });
});
