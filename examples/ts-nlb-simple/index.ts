import * as awsx from "@pulumi/awsx";

// Create VPC for the LB
const vpc = new awsx.ec2.Vpc("test-vpc", {
    subnetSpecs: [
      { type: "Public" }
    ],
    natGateways: {
      strategy: "None",
    }
  });

// Create a network load balancer.
const lb = new awsx.lb.NetworkLoadBalancer("nginx-lb", {
    subnets: vpc.subnets,
});
