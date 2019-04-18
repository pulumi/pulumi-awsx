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

// export class Policy extends pulumi.ComponentResource {
//     constructor(name: string, args: PolicyArgs, opts: pulumi.ComponentResourceOptions = {});
//         super
//     }
// }

export type AdjustmentType = "ChangeInCapacity" | "ExactCapacity" | "PercentChangeInCapacity";
export type PolicyType = "SimpleScaling" | "StepScaling" | "TargetTrackingScaling";
export type MetricAggregationType = "Minimum" | "Maximum" | "Average";

/**
 * See https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_PredefinedMetricSpecification.html
 * for full details.
 */
export type PredefinedMetricType =
    /** Average CPU utilization of the Auto Scaling group.  */
    "ASGAverageCPUUtilization" |
    /** Average number of bytes received on all network interfaces by the Auto Scaling group. */
    "ASGAverageNetworkIn " |
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

/**
 * A target tracking policy.
 */
export interface TargetTrackingConfiguration {
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
     * Indicates whether scale in by the target tracking policy is disabled.  Defaults to [false] if
     * unspecified.
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

export interface PolicyArgs {
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

    minAdjustmentMagnitude?: pulumi.Input<number>;
}

export interface SimpleScalingPolicyArgs extends PolicyArgs {
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

export interface StepScalingPolicyArgs extends PolicyArgs {

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

export interface TargetTrackingScalingPolicyArgs extends PolicyArgs {
    /**
     * A target tracking policy.
     */
    targetTrackingConfiguration?: pulumi.Input<TargetTrackingConfiguration>;
}

export abstract class Policy extends pulumi.ComponentResource {
    public readonly policy: aws.autoscaling.Policy;

    constructor(
        type: string, name: string, group: AutoScalingGroup,
        args: PolicyArgs, opts: pulumi.ComponentResourceOptions = {}) {

        super(type, name, undefined, { parent: group, ...opts });
    }
}

export class SimpleScalingPolicy extends Policy {
    constructor(name: string, group: AutoScalingGroup, args: SimpleScalingPolicyArgs, opts?: pulumi.ComponentResourceOptions) {
        super("awsx:autoscaling:SimpleScalingPolicy", name, group, args, opts);
    }
}
