import * as awsx from "@pulumi/awsx";

// // Create a network load balancer.
const lb = new awsx.lb.NetworkLoadBalancer("nginx-lb");
