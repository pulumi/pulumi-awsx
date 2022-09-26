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

import { SubnetTypeInputs } from "../schema-types";
import { getSubnetSpecs, SubnetSpec } from "./subnetDistributor";

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
        subnetName: "vpcname-private-1a",
      },
      {
        type: "Private",
        cidrBlock: "10.0.64.0/19",
        azName: "us-east-1b",
        subnetName: "vpcname-private-1b",
      },
      {
        type: "Private",
        cidrBlock: "10.0.128.0/19",
        azName: "us-east-1c",
        subnetName: "vpcname-private-1c",
      },
      {
        type: "Public",
        cidrBlock: "10.0.32.0/20",
        azName: "us-east-1a",
        subnetName: "vpcname-public-1a",
      },
      {
        type: "Public",
        cidrBlock: "10.0.96.0/20",
        azName: "us-east-1b",
        subnetName: "vpcname-public-1b",
      },
      {
        type: "Public",
        cidrBlock: "10.0.160.0/20",
        azName: "us-east-1c",
        subnetName: "vpcname-public-1c",
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
          subnetName: "vpcname-foo-1a",
          tags: {
            Name: "test",
            Owner: "user1",
          },
        },
        {
          type: type,
          cidrBlock: "10.0.64.0/19",
          azName: "us-east-1b",
          subnetName: "vpcname-foo-1b",
          tags: {
            Name: "test",
            Owner: "user1",
          },
        },
        {
          type: type,
          cidrBlock: "10.0.128.0/19",
          azName: "us-east-1c",
          subnetName: "vpcname-foo-1c",
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
        subnetName: "vpcname-foo-1a",
      },
      {
        type: slash20Type,
        cidrBlock: "10.0.32.0/20",
        azName: "us-east-1a",
        subnetName: "vpcname-bar-1a",
      },
      {
        type: slash19Type,
        cidrBlock: "10.0.64.0/19",
        azName: "us-east-1b",
        subnetName: "vpcname-foo-1b",
      },
      {
        type: slash20Type,
        cidrBlock: "10.0.96.0/20",
        azName: "us-east-1b",
        subnetName: "vpcname-bar-1b",
      },
      {
        type: slash19Type,
        cidrBlock: "10.0.128.0/19",
        azName: "us-east-1c",
        subnetName: "vpcname-foo-1c",
      },
      {
        type: slash20Type,
        cidrBlock: "10.0.160.0/20",
        azName: "us-east-1c",
        subnetName: "vpcname-bar-1c",
      },
    ];

    expect(getSubnetSpecs(vpcName, vpcCidr, azs, inputs)).toEqual(expected);
  });
});
