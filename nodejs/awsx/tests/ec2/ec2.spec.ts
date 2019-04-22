// Copyright 2016-2018, Pulumi Corporation.
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

import * as pulumi from "@pulumi/pulumi";
import { permutation } from "js-combinatorics";

pulumi.runtime.setConfig("aws:region", "us-east-2");

import * as assert from "assert";

import { Cidr32Block } from "../../ec2/cidr";
import { VpcSubnetArgs } from "../../ec2/vpc";
import { VpcTopology } from "../../ec2/vpcTopology";

function topologyToJson(cidr: string, numberOfAvailabilityZones: number, subnets: VpcSubnetArgs[]) {
    return JSON.stringify(
        new VpcTopology("testing", cidr, numberOfAvailabilityZones).createSubnets(subnets), null, 4);
}

describe("cidr", () => {
    it("throws without /", () => {
        assert.throws(() => {
            Cidr32Block.fromCidrNotation("10.0.0.0");
        });
    });

    it("throws without enough portions", () => {
        assert.throws(() => {
            Cidr32Block.fromCidrNotation("10.0.0/16");
        });
    });

    it("throws with too many portions", () => {
        assert.throws(() => {
            Cidr32Block.fromCidrNotation("10.0.0.0.0/16");
        });
    });

    it("throws with invalid octet", () => {
        assert.throws(() => {
            Cidr32Block.fromCidrNotation("10.0.0.256/16");
        });
    });

    it("roundtrip", () => {
        assert.equal(Cidr32Block.fromCidrNotation("10.0.0.0/16").toString(), "10.0.0.0/16");
    });

    it("permutations", () => {
        // Try a lot of interesting permutations of values
        const values = [0, 1, 10, 127, 128, 200, 255];
        for (const arr of permutation(values, 4).toArray()) {
            for (let i = 0; i <= 32; i++) {
                assert.doesNotThrow(() => {
                    Cidr32Block.fromCidrNotation(`${arr.join(".")}/${i}`);
                });
            }
        }
    });

    describe("start/end", () => {
        it("0", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/0");
            assert.throws(() => cidr.nextBlock().toString());
        });

        it("1", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/1");
            assert.throws(() => cidr.nextBlock().toString());
        });

        it("4", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/4");
            assert.equal(cidr.nextBlock().toString(), "16.0.0.0/4");
        });

        it("5", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/5");
            assert.equal(cidr.nextBlock().toString(), "16.0.0.0/5");
        });

        it("6", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/6");
            assert.equal(cidr.nextBlock().toString(), "12.0.0.0/6");
        });

        it("8", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/8");
            assert.equal(cidr.nextBlock().toString(), "11.0.0.0/8");
        });

        it("12", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/12");
            assert.equal(cidr.nextBlock().toString(), "10.16.0.0/12");
        });

        it("16", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/16");
            assert.equal(cidr.nextBlock().toString(), "10.1.0.0/16");
        });

        it("20", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/20");
            assert.equal(cidr.nextBlock().toString(), "10.0.16.0/20");
        });

        it("21", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/21");
            assert.equal(cidr.nextBlock().toString(), "10.0.8.0/21");
        });

        it("30", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/30");
            assert.equal(cidr.nextBlock().toString(), "10.0.0.4/30");
        });

        it("31", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/31");
            assert.equal(cidr.nextBlock().toString(), "10.0.0.2/31");
        });

        it("32", () => {
            const cidr = Cidr32Block.fromCidrNotation("10.0.0.0/32");
            assert.equal(cidr.nextBlock().toString(), "10.0.0.1/32");
        });
    });
});

