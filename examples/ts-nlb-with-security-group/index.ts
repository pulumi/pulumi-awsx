import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";

const securityGroup = new aws.ec2.SecurityGroup(
  "nlb-security-group",
);

// Create a network load balancer with the security group from above
const lb = new awsx.lb.NetworkLoadBalancer("nlb", {
  securityGroups: [securityGroup.id]
});
