import * as awsx from "@pulumi/awsx";

const myVpc = new awsx.ec2.Vpc("awsx-nodejs-multiple-subnets", {
    subnetSpecs: [
        {
            type: awsx.ec2.SubnetType.Public,
            cidrMask: 22,
        },
        {
            type: awsx.ec2.SubnetType.Private,
            cidrMask: 21,
        },
        {
            type: awsx.ec2.SubnetType.Isolated,
            cidrMask: 24,
            name: "db",
        },
        {
            type: awsx.ec2.SubnetType.Isolated,
            cidrMask: 24,
            name: "redis",
        },
    ],
});

export const vpcId = myVpc.vpcId;
export const publicSubnetIds = myVpc.publicSubnetIds;
export const privateSubnetIds = myVpc.privateSubnetIds;
export const isolatedSubnetIds = myVpc.isolatedSubnetIds;
