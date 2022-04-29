import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config("aws");
const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config.require("envRegion") }) };


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
}, providerOpts);

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
}, providerOpts);

