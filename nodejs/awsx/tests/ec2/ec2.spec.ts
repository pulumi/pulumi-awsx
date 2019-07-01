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
import * as utils from "../../utils";

import { Cidr32Block } from "../../ec2/cidr";
import { VpcSubnetArgs } from "../../ec2/vpc";
import * as vpcTopology from "../../ec2/vpcTopology";

function topology(
        cidr: string, availabilityZones: vpcTopology.AvailabilityZoneDescription[],
        numberOfNatGateways: number, subnets: VpcSubnetArgs[]) {
    return vpcTopology.create(
        undefined, "testing", cidr, undefined, availabilityZones,
        numberOfNatGateways, false, subnets);
}

function subnets(
        cidr: string, availabilityZones: vpcTopology.AvailabilityZoneDescription[], subnets: VpcSubnetArgs[]) {
    return topology(cidr, availabilityZones, availabilityZones.length, subnets).subnets;
}

async function jsonEqual(desc1: vpcTopology.VpcTopologyDescription, desc2: vpcTopology.VpcTopologyDescription) {
    const unwrapped1 = await (<any>pulumi.output(desc1)).promise();
    const unwrapped2 = await (<any>pulumi.output(desc2)).promise();

    return assert.equal(JSON.stringify(unwrapped1, null, 4), JSON.stringify(unwrapped2, null, 4));
}

async function subnetsEqual(desc1: vpcTopology.SubnetDescription[], desc2: vpcTopology.SubnetDescription[]) {
    const unwrapped1 = await (<any>pulumi.output(desc1)).promise();
    const unwrapped2 = await (<any>pulumi.output(desc2)).promise();

    return assert.equal(JSON.stringify(unwrapped1, null, 4), JSON.stringify(unwrapped2, null, 4));
}

const AZ1 = { name: "name_a", id: "id_a" };
const AZ2 = { name: "name_b", id: "id_b" };
const AZ3 = { name: "name_c", id: "id_c" };
const AZ4 = { name: "name_d", id: "id_d" };
const AZ5 = { name: "name_e", id: "id_e" };

