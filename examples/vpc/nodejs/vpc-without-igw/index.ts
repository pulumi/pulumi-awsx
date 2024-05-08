import * as awsx from "@pulumi/awsx";

const myVpc = new awsx.ec2.Vpc("awsx-nodejs-vpc-without-igw", {
    enableInternetGateway: false,
    natGateways: {
        strategy: "None"
    },
    subnetSpecs: [
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
export const isolatedSubnetIds = myVpc.isolatedSubnetIds;
export const igw = myVpc.internetGateway;
