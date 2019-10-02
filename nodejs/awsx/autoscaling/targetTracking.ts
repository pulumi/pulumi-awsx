// Copyright 2016-2018, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as x from "..";

import { AutoScalingGroup } from "./autoscaling";

/**
 * See https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_PredefinedMetricSpecification.html
 * for full details.
 *
 * @internal
 */
type PredefinedMetricType =
    /** Average CPU utilization of the Auto Scaling group.  */
    "ASGAverageCPUUtilization" |
    /** Average number of bytes received on all network interfaces by the Auto Scaling group. */
    "ASGAverageNetworkIn" |
    /** Average number of bytes sent out on all network interfaces by the Auto Scaling group. */
    "ASGAverageNetworkOut" |
    /** Number of requests completed per target in an Application Load Balancer or a Network Load Balancer target group */
    "ALBRequestCountPerTarget";

export interface TargetTrackingPolicyArgs {
    /**
     * The estimated time, in seconds, until a newly launched instance will contribute CloudWatch
     * metrics. Without a value, AWS will default to the group's specified cooldown period.
     */
    estimatedInstanceWarmup?: pulumi.Input<number>;

    /**
     * Indicates whether scaling in by the target tracking scaling policy is disabled. If scaling in
     * is disabled, the target tracking scaling policy doesn't remove instances from the Auto
     * Scaling group. Otherwise, the target tracking scaling policy can remove instances from the
     * Auto Scaling group.  Defaults to [false] if unspecified.
     */
    disableScaleIn?: pulumi.Input<boolean>;

    /**
     * The target value for the metric.
     */
    targetValue: pulumi.Input<number>;
}

export interface ApplicationTargetGroupTrackingPolicyArgs extends TargetTrackingPolicyArgs {
    /**
     * The target group to scale [AutoScalingGroup] in response to number of requests to.
     * This must be a [TargetGroup] that the [AutoScalingGroup] was created with.  These can
     * be provided to the [AutoScalingGroup] using [AutoScalingGroupArgs.targetGroups].
     */
    targetGroup: x.lb.ApplicationTargetGroup;
}

/**
 * Represents a predefined metric for a target tracking scaling policy to use with Amazon EC2 Auto
 * Scaling.
 *
 * @internal
 */
interface PredefinedMetricTargetTrackingPolicyArgs extends TargetTrackingPolicyArgs {
    /**
     * The metric type.
     */
    predefinedMetricType: pulumi.Input<PredefinedMetricType>;

    /**
     * Identifies the resource associated with the metric type.
     */
    resourceLabel?: pulumi.Input<string>;
}

/**
 * Represents a CloudWatch metric of your choosing for a target tracking scaling policy to use with
 * Amazon EC2 Auto Scaling.
 *
 * To create your customized metric specification:
 *
 *  * Add values for each required parameter from CloudWatch. You can use an existing metric, or a
 *    new metric that you create. To use your own metric, you must first publish the metric to
 *    CloudWatch. For more information, see
 *    [Publish-Custom-Metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html)
 *    in the Amazon CloudWatch User Guide.
 *
 *  * Choose a metric that changes proportionally with capacity. The value of the metric should
 *    increase or decrease in inverse proportion to the number of capacity units. That is, the value
 *    of the metric should decrease when capacity increases.
 */
export interface CustomMetricTargetTrackingPolicyArgs extends TargetTrackingPolicyArgs {
    /** The metric to track */
    metric: x.cloudwatch.Metric;
}

/** @internal */
export function createPolicy(
        name: string, group: AutoScalingGroup,
        args: TargetTrackingPolicyArgs,
        targetTrackingConfiguration: aws.autoscaling.PolicyArgs["targetTrackingConfiguration"],
        opts: pulumi.ComponentResourceOptions = {}) {

    return new aws.autoscaling.Policy(name, {
        policyType: "TargetTrackingScaling",
        autoscalingGroupName: group.group.name,
        targetTrackingConfiguration: targetTrackingConfiguration,
        estimatedInstanceWarmup: args.estimatedInstanceWarmup,
    }, { parent: group, ...opts });
}

/** @internal */
export function createPredefinedMetricPolicy(
        name: string, group: AutoScalingGroup,
        args: PredefinedMetricTargetTrackingPolicyArgs,
        opts?: pulumi.ComponentResourceOptions) {

    return createPolicy(name, group, args, {
        disableScaleIn: args.disableScaleIn,
        targetValue: args.targetValue,
        predefinedMetricSpecification: {
            predefinedMetricType: args.predefinedMetricType,
            resourceLabel: args.resourceLabel,
        },
    }, opts);
}

/** @internal */
export function createCustomMetricPolicy(
        name: string, group: AutoScalingGroup,
        args: CustomMetricTargetTrackingPolicyArgs,
        opts?: pulumi.ComponentResourceOptions) {

    return createPolicy(name, group, args, {
        disableScaleIn: args.disableScaleIn,
        targetValue: args.targetValue,
        customizedMetricSpecification: {
            namespace: args.metric.namespace,
            metricName: args.metric.name,
            unit: args.metric.unit.apply(u => <string>u),
            statistic: x.cloudwatch.statisticString(args.metric),
            metricDimensions: convertDimensions(args.metric.dimensions),
        },
    }, opts);
}

function convertDimensions(dimensions: pulumi.Output<Record<string, any> | undefined>) {
    return dimensions.apply(d => {
        if (!d) {
            return [];
        }

        const result: { name: string, value: string }[] = [];
        for (const key of Object.keys(d)) {
            result.push({ name: key, value: d[key] });
        }

        return result;
    });
}
