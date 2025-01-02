import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";

const repository = "pulumi/pulumi-awsx";
const testcase = "vpc-ipam-ipv4-auto-cidrblock";

const tags = {
  "repository": repository,
  "testcase": testcase,
};

const currentRegion = aws.getRegionOutput({});

const myVpcIpam = new aws.ec2.VpcIpam("myVpcIpam", {
  operatingRegions: [{
    regionName: currentRegion.name,
  }],
  description: `IPAM for ${repository} example ${testcase}`,
  tags: tags,
});

const myVpcIpamPool = new aws.ec2.VpcIpamPool("myVpcIpamPool", {
  addressFamily: "ipv4",
  ipamScopeId: myVpcIpam.privateDefaultScopeId,
  locale: currentRegion.name,
  tags: tags,
});

const myVpcIpamPoolCidr = new aws.ec2.VpcIpamPoolCidr("myVpcIpamPoolCidr", {
  ipamPoolId: myVpcIpamPool.id,
  cidr: "172.20.0.0/16",
});

const myVpc = new awsx.ec2.Vpc("myVpc", {
  ipv4IpamPoolId: myVpcIpamPool.id,
  ipv4NetmaskLength: 24,
  tags: tags,
  subnetStrategy: "Auto",
}, {
  dependsOn: [myVpcIpamPoolCidr],
});

export const regionName = currentRegion.name;
export const subnetLayout = myVpc.subnetLayout;
export const subnets = myVpc.subnets.apply(s => s.map(x => ({
  availabilityZone: x.availabilityZone,
  cidrBlock: x.cidrBlock
})));
