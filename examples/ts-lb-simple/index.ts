import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as classic from "@pulumi/awsx/classic";

const vpc = classic.ec2.Vpc.getDefault();

const cluster = new classic.ecs.Cluster("cluster", {
    capacityProviders: ["FARGATE_SPOT"],
    defaultCapacityProviderStrategies: [
        {
            capacityProvider: "FARGATE_SPOT",
            weight: 1,
        },
    ],
});

// // Create a load balancer on port 80 and spin up two instances of Nginx.
const lb = new awsx.lb.ApplicationLoadBalancer("nginx-lb", {
    subnetIds: pulumi.output(vpc.publicSubnetIds),
});

const service = new awsx.ecs.FargateService("my-service", {
    cluster: cluster.cluster.arn,
    taskDefinitionArgs: {
        container: {
            image: "nginx:latest",
            cpu: 512,
            memory: 128,
            essential: true,
            portMappings: [{ targetGroup: lb.defaultTargetGroup }],
        },
    },
    networkConfiguration: {
        subnets: vpc.publicSubnetIds,
        assignPublicIp: true,
    },
});

// Export the load balancer's address so that it's easy to access.
export const url = lb.loadBalancer.dnsName;
