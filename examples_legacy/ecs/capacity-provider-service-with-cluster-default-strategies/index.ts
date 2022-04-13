import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config("aws");
const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config.require("envRegion") }) };

const cluster = new awsx.ecs.Cluster("cluster", {
  capacityProviders: ["FARGATE_SPOT"],
  defaultCapacityProviderStrategies: [{
    capacityProvider: "FARGATE_SPOT",
    weight: 1,
  }],
}, providerOpts);

// Create a load balancer on port 80 and spin up two instances of Nginx.
const lb = new awsx.lb.ApplicationListener("nginx-lb", { port: 80 }, providerOpts);

const fargateTask = new awsx.ecs.FargateTaskDefinition("fargate-task", {
  containers: {
      application: {
          image: "nginx:latest",
          memory: 128,
          essential: true,
          cpu: 512,
          portMappings: [lb],
      },
  },
}, providerOpts);

const service = new awsx.ecs.CapacityProviderService("my-service", {
  cluster,
  taskDefinition: fargateTask,
  desiredCount: 1,
}, providerOpts);

// Export the load balancer's address so that it's easy to access.
export const url = lb.endpoint.hostname;
