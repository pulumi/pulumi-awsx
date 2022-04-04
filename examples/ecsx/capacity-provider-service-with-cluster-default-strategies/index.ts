import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as ecsx from "@pulumi/awsx/ecsx";

const vpc = awsx.ec2.Vpc.getDefault();

const cluster = new awsx.ecs.Cluster("cluster", {
    capacityProviders: ["FARGATE_SPOT"],
    defaultCapacityProviderStrategies: [
        {
            capacityProvider: "FARGATE_SPOT",
            weight: 1,
        },
    ],
});

// // Create a load balancer on port 80 and spin up two instances of Nginx.
const lb = new awsx.lb.ApplicationListener("nginx-lb", { port: 80 });
const targetGroup = lb.defaultTargetGroup!.targetGroup;

const fargateTask = new ecsx.FargateTaskDefinition("fargate-task", {
    container: {
        image: "nginx:latest",
        cpu: 512,
        memory: 128,
        essential: true,
        portMappings: [{ targetGroup }],
    },
});

const service = new ecsx.FargateService("my-service", {
    cluster: cluster.cluster.arn,
    taskDefinition: fargateTask.taskDefinition.arn,
    loadBalancers: fargateTask.loadBalancers,
    networkConfiguration: {
        subnets: vpc.publicSubnetIds,
        assignPublicIp: true,
    },
});

// Export the load balancer's address so that it's easy to access.
export const url = lb.endpoint.hostname;
