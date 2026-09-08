import * as awsx from "@pulumi/awsx";

const args: awsx.classic.ec2.VpcArgs = {
    numberOfNatGateways: "three",
};

export { args };
