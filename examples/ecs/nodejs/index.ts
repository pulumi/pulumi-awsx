import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as ecs from "@pulumi/awsx/ecs";
import * as classic from "@pulumi/awsx/classic";

const vpc = classic.ec2.Vpc.getDefault();

const cluster = new classic.ecs.Cluster("cluster");

// Create a load balancer on port 80 and spin up two instances of Nginx.
const lb = new classic.lb.ApplicationListener("nginx-lb", {
  port: 80,
  targetGroup: new classic.lb.ApplicationTargetGroup("target", {
    port: 80,
    // quicker deployments
    healthCheck: {
      healthyThreshold: 2,
      interval: 5,
      timeout: 2,
      unhealthyThreshold: 2,
      port: "80",
      path: "/",
    },
  }),
});
const targetGroup = lb.defaultTargetGroup!.targetGroup;

const fargateTask = new ecs.FargateTaskDefinition("fargate-task", {
  container: {
    image: "nginx:latest",
    name: "nginx",
    cpu: 512,
    memory: 128,
    essential: true,
    portMappings: [{ targetGroup }],
  },
});

const sg = new awsx.classic.ec2.SecurityGroup("service-sg", {
  vpc: vpc,
  egress: [
    {
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  ingress: [
    {
      fromPort: 80,
      toPort: 80,
      protocol: "tcp",
      sourceSecurityGroupId: lb.loadBalancer.securityGroups[0].id,
    },
  ],
});

const service = new ecs.FargateService(
  "my-service",
  {
    cluster: cluster.cluster.arn,
    taskDefinition: fargateTask.taskDefinition.arn,
    loadBalancers: fargateTask.loadBalancers,
    networkConfiguration: {
      securityGroups: [sg.id],
      subnets: vpc.publicSubnetIds,
      assignPublicIp: true,
    },
  },
  {
    dependsOn: [lb.loadBalancer],
    transforms: [
      (args) => {
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
      },
    ],
  },
);

// Export the load balancer's address so that it's easy to access.
export const url = lb.endpoint.hostname;
