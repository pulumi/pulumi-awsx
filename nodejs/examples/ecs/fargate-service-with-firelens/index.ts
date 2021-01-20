import * as awsx from "@pulumi/awsx";

const cluster = new awsx.ecs.Cluster("cluster");

// Create a load balancer on port 80 and spin up two instances of Nginx.
const lb = new awsx.lb.ApplicationListener("nginx-lb", { port: 80 });

const fargateTask = new awsx.ecs.FargateTaskDefinition(
    `taskdefinition-firelens`,
    {
        logGroup: null,
        containers: {
            container: {
                image: "nginx",
                essential: true,
                memory: 128,
                portMappings: [lb],
                logConfiguration: {
                    logDriver: "awsfirelens",
                    options: {
                        Name: "cloudwatch",
                        region: "us-west-2",
                        log_group_name: "firelens-fluent-bit",
                        auto_create_group: "true",
                        log_stream_prefix: "from-fluent-bit",
                    },
                },
            },
            log_router: {
                image:
                    "public.ecr.aws/aws-observability/aws-for-fluent-bit:latest",
                firelensConfiguration: {
                    type: "fluentbit",
                },
                logConfiguration: {
                    logDriver: "awslogs",
                    options: {
                        "awslogs-group": "firelens-container",
                        "awslogs-region": "us-west-2",
                        "awslogs-create-group": "true",
                        "awslogs-stream-prefix": "firelens",
                    },
                },
            },
        },
    })

const service = new awsx.ecs.FargateService("my-service", {
    cluster: cluster,
    taskDefinition: fargateTask,
    desiredCount: 1,
});

// Export the load balancer's address so that it's easy to access.
export const url = lb.endpoint.hostname;
