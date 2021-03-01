import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

const config = new pulumi.Config("aws");
const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config.require("envRegion") }) };

const vpc = awsx.ec2.Vpc.getDefault(providerOpts);

const clusterName = "cluster";
const clusterIdentifier = new random.RandomString("cluster", {
  special: false,
  upper: false,
  length: 6,
}).result.apply(s => "cluster-" + s);

// Create the cluster's security group ahead of time so we can use it for the ASG.
const clusterSecurityGroup = awsx.ecs.Cluster.createDefaultSecurityGroup(clusterName, vpc, providerOpts);

const userData: awsx.autoscaling.AutoScalingUserData = {
  extraBootcmdLines: () => clusterIdentifier.apply(clusterId =>
    [{ contents: `- echo ECS_CLUSTER='${clusterId}' >> /etc/ecs/ecs.config` }]),
};

const asg = new awsx.autoscaling.AutoScalingGroup("asg", {
  vpc,
  subnetIds: vpc.publicSubnetIds,
  templateParameters: { minSize: 1 },
  launchConfigurationArgs: {
    instanceType: "t2.micro",
    securityGroups: [clusterSecurityGroup],
    userData,
  },
}, providerOpts);

const cp = new aws.ecs.CapacityProvider("capacity-provider", {
  autoScalingGroupProvider: {
    autoScalingGroupArn: asg.group.arn,
  },
}, providerOpts);

const cluster = new awsx.ecs.Cluster(clusterName, {
  name: clusterIdentifier,
  vpc,
  capacityProviders: [ cp.name ],
  securityGroups: [clusterSecurityGroup],
}, providerOpts);

// Create a load balancer on port 80 and spin up two instances of Nginx.
const lb = new awsx.lb.ApplicationListener("nginx-lb", { port: 80 }, providerOpts);

const ec2Task = new awsx.ecs.EC2TaskDefinition("ec2-task", {
  containers: {
      application: {
          image: "nginx:latest",
          memory: 128,
          cpu: 512,
          portMappings: [lb],
      },
  },
}, providerOpts);

const service = new awsx.ecs.CapacityProviderService("my-service", {
  cluster,
  taskDefinition: ec2Task,
  desiredCount: 1,
  forceNewDeployment: true,
  capacityProviderStrategies: [{
    capacityProvider: cp.name,
    weight: 1
  }]
}, providerOpts);

// Export the load balancer's address so that it's easy to access.
export const url = lb.endpoint.hostname;
