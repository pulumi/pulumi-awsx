## Pulumi ECS Components

Pulumi's API's for simplifying working with ECS. The API currently provides ways to define and configure [`Clusters`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_clusters.html), [`Services`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html), [`TaskDefinitions`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html), and [`Containers`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_instances.html).  The Pulumi API also makes it simple to configure things simply to use [`Fargate`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html) (alleviating the need to manage servers yourself), or just use EC2 for the most control.

To start with, here's a simple example of how one can create a Fargate service:

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const listener = new awsx.lb.NetworkListener("nginx", { port: 80 });
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

This single call will create a Cluster on your behalf in [The Default VPC](https://github.com/pulumi/pulumi-awsx/tree/master/nodejs/awsx/ec2#the-default-vpc) for your region.  It will also create an internet-facing [NLB](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html) that will listen for connections and route requests appropriate to spawned instances in the cluster.  Because we have used [`Fargate`](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html), there is no need to create any sort of [Auto Scaling Group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/AutoScalingGroup.html) or otherwise specify what sort of machine instances will be run.  Instead, Fargate will manage that for us automatically based on the optional `memory` and `cpu` values we request for our containers.

While this approach manages nearly everything on your behalf, it can often be desirable to control more of what is going on.  To help explain how that works, we'll work from the top down up to see how each part of your containerized infrastructure can be configured.

### Load Balancing

The above example shows how service load balanced through an internet-facing [NLB](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html). The pattern of defining a service that is attached to an [NLB](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html) or [ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html) is so common that both `awsx.ecs.FargateService` and `awsx.ecs.EC2Service` provide convenient construction techniques to simplify creating both.

Here's how we can simplify the above using those techniques:

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const nginx = new awsx.ecs.FargateService("nginx", {
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: "nginx",
                memory: 128,
                networkListener: { port: 80 },
            },
        },
    },
    desiredCount: 2,
});
```

Like before, this will create an [awsx.lb.NetworkListener] named `"nginx"`, but will not require that resource to be directly declared beforehand.

The `networkListener:` or `applicationListener:` provided can be fully configured to your needs. This includes adjusting the `awsx.lb.LoadBalancer` and `awsx.lb.TargetGroup` that are needed here.  Those can be configured like so:

```ts
    nginx: {
        image: "nginx",
        memory: 128,
        networkListener: { port: 80, /*more args*/, targetGroup: { /*...*/ }, loadBalancer: { /*...*/ }  },
    },
```

See the respective docs for more details on what can be configured here.

### Clusters

A Cluster defines the infrastructure to run Services and Tasks in.  If a Cluster is not specified when creating Services or running Tasks, then a default one will be created that is confired to use [The Default VPC](https://github.com/pulumi/pulumi-awsx/tree/master/nodejs/awsx/ec2#the-default-vpc) for your region.  Creating a Cluster that uses a different Vpc can be simply done by:

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const vpc = // ... create custom vpc
const cluster = new awsx.ecs.Cluster("custom", { vpc });

const nginx = new awsx.ecs.FargateService("nginx", {
    cluster,
    // ... additional args
});
```

A Cluster created in this manner is ready for use by Fargate.  In order to be used by EC2 though scaling capacity needs to be added to the Cluster.  This can be done simply like so:

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const vpc = // ... create custom vpc
const cluster = new awsx.ecs.Cluster("custom", { vpc });

const asg = cluster.createAutoScalingGroup("custom", {
    templateParameters: { minSize: 20 },
    launchConfigurationArgs: { instanceType: "t2.medium" },
});
```

### Task Definitions

A task definition is required to run Docker containers in Amazon ECS. Some of the parameters you can specify in a task definition include:

   * The Docker image to use with each container in your task
   * How much CPU and memory to use with each task or each container within a task
   * The Docker networking mode to use for the containers in your task
   * The logging configuration to use for your tasks
   * Whether the task should continue to run if the container finishes or fails
   * The command the container should run when it is started
   * Any data volumes that should be used with the containers in the task
   * The IAM role that your tasks should use

You can define multiple containers in a task definition. Tasks can easily be created to run either in Fargate or EC2 like so:

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const vpc = // ... create custom vpc
const cluster = new awsx.ecs.Cluster("custom", { vpc });

// optionally create an auto scaling group for EC2 tasks.

const fargateTask = new awsx.ecs.FargateTaskDefinition("fargate-nginx", {
    containers: {
        nginx: // ...
    },
});

const ec2Task = new awsx.ecs.FargateTaskDefinition("ec2-nginx", {
    containers: {
        nginx: // ...
    },
});
```

A Task Definition can be used to define a Service, or it can be run on demand in a 'fire and forget' manner (for example, from within a Lambda callback). This can be done by calling the `run` method on the Task instance.  This `run` call must be supplied a Cluster to run in.  For example. continuing from above:

