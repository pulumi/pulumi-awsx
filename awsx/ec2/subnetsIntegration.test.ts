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

import { SubnetSpecInputs } from "../schema-types";
import { getSubnetSpecs } from "./subnetDistributor";
import { getOverlappingSubnets } from "./vpc";

describe("subnet creation integration tests", () => {
  it("should return no overlapping subnets for the default subnet specs for this component", () => {
    const defaultSpecs = getSubnetSpecs("dummy", "10.0.0.0/16", [
      "us-east-1a",
      "us-east-1b",
      "us-east-1c",
    ]);
    expect(getOverlappingSubnets(defaultSpecs)).toEqual([]);
  });

  // TODO: Consider moving these back to unit tests since they are simple enough to make assertions on:
  it("should return no overlapping subnets 2 public subnets per AZ", () => {
    const inputs: SubnetSpecInputs[] = [
      {
        type: "Public",
        cidrMask: 22,
      },
      {
        type: "Public",
        cidrMask: 22,
      },
    ];

    const subnetSpecs = getSubnetSpecs(
      "dummy",
      "10.0.0.0/16",
      ["us-east-1a", "us-east-1b", "us-east-1c"],
      inputs,
    );

    expect(getOverlappingSubnets(subnetSpecs)).toEqual([]);
  });

  it("should return default cidrMasksFor Subnet Types", () => {
    const inputs: SubnetSpecInputs[] = [
      {
        type: "Public",
      },
      {
        type: "Private",
      },
      {
        type: "Isolated",
      },
    ];

    const subnetSpecs = getSubnetSpecs(
      "dummy",
      "10.0.0.0/16",
      ["us-east-1a", "us-east-1b", "us-east-1c"],
      inputs,
    );

    console.log(JSON.stringify(subnetSpecs));

    expect(getOverlappingSubnets(subnetSpecs)).toEqual([]);
  });

  it("should return no overlapping subnets 2 private subnets per AZ", () => {
    const inputs: SubnetSpecInputs[] = [
      {
        type: "Private",
        cidrMask: 22,
      },
      {
        type: "Private",
        cidrMask: 22,
      },
    ];

    const subnetSpecs = getSubnetSpecs(
      "dummy",
      "10.0.0.0/16",
      ["us-east-1a", "us-east-1b", "us-east-1c"],
      inputs,
    );

    expect(getOverlappingSubnets(subnetSpecs)).toEqual([]);
  });

  it("should return no overlapping subnets 2 isolated subnets per AZ", () => {
    const inputs: SubnetSpecInputs[] = [
      {
        type: "Isolated",
        cidrMask: 22,
      },
      {
        type: "Isolated",
        cidrMask: 22,
      },
    ];

    const subnetSpecs = getSubnetSpecs(
      "dummy",
      "10.0.0.0/16",
      ["us-east-1a", "us-east-1b", "us-east-1c"],
      inputs,
    );

    expect(getOverlappingSubnets(subnetSpecs)).toEqual([]);
  });

  it("should return no overlapping subnets with 2 privates and 1 public per AZ", () => {
    const inputs: SubnetSpecInputs[] = [
      {
        type: "Private",
        cidrMask: 22,
      },
      {
        type: "Private",
        cidrMask: 22,
      },
      {
        type: "Public",
        cidrMask: 21,
      },
    ];

    const subnetSpecs = getSubnetSpecs(
      "dummy",
      "10.0.0.0/16",
      ["us-east-1a", "us-east-1b", "us-east-1c"],
      inputs,
    );

    expect(getOverlappingSubnets(subnetSpecs)).toEqual([]);
  });

  it("should return no overlapping subnets with 2 publics and 1 isolated per AZ", () => {
    const inputs: SubnetSpecInputs[] = [
      {
        type: "Public",
        cidrMask: 22,
      },
      {
        type: "Public",
        cidrMask: 22,
      },
      {
        type: "Isolated",
        cidrMask: 21,
      },
    ];

    const subnetSpecs = getSubnetSpecs(
      "dummy",
      "10.0.0.0/16",
      ["us-east-1a", "us-east-1b", "us-east-1c"],
      inputs,
    );

    expect(getOverlappingSubnets(subnetSpecs)).toEqual([]);
  });

  it("should return no overlapping subnets with 2 of each type per AZ", () => {
    const inputs: SubnetSpecInputs[] = [
      {
        type: "Public",
        cidrMask: 24,
      },
      {
        type: "Public",
        cidrMask: 24,
      },
      {
        type: "Private",
        cidrMask: 24,
      },
      {
        type: "Private",
        cidrMask: 24,
      },
      {
        type: "Isolated",
        cidrMask: 24,
      },
      {
        type: "Isolated",
        cidrMask: 24,
      },
    ];

    const subnetSpecs = getSubnetSpecs(
      "dummy",
      "10.0.0.0/16",
      ["us-east-1a", "us-east-1b", "us-east-1c"],
      inputs,
    );

    expect(getOverlappingSubnets(subnetSpecs)).toEqual([]);
  });
});
