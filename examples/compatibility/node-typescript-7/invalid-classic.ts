import * as awsx from "@pulumi/awsx";

const args: awsx.classic.ec2.VpcArgs = {
    numberOfAvailabilityZones: "three",
};

export { args };