```ts
const helloTask = new awsx.ecs.FargateTaskDefinition("hello-world", {
    container: {
        image: "hello-world",
        memory: 20,
    },
});

const api = new aws.apigateway.x.API("examples-containers", {
    routes: [{
        path: "/run",
        method: "GET",
        eventHandler: async (req) => {
            const result = await helloTask.run({ cluster });
        },
    }],
});
```

Additional arguments can be passed to `run` to control how the instance will be run.

### Services

ECS allows you to run and maintain a specified number of instances of a task definition simultaneously in a cluster. This is called a Service. If any of your tasks should fail or stop for any reason, the ECS launches another instance of your task definition to replace it and maintain the desired count of tasks in the service depending on the scheduling strategy used.

Services can be simply be made for Fargate and EC2 like so:

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const vpc = // ... create custom vpc
const cluster = new awsx.ecs.Cluster("custom", { vpc });

// optionally create an auto scaling group for EC2 tasks.

const fargateService = new awsx.ecs.FargateService("fargate-nginx", {
    cluster,
    desiredCount: 2,
    taskDefinitionArgs: {
      containers: {
        nginx: // ...
      },
    },
});

const ec2Service = new awsx.ecs.FargateService("ec2-nginx", {
    cluster,
    desiredCount: 2,
    taskDefinitionArgs: {
      containers: {
        nginx: // ...
      },
    },
});
```

In the case where a Task is both expected to run in a Service and a 'fire and forget' manner, then the following pattern can be used:

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const vpc = // ... create custom vpc
const cluster = new awsx.ecs.Cluster("custom", { vpc });

// optionally create an auto scaling group for EC2 tasks.

const fargateTask = new awsx.ecs.FargateTaskDefinition("fargate-nginx", {
    containers: {
        nginx: // ...
    },
});

const fargateService = fargateTask.createService("fargate-nginx", {
    cluster,
    desiredCount: 2,
});
```

### Containers

A Task Definition is built from a collection of [Container Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#container_definitions).  These definitions are used to specify the docker configuration for the container instances that are launched.  The simplest way to specify the docker image to run is to provide a string to the 'image' parameter of the container definition.  This string is either the name of an image on [DockerHub](https://hub.docker.com/), or an [ECR Repository](https://docs.aws.amazon.com/AmazonECR/latest/userguide/Repositories.html).

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const listener = new awsx.lb.NetworkListener("listener", { port: 80 });
const task = new awsx.ecs.FargateTaskDefinition("task", {
    containers: {
        nginx: {
            image: "nginx",
            memory: 128,
            portMappings: [listener],
        },
    },
});
```

However, `image` is far more flexible than that.  Beyond just accepting a string a [ContainerImageProvider](https://github.com/pulumi/pulumi-awsx/blob/8d651854ba3821644eabff66c0f6fe6d85e61160/nodejs/awsx/ecs/container.ts#L188) can also be provided.  Instances of this interface can be used to dynamically compute and pass in an ECR repository path.  Pulumi provides several convenient ways to do this.

For example `fromPath` will run a Docker build in that path, push the result up to an ECR repository, and then pass the repostory path to the container:

```ts
const task = new awsx.ecs.FargateTaskDefinition("task", {
    containers: {
        nginx: {
            image: awsx.ecs.Image.fromPath(/*localPath*/"..."),
            // ...
        },
    },
});
```

For more control over the Docker invocation `fromDockerBuild` an be used like so:

```ts
const task = new awsx.ecs.FargateTaskDefinition("task", {
    containers: {
        nginx: {
            image: awsx.ecs.Image.fromDockerBuild({
                    context: "./app",
                    dockerfile: "./app/Dockerfile-multistage",
                    cacheFrom: {stages: ["build"]},
                }),
            // ...
        },
    },
});
```

Finally, Pulumi offers a way to create a Container from a callback function.  This allows for an infrastructure setup where the code that runs in a container is itself supplied as code directly in the Pulumi application like so.  This can be setup like so:

```ts
const listener =
    new awsx.lb.NetworkTargetGroup("custom", { port: 8080 })
               .createListener("custom", { port: 80 });

const service = new awsx.ecs.EC2Service("custom", {
    cluster,
    desiredCount: 2,
    taskDefinitionArgs: {
        containers: {
            webserver: {
                memory: 128,
                portMappings: [listener],
                image: awsx.ecs.Image.fromFunction(() => {
                    const rand = Math.random();
                    const http = require("http");
                    http.createServer((req: any, res: any) => {
                        res.end(`Hello, world! (from ${rand})`);
                    }).listen(8080);
                }),
            },
        },
    },
});
```
