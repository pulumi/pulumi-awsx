import * as awsx from "@pulumi/awsx";

const myVpc = new awsx.ec2.Vpc("awsx-nodejs-default-args");

export const vpcId = myVpc.vpcId;
export const publicSubnetIds = myVpc.publicSubnetIds;
export const privateSubnetIds = myVpc.privateSubnetIds;
