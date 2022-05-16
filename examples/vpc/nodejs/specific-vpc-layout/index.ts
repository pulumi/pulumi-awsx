import * as awsx from "@pulumi/awsx";

const myVpc = new awsx.ec2.Vpc("awsx-nodejs-specific-args", {
  subnetSpecs: [
    {
      type: awsx.ec2.SubnetType.Private,
      cidrMask: 21,
    },
    {
      type: awsx.ec2.SubnetType.Public,
      cidrMask: 24,
    },
  ],
});

export const vpcId = myVpc.vpcId;
export const publicSubnetIds = myVpc.publicSubnetIds;
export const privateSubnetIds = myVpc.privateSubnetIds;
