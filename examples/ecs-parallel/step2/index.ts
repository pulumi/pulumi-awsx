import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const image = "docker.io/memcached:1.6.29"

const clusterA = new aws.ecs.Cluster("cluster-a", {});
const clusterB = new aws.ecs.Cluster("cluster-b", {});

for (let i = 0; i < 5; i++) {
    new awsx.ecs.FargateService(`cluster-a-service-${i}`, {
        cluster: clusterA.arn,
        assignPublicIp: true,
        desiredCount: 1,
        taskDefinitionArgs: {
            container: {
                name: `cluster-a-service-${i}`,
                image,
                cpu: 128,
                memory: 512,
                essential: true,
            },
        },
        forceNewDeployment: true,
        triggers: {
            redeployment: Date.now().toString(),
        }
    });
}

for (let i = 0; i < 5; i++) {
    new awsx.ecs.FargateService(`cluster-b-service-${i}`, {
        cluster: clusterB.arn,
        assignPublicIp: true,
        desiredCount: 1,
        taskDefinitionArgs: {
            container: {
                name: `cluster-b-service-${i}`,
                image,
                cpu: 128,
                memory: 512,
                essential: true,
            },
        },
        forceNewDeployment: true,
        triggers: {
            redeployment: Date.now().toString(),
        }
    });
}
