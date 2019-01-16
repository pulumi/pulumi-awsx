## Pulumi ECS Components

Pulumi's API's for simplifying workin with ECS. The API currently provides ways to define and configure [`Clusters`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_clusters.html), [`Services`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html), [`TaskDefinitions`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html), and [`Containers`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_instances.html).  The Pulumi API also makes it simple to configure things simply to use [`Fargate`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html) (alleviating the need to manage servers yourself), or just use EC2 for the most control.

To start with, here's a simple example of how one can create a Fargate service:

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/aws-infra";

const listener = new awsx.elasticloadbalancingv2.NetworkListener("nginx", { port: 80 });
const nginx = new awsx.ecs.FargateService("nginx", {
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: "nginx",
                memory: 128,
                portMappings: [listener],
            },
        },
    },
    desiredCount: 2,
});
```

This single call will create a Cluster on your behalf in [The Default VPC](https://github.com/pulumi/pulumi-aws-infra/tree/master/nodejs/aws-infra/ec2#the-default-vpc) for your region.  It will also create an internet-facing [NLB](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html) that will listen for connections and route requests appropriate to spawned instances in the cluster.  Because we have used [`Fargate`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html), there is no need to create any sort of [Auto Scaling Group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/AutoScalingGroup.html) or otherwise specify what sort of machine instances will be run.  Instead, Fargate will manage that for us automatically based on the optional `memory` and `cpu` values we request for our containers.

While this approach manages nearly everything on your behalf, it can often be desirable to control more of what is going on.  To help explain how that works, we'll work from the bottom up to see how each part of your containerized infrastructure can be configured.


