# Pulumi Autoscaling Components

AutoScalingGroups (ASGs) allow you to allocate a set of EC2 instances on which to run code (like ECS Services) for a `Cluster`.  Groups can define hard constraints in terms of the minimum, maximum and desired number of instances that should be running.  They can also specify `Schedule`s that control changing these desired values (for example, to scale up on certain days with high expected load), as well as specifying `Policy`s that will adjust how the group scales in response to events happening in the system.

## Creating an AutoScalingGroup

AutoScalingGroups are created for a corresponding `awsx.ecs.Cluster`.  This can be done by either manually creating a cluster, or using `Cluster.getDefault()` to get to the default cluster for the default VPC for the account.  The simplest way to create a cluster is to just do:

```ts
const cluster = new awsx.ecs.Cluster("testing", { vpc });

const autoScalingGroup = cluster.createAutoScalingGroup("testing", {
    templateParameters: { minSize: 10 },
    launchConfigurationArgs: { instanceType: "t2.medium" },
});
```

This will create an ASG that use the private subnets of the VPC, attempting to keep around at least 10 instances running with the specified size.  If you want instances to be allowed access to the internet, this can be done by specifying:

```ts
const cluster = new awsx.ecs.Cluster("testing", { vpc });

const autoScalingGroup = cluster.createAutoScalingGroup("testing", {
    subnetIds: vpc.publicSubnetIds,
    templateParameters: { minSize: 10 },
    launchConfigurationArgs: { instanceType: "t2.medium", associatePublicIpAddress: true },
});
```

Here we place in the public subnets of the VPC and provide `associatePublicIpAddress: true` so that instances will have IPs that are externally reachable.

## Template parameters

The `templateParameters` allows one to control additional aspects of the ASG.  For example, the following are supported:

1. Setting a `maxSize` for the maximum number of instances that can be launched at a time.
2. Controlling how health checks are performed to determine if new instances should be created.
3. Specifying an appropriate `defaultCooldown` period which controls how often the ASG actually scales things.  This cooldown period helps avoid rapid runaway scaling scenarios from happening.

## Launch configuration

The `launchConfiguration` (or `launchConfigurationArgs`) properties help control the configuration
of the actual instances that are launched by the ASG.  A launch configuration is an instance
configuration template that an Auto Scaling group uses to launch EC2 instances. When you create a
launch configuration, you specify information for the instances. Include the ID of the Amazon
Machine Image (AMI), the instance type, a key pair, one or more security groups, and a block device
mapping. If you've launched an EC2 instance before, you specified the same information in order to
launch the instance.

If you don't provide either of these properties, a default configuration will be created on your behalf with basic values set as appropriate.

## Scaling schedules

Scaling based on a schedule allows you to set your own scaling schedule for predictable load changes. For example, every week the traffic to your web application starts to increase on Wednesday, remains high on Thursday, and starts to decrease on Friday. You can plan your scaling actions based on the predictable traffic patterns of your web application. Scaling actions are performed automatically as a function of time and date.

To create a `Schedule` you can do:

```ts
// Schedule the ASG to go up to 20 instances at 6am, and back down to 10 at 10pm.
autoScalingGroup.scaleOnSchedule("scaleUpOnFriday", {
    minSize: 20,
    recurrence: { dayOfWeek: 5 /*friday*/ },
});
autoScalingGroup.scaleOnSchedule("scaleDownOnMonday", {
    minSize: 10,
    recurrence: { dayOfWeek: 1 /*monday*/ },
});
```

Schedules also support normal [cron](https://en.wikipedia.org/wiki/Cron) format strings like so:

```ts
// Schedule the ASG to go up to 20 instances at 6am, and back down to 10 at 10pm.
autoScalingGroup.scaleOnSchedule("scaleUpOnFriday", {
    minSize: 20,
    recurrence: "* * * * 5",
});
autoScalingGroup.scaleOnSchedule("scaleDownOnMonday", {
    minSize: 10,
    recurrence: "* * * * 1",
});
```

## Scaling policies

A more advanced way to scale; scaling policies lets you define parameters that control the scaling process. For example, you have a web application that currently runs on two instances and you want the CPU utilization of the Auto Scaling group to stay at around 50 percent when the load on the application changes. This is useful for scaling in response to changing conditions, when you don't know when those conditions will change.

There are three main ways to scale on demand:

1. [Target Tracking](#target-tracking-scaling).  With target tracking scaling policies, you select a scaling metric and set a target value. Amazon EC2 Auto Scaling creates and manages the CloudWatch alarms that trigger the scaling policy and calculates the scaling adjustment based on the metric and the target value. The scaling policy adds or removes capacity as required to keep the metric at, or close to, the specified target value.

2. [Step Scaling](#step-scaling).  TBD.

### Target tracking scaling

With target tracking scaling policies, you select a scaling metric and set a target value. Amazon
EC2 Auto Scaling creates and manages the CloudWatch alarms that trigger the scaling policy and
calculates the scaling adjustment based on the metric and the target value. The scaling policy adds
or removes capacity as required to keep the metric at, or close to, the specified target value. In
addition to keeping the metric close to the target value, a target tracking scaling policy also
adjusts to the changes in the metric due to a changing load pattern.

AutoScalingGroups provide several predefined scaling metrics.

1. Scaling based on cpu utilization:

```ts
// Try to keep the ASG using around 50% CPU.
autoScalingGroup.scaleToTrackAverageCPUUtilization("keepAround50Percent", {
    targetValue: 50,
});
```

If you only want the ASG to scale up by adding instances, and not have it remove instances when usage falls, you can pass `disableScaleIn: true`.

```ts
autoScalingGroup.scaleToTrackAverageCPUUtilization("scaleDownOnMonday", {
    targetValue: 50,
    disableScaleIn: true,
});
```

2. Scaling based on the average number of bytes sent/received on all network interfaces in this ASG.

```ts
autoScalingGroup.scaleToTrackAverageNetworkIn("scaleDownOnMonday", {
    targetValue: 100000000,
});
autoScalingGroup.scaleToTrackAverageNetworkOut("scaleDownOnMonday", {
    targetValue: 100000000,
});
```

3. Scaling based on the average number of requests completed per `awsx.elasticloadbalancinv2.ApplicationTargetGroup` in the ASG.  In order to do this, the ASG must be informed of that particular `TargetGroup` at creation time. Scaling for `TargetGroup`s is only supported if the `TargetGroup.targetType` is set to `"instance"`.

```ts
const cluster = new awsx.ecs.Cluster("testing");
const loadBalancer = new awsx.elasticloadbalancingv2.ApplicationLoadBalancer("testing", { external: true });

// A simple NGINX service, scaled out over two containers.
const targetGroup = loadBalancer.createTargetGroup("testing", { port: 80, targetType: "instance" });

const autoScalingGroup = cluster.createAutoScalingGroup("testing", {
    targetGroups: [targetGroup],
    subnetIds: awsx.ec2.Vpc.getDefault().publicSubnetIds,
    templateParameters: { minSize: 10 },
    launchConfigurationArgs: { instanceType: "t2.medium", associatePublicIpAddress: true },
});

const policy = autoScalingGroup.scaleToTrackRequestCountPerTarget("onHighRequest", {
    targetValue: 1000,
    targetGroup: targetGroup,
});
```