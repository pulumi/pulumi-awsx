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

import { validateNatGatewayStrategy } from "./vpc";

describe("validateNatGatewayStrategy", () => {
    it("should throw an exception if NAT Gateway strategy is None and EIPs are supplied", () => {
        expect(() => validateNatGatewayStrategy("None", ["abc123"]))
            .toThrowError("cannot be specified");
    });

    it("should throw an exception if NAT Gateway strategy is Single and more than 1 EIP is supplied", () => {
        expect(() => validateNatGatewayStrategy("Single", ["abc123", "def456"]))
            .toThrowError("Exactly one");
    });

    it("should throw an exception if NAT Gateway strategy is OnePerAz and too few EIPs are supplied", () => {
        expect(() => validateNatGatewayStrategy("OnePerAz", ["abc123", "def456"], ["us-east-1a", "us-east-1b", "us-east-1c"]))
            .toThrowError("must match the number");
    });

    it("should throw an exception if NAT Gateway strategy is OnePerAz and too many EIPs are supplied", () => {
        expect(() => validateNatGatewayStrategy("OnePerAz", ["abc123", "def456", "ghi789"], ["us-east-1a", "us-east-1b"]))
            .toThrowError("must match the number");
    });
});
