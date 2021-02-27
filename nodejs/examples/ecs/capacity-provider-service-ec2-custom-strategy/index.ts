import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config("aws");
const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config.require("envRegion") }) };

const vpc = awsx.ec2.Vpc.getDefault(providerOpts);

const cluster = new awsx.ecs.Cluster("cluster", { vpc }, providerOpts);

const asg = cluster.createAutoScalingGroup("asg", {
  vpc,
  subnetIds: vpc.publicSubnetIds,
  templateParameters: { minSize: 1 },
  launchConfigurationArgs: { instanceType: "t2.micro" },
}, providerOpts);

const cp = new aws.ecs.CapacityProvider("capacity-provider", {
  name: "my-capacity-provider",
  autoScalingGroupProvider: {
    autoScalingGroupArn: asg.group.arn
  }
}, providerOpts);

// Create a load balancer on port 80 and spin up two instances of Nginx.
const lb = new awsx.lb.ApplicationListener("nginx-lb", { port: 80 }, providerOpts);

const ec2Task = new awsx.ecs.EC2TaskDefinition("ec2-task", {
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
  taskDefinition: ec2Task,
  desiredCount: 1,
  capacityProviderStrategies: [{
    capacityProvider: cp.name,
    weight: 1
  }]
}, providerOpts);

// Export the load balancer's address so that it's easy to access.
export const url = lb.endpoint.hostname;
