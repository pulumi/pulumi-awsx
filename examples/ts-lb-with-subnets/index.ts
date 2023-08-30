import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const vpc = new awsx.ec2.Vpc("dev-vpc");

const cluster = new aws.ecs.Cluster("default-cluster");

// // Create a load balancer on port 80 and spin up two instances of Nginx.
const lb = new awsx.lb.ApplicationLoadBalancer("nginx-lb", {
    subnetIds: vpc.publicSubnetIds.apply((x) => x!),
});

const service = new awsx.ecs.FargateService("my-service", {
    cluster: cluster.arn,
    assignPublicIp: true,
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
