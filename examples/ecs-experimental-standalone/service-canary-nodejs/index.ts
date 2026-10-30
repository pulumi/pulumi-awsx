import * as fs from "node:fs";
import * as path from "node:path";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as awsxNext from "@pulumi/awsx-next";

import { validationFunction, validationLogGroup } from "./validationHook";

const config = new pulumi.Config();
const revision = config.get("revision") ?? "v1";
if (!/^v\d+$/.test(revision)) {
  throw new Error("revision must be a version label such as v1 or v2.");
}
const previousRevision = config.get("previousRevision") ?? "";

// Public task subnets avoid a NAT gateway for this example. Tasks receive public IPs,
// but their service-owned group permits inbound traffic only from the ALB security group.
const vpc = new awsx.ec2.Vpc("vpc", {
  cidrBlock: "10.0.0.0/16",
  numberOfAvailabilityZones: 2,
  natGateways: { strategy: awsx.ec2.NatGatewayStrategy.None },
  subnetSpecs: [{ type: awsx.ec2.SubnetType.Public }],
});

// The caller owns frontend networking; the service manages only task-side ingress.
// Use standalone rules, not inline SecurityGroup.ingress/egress.
const frontendGroup = new aws.ec2.SecurityGroup("frontend", { vpcId: vpc.vpcId });
const port = 80;
new aws.vpc.SecurityGroupIngressRule("frontend-ipv4", {
  securityGroupId: frontendGroup.id,
  ipProtocol: "tcp",
  fromPort: port,
  toPort: port,
  cidrIpv4: "0.0.0.0/0",
});
new aws.vpc.SecurityGroupEgressRule("frontend-egress", {
  securityGroupId: frontendGroup.id,
  ipProtocol: "-1",
  cidrIpv4: "0.0.0.0/0",
});

const alb = new aws.lb.LoadBalancer("alb", {
  loadBalancerType: "application",
  securityGroups: [frontendGroup.id],
  subnets: vpc.publicSubnetIds,
});
// The caller owns the listener and its default response. The service adds forwarding rules.
const listener = new aws.lb.Listener("listener", {
  loadBalancerArn: alb.arn,
  port,
  protocol: "HTTP",
  defaultActions: [
    {
      type: "fixed-response",
      fixedResponse: {
        statusCode: "404",
        contentType: "text/plain",
        messageBody: "listener-default\n",
      },
    },
  ],
});
const cluster = new aws.ecs.Cluster("cluster");
const task = new awsxNext.FargateTaskDefinitionV2("task", {
  family: config.get("taskDefinitionFamily"),
  cpuUnits: 256,
  memoryMiB: 512,
  containers: {
    app: {
      image: "public.ecr.aws/docker/library/nginx:stable",
      portMappings: [{ containerPort: 3000 }, { containerPort: 3001 }],
      environment: {
        NGINX_CONFIG: {
          value: fs
            .readFileSync(path.join(__dirname, "nginx.conf"), "utf8")
            .replaceAll("__REVISION__", `-${revision}`),
        },
      },
      command: [
        "sh",
        "-c",
        'printf "%s" "$NGINX_CONFIG" > /etc/nginx/nginx.conf && exec nginx -g "daemon off;"',
      ],
    },
  },
});
export const url = pulumi.interpolate`http://${alb.dnsName}`;

export const hookLogGroup = validationLogGroup.name;

// This example supplies the ECS invocation role explicitly. The rolling-hook example
// lets the service create it. Neither role is the Lambda execution role.
const invocationRole = new aws.iam.Role("deployment-validation-invocation", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs.amazonaws.com" }),
});
const invokePolicy = new aws.iam.RolePolicy("deployment-validation-invoke", {
  role: invocationRole.name,
  policy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [
      { Effect: "Allow", Action: "lambda:InvokeFunction", Resource: validationFunction.arn },
    ],
  }),
});

// Each attachment owns a forwarding rule and target group. Both route to the same backend;
// the service permits ALB traffic on the application and health-check ports.
new awsxNext.FargateServiceV2(
  "service",
  {
    clusterArn: cluster.arn,
    taskDefinition: task.taskDefinitionArn,
    vpcSubnetIds: vpc.publicSubnetIds,
    assignPublicIp: true,
    deploymentStrategy: {
      canary: {
        // Skip the final bake period to keep this integration test short. Use a
        // production bake period that gives your monitoring time to detect failures.
        bakeTimeMinutes: 0,
        canaryPercent: 50,
        canaryBakeTimeMinutes: 1,
        lambdaHooks: [
          {
            functionArn: validationFunction.arn,
            invocationRoleArn: invocationRole.arn,
            lifecycleStages: ["POST_TEST_TRAFFIC_SHIFT", "PRODUCTION_TRAFFIC_SHIFT"],
            hookDetails: {
              endpoint: url,
              revision,
              previousRevision,
              checks: { enabled: true, paths: ["/api/ping"] },
            },
          },
        ],
      },
    },
    loadBalancerAttachments: {
      api: {
        application: {
          containerName: "app",
          containerPort: 3000,
          targetHealthCheck: { path: "/health", port: 3001 },
          listenerArn: listener.arn,
          priority: 10,
          match: { pathPatterns: { values: ["/api/*"] } },
          testTraffic: {
            match: {
              pathPatterns: { values: ["/api/*"] },
              headers: [{ name: "X-Deployment-Test", values: ["true"] }],
            },
          },
        },
      },
      admin: {
        application: {
          containerName: "app",
          containerPort: 3000,
          targetHealthCheck: { path: "/health", port: 3001 },
          listenerArn: listener.arn,
          priority: 20,
          match: { pathPatterns: { values: ["/admin/*"] } },
        },
      },
    },
  },
  // Referencing the invocation role does not wait for its policy to be attached.
  { dependsOn: [invokePolicy] },
);
