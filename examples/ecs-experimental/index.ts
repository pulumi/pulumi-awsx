import * as pulumi from "@pulumi/pulumi";
import * as aws from '@pulumi/aws';
import * as awsx from "@pulumi/awsx";
import * as awsxx from '@pulumi/awsx/experimental';

const vpc = new awsx.ec2.Vpc('vpc', {
  subnetStrategy: awsx.ec2.SubnetAllocationStrategy.AutoMerge,
  natGateways: {
    strategy: awsx.ec2.NatGatewayStrategy.Single,
  },
  subnetSpecs: [
    {
      type: awsx.ec2.SubnetType.Private,
    },
    {
      type: awsx.ec2.SubnetType.Public,
    },
  ]
})


const albSg = new aws.ec2.SecurityGroup('test-sg', {
  vpcId: vpc.vpcId,
});

const alb = new awsx.lb.ApplicationLoadBalancer('test-lb', {
  securityGroups: [albSg.id],
  defaultTargetGroup: {
    port: 8080,
    protocol: 'HTTP',
    vpcId: vpc.vpcId,
  },
  listener: {
    port: 80,
    protocol: 'HTTP',
  },
  subnetIds: vpc.publicSubnetIds,
});

const logGroup1 = new aws.cloudwatch.LogGroup('group');
const logGroup = new awsxx.cloudwatch.LogGroup('log-group', {
  existingLogGroupName: logGroup1.id,
});
const fargateTask = new awsxx.ecs.FargateTaskDefinitionV2('fargate-task', {
  containers: {
    app: {
      image: 'nginx:latest',
      portMappings: [{ containerPort: 80 }],
      logging: {
        cloudwatch: {
          streamPrefix: 'app',
          logGroup: logGroup,
        },
      },
    },
  },
  cpu: 256,
  memory: 512,
});


const sg = new aws.ec2.SecurityGroup('test-security-group', {
  vpcId: vpc.vpcId,
});

new aws.vpc.SecurityGroupIngressRule('alb-ingress', {
  ipProtocol: 'tcp',
  securityGroupId: sg.id,
  toPort: 80,
  fromPort: 80,
  referencedSecurityGroupId: albSg.id,
})

const cluster = new aws.ecs.Cluster('test-cluster', {});
new awsx.ecs.FargateService('test-service', {
  cluster: cluster.arn,
  deploymentCircuitBreaker: {
    enable: true,
    rollback: true,
  },
  loadBalancers: [
    {
      containerName: 'app',
      containerPort: 8080,
      targetGroupArn: alb.defaultTargetGroup.arn,
    },
  ],
  deploymentConfiguration: {
    bakeTimeInMinutes: '3',
    strategy: 'LINEAR',
    linearConfiguration: {
      stepBakeTimeInMinutes: '3',
      stepPercent: 50,
    },
  },
  networkConfiguration: {
    subnets: vpc.privateSubnetIds,
    securityGroups: [sg.id],
  },
  enableEcsManagedTags: true,
  deploymentMinimumHealthyPercent: 50,
  taskDefinition: fargateTask.taskDefinitionArn,
  deploymentMaximumPercent: 100,
}, {
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
});

// Export the load balancer's address so that it's easy to access.
export const url = alb.loadBalancer.dnsName;
