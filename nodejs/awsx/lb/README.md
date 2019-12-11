## Pulumi Elastic Load Balancing Components

Pulumi's API for simplifying [Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/).  The API provides a simple way to create either Application (ALB) or Network (NLB) load balancers, and their associated Target Groups and Listeners.  For more details, see [Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html) and [Network Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html).

### Network Load Balancer

To create an NLB

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Creates an NLB associated with the default Vpc for this region.  Pass 'external: true' to make the NLB
// externally accessible
const nlb1 = new awsx.lb.NetworkLoadBalancer("nlb1", { external: true });

// To create an NLB for a different Vpc, simply pass it in:
const vpc = new awsx.ec2.Vpc(...);
const nlb2 = new awsx.lb.NetworkLoadBalancer("nlb2", { vpc, external: true });
```

Once created, an NLB can be used to create both [`Listeners`](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-listeners.html) and [`TargetGroups`](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html).  By default, a Listener needs at least one TargetGroup that it can route requests to.  So, if a Listener is created without specifying a TargetGroup, one will be automatically created.  For example:

```ts
// continuing from above.  Manually create the target group and the listener.
const tg1 = nlb1.createTargetGroup("tg1", { port: 8080 });
const listener1 = tg1.createListener("listener1", { port: 80 });

// or, create a listener and have the target group automatically created.  In this case, the port
// will automatically be the same for the listener and target group.
const listener2 = nlb1.createListener("listener2", { port: 80 });

// in both these cases the 'defaultAction' of the Listeners will be to 'forward' requests to the explicit
// or implicit target group they are associated with.  To have the listener do something different, supply
// a preferred 'defaultAction' manually.  For example:
const listener3 = nlb1.createListener(`redirecthttp`, {
    port: 80,
    protocol: "HTTP",
    defaultAction: {
        type: "redirect",
        redirect: {
            protocol: "HTTPS",
            port: "443",
            statusCode: "HTTP_301",
        },
    },
});
```

Listeners and TargetGroups are automatically setup to operate well with the awsx [`ecs`](https://github.com/pulumi/pulumi-awsx/new/master/nodejs/awsx/ecs) module.  Specifically, once a Listener (or an associated TargetGroup) has been created, it can be used directly by the ECS module to automatically setup the correct information for both an ECS [`Container`](https://github.com/pulumi/pulumi-awsx/blob/0b432e320c6929866038507e997d55c8d8f62bc3/nodejs/awsx/ecs/container.ts#L148) or [`Service`](https://github.com/pulumi/pulumi-awsx/blob/0b432e320c6929866038507e997d55c8d8f62bc3/nodejs/awsx/ecs/service.ts#L22).  Specifically, a Listener or TargetGroup can be provided in a Container definition.  If so, it (and its associated LoadBalancer) will be queried to map the right ports and automatically connect to the load balancer.  This can be done like so:

```ts
// Continuing from above.

// Need a cluster for ecs or fargate services to pull instances from.  This cluster will be
// associated with the default VPC for the region.  To override that, pass in a VPC manually.
const cluster = new awsx.ecs.Cluster("testing");

// Create a listener to handle requests coming in on port 80.  This will automatically create a
// target group that also forwards the requests to targets in it at the same port.
const nginxListener = nlb1.createListener("nginx", { port: 80 });

// Create a Service pointing to the well known 'nginx' image.  Supply the listener we just created
// in the `portMappings` section.  This will both properly connect the service and launched instances
// to the target group.
//
// For a Fargate service just replace this with `new awsx.ecs.FargateService`.
const nginx = new awsx.ecs.EC2Service("examples-nginx", {
    cluster,
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: "nginx",
                memory: 128,
                portMappings: [nginxListener],
            },
        },
    },
    desiredCount: 2,
});
```

## Application Load Balancers

ALBs follow the same pattern above as NLBs.  To create ad use them, simply replace usages of `Network` above with `Application`.  i.e. instead of `new awsx.lb.NetworkLoadBalancer` use `new awsx.lb.ApplicationLoadBalancer`.

For detailed reference documentation, please visit [the API docs](
https://pulumi.io/reference/pkg/nodejs/@pulumi/awsx/lb/).
