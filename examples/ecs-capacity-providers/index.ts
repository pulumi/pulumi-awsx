import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as ecs from "@pulumi/awsx/ecs";
import * as aws from "@pulumi/aws";

const vpc = new awsx.ec2.Vpc("vpc", {
  subnetStrategy: awsx.ec2.SubnetAllocationStrategy.Auto,
  natGateways: { strategy: awsx.ec2.NatGatewayStrategy.None },
  subnetSpecs: [
    {
      type: "Public",
    },
  ],
});
const cluster = new aws.ecs.Cluster("cluster");
const capacityProvider = new aws.ecs.ClusterCapacityProviders("spot-provider", {
  clusterName: cluster.name,
  capacityProviders: ["FARGATE", "FARGATE_SPOT"],
  // 4:1 split where 4 of every 5 tasks run on spot. Base of 1 on FARGATE
  // means that we always have at least 1 on FARGATE
  defaultCapacityProviderStrategies: [
    {
      capacityProvider: "FARGATE",
      weight: 1,
      base: 1,
    },
    {
      capacityProvider: "FARGATE_SPOT",
      weight: 4,
    },
  ],
});

const fargateTask = new ecs.FargateTaskDefinition("fargate-task", {
  container: {
    image: "nginx:latest",
    name: "nginx",
    cpu: 512,
    memory: 128,
    essential: true,
  },
});

const sg = new aws.ec2.SecurityGroup("service-sg", {
  vpcId: vpc.vpcId,
  egress: [
    {
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
});

const transform: pulumi.ResourceTransform = (args) => {
  if (args.type === "aws:ecs/service:Service") {
    return {
      opts: pulumi.mergeOptions(args.opts, {
        // this test should be fairly quick, if not then there is something wrong
        // and we should just fail sooner
        customTimeouts: {
          create: "3m",
          update: "3m",
        },
      }),
      props: args.props,
    };
  }
  return {
    opts: args.opts,
    props: args.props,
  };
};

const service = new ecs.FargateService(
  "my-service",
  {
    cluster: cluster.arn,
    taskDefinition: fargateTask.taskDefinition.arn,
    useClusterDefaultCapacityProviderStrategy: true,
    networkConfiguration: {
      securityGroups: [sg.id],
      subnets: vpc.publicSubnetIds,
      assignPublicIp: true,
    },
  },
  {
    transforms: [transform],
    dependsOn: [capacityProvider],
  },
);

const service2 = new ecs.FargateService(
  "my-service2",
  {
    cluster: cluster.arn,
    taskDefinition: fargateTask.taskDefinition.arn,
    capacityProviderStrategies: [{ capacityProvider: "FARGATE", weight: 1 }],
    networkConfiguration: {
      securityGroups: [sg.id],
      subnets: vpc.publicSubnetIds,
      assignPublicIp: true,
    },
  },
  {
    transforms: [transform],
    dependsOn: [capacityProvider],
  },
);
