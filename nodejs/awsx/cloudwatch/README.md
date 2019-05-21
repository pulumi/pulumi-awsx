# Pulumi Cloudwatch Components

Amazon CloudWatch monitors your Amazon Web Services (AWS) resources and the applications you run on AWS in real time. You can use Pulumi's CloudWatch components to collect and track [metrics](#Metrics), which are variables you can measure for your resources and applications.

The CloudWatch home page automatically displays metrics about every AWS service you use. You can additionally create custom [dashboards](#Dashboards) to display metrics about your custom applications, and display custom collections of metrics that you choose.

You can create [alarms](#Alarms) which watch metrics and send notifications or automatically make changes to the resources you are monitoring when a threshold is breached. For example, you can monitor the CPU usage and disk reads and writes of your Amazon EC2 instances and then use this data to determine whether you should launch additional instances to handle increased load. You can also use this data to stop under-used instances to save money.

With CloudWatch, you gain system-wide visibility into resource utilization, application performance, and operational health.

## Metrics

[Metric](https://github.com/pulumi/pulumi-awsx/blob/27e8d976c2bb4e856937af90ad2633b6ad11e568/nodejs/awsx/cloudwatch/metric.ts#L46) resources are the fundamental concept in CloudWatch. A metric represents a time-ordered set of data points that are published to CloudWatch. Think of a metric as a variable to monitor, and the data points as representing the values of that variable over time. For example, the CPU usage of a particular EC2 instance is one metric provided by Amazon EC2. The data points themselves can come from any application or business activity from which you collect data.

AWS services send metrics to CloudWatch, and you can send your own custom metrics to CloudWatch. You can add the data points in any order, and at any rate you choose. You can retrieve statistics about those data points as an ordered set of time-series data.

Metrics exist only in the region in which they are created. Metrics cannot be deleted, but they automatically expire after 15 months if no new data is published to them. Data points older than 15 months expire on a rolling basis; as new data points come in, data older than 15 months is dropped.

Metrics are uniquely defined by a name, a namespace, and zero or more dimensions. Each data point in a metric has a time stamp, and (optionally) a unit of measure. You can retrieve statistics from CloudWatch for any metric.

see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Metric for more details.

### Predefined metrics

Most commonly, applications will want to work with existing metrics produced by AWS services.  These metrics are exposed through the corresponding for awsx module in a submodule called `metrics`.  For example:

```ts
const func = new aws.lambda.CallbackFunction(...);
const funcMetric = awsx.lambda.metrics.duration({ function: func, unit: "Seconds" });
```

In this example, this will return the metric giving information about how long each invocation of this function takes, in seconds.  Metrics sometimes relate to an entire service, or (like in the above example) will be tied to some resource or subset of resources.  When obtaining a metric, it's possible to specify the following:

1. The `period` of the metric. This specifies over what time period the data will be collected.
2. The `statistic` to be collected.  For example, asking for the `Average`, or `Maximum` value of that metric over the requested period.
3. The `unit` the metric should be collected in.  For example, for bandwidth, `Megabytes/Second`.

Not all of these can be controlled for a particular metric, and not all values are legal for any given metric.  For example, some metrics may not support collecting the `Maximum` statistic.  See the docs for each individual Metric for more information on what is specifiable or not.

## Alarms

You can create a CloudWatch alarm that watches a single CloudWatch metric. The alarm performs one or more actions based on the value of the metric or expression relative to a threshold over a number of time periods. The action can be an Amazon EC2 action, an Amazon EC2 Auto Scaling action, or a notification sent to an Amazon SNS topic.

You can also add alarms to CloudWatch dashboards and monitor them visually. When an alarm is on a dashboard, it turns red when it is in the ALARM state, making it easier for you to monitor its status proactively.

Alarms invoke actions for sustained state changes only. CloudWatch alarms do not invoke actions simply because they are in a particular state, the state must have changed and been maintained for a specified number of periods.

After an alarm invokes an action due to a change in state, its subsequent behavior depends on the type of action that you have associated with the alarm. For Amazon EC2 Auto Scaling actions, the alarm continues to invoke the action for every period that the alarm remains in the new state. For Amazon SNS notifications, no additional actions are invoked. 

When creating an alarm, the following can be specified:

1. `threshold`.  The value to compare the metric value against. 
2. `comparisonOperator`.  The type of comparison that should be made between the metric value and the threshold value.  The default is `"GreaterThanOrEqualToThreshold"`.
3. `evaluationPeriods`.  The number of periods over which data is compared to the specified threshold.

To create an alarm from a metric:

```ts
const func = new aws.lambda.CallbackFunction(...);
const funcMetric = awsx.lambda.metrics.duration({ function: func, period: 300, unit: "Seconds" });
const alarm = funcMetric.createAlarm("alarm", {
    threshold: 120,
    evaluationPeriods: 2,
});
```

To report the alarm to an SNS Topic:

```ts
const alarm = funcMetric.createAlarm("alarm", {
    threshold: 120,
    evaluationPeriods: 2,
    alarmActions: [someTopic],
});
```

See [Autoscaling Scaling Policies](https://github.com/pulumi/pulumi-awsx/tree/master/nodejs/awsx/autoscaling#scaling-policies) for more details on easily connecting metric changes to autoscaling group changes.

## Dashboards

Amazon CloudWatch dashboards are customizable home pages in the CloudWatch console that you can use to monitor your resources in a single view, even those resources that are spread across different Regions. You can use CloudWatch dashboards to create customized views of the metrics and alarms for your AWS resources.

With dashboards, you can create the following:

1. A single view for selected metrics and alarms to help you assess the health of your resources and applications across one or more regions. You can select the color used for each metric on each graph, so that you can easily track the same metric across multiple graphs.
2. An operational playbook that provides guidance for team members during operational events about how to respond to specific incidents.
3. A common view of critical resource and application measurements that can be shared by team members for faster communication flow during operational events.

### Widgets

Dashboards are created from [Widgets](#Widgets) that are then automatically placed on a 24 unit wide, infinitely tall grid, based on flow constraints.  When creating widgets, a desired Width-x-Height cab be supplied (otherwise a default size of 6x6 is used).  Widgets can then be related to other widgets by either placing them in a [Column](https://github.com/pulumi/pulumi-awsx/blob/27e8d976c2bb4e856937af90ad2633b6ad11e568/nodejs/awsx/cloudwatch/widgets_flow.ts#L96) or in a [Row](https://github.com/pulumi/pulumi-awsx/blob/27e8d976c2bb4e856937af90ad2633b6ad11e568/nodejs/awsx/cloudwatch/widgets_flow.ts#L130).  Widgets placed in a column can flow veritically as far as necessary.  Widgets placed in a row will wrap automatically after 24 grid spaces.

#### Text widgets

You can place a simple piece of text on the dashboard using a [Text Widget](https://github.com/pulumi/pulumi-awsx/blob/27e8d976c2bb4e856937af90ad2633b6ad11e568/nodejs/awsx/cloudwatch/widgets_simple.ts#L127).  These can contain markdown and will be rendered by the dashboard in the requested location and size.

#### Space widgets

The [Space Widget](https://github.com/pulumi/pulumi-awsx/blob/27e8d976c2bb4e856937af90ad2633b6ad11e568/nodejs/awsx/cloudwatch/widgets_simple.ts#L92) acts as a simple mechanism to place a gap (with a desired Width-x-Height) in between other widgets.


#### Metric widgets

The most common widgets that will be added to a Dashboard are 'metric' widgets.  i.e. widgets that display the latest reported values of some metric.  These metrics can be shown on the dashboard as either a [ine-graph](https://github.com/pulumi/pulumi-awsx/blob/27e8d976c2bb4e856937af90ad2633b6ad11e568/nodejs/awsx/cloudwatch/widgets_graph.ts#L64), [stacked-graph](https://github.com/pulumi/pulumi-awsx/blob/27e8d976c2bb4e856937af90ad2633b6ad11e568/nodejs/awsx/cloudwatch/widgets_graph.ts#L75), or as a [single-number](https://github.com/pulumi/pulumi-awsx/blob/27e8d976c2bb4e856937af90ad2633b6ad11e568/nodejs/awsx/cloudwatch/widgets_graph.ts#L86).  Creating these can be done like so:

```ts
// Get the metric for the lambda that processing our topic requests.
const funcMetric = awsx.lambda.metrics.duration({ function: func });

// Also create a dashboard to track this.
const dashboard = new awsx.cloudwatch.Dashboard("TopicData", {
    widgets: [
        new awsx.cloudwatch.SingleNumberMetricWidget({
            title: "Requests/Minute",
            width: 10,
            metrics: awsx.lambda.metrics.invocations({
                function: func,
                unit: "Count",
                statistic: "Average",
                period: 60,
            }),
        }),
        new awsx.cloudwatch.LineGraphMetricWidget({
            title: "Lambda duration",
            width: 14,

            // Log our different p90/p95/p99 latencies
            metrics: [
                funcMetric.with({ extendedStatistic: 90, label: "Duration p90" }),
                funcMetric.with({ extendedStatistic: 95, label: "Duration p95" }),
                funcMetric.with({ extendedStatistic: 98, label: "Duration p99" }),
            ],
        }),
    ],
});
```

Graph widgets can also have a line on them showing the breaching threshold for a specific alarm using `annotations`.  This can be done like so:


```ts
// Create an alarm if this lambda takes more than 1000ms to complete in a period of 10 minutes over
// at least five periods in a row.
const funcAlarm1 = funcMetric.with({ unit: "Milliseconds", period: 600 })
                             .createAlarm("SlowUrlProcessing", { threshold: 1000, evaluationPeriods: 5 });

// Also create a dashboard to track this.
const dashboard = new awsx.cloudwatch.Dashboard("TopicData", {
    widgets: [
        ...,
        new awsx.cloudwatch.LineGraphMetricWidget({
            title: "Lambda duration",
            width: 14,

            // Place a line on the graph to indicate where our alarm will be triggered.
            annotations: new awsx.cloudwatch.HorizontalAnnotation(funcAlarm1),

            // Log our different p90/p95/p99 latencies
            metrics: [
                funcMetric.with({ extendedStatistic: 90, label: "Duration p90" }),
                funcMetric.with({ extendedStatistic: 95, label: "Duration p95" }),
                funcMetric.with({ extendedStatistic: 98, label: "Duration p99" }),
            ],
        }),
    ],
});
```

More complex widget customization is possible.  See the invidual types and arguments in the [Cloudwatch API](https://pulumi.io/reference/pkg/nodejs/@pulumi/awsx/cloudwatch/) for more details.