const oneAZ: vpcTopology.AvailabilityZoneDescription[] = [AZ1];
const twoAZs: vpcTopology.AvailabilityZoneDescription[] = [AZ1, AZ2];
const threeAZs: vpcTopology.AvailabilityZoneDescription[] = [AZ1, AZ2, AZ3];
const fourAZs: vpcTopology.AvailabilityZoneDescription[] = [AZ1, AZ2, AZ3, AZ4];
const fiveAZs: vpcTopology.AvailabilityZoneDescription[] = [AZ1, AZ2, AZ3, AZ5];

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
        it("1 AZ", async () => {
            await subnetsEqual(subnets("10.0.0.0/16", oneAZ, [
                { type: "public" },
                { type: "private" },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.0/17",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.128.0/17",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
]);
        });

        it("2 AZs", async () => {
            await subnetsEqual(subnets("10.0.0.0/16", twoAZs, [
                { type: "public" },
                { type: "private" },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.0/18",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.0.64.0/18",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.128.0/18",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.0.192.0/18",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
]);
        });

        it("3 AZs", async () => {
            await subnetsEqual(subnets("10.0.0.0/16", threeAZs, [
                { type: "public" },
                { type: "private" },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.0/19",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.0.32.0/19",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "public",
        "subnetName": "testing-public-2",
        args: {
            "availabilityZone": AZ3.name,
            "availabilityZoneId": AZ3.id,
            "cidrBlock": "10.0.64.0/19",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.96.0/19",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.0.128.0/19",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-2",
        args: {
            "availabilityZone": AZ3.name,
            "availabilityZoneId": AZ3.id,
            "cidrBlock": "10.0.160.0/19",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
]);
        });
    });

    describe("custom cidr", () => {
        it("custom 1", async () => {
            await subnetsEqual(subnets("10.10.0.0/16", twoAZs, [
                { type: "public", cidrMask: 24 },
                { type: "private", cidrMask: 28 },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.10.0.0/24",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.10.1.0/24",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.10.2.0/28",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.10.2.16/28",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
]);
        });

        it("custom 2", async () => {
            await subnetsEqual(subnets("10.10.0.0/16", twoAZs, [
                { type: "public", cidrMask: 26 },
                { type: "private" },
                { type: "isolated", cidrMask: 28 },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.10.0.0/26",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.10.0.64/26",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "isolated",
        "subnetName": "testing-isolated-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.10.0.128/28",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "isolated",
        "subnetName": "testing-isolated-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.10.0.144/28",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.10.0.160/18",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.10.64.160/18",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
]);
        });

        it("custom 3", async () => {
            await subnetsEqual(subnets("10.10.0.0/16", twoAZs, [
                { type: "public", cidrMask: 24 },
                { type: "private", name: "private1" },
                { type: "private", name: "private2" },
                { type: "isolated", cidrMask: 24 },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.10.0.0/24",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.10.1.0/24",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "isolated",
        "subnetName": "testing-isolated-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.10.2.0/24",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "isolated",
        "subnetName": "testing-isolated-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.10.3.0/24",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private1-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.10.4.0/19",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private1-private-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.10.36.0/19",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private2-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.10.68.0/19",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private2-private-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.10.100.0/19",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
]);
        });
    });

    describe("26 block", () => {
        // a 26 block can only fit four subnets since it only has 64 addresses available.
        it("1 AZ, 1 subnet", async () => {
            await subnetsEqual(subnets("10.0.0.0/26", oneAZ, [
                { type: "private" },
            ]), [
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.0/26",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
]);
        });
        it("1 AZ, 2 subnets", async () => {
            await subnetsEqual(subnets("10.0.0.0/26", oneAZ, [
                { type: "public" },
                { type: "private" },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.0/27",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.32/27",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
]);
        });
        it("2 AZs, 1 subnets", async () => {
            await subnetsEqual(subnets("10.0.0.0/26", twoAZs, [
                { type: "private" },
            ]), [
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.0/27",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.0.0.32/27",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
]);
        });
        it("2 AZs, 2 subnets", async () => {
            await subnetsEqual(subnets("10.0.0.0/26", twoAZs, [
                { type: "public" },
                { type: "private" },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.0/28",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "public",
        "subnetName": "testing-public-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.0.0.16/28",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.32/28",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.0.0.48/28",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
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
        it("1 AZ, 1 subnet", async () => {
            await subnetsEqual(subnets("10.0.0.0/27", oneAZ, [
                { type: "private" },
            ]), [
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.0/27",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
]);
        });
        it("1 AZ, 2 subnets", async () => {
            await subnetsEqual(subnets("10.0.0.0/27", oneAZ, [
                { type: "public" },
                { type: "private" },
            ]), [
    {
        "type": "public",
        "subnetName": "testing-public-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.0/28",
            mapPublicIpOnLaunch: true,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.16/28",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
]);
        });
        it("2 AZs, 1 subnets", async () => {
            await subnetsEqual(subnets("10.0.0.0/27", twoAZs, [
                { type: "private" },
            ]), [
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.0/28",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
    },
    {
        "type": "private",
        "subnetName": "testing-private-1",
        args: {
            "availabilityZone": AZ2.name,
            "availabilityZoneId": AZ2.id,
            "cidrBlock": "10.0.0.16/28",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
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
        it("1 AZ, 1 subnet", async () => {
            await subnetsEqual(subnets("10.0.0.0/28", oneAZ, [
                { type: "private" },
            ]), [
    {
        "type": "private",
        "subnetName": "testing-private-0",
        args: {
            "availabilityZone": AZ1.name,
            "availabilityZoneId": AZ1.id,
            "cidrBlock": "10.0.0.0/28",
            mapPublicIpOnLaunch: false,
            assignIpv6AddressOnCreation: false,
        },
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

    describe("custom locations", () => {
        it("custom one azs", async () => {
            await jsonEqual(topology("10.0.0.0/16", oneAZ, 1, [
                { type: "public", location: "10.0.0.0/24" },
                { type: "private", location: "10.0.1.0/24" },
                { type: "isolated", name: "db", location: "10.0.2.0/24" },
                { type: "isolated", name: "redis", location: "10.0.3.0/24" },
            ]), {
                "subnets": [
                    {
                        "subnetName": "public-0",
                        "type": "public",
                        "args": {
                            "cidrBlock": "10.0.0.0/24",
                            "mapPublicIpOnLaunch": true,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "private-1",
                        "type": "private",
                        "args": {
                            "cidrBlock": "10.0.1.0/24",
                            "mapPublicIpOnLaunch": false,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "db",
                        "type": "isolated",
                        "args": {
                            "cidrBlock": "10.0.2.0/24",
                            "mapPublicIpOnLaunch": false,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "redis",
                        "type": "isolated",
                        "args": {
                            "cidrBlock": "10.0.3.0/24",
                            "mapPublicIpOnLaunch": false,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                ],
                "natGateways": [
                    {
                        "name": "testing-0",
                        "publicSubnet": "public-0",
                    },
                ],
                "natRoutes": [
                    {
                        "name": "nat-0",
                        "privateSubnet": "private-1",
                        "natGateway": "testing-0",
                    },
                ],
            });
        });

        it("custom two private one public", async () => {
            await jsonEqual(topology("10.0.0.0/16", twoAZs, 2, [
                { type: "public", location: "10.0.0.0/24" },
                { type: "private", location: { cidrBlock: "10.0.1.0/24", availabilityZone: AZ1.name } },
                { type: "private", location: { cidrBlock: "10.0.2.0/24", availabilityZone: AZ2.name } },
            ]), {
                "subnets": [
                    {
                        "subnetName": "public-0",
                        "type": "public",
                        "args": {
                            "cidrBlock": "10.0.0.0/24",
                            "mapPublicIpOnLaunch": true,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "private-1",
                        "type": "private",
                        "args": {
                            "cidrBlock": "10.0.1.0/24",
                            "availabilityZone": "name_a",
                            "mapPublicIpOnLaunch": false,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "private-2",
                        "type": "private",
                        "args": {
                            "cidrBlock": "10.0.2.0/24",
                            "availabilityZone": "name_b",
                            "mapPublicIpOnLaunch": false,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                ],
                "natGateways": [
                    {
                        "name": "testing-0",
                        "publicSubnet": "public-0",
                    },
                ],
                "natRoutes": [
                    {
                        "name": "nat-0",
                        "privateSubnet": "private-1",
                        "natGateway": "testing-0",
                    },
                    {
                        "name": "nat-1",
                        "privateSubnet": "private-2",
                        "natGateway": "testing-0",
                    },
                ],
            });
        });

        it("custom two private two public", async () => {
            await jsonEqual(topology("10.0.0.0/16", twoAZs, 2, [
                { type: "public", location: { cidrBlock: "10.0.1.0/24", availabilityZone: AZ1.name } },
                { type: "public", location: { cidrBlock: "10.0.2.0/24", availabilityZone: AZ2.name } },
                { type: "private", location: { cidrBlock: "10.0.3.0/24", availabilityZone: AZ1.name } },
                { type: "private", location: { cidrBlock: "10.0.4.0/24", availabilityZone: AZ2.name } },
            ]), {
                "subnets": [
                    {
                        "subnetName": "public-0",
                        "type": "public",
                        "args": {
                            "cidrBlock": "10.0.1.0/24",
                            "availabilityZone": "name_a",
                            "mapPublicIpOnLaunch": true,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "public-1",
                        "type": "public",
                        "args": {
                            "cidrBlock": "10.0.2.0/24",
                            "availabilityZone": "name_b",
                            "mapPublicIpOnLaunch": true,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "private-2",
                        "type": "private",
                        "args": {
                            "cidrBlock": "10.0.3.0/24",
                            "availabilityZone": "name_a",
                            "mapPublicIpOnLaunch": false,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "private-3",
                        "type": "private",
                        "args": {
                            "cidrBlock": "10.0.4.0/24",
                            "availabilityZone": "name_b",
                            "mapPublicIpOnLaunch": false,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                ],
                "natGateways": [
                    {
                        "name": "testing-0",
                        "publicSubnet": "public-0",
                    },
                    {
                        "name": "testing-1",
                        "publicSubnet": "public-1",
                    },
                ],
                "natRoutes": [
                    {
                        "name": "nat-0",
                        "privateSubnet": "private-2",
                        "natGateway": "testing-0",
                    },
                    {
                        "name": "nat-1",
                        "privateSubnet": "private-3",
                        "natGateway": "testing-1",
                    },
                ],
            });
        });

        it("custom two private three public", async () => {
            await jsonEqual(topology("10.0.0.0/16", fiveAZs, 5, [
                { type: "public", location: { cidrBlock: "10.0.1.0/24", availabilityZone: AZ1.name } },
                { type: "public", location: { cidrBlock: "10.0.2.0/24", availabilityZone: AZ2.name } },
                // first private subnet should get natgateway from second public subnet (since it's
                // in the same AZ).  Remaining private subnets should round-robin between the two
                // natgateways we make.
                { type: "private", location: { cidrBlock: "10.0.3.0/24", availabilityZone: AZ2.name } },
                { type: "private", location: { cidrBlock: "10.0.4.0/24", availabilityZone: AZ3.name } },
                { type: "private", location: { cidrBlock: "10.0.5.0/24", availabilityZone: AZ4.name } },
                { type: "private", location: { cidrBlock: "10.0.6.0/24", availabilityZone: AZ5.name } },
            ]), {
                "subnets": [
                    {
                        "subnetName": "public-0",
                        "type": "public",
                        "args": {
                            "cidrBlock": "10.0.1.0/24",
                            "availabilityZone": "name_a",
                            "mapPublicIpOnLaunch": true,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "public-1",
                        "type": "public",
                        "args": {
                            "cidrBlock": "10.0.2.0/24",
                            "availabilityZone": "name_b",
                            "mapPublicIpOnLaunch": true,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "private-2",
                        "type": "private",
                        "args": {
                            "cidrBlock": "10.0.3.0/24",
                            "availabilityZone": "name_b",
                            "mapPublicIpOnLaunch": false,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "private-3",
                        "type": "private",
                        "args": {
                            "cidrBlock": "10.0.4.0/24",
                            "availabilityZone": "name_c",
                            "mapPublicIpOnLaunch": false,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "private-4",
                        "type": "private",
                        "args": {
                            "cidrBlock": "10.0.5.0/24",
                            "availabilityZone": "name_d",
                            "mapPublicIpOnLaunch": false,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                    {
                        "subnetName": "private-5",
                        "type": "private",
                        "args": {
                            "cidrBlock": "10.0.6.0/24",
                            "availabilityZone": "name_e",
                            "mapPublicIpOnLaunch": false,
                            "assignIpv6AddressOnCreation": false,
                        },
                    },
                ],
                "natGateways": [
                    {
                        "name": "testing-0",
                        "publicSubnet": "public-1",
                    },
                    {
                        "name": "testing-1",
                        "publicSubnet": "public-0",
                    },
                ],
                "natRoutes": [
                    {
                        "name": "nat-0",
                        "privateSubnet": "private-2",
                        "natGateway": "testing-0",
                    },
                    {
                        "name": "nat-1",
                        "privateSubnet": "private-3",
                        "natGateway": "testing-1",
                    },
                    {
                        "name": "nat-2",
                        "privateSubnet": "private-4",
                        "natGateway": "testing-0",
                    },
                    {
                        "name": "nat-3",
                        "privateSubnet": "private-5",
                        "natGateway": "testing-1",
                    },
                ],
            });
        });
    });
});
