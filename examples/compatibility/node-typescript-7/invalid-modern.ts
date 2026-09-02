import * as awsx from "@pulumi/awsx";

const args: awsx.ec2.VpcArgs = {
    numberOfAvailabilityZones: "three",
};

export { args };
