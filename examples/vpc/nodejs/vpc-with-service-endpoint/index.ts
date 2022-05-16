import * as awsx from "@pulumi/awsx";

const myVpc = new awsx.ec2.Vpc("awsx-with-service-endpoint", {
  vpcEndpointSpecs: [
    {
      serviceName: "com.amazonaws.us-west-2.s3",
    },
  ],
});

export const vpcId = myVpc.vpcId;
export const publicSubnetIds = myVpc.publicSubnetIds;
export const privateSubnetIds = myVpc.privateSubnetIds;
export const vpcEndpoints = myVpc.vpcEndpoints;
