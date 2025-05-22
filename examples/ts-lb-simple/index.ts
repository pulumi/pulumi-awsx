import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Create VPC for the LB and ECS service
const vpc = new awsx.ec2.Vpc("test-vpc", {
    subnetSpecs: [
      { type: "Public" }
    ],
    natGateways: {
      strategy: "None",
    }
  });

const cluster = new aws.ecs.Cluster("default-cluster");

// Create a load balancer on port 80 and spin up two instances of Nginx.
const lb = new awsx.lb.ApplicationLoadBalancer("nginx-lb", {
    subnets: vpc.subnets,
  });

// Create a security group for the service that only allows ingress from the LB
const serviceSg = new aws.ec2.SecurityGroup(`test-service-sg`, {
    vpcId: vpc.vpcId,
    ingress: [
      {
        protocol: '-1',
        fromPort: 0,
        toPort: 0,
        securityGroups: [lb.defaultSecurityGroup.apply(sg => sg!.id)],
      },
    ],
    egress: [
      {
        protocol: '-1',
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'],
      }
    ]
  });

const service = new awsx.ecs.FargateService("my-service", {
    cluster: cluster.arn,
    networkConfiguration: {
        assignPublicIp: true,
        securityGroups: [serviceSg.id],
        subnets: vpc.publicSubnetIds,
      },
    taskDefinitionArgs: {
        container: {
            image: "nginx:latest",
            name: "nginx",
            cpu: 512,
            memory: 128,
            essential: true,
            portMappings: [
                {
                    containerPort: 80,
                    targetGroup: lb.defaultTargetGroup,
                },
            ],
        },
    },
});

// Export the load balancer's address so that it's easy to access.
export const url = lb.loadBalancer.dnsName;
