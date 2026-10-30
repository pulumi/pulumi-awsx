import * as fs from "node:fs";
import * as path from "node:path";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as awsxNext from "@pulumi/awsx-next";

const config = new pulumi.Config();
const certificateArn = config.get("certificateArn");
const hostname = config.get("hostname");
const additionalCertificates =
  config.getObject<Record<string, string>>("additionalCertificates") ?? {};
if (certificateArn && !hostname) {
  throw new Error(
    "Set hostname and configure its DNS to the ALB when supplying an HTTPS certificate.",
  );
}
if (!certificateArn && Object.keys(additionalCertificates).length > 0) {
  throw new Error("Additional SNI certificates require a primary certificateArn.");
}

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
const port = certificateArn ? 443 : 80;
new aws.vpc.SecurityGroupIngressRule("frontend-ipv4", {
  securityGroupId: frontendGroup.id,
  ipProtocol: "tcp",
  fromPort: port,
  toPort: port,
  cidrIpv4: "0.0.0.0/0",
});
// IPv6 permissions also belong to the caller. This IPv4 example does not prove IPv6 routing;
// an IPv6 client additionally requires a dual-stack ALB, VPC, and subnet configuration.
new aws.vpc.SecurityGroupIngressRule("frontend-ipv6", {
  securityGroupId: frontendGroup.id,
  ipProtocol: "tcp",
  fromPort: port,
  toPort: port,
  cidrIpv6: "::/0",
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
// The caller owns listener creation, TLS, its primary certificate, and its default response.
// The example defaults to HTTP; supply certificateArn and hostname to exercise HTTPS.
const listener = new aws.lb.Listener("listener", {
  loadBalancerArn: alb.arn,
  port,
  protocol: certificateArn ? "HTTPS" : "HTTP",
  certificateArn,
  sslPolicy: certificateArn ? "ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09" : undefined,
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
// The caller gives additional certificates stable resource names, independent of map order.
for (const [name, arn] of Object.entries(additionalCertificates)) {
  new aws.lb.ListenerCertificate(`certificate-${name}`, {
    listenerArn: listener.arn,
    certificateArn: arn,
  });
}

const cluster = new aws.ecs.Cluster("cluster");
// The mismatch preview supplies an ARN to isolate the service provider check.
const taskDefinitionArn =
  config.get("taskDefinitionArn") ??
  new awsxNext.FargateTaskDefinitionV2("task", {
    family: config.get("taskDefinitionFamily"),
    cpuUnits: 256,
    memoryMiB: 512,
    containers: {
      app: {
        image: "public.ecr.aws/docker/library/nginx:stable",
        portMappings: [{ containerPort: 3000 }, { containerPort: 3001 }],
        environment: {
          NGINX_CONFIG: { value: fs.readFileSync(path.join(__dirname, "nginx.conf"), "utf8") },
        },
        command: [
          "sh",
          "-c",
          'printf "%s" "$NGINX_CONFIG" > /etc/nginx/nginx.conf && exec nginx -g "daemon off;"',
        ],
      },
    },
  }).taskDefinitionArn;

export const url = pulumi.interpolate`${certificateArn ? "https" : "http"}://${hostname ?? alb.dnsName}`;

// Each attachment owns a forwarding rule and target group. Both route to the same backend;
// the service permits ALB traffic on the application and health-check ports.
new awsxNext.FargateServiceV2("service", {
  clusterArn: cluster.arn,
  taskDefinition: taskDefinitionArn,
  vpcSubnetIds: vpc.publicSubnetIds,
  assignPublicIp: true,
  loadBalancerAttachments: {
    api: {
      application: {
        containerName: "app",
        containerPort: 3000,
        targetHealthCheck: { path: "/health", port: 3001 },
        listenerArn: listener.arn,
        priority: 10,
        match: { pathPatterns: { values: ["/api/*"] } },
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
});
