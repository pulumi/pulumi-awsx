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
