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
import * as utils from "./../utils";

import { AutoScalingGroup } from "./autoscaling";

export type AdjustmentType = "ChangeInCapacity" | "ExactCapacity" | "PercentChangeInCapacity";
export type PolicyType = "SimpleScaling" | "StepScaling" | "TargetTrackingScaling";
export type MetricAggregationType = "Minimum" | "Maximum" | "Average";

/**
 * See https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_PredefinedMetricSpecification.html
 * for full details.
 *
 * @internal
 */
export type PredefinedMetricType =
    /** Average CPU utilization of the Auto Scaling group.  */
    "ASGAverageCPUUtilization" |
    /** Average number of bytes received on all network interfaces by the Auto Scaling group. */
    "ASGAverageNetworkIn" |
    /** Average number of bytes sent out on all network interfaces by the Auto Scaling group. */
    "ASGAverageNetworkOut" |
    /** Number of requests completed per target in an Application Load Balancer or a Network Load Balancer target group */
    "ALBRequestCountPerTarget";

export interface StepAdjustment {
    /**
     * The lower bound for the difference between the alarm threshold and the CloudWatch metric.
     * Without a value, AWS will treat this bound as infinity.
     */
    metricIntervalLowerBound?: pulumi.Input<string>;

    /**
     * The upper bound for the difference between the alarm threshold and the CloudWatch metric.
     * Without a value, AWS will treat this bound as infinity. The upper bound must be greater
     * than the lower bound.
     */
    metricIntervalUpperBound?: pulumi.Input<string>;

    /**
     * The number of members by which to scale, when the adjustment bounds are breached. A
     * positive value scales up. A negative value scales down
     */
    scalingAdjustment: pulumi.Input<number>;
}

/** @internal */
interface TargetTrackingConfiguration {
    /**
     * A customized metric. Cannot be provided along with [predefinedMetricSpecification].
     */
    customizedMetricSpecification?: pulumi.Input<{
        /** The dimensions of the metric. */
        metricDimensions?: pulumi.Input<pulumi.Input<{
            /** The name of the dimension. */
            name: pulumi.Input<string>;

            /** The value of the dimension.  */
            value: pulumi.Input<string>;
        }>[]>;
        /** The name of the metric. */
        metricName: pulumi.Input<string>;
        /** The namespace of the metric. */
        namespace: pulumi.Input<string>;
        /** The statistic of the metric. */
        statistic: pulumi.Input<string>;
        /** The unit of the metric. */
        unit?: pulumi.Input<string>;
    }>;

    /**
     * Indicates whether scaling in by the target tracking scaling policy is disabled. If scaling in
     * is disabled, the target tracking scaling policy doesn't remove instances from the Auto
     * Scaling group. Otherwise, the target tracking scaling policy can remove instances from the
     * Auto Scaling group.  Defaults to [false] if unspecified.
     */
    disableScaleIn?: pulumi.Input<boolean>;

    /**
     * A predefined metric. Cannot be provided along with [customizedMetricSpecification].
     */
    predefinedMetricSpecification?: pulumi.Input<{
        /**
         * The metric type.
         */
        predefinedMetricType: pulumi.Input<PredefinedMetricType>;

        /**
         * Identifies the resource associated with the metric type.
         */
        resourceLabel?: pulumi.Input<string>;
    }>;

    /**
     * The target value for the metric.
     */
    targetValue: pulumi.Input<number>;
}

export interface BasePolicyArgs {
    /**
     * Specifies whether the adjustment is an absolute number or a percentage of the current
     * capacity.
     */
    adjustmentType?: pulumi.Input<AdjustmentType>;

    /**
     * The estimated time, in seconds, until a newly launched instance will contribute CloudWatch
     * metrics. Without a value, AWS will default to the group's specified cooldown period.
     */
    estimatedInstanceWarmup?: pulumi.Input<number>;

    /**
     * The minimum number of instances to scale. If the value of [adjustmentType] is
     * ["PercentChangeInCapacity"], the scaling policy changes the DesiredCapacity of the Auto
     * Scaling group by at least this many instances.
     */
    minAdjustmentMagnitude?: pulumi.Input<number>;
}

interface PolicyArgs extends BasePolicyArgs {
    /**
     * The amount of time, in seconds, after a scaling activity completes and before the next
     * scaling activity can start.
     */
    cooldown?: pulumi.Input<number>;
    /**
     * The aggregation type for the policy's metrics. Valid values are "Minimum", "Maximum", and
     * "Average". Without a value, AWS will treat the aggregation type as "Average".
     */
    metricAggregationType?: pulumi.Input<MetricAggregationType>;
    /**
     * The policy type, either  . If this value isn't provided, AWS will default to "SimpleScaling."
     */
    policyType: pulumi.Input<PolicyType>;
    /**
     * The number of members by which to
     * scale, when the adjustment bounds are breached. A positive value scales
     * up. A negative value scales down.
     */
    scalingAdjustment?: pulumi.Input<number>;
    stepAdjustments?: aws.autoscaling.PolicyArgs["stepAdjustments"];
    /**
     * A target tracking policy. These have the following structure:
     */
    targetTrackingConfiguration?: aws.autoscaling.PolicyArgs["targetTrackingConfiguration"];
}

