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

// See https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing for full details

// For IPv4, CIDR notation is an alternative to the older system of representing networks by their
// starting address and the subnet mask, both written in dot-decimal notation. 192.168.100.0/24
// equivalent to 192.168.100.0/255.255.255.0.
//
// The number of addresses of a subnet may be calculated as 2^(address length − prefix length),
// where address length is 128 for IPv6 and 32 for IPv4. For example, in IPv4, the prefix length /29
// gives: 2^(32 − 29) = 2^3 = 8 addresses.

// CIDR is principally a bitwise, prefix-based standard for the representation of IP addresses and
// their routing properties. It facilitates routing by allowing blocks of addresses to be grouped
// into single routing table entries. These groups, commonly called CIDR blocks, share an initial
// sequence of bits in the binary representation of their IP addresses. IPv4 CIDR blocks are
// identified using a syntax similar to that of IPv4 addresses: a dotted-decimal address, followed
// by a slash, then a number from 0 to 32, i.e., a.b.c.d/n. The dotted decimal portion is the IPv4
// address. The number following the slash is the prefix length, the number of shared initial bits,
// counting from the most-significant bit of the address. When emphasizing only the size of a
// network, the address portion of the notation is usually omitted. Thus, a /20 block is a CIDR
// block with an unspecified 20-bit prefix.

// An IP address is part of a CIDR block, and is said to match the CIDR prefix if the initial n bits
// of the address and the CIDR prefix are the same. An IPv4 address is 32 bits so an n-bit CIDR
// prefix leaves 32 − n bits unmatched, meaning that 232 − n IPv4 addresses match a given n-bit CIDR
// prefix. Shorter CIDR prefixes match more addresses, while longer prefixes match fewer. An address
// can match multiple CIDR prefixes of different lengths.

export class Cidr32Block {
    public readonly endIpAddressExclusive: number;

    /** Do not call directly.  Use the static factory methods to generate a cidr block */
    constructor(public readonly startIpAddressInclusive: number,
                public readonly subnetMaskLeading1Bits: number) {

        if (subnetMaskLeading1Bits < 0 || subnetMaskLeading1Bits > 32) {
            throw new Error(`Mask for a cidr block must be between "0" and "32", but was ${subnetMaskLeading1Bits}`);
        }

        // Ensure that our starting ip address would be legal.
        getIPv4Address(startIpAddressInclusive);

        const trailing1Bits = 32 - subnetMaskLeading1Bits;
        const ipAddressesInBlock = 2 ** trailing1Bits;

        // i.e. if we have 256 ipAddresses in the block and the starting ipAddress is
        // 192.168.100.0, then then exclusive endIpAddress is 192.168.101.0. Or, inclusively
        // the range is from 192.168.100.0 to 192.168.100.255.
        this.endIpAddressExclusive = startIpAddressInclusive + ipAddressesInBlock;
    }

    /**
     * Returns a cidr block given notation like "a.b.c.d/n"
     */
    public static fromCidrNotation(cidr: string) {
        const split = cidr.split("/");
        if (split.length !== 2) {
            throw new Error(`Cidr block notation not valid.  Expected "a.b.c.d/n", but got "${cidr}"`);
        }

        const subnetMaskLeading1Bits = parseInt(split[1], 10);
        if (subnetMaskLeading1Bits < 0 || subnetMaskLeading1Bits > 32) {
            throw new Error(`Cidr mask bit count must be between 0 and 32, but was "${subnetMaskLeading1Bits}"`);
        }

        const trailing1Bits = 32 - subnetMaskLeading1Bits;

        // Get the full mask based on the count of bits to use.  If maskBitCount was 32, this would
        // generate ((2^32)-1), or 255.255.255.255.  if maskBitCount was 24 this would generate
        // (2^32 - 2^8), or 255.255.255.0.
        const leadingMask = (2 ** 32) - (2 ** trailing1Bits);

        const ipAddress = split[0];
        const ipAddressValue = getIPv4AddressValue(ipAddress);

        // The minimum ipAddress in the block is the subnet leading bits of the ipAddress passed in.
        // i.e. 192.168.100.14/24 represents the IPv4 address 192.168.100.14. Its subnet mask is
        // 255.255.255.0, which has 24 leading 1-bits, and the start of the block would be
        // 192.168.100.0.  With a mask count of 24, there are 8 bits for the block.  So the block
        // would contain the addresses 192.168.100.0-192.168.100.255 (inclusive).

        const startIpAddress = ipAddressValue & leadingMask;

        return new Cidr32Block(startIpAddress, subnetMaskLeading1Bits);
    }

    public nextBlock() {
        // because our end address is exclusive, it's automatically the starting address of the next
        // block.
        return new Cidr32Block(this.endIpAddressExclusive, this.subnetMaskLeading1Bits);
    }

    public toString() {
        return `${getIPv4Address(this.startIpAddressInclusive)}/${this.subnetMaskLeading1Bits}`;
    }
}

function getIPv4AddressValue(address: string): number {
    const split = address.split(".");
    if (split.length !== 4) {
        throw new Error(`Ip address must be in the form "a.b.c.d", but was "${address}"`);
    }

    const a = getOctet(split[0]);
    const b = getOctet(split[1]);
    const c = getOctet(split[2]);
    const d = getOctet(split[3]);

    const result = (a << 24) | (b << 16) | (c << 8) | d;

    return result;

    function getOctet(piece: string): number {
        const val = parseInt(piece, 10);
        if (val < 0 || val >= 256) {
            throw new Error(`Each part of the ip address must be between 0 and 255. Parsed "${val}" from "${piece} in ${address}"`);
        }

        return val;
    }
}

export function getIPv4Address(value: number): string {
    const ipAddress = ((value>>24) & 255) + "." +
                      ((value>>16) & 255) + "." +
                      ((value>>8) & 255) + "." +
                      (value & 255);

    if (getIPv4AddressValue(ipAddress) !== value) {
        throw new Error(`Could not convert ${value} into a valid ip address`);
    }

    return ipAddress;
}
