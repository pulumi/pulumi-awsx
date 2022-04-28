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

import { NatGatewayStrategyInputs, SubnetTypeInputs } from "../schema-types";
import {
    compareSubnetSpecs,
    shouldCreateNatGateway,
    validateEips,
    validateNatGatewayStrategy,
} from "./vpc";

describe("validateEips", () => {
    it("should throw an exception if NAT Gateway strategy is None and EIPs are supplied", () => {
        expect(() => validateEips("None", ["abc123"]))
            .toThrowError("cannot be specified");
    });

    it("should throw an exception if NAT Gateway strategy is Single and more than 1 EIP is supplied", () => {
        expect(() => validateEips("Single", ["abc123", "def456"]))
            .toThrowError("Exactly one");
    });

    it("should throw an exception if NAT Gateway strategy is OnePerAz and too few EIPs are supplied", () => {
        expect(() => validateEips("OnePerAz", ["abc123", "def456"], ["us-east-1a", "us-east-1b", "us-east-1c"]))
            .toThrowError("must match the number");
    });

    it("should throw an exception if NAT Gateway strategy is OnePerAz and too many EIPs are supplied", () => {
        expect(() => validateEips("OnePerAz", ["abc123", "def456", "ghi789"], ["us-east-1a", "us-east-1b"]))
            .toThrowError("must match the number");
    });
});

describe("validateNatGatewayStrategy", () => {
    const runTest = (
        strategy: NatGatewayStrategyInputs,
        inputs: SubnetTypeInputs[], expectException: boolean,
        expectedMessage?: string,
    ) => {
        const specs = inputs.map(x => {
            return {
                type: x,
                subnetName: "dummy",
                cidrBlock: "dummy",
                azName: "us-dummy-1a",
            };
        });

        if (expectException) {
            expect(() => validateNatGatewayStrategy(strategy, specs))
                .toThrowError(expectedMessage);
        } else {
            expect(() => validateNatGatewayStrategy(strategy, specs))
                .not.toThrowError();
        }
    };

    describe
        .each<NatGatewayStrategyInputs>([
            "OnePerAz",
            "Single",
        ])("strategy is OnePerAz or Single", (strategy: NatGatewayStrategyInputs) => {
            it("should succeed if there's public and private subnets",
                () => runTest(strategy, ["Public", "Private"], false));

            it("should throw an exception if there are only isolated subnets",
                () => runTest(strategy, ["Isolated"], true, "both private and public subnets"));

            it("should throw an exception if there are only private subnets",
                () => runTest(strategy, ["Private"], true, "both private and public subnets"));

            it("should throw an exception if there are only public subnets",
                () => runTest(strategy, ["Public"], true, "both private and public subnets"));
        });

    describe("strategy is None", () => {
        it("should throw an exception if any private subnets are specified",
            () => runTest("None", ["Private"], true, "cannot be 'None'"));

        it("should succeed if only public and isolated subnets are specified",
            () => runTest("None", ["Public", "Isolated"], false));
    });
});

describe("shouldCreateNatGateway", () => {
    describe
        .each([
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
                const result = shouldCreateNatGateway(strategy as NatGatewayStrategyInputs, numGateways, azIndex);
                expect(result).toBe(expected);
            });
});

describe("compareSubnetSpecs", () => {
    describe
        .each([
            { input: ["Private", "Public"], expected: ["Public", "Private"] },
            { input: ["Isolated", "Public"], expected: ["Public", "Isolated"] },
            { input: ["Private", "Public", "Public"], expected: ["Public", "Public", "Private"] },
            { input: ["Isolated", "Public", "Private"], expected: ["Public", "Private", "Isolated"] },
            { input: ["Private", "Public", "Public"], expected: ["Public", "Public", "Private"] },
        ])("should sort Public first, then Private, then Isolated", (data) => {
            const specs = data.input.map(x => {
                return {
                    type: x as SubnetTypeInputs,
                    azName: "dummy",
                    subnetName: "dummy",
                    cidrBlock: "dummy",
                };
            });

            const result = specs.sort(compareSubnetSpecs).map(x => x.type);

            expect(result).toEqual(data.expected.map(x => x as SubnetTypeInputs));
        });
});
