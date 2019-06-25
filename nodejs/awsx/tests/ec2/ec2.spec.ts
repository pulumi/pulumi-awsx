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
import * as vpcTopology from "../../ec2/vpcTopology";

function topology(
        cidr: string, availabilityZones: vpcTopology.AvailabilityZoneDescription[],
        numberOfNatGateways: number, subnets: VpcSubnetArgs[]) {
    return new vpcTopology.VpcTopology(
        undefined, "testing", cidr, undefined,
        availabilityZones, numberOfNatGateways, false).create(subnets);
}

function subnets(
        cidr: string, availabilityZones: vpcTopology.AvailabilityZoneDescription[], subnets: VpcSubnetArgs[]) {
    return topology(cidr, availabilityZones, availabilityZones.length, subnets).subnets;
}

function jsonEqual(desc1: vpcTopology.VpcTopologyDescription, desc2: vpcTopology.VpcTopologyDescription) {
    return assert.equal(JSON.stringify(desc1, null, 4), JSON.stringify(desc1, null, 4));
}

function subnetsEqual(desc1: vpcTopology.SubnetDescription[], desc2: vpcTopology.SubnetDescription[]) {
    return assert.equal(JSON.stringify(desc1, null, 4), JSON.stringify(desc1, null, 4));
}

const AZ1 = { name: "name_a", id: "id_a" };
const AZ2 = { name: "name_b", id: "id_b" };
const AZ3 = { name: "name_c", id: "id_c" };

const oneAZ: vpcTopology.AvailabilityZoneDescription[] = [AZ1];
const twoAZs: vpcTopology.AvailabilityZoneDescription[] = [AZ1, AZ2];
const threeAZs: vpcTopology.AvailabilityZoneDescription[] = [AZ1, AZ2, AZ3];

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
            subnetsEqual(subnets("10.0.0.0/16", oneAZ, [
                { type: "public" },
                { type: "private" },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.0/17",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.128.0/17",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });

        it("2 AZs", () => {
            subnetsEqual(subnets("10.0.0.0/16", twoAZs, [
                { type: "public" },
                { type: "private" },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.0/18",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.0.64.0/18",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.128.0/18",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.0.192.0/18",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });

        it("3 AZs", () => {
            subnetsEqual(subnets("10.0.0.0/16", threeAZs, [
                { type: "public" },
                { type: "private" },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.0/19",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.0.32.0/19",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "public",
        "subnetName": "testing-public-2",
        "availabilityZone": AZ3.name,
        "cidrBlock": "10.0.64.0/19",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.96.0/19",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.0.128.0/19",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-2",
        "availabilityZone": AZ3.name,
        "cidrBlock": "10.0.160.0/19",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });
    });

    describe("custom cidr", () => {
        it("custom 1", () => {
            subnetsEqual(subnets("10.10.0.0/16", twoAZs, [
                { type: "public", cidrMask: 24 },
                { type: "private", cidrMask: 28 },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.10.0.0/24",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.10.1.0/24",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.10.2.0/28",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.10.2.16/28",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });

        it("custom 2", () => {
            subnetsEqual(subnets("10.10.0.0/16", twoAZs, [
                { type: "public", cidrMask: 26 },
                { type: "private" },
                { type: "isolated", cidrMask: 28 },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.10.0.0/26",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.10.0.64/26",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "isolated",
        "subnetName": "testing-isolated-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.10.0.128/28",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "isolated",
        "subnetName": "testing-isolated-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.10.0.144/28",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.10.0.160/18",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.10.64.160/18",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });

        it("custom 3", () => {
            subnetsEqual(subnets("10.10.0.0/16", twoAZs, [
                { type: "public", cidrMask: 24 },
                { type: "private", name: "private1" },
                { type: "private", name: "private2" },
                { type: "isolated", cidrMask: 24 },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.10.0.0/24",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.10.1.0/24",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "isolated",
        "subnetName": "testing-isolated-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.10.2.0/24",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "isolated",
        "subnetName": "testing-isolated-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.10.3.0/24",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private1-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.10.4.0/19",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private1-private-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.10.36.0/19",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private2-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.10.68.0/19",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private2-private-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.10.100.0/19",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });
    });

    describe("26 block", () => {
        // a 26 block can only fit four subnets since it only has 64 addresses available.
        it("1 AZ, 1 subnet", () => {
            subnetsEqual(subnets("10.0.0.0/26", oneAZ, [
                { type: "private" },
            ]), [
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.0/26",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });
        it("1 AZ, 2 subnets", () => {
            subnetsEqual(subnets("10.0.0.0/26", oneAZ, [
                { type: "public" },
                { type: "private" },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.0/27",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.32/27",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });
        it("2 AZs, 1 subnets", () => {
            subnetsEqual(subnets("10.0.0.0/26", twoAZs, [
                { type: "private" },
            ]), [
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.0/27",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.0.0.32/27",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });
        it("2 AZs, 2 subnets", () => {
            subnetsEqual(subnets("10.0.0.0/26", twoAZs, [
                { type: "public" },
                { type: "private" },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.0/28",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.0.0.16/28",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.32/28",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.0.0.48/28",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });
        it("2 AZs, 3 subnets", () => {
            assert.throws(() => subnets("10.0.0.0/26", twoAZs, [
                { type: "public" },
                { type: "private" },
                { type: "isolated" },
            ]));
        });
    });

    describe("27 block", () => {
        // a 27 block can only fit two subnets since it only has 32 addresses available.
        it("1 AZ, 1 subnet", () => {
            subnetsEqual(subnets("10.0.0.0/27", oneAZ, [
                { type: "private" },
            ]), [
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.0/27",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });
        it("1 AZ, 2 subnets", () => {
            subnetsEqual(subnets("10.0.0.0/27", oneAZ, [
                { type: "public" },
                { type: "private" },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.0/28",
        mapPublicIpOnLaunch: true,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.16/28",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });
        it("2 AZs, 1 subnets", () => {
            subnetsEqual(subnets("10.0.0.0/27", twoAZs, [
                { type: "private" },
            ]), [
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.0/28",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        "availabilityZone": AZ2.name,
        "cidrBlock": "10.0.0.16/28",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });
        it("2 AZs, 2 subnets", () => {
            assert.throws(() => subnets("10.0.0.0/27", twoAZs, [
                { type: "public" },
                { type: "private" },
            ]));
        });
    });

    describe("28 block", () => {
        // a 28 block can only fit a single subnet since it only has 16 addresses available.
        it("1 AZ, 1 subnet", () => {
            subnetsEqual(subnets("10.0.0.0/28", oneAZ, [
                { type: "private" },
            ]), [
    {
        "type": "private",
        "subnetName": "testing-private-0",
        "availabilityZone": AZ1.name,
        "cidrBlock": "10.0.0.0/28",
        mapPublicIpOnLaunch: false,
        assignIpv6AddressOnCreation: false,
    },
]);
        });
        it("1 AZ, 2 subnets", () => {
            assert.throws(() => subnets("10.0.0.0/28", oneAZ, [
                { type: "public" },
                { type: "private" },
            ]));
        });
        it("2 AZs, 1 subnets", () => {
            assert.throws(() => subnets("10.0.0.0/28", twoAZs, [
                { type: "private" },
            ]));
        });
        it("2 AZs, 2 subnets", () => {
            assert.throws(() => subnets("10.0.0.0/28", twoAZs, [
                { type: "public" },
                { type: "private" },
            ]));
        });
    });
});
