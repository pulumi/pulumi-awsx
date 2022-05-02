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

import { getOverlappingSubnets } from ".";
import { NatGatewayStrategyInputs, SubnetTypeInputs } from "../schema-types";
import { getSubnetSpecs } from "./subnetDistributor";
import {
    compareSubnetSpecs,
    OverlappingSubnet,
    shouldCreateNatGateway,
    validateEips,
    validateNatGatewayStrategy,
    validateSubnets,
} from "./vpc";

describe("validateEips", () => {
    it("should not throw an exception if NAT Gateway strategy is Single and no EIPs are supplied", () => {
        expect(() => validateEips("Single", [])).not.toThrowError();
    });

    it("should throw an exception if NAT Gateway strategy is None and EIPs are supplied", () => {
        expect(() => validateEips("None", ["abc123"])).toThrowError(
            "cannot be specified",
        );
    });

    it("should throw an exception if NAT Gateway strategy is Single and more than 1 EIP is supplied", () => {
        expect(() => validateEips("Single", ["abc123", "def456"])).toThrowError(
            "Exactly one",
        );
    });

    it("should throw an exception if NAT Gateway strategy is OnePerAz and too few EIPs are supplied", () => {
        expect(() =>
            validateEips(
                "OnePerAz",
                ["abc123", "def456"],
                ["us-east-1a", "us-east-1b", "us-east-1c"],
            ),
        ).toThrowError("must match the number");
    });

    it("should throw an exception if NAT Gateway strategy is OnePerAz and too many EIPs are supplied", () => {
        expect(() =>
            validateEips(
                "OnePerAz",
                ["abc123", "def456", "ghi789"],
                ["us-east-1a", "us-east-1b"],
            ),
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
            expect(() =>
                validateNatGatewayStrategy(strategy, specs),
            ).toThrowError(expectedMessage);
        } else {
            expect(() =>
                validateNatGatewayStrategy(strategy, specs),
            ).not.toThrowError();
        }
    };

    describe.each<NatGatewayStrategyInputs>(["OnePerAz", "Single"])(
        "strategy is OnePerAz or Single",
        (strategy: NatGatewayStrategyInputs) => {
            it("should succeed if there's public and private subnets", () =>
                runTest(strategy, ["Public", "Private"], false));

            it("should throw an exception if there are only isolated subnets", () =>
                runTest(
                    strategy,
                    ["Isolated"],
                    true,
                    "both private and public subnets",
                ));

            it("should throw an exception if there are only private subnets", () =>
                runTest(
                    strategy,
                    ["Private"],
                    true,
                    "both private and public subnets",
                ));

            it("should throw an exception if there are only public subnets", () =>
                runTest(
                    strategy,
                    ["Public"],
                    true,
                    "both private and public subnets",
                ));
        },
    );

    describe("strategy is None", () => {
        it("should throw an exception if any private subnets are specified", () =>
            runTest("None", ["Private"], true, "cannot be 'None'"));

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
        expect(getOverlappingSubnets([subnet1, subnet1a])).toEqual([
            subnet1,
            subnet1a,
        ]);
    });

    it("should return all subnets that overlap with each other in a deterministic order when give 5 subnets", () => {
        expect(
            getOverlappingSubnets([
                subnet1,
                subnet2,
                subnet3,
                subnet1a,
                subnet2a,
            ]),
        ).toEqual([subnet1, subnet2, subnet1a, subnet2a]);

        expect(
            getOverlappingSubnets([
                subnet3,
                subnet2a,
                subnet1,
                subnet1a,
                subnet2,
            ]),
        ).toEqual([subnet2a, subnet1, subnet1a, subnet2]);
    });

    // This is technically an integration test, but it's probably better to just call getSubnetSpecs than it is to restate the default subnet specs as a literal:
    it("should return no overlapping subnets for the default subnet specs for this component", () => {
        const defaultSpecs = getSubnetSpecs("dummy", "10.0.0.0/16", [
            "us-east-1a",
            "us-east-1b",
            "us-east-1c",
        ]);
        expect(getOverlappingSubnets(defaultSpecs)).toEqual([]);
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