export interface SimplePolicyArgs extends BasePolicyArgs {
    /**
     * The amount of time, in seconds, after a scaling activity completes and before the next
     * scaling activity can start.
     */
    cooldown?: pulumi.Input<number>;

    /**
     * The number of instances by which to scale. adjustmentType determines the interpretation of
     * this number (e.g., as an absolute number or as a percentage of the existing Auto Scaling
     * group size). A positive increment adds to the current capacity and a negative value removes
     * from the current capacity.
     */
    scalingAdjustment?: pulumi.Input<number>;
}

export interface StepPolicyArgs extends BasePolicyArgs {
    /**
     * The aggregation type for the policy's metrics. Without a value, AWS will treat the
     * aggregation type as "Average"
     */
    metricAggregationType?: pulumi.Input<MetricAggregationType>;

    /**
     * A set of adjustments that manage group scaling.
     */
    stepAdjustments?: pulumi.Input<pulumi.Input<StepAdjustment>[]>;
}

/** @internal */
interface TargetTrackingPolicyArgs extends BasePolicyArgs {
    /**
     * A target tracking policy.
     */
    targetTrackingConfiguration?: pulumi.Input<TargetTrackingConfiguration>;
}

export interface BaseMetricTargetTrackingPolicyArgs extends BasePolicyArgs {
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

export interface ApplicationTargetGroupTrackingPolicyArgs extends BaseMetricTargetTrackingPolicyArgs {
    /**
     * The target group to scale [AutoScalingGroup] in response to number of requests to.
     * If not provided, the first [TargetGroup] in [AutoScalingGroup.targetGroups] will be used.
     * If provided, this must be a [TargetGroup] the [AutoScalingGroup] was created with.
     */
    targetGroup?: x.elasticloadbalancingv2.ApplicationTargetGroup;
}

/**
 * Represents a predefined metric for a target tracking scaling policy to use with Amazon EC2 Auto
 * Scaling.
 */
export interface PredefinedMetricTargetTrackingPolicyArgs extends BaseMetricTargetTrackingPolicyArgs {
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
export interface CustomMetricTargetTrackingPolicyArgs extends BaseMetricTargetTrackingPolicyArgs {
    /** The metric to track */
    metric: x.cloudwatch.Metric;

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

export abstract class Policy extends pulumi.ComponentResource {
    public readonly policy: aws.autoscaling.Policy;

    constructor(
        type: string, name: string, group: AutoScalingGroup,
        args: PolicyArgs, opts: pulumi.ComponentResourceOptions = {}) {

        super(type, name, undefined, { parent: group, ...opts });

        this.policy = new aws.autoscaling.Policy(name, {
            adjustmentType: args.adjustmentType,
            autoscalingGroupName: group.group.name,
            cooldown: args.cooldown,
            estimatedInstanceWarmup: args.estimatedInstanceWarmup,
            metricAggregationType: args.metricAggregationType,
            minAdjustmentMagnitude: args.minAdjustmentMagnitude,
            policyType: args.policyType,
            scalingAdjustment: args.scalingAdjustment,
            stepAdjustments: args.stepAdjustments,
            targetTrackingConfiguration: args.targetTrackingConfiguration,
        }, { parent: this });

        this.registerOutputs();
    }
}

/** @internal */
abstract class TargetTrackingPolicy extends Policy {
    constructor(
        type: string, name: string, group: AutoScalingGroup,
        args: TargetTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions) {

        super(type, name, group, {
            policyType: "TargetTrackingScaling",
            adjustmentType: args.adjustmentType,
            cooldown: undefined,
            estimatedInstanceWarmup: args.estimatedInstanceWarmup,
            metricAggregationType: undefined,
            minAdjustmentMagnitude: args.minAdjustmentMagnitude,
            scalingAdjustment: undefined,
            stepAdjustments: undefined,
            targetTrackingConfiguration: args.targetTrackingConfiguration,
        }, opts);
    }
}

/** @internal */
export class PredefinedMetricTargetTrackingPolicy extends TargetTrackingPolicy {
    constructor(
        name: string, group: AutoScalingGroup,
        args: PredefinedMetricTargetTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions) {

        super("awsx:autoscaling:PredefinedMetricTargetTrackingPolicy", name, group, {
            ...args,
            targetTrackingConfiguration: {
                disableScaleIn: args.disableScaleIn,
                targetValue: args.targetValue,
                predefinedMetricSpecification: {
                    predefinedMetricType: args.predefinedMetricType,
                    resourceLabel: args.resourceLabel,
                },
            },
        }, opts);
    }
}

/** @internal */
export class CustomMetricTargetTrackingPolicy extends TargetTrackingPolicy {
    constructor(
        name: string, group: AutoScalingGroup,
        args: CustomMetricTargetTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions) {

        super("awsx:autoscaling:CustomMetricTargetTrackingPolicyArgs", name, group, {
            ...args,
            targetTrackingConfiguration: {
                disableScaleIn: args.disableScaleIn,
                targetValue: args.targetValue,
                customizedMetricSpecification: {
                    namespace: args.metric.namespace,
                    metricName: args.metric.name,
                    unit: args.metric.unit.apply(u => <string>u),
                    statistic: x.cloudwatch.statisticString(args.metric),
                    metricDimensions: convertDimensions(args.metric.dimensions),
                },
            },
        }, opts);
    }
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
