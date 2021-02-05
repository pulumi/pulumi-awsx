import * as awsx from "@pulumi/awsx";

const fargateTask = new awsx.ecs.FargateTaskDefinition("fargate-task", {
    containers: {
        application: {
            image: "nginx:latest",
            memory: 128,
            essential: true,
            cpu: 512,
        }
    },
    proxyConfiguration: {
        type: "APPMESH",
        containerName: "application",
        properties: {
            AppPorts: "80",
            EgressIgnoredIPs: "169.254.170.2,169.254.169.254",
            EgressIgnoredPorts: "5500",
            IgnoredUID: "1337",
            IgnoredGID: "999",
            ProxyEgressPort: "15001",
            ProxyIngressPort: "15000",
        }
    }
});

const ec2Task = new awsx.ecs.EC2TaskDefinition("ec2-task", {
    containers: {
        application: {
            image: "nginx:latest",
            memory: 128,
            essential: true,
            cpu: 512,
        }
    },
    proxyConfiguration: {
        type: "APPMESH",
        containerName: "application",
        properties: {
            AppPorts: "80",
            EgressIgnoredIPs: "169.254.170.2,169.254.169.254",
            EgressIgnoredPorts: "5500",
            IgnoredUID: "1337",
            IgnoredGID: "999",
            ProxyEgressPort: "15001",
            ProxyIngressPort: "15000",
        }
    }
});

