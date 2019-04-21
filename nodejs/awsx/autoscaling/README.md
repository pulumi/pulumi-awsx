# Pulumi Autoscaling Components

AutoScalingGroups (ASGs) allow you to allocate a set of EC2 instances on which to run code (like ECS Services) for a `Cluster`.  Groups can define hard constraints in terms of the minimum, maximum and desired number of instances that should be running.  They can also specify [Scaling Schedules](#scaling-schedules) that control changing these desired values (for example, to scale up on certain days with high expected load), as well as specifying [Scaling Policies](#scaling-policies) that will adjust how the group scales in response to events happening in the system.

## Creating an AutoScalingGroup

AutoScalingGroups are created for a corresponding `awsx.ecs.Cluster`.  This can be done by either manually creating a cluster, or using `Cluster.getDefault()` to get to the default cluster for the default VPC for the account.  The simplest way to create a `AutoScalingGroup` is to just do:

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
// Schedule the ASG to go up to 20 instances on Friday and back down to 10 on Monday.
autoScalingGroup.scaleOnSchedule("scaleUpOnFriday", {
    minSize: 20,
    recurrence: { dayOfWeek: "Friday" },
});
autoScalingGroup.scaleOnSchedule("scaleDownOnMonday", {
    minSize: 10,
    recurrence: { dayOfWeek: "Monday" },
});
```

Schedules also support normal [Cron](https://en.wikipedia.org/wiki/Cron) format strings like so:

```ts
// Schedule the ASG to go up to 20 instances on Friday and back down to 10 on Monday.
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

A more advanced way to scale; scaling policies lets you define parameters that control the scaling process. For example, you could a web application that currently runs on two instances and you want the CPU utilization of the Auto Scaling group to stay at around 50 percent when the load on the application changes. This is useful for scaling in response to changing conditions, when you don't necessarily know when those conditions will change.

There are two main ways to scale on demand:

1. [Target Tracking](#target-tracking-scaling).  With target tracking scaling policies, you select a
   scaling metric and set a target value. Amazon EC2 Auto Scaling creates and manages the CloudWatch
   alarms that trigger the scaling policy and calculates the scaling adjustment based on the metric
   and the target value. The scaling policy adds or removes capacity as required to keep the metric
   at, or close to, the specified target value.

2. [Step Scaling](#step-scaling).  With step scaling, you choose scaling metrics and threshold
   values for the CloudWatch alarms that trigger the scaling process as well as define how your
   scalable target should be scaled when a threshold is in breach for a specified number of
   evaluation periods. Step scaling policies increase or decrease the current capacity of a scalable
   target based on a set of scaling adjustments, known as step adjustments. The adjustments vary
   based on the size of the alarm breach.

### Target tracking scaling

With target tracking scaling policies, you select a scaling metric and set a target value. Amazon
EC2 Auto Scaling creates and manages the CloudWatch alarms that trigger the scaling policy and
calculates the scaling adjustment based on the metric and the target value. The scaling policy adds
or removes capacity as required to keep the metric at, or close to, the specified target value. In
addition to keeping the metric close to the target value, a target tracking scaling policy also
adjusts to the changes in the metric due to a changing load pattern.

#### Predefined target tracking scaling

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

#### Custom metric target tracking scaling

On top of the predefined targets defined above, you can also scale to any arbitrary
[awsx.cloudwatch.Metric].  Note: not all metrics work for target tracking. This can be important
when you are specifying a customized metric. The metric must be a valid utilization metric and
describe how busy an instance is. The metric value must increase or decrease proportionally to the
number of instances in the Auto Scaling group. That's so the metric data can be used to
proportionally scale out or in the number of instances.

We recommend that you scale on Amazon EC2 instance metrics with a 1-minute frequency because that
ensures a faster response to utilization changes. Scaling on metrics with a 5-minute frequency can
result in slower response times and scaling on stale metric data. By default, Amazon EC2 instances
are enabled for basic monitoring, which means metric data for instances is available at 5-minute
intervals. You can enable detailed monitoring to get metric data for instances at 1-minute
frequency. For more information, see
[Configure-Monitoring-for-Auto-Scaling-Instances](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-instance-monitoring.html#enable-as-instance-metrics).

```ts
// Scale the ASG based on average memory utilization of a service.
// Try to keep enough instances to keep things around 50% memory utilization.
autoScalingGroup.scaleToTrackMetric("keepAround50Percent", {
    metric: awsx.ecs.metrics.memoryUtilization({ service, statistic: "Average", unit: "Percent" }),
    targetValue: 50,
});
```

### Step scaling

Step scaling policies increase or decrease the current capacity of your Auto Scaling group based on
a set of scaling adjustments, known as step adjustments. The adjustments vary based on the size of
the alarm breach.

For example, consider the following StepScaling description for an ASG that has both a current
capacity and a desired capacity of 10. The current and desired capacity is maintained while the
aggregated metric value is greater than 40 and less than 60.

```ts
const autoScalingGroup = cluster.createAutoScalingGroup("testing", {
    templateParameters: { minSize: 2, desiredCapacity: 10 },
    launchConfigurationArgs: { instanceType: "t2.medium" },
});

autoScalingGroup.scaleInSteps("scale-in-out", {
    metric: awsx.ecs.metrics.memoryUtilization({ service, statistic: "Average", unit: "Percent" }),
    adjustmentType: "PercentChangeInCapacity",
    steps: {
        lower: [{ value: 30, adjustment: -30 }, { value: 40, adjustment: -10 }],
        upper: [{ value: 60, adjustment: 10 }, { value: 70, adjustment: 30 }]
    },
};
```

This represents the following scaling strategy:

```
Memory utilization:

0%               30%    40%          60%     70%               100%
-------------------------------------------------------------------
|       -30%      | -10% | Unchanged  | +10%  |       +30%        |
-------------------------------------------------------------------
```

This will end up setting two alarms for this metric.  One for when the metric goes above 60%, and
one where it goes below.  Depending on which step range the value is in when the alarm fires, the
ASG will scale accordingly.  Because we've chosen `"PercentChangeInCapacity"` as our adjustment type, a value of 65% would scale the ASG up by 10%, while a value of 85% would scale the ASG up by 30%.

If the metric value gets to 60, Auto Scaling increases the desired capacity of the group by 1, to
11. That's based on the second step adjustment of the scale-out policy (add 10 percent of 10). After
the new capacity is added, Application Auto Scaling increases the current capacity to 11. If the
metric value rises to 70 even after this increase in capacity, Application Auto Scaling increases
the target capacity by 3, to 14. That's based on the third step adjustment of the scale-out policy
(add 30 percent of 11, 3.3, rounded down to 3).

If the metric value gets to 40, Application Auto Scaling decreases the target capacity by 1, to
13, based on the second step adjustment of the scale-in policy (remove 10 percent of 14, 1.4,
rounded down to 1). If the metric value falls to 30 even after this decrease in capacity,
Application Auto Scaling decreases the target capacity by 3, to 10, based on the third step
adjustment of the scale-in policy (remove 30 percent of 13, 3.9, rounded down to 3).

Other adjustment types are possible as well.  The full list is:

1. "ChangeInCapacity".  This increases or decreases the current capacity of the group by the
   specified number of instances. A positive value increases the capacity and a negative adjustment
   value decreases the capacity.  For example: If the current capacity of the group is 3 instances
   and the adjustment is 5, then when this policy is performed, there are 5 instances added to the
   group for a total of 8 instances.

2. "ExactCapacity".  This changes the current capacity of the group to the specified number of instances. Specify a positive value with this adjustment type.  For example: If the current capacity of the group is 3 instances and the adjustment is 5, then when this policy is performed, the capacity is set to 5 instances.

3. "PercentChangeInCapacity".  As shown above. Increment or decrement the current capacity of the
   group by the specified percentage. A positive value increases the capacity and a negative value
   decreases the capacity. If the resulting value is not an integer, it is rounded.  See [step
   scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-simple-step.html for
   more) details.  With "PercentChangeInCapacity", you can also specify the minimum number of
   instances to scale using the `minAdjustmentMagnitude` parameter.
