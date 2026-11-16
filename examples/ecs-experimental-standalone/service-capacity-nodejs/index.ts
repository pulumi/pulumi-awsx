import * as aws from "@pulumi/aws";
import * as awsNative from "@pulumi/aws-native";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as awsxNext from "@pulumi/awsx-next";

const config = new pulumi.Config();
const capacityType = config.require("capacityType");
if (capacityType !== "ec2" && capacityType !== "managedInstances") {
  throw new Error("capacityType must be ec2 or managedInstances");
}
const managed = capacityType === "managedInstances";
const partition = aws.getPartitionOutput().partition;
const vpc = new awsx.ec2.Vpc("capacity", {
  numberOfAvailabilityZones: 2,
  natGateways: { strategy: awsx.ec2.NatGatewayStrategy.Single },
  subnetSpecs: [
    { type: awsx.ec2.SubnetType.Public },
    { type: awsx.ec2.SubnetType.Private },
  ],
});
const cluster = new aws.ecs.Cluster("capacity");
const hostGroup = new aws.ec2.SecurityGroup("hosts", {
  vpcId: vpc.vpcId,
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});
// The Managed Instances infrastructure policy permits passing roles with this prefix.
// https://docs.aws.amazon.com/AmazonECS/latest/developerguide/managed-instances-instance-profile.html
const instanceRole = new aws.iam.Role("ecsInstanceRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ec2.amazonaws.com" }),
});
const instancePolicy = new aws.iam.RolePolicyAttachment("instance", {
  role: instanceRole.name,
  policyArn: managed
    ? pulumi.interpolate`arn:${partition}:iam::aws:policy/AmazonECSInstanceRolePolicyForManagedInstances`
    : pulumi.interpolate`arn:${partition}:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role`,
});
const profile = new aws.iam.InstanceProfile("hosts", { role: instanceRole.name });

let provider: { name: pulumi.Output<string>; arn: pulumi.Output<string> };
if (managed) {
  const infrastructureRole = new aws.iam.Role("infrastructure", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs.amazonaws.com" }),
  });
  const infrastructurePolicy = new aws.iam.RolePolicyAttachment("infrastructure", {
    role: infrastructureRole.name,
    policyArn: pulumi.interpolate`arn:${partition}:iam::aws:policy/AmazonECSInfrastructureRolePolicyForManagedInstances`,
  });
  const managedProvider = new awsNative.ecs.CapacityProvider("managed", {
    clusterName: cluster.name,
    managedInstancesProvider: {
      infrastructureRoleArn: infrastructureRole.arn,
      instanceLaunchTemplate: {
        ec2InstanceProfileArn: profile.arn,
        networkConfiguration: { subnets: vpc.privateSubnetIds, securityGroups: [hostGroup.id] },
        instanceRequirements: {
          vCpuCount: { min: 2, max: 2 },
          memoryMiB: { min: 2048, max: 2048 },
          allowedInstanceTypes: ["t3.small"],
          burstablePerformance: "included",
        },
      },
    },
  }, { dependsOn: [instancePolicy, infrastructurePolicy] });
  // CloudFormation exposes the provider name, while Service accepts its ARN.
  provider = {
    name: managedProvider.id,
    arn: pulumi.interpolate`arn:${partition}:ecs:${aws.getRegionOutput().region}:${aws.getCallerIdentityOutput().accountId}:capacity-provider/${managedProvider.id}`,
  };
} else {
  const image = aws.ssm.getParameterOutput({
    name: "/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id",
  });
  const template = new aws.ec2.LaunchTemplate("hosts", {
    imageId: image.value,
    instanceType: "t3.small",
    iamInstanceProfile: { arn: profile.arn },
    vpcSecurityGroupIds: [hostGroup.id],
    userData: cluster.name.apply(name => Buffer.from(`#!/bin/bash\necho ECS_CLUSTER=${name} >> /etc/ecs/ecs.config\n`).toString("base64")),
  });
  const group = new aws.autoscaling.Group("hosts", {
    minSize: 0,
    maxSize: 2,
    desiredCapacity: 0,
    forceDelete: true,
    vpcZoneIdentifiers: vpc.privateSubnetIds,
    launchTemplate: { id: template.id, version: "$Latest" },
    tags: [{ key: "AmazonECSManaged", value: "true", propagateAtLaunch: true }],
  }, { dependsOn: [instancePolicy], ignoreChanges: ["desiredCapacity"] });
  provider = new aws.ecs.CapacityProvider("ec2", {
    autoScalingGroupProvider: {
      autoScalingGroupArn: group.arn,
      managedScaling: {
        status: "ENABLED",
        targetCapacity: 100,
        minimumScalingStepSize: 1,
        maximumScalingStepSize: 2,
        instanceWarmupPeriod: 60,
      },
      managedTerminationProtection: "DISABLED",
    },
  });
}
const task = new awsxNext.TaskDefinition("worker", {
  family: config.get("taskDefinitionFamily"),
  compatibilities: [managed ? awsxNext.TaskCompatibility.MANAGED_INSTANCES : awsxNext.TaskCompatibility.EC2],
  cpuArchitecture: awsxNext.CpuArchitecture.X86_64,
  cpuUnits: 256,
  memoryMiB: 512,
  containers: {
    worker: {
      image: "public.ecr.aws/docker/library/busybox:stable",
      command: ["sh", "-c", "echo AWSX_CAPACITY_OK; exec sleep 86400"],
    },
  },
});
const association = managed
  ? new awsNative.ecs.ClusterCapacityProviderAssociations("capacity", {
      cluster: cluster.name,
      capacityProviders: [provider.name],
      defaultCapacityProviderStrategy: [{ capacityProvider: provider.name, weight: 1 }],
    })
  : new aws.ecs.ClusterCapacityProviders("capacity", {
      clusterName: cluster.name,
      capacityProviders: [provider.name],
      defaultCapacityProviderStrategies: [{ capacityProvider: provider.name, weight: 1 }],
    });
const common = {
  // Order capacity lookups after the association without gating unrelated service inputs.
  clusterArn: pulumi.all([cluster.arn, association.id]).apply(([arn]) => arn),
  taskDefinitionArn: task.taskDefinitionArn,
  vpcSubnetIds: vpc.privateSubnetIds,
  deploymentTimeout: "30m",
};
const services = [
  new awsxNext.Service("explicit", {
    ...common,
    capacity: { providers: [{ capacityProviderArn: provider.arn }] },
  }),
  new awsxNext.Service("inherited", common),
];

export const clusterArn = cluster.arn;
export const providerName = provider.name;
export const taskDefinitionArn = task.taskDefinitionArn;
export const serviceArns = services.map(service => service.serviceArn);
export const serviceNames = services.map(service => service.serviceName);
