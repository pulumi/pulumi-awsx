import * as awsx from "@pulumi/awsx";

const vpc = new awsx.ec2.Vpc("test-vpc", {
  assignGeneratedIpv6CidrBlock: true,
  subnetSpecs: [
    {
      type: "Private",
      assignIpv6AddressOnCreation: true,
    },
    {
      type: "Public",
    },
  ],
});

export const subnets = vpc.subnets;
