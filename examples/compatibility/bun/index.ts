import * as awsx from "@pulumi/awsx";

// Vpc is lazy-loaded, so call a public method to test the modern runtime module as well as its types.
if (awsx.ec2.Vpc.isInstance(undefined)) {
    throw new Error("Vpc.isInstance unexpectedly accepted undefined.");
}

const cidr = awsx.classic.ec2.Cidr32Block.fromCidrNotation("10.0.0.1/24").toString();
if (cidr !== "10.0.0.0/24") {
    throw new Error(`Classic AWSX code returned an unexpected CIDR block: ${cidr}`);
}

export const bunVersion = Bun.version;
export { cidr };
