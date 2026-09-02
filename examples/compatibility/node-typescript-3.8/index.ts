import * as awsx from "@pulumi/awsx";

const modernArgs: awsx.ec2.VpcArgs = {
    numberOfAvailabilityZones: 3,
};
const classicArgs: awsx.classic.ec2.VpcArgs = {
    cidrBlock: "10.0.0.0/16",
    numberOfAvailabilityZones: 2,
};

// Vpc is lazy-loaded, so call a public method to test the modern runtime module as well as its types.
if (awsx.ec2.Vpc.isInstance(undefined)) {
    throw new Error("Vpc.isInstance unexpectedly accepted undefined.");
}

const cidr = awsx.classic.ec2.Cidr32Block.fromCidrNotation("10.0.0.1/24").toString();
if (cidr !== "10.0.0.0/24") {
    throw new Error(`Classic AWSX code returned an unexpected CIDR block: ${cidr}`);
}

export const nodeVersion = process.version;
export const modernAvailabilityZones = modernArgs.numberOfAvailabilityZones;
export const classicAvailabilityZones = classicArgs.numberOfAvailabilityZones;
export { cidr };
