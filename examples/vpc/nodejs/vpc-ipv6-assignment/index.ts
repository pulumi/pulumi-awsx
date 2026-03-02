import * as awsx from "@pulumi/awsx";

const vpc = new awsx.ec2.Vpc("test-vpc", {
  assignGeneratedIpv6CidrBlock: true,
  subnetStrategy: "Auto",
  subnetSpecs: [
    {
      type: "Private" as const,
      assignIpv6AddressOnCreation: false,
    },
    {
      type: "Public" as const,
    },
  ],
});

export const subnets = vpc.subnets;