describe("topology", () => {
    describe("default", () => {
        it("1 AZ", () => {
            assert.equal(topologyToJson("10.0.0.0/16", 1, [
                { type: "public" },
                { type: "private" },
            ]), `[
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": 0,
        "cidrBlock": "10.0.0.0/17"
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": 0,
        "cidrBlock": "10.0.128.0/17"
    }
]`);
        });

        it("2 AZs", () => {
            assert.equal(topologyToJson("10.0.0.0/16", 2, [
                { type: "public" },
                { type: "private" },
            ]), `[
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": 0,
        "cidrBlock": "10.0.0.0/18"
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        "availabilityZone": 1,
        "cidrBlock": "10.0.64.0/18"
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": 0,
        "cidrBlock": "10.0.128.0/18"
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        "availabilityZone": 1,
        "cidrBlock": "10.0.192.0/18"
    }
]`);
        });

        it("3 AZs", () => {
            assert.equal(topologyToJson("10.0.0.0/16", 3, [
                { type: "public" },
                { type: "private" },
            ]), `[
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": 0,
        "cidrBlock": "10.0.0.0/19"
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        "availabilityZone": 1,
        "cidrBlock": "10.0.32.0/19"
    },
    {
        "type": "public",
        "subnetName": "testing-public-2",
        "availabilityZone": 2,
        "cidrBlock": "10.0.64.0/19"
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": 0,
        "cidrBlock": "10.0.96.0/19"
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        "availabilityZone": 1,
        "cidrBlock": "10.0.128.0/19"
    },
    {
        "type": "private",
        "subnetName": "testing-private-2",
        "availabilityZone": 2,
        "cidrBlock": "10.0.160.0/19"
    }
]`);
        });
    });

    describe("custom cidr", () => {
        it("custom 1", () => {
            assert.equal(topologyToJson("10.10.0.0/16", 2, [
                { type: "public", cidrMask: 24 },
                { type: "private", cidrMask: 28 },
            ]), `[
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": 0,
        "cidrBlock": "10.10.0.0/24"
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        "availabilityZone": 1,
        "cidrBlock": "10.10.1.0/24"
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": 0,
        "cidrBlock": "10.10.2.0/28"
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        "availabilityZone": 1,
        "cidrBlock": "10.10.2.16/28"
    }
]`);
        });

        it("custom 2", () => {
            assert.equal(topologyToJson("10.10.0.0/16", 2, [
                { type: "public", cidrMask: 26 },
                { type: "private" },
                { type: "isolated", cidrMask: 28 },
            ]), `[
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": 0,
        "cidrBlock": "10.10.0.0/26"
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        "availabilityZone": 1,
        "cidrBlock": "10.10.0.64/26"
    },
    {
        "type": "isolated",
        "subnetName": "testing-isolated-0",
        "availabilityZone": 0,
        "cidrBlock": "10.10.0.128/28"
    },
    {
        "type": "isolated",
        "subnetName": "testing-isolated-1",
        "availabilityZone": 1,
        "cidrBlock": "10.10.0.144/28"
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": 0,
        "cidrBlock": "10.10.0.160/18"
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        "availabilityZone": 1,
        "cidrBlock": "10.10.64.160/18"
    }
]`);
        });

        it("custom 3", () => {
            assert.equal(topologyToJson("10.10.0.0/16", 2, [
                { type: "public", cidrMask: 24 },
                { type: "private", name: "private1" },
                { type: "private", name: "private2" },
                { type: "isolated", cidrMask: 24 },
            ]), `[
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": 0,
        "cidrBlock": "10.10.0.0/24"
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        "availabilityZone": 1,
        "cidrBlock": "10.10.1.0/24"
    },
    {
        "type": "isolated",
        "subnetName": "testing-isolated-0",
        "availabilityZone": 0,
        "cidrBlock": "10.10.2.0/24"
    },
    {
        "type": "isolated",
        "subnetName": "testing-isolated-1",
        "availabilityZone": 1,
        "cidrBlock": "10.10.3.0/24"
    },
    {
        "type": "private",
        "subnetName": "testing-private1-private-0",
        "availabilityZone": 0,
        "cidrBlock": "10.10.4.0/19"
    },
    {
        "type": "private",
        "subnetName": "testing-private1-private-1",
        "availabilityZone": 1,
        "cidrBlock": "10.10.36.0/19"
    },
    {
        "type": "private",
        "subnetName": "testing-private2-private-0",
        "availabilityZone": 0,
        "cidrBlock": "10.10.68.0/19"
    },
    {
        "type": "private",
        "subnetName": "testing-private2-private-1",
        "availabilityZone": 1,
        "cidrBlock": "10.10.100.0/19"
    }
]`);
        });
    });
});
