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

export type AdjustmentType =
    /**
     * Increases or decreases the current capacity of the group by the specified number of
     * instances. A positive value increases the capacity and a negative adjustment value decreases
     * the capacity.
     *
     * Example: If the current capacity of the group is 3 instances and the adjustment is 5, then
     * when this policy is performed, there are 5 instances added to the group for a total of 8
     * instances.
     */
    "ChangeInCapacity" |

    /**
     * Changes the current capacity of the group to the specified number of instances. Specify a
     * positive value with this adjustment type.
     *
     * Example: If the current capacity of the group is 3 instances and the adjustment is 5, then
     * when this policy is performed, the capacity is set to 5 instances.
     */
    "ExactCapacity" |
    /**
     * Increment or decrement the current capacity of the group by the specified percentage. A
     * positive value increases the capacity and a negative value decreases the capacity. If the
     * resulting value is not an integer, it is rounded as follows:
     *
     *  * Values greater than 1 are rounded down. For example, 12.7 is rounded to 12.
     *  * Values between 0 and 1 are rounded to 1. For example, .67 is rounded to 1.
     *  * Values between 0 and -1 are rounded to -1. For example, -.58 is rounded to -1.
     *  * Values less than -1 are rounded up. For example, -6.67 is rounded to -6.
     *
     * Example: If the current capacity is 10 instances and the adjustment is 10 percent, then when
     * this policy is performed, 1 instance is added to the group for a total of 11 instances.
     *
     * With PercentChangeInCapacity, you can also specify the minimum number of instances to scale
     * (using the [minAdjustmentMagnitude] parameter). For example, suppose that you create a policy
     * that adds 25 percent and you specify a minimum increment of 2 instances. If you have an Auto
     * Scaling group with 4 instances and the scaling policy is executed, 25 percent of 4 is 1
     * instance. However, because you specified a minimum increment of 2, there are 2 instances
     * added.
     */
    "PercentChangeInCapacity";

export type MetricAggregationType = "Minimum" | "Maximum" | "Average";

/**
 * When you create a step scaling policy, you add one or more step adjustments that enable you to
 * scale based on the size of the alarm breach. Each step adjustment specifies the following:
 *
 *  1. A lower bound for the metric value
 *  2. An upper bound for the metric value
 *  3. The amount by which to scale, based on the scaling adjustment type
 *
 * There are a few rules for the step adjustments for your policy:
 *
 *  1. The ranges of your step adjustments can't overlap or have a gap.
 *  2. Only one step adjustment can have a null lower bound (negative infinity). If one step
 *     adjustment has a negative lower bound, then there must be a step adjustment with a null lower
 *     bound.
 *  3. Only one step adjustment can have a null upper bound (positive infinity). If one step
 *     adjustment has a positive upper bound, then there must be a step adjustment with a null upper
 *     bound.
 *  4. The upper and lower bound can't be null in the same step adjustment.
 *  5. If the metric value is above the breach threshold, the lower bound is inclusive and the upper
 *     bound is exclusive. If the metric value is below the breach threshold, the lower bound is
 *     exclusive and the upper bound is inclusive.
 *
 * See https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-simple-step.html for more
 * details.
 */
export interface StepAdjustment {
    /**
     * The lower bound for the difference between the alarm threshold and the CloudWatch metric.
     * Without a value, AWS will treat this bound as infinity.
     */
    metricIntervalLowerBound?: pulumi.Input<number>;

    /**
     * The upper bound for the difference between the alarm threshold and the CloudWatch metric.
     * Without a value, AWS will treat this bound as infinity. The upper bound must be greater
     * than the lower bound.
     */
    metricIntervalUpperBound?: pulumi.Input<number>;

    /**
     * The number of members by which to scale, when the adjustment bounds are breached. A
     * positive value scales up. A negative value scales down
     */
    scalingAdjustment: pulumi.Input<number>;
}

export interface StepScalingPolicyArgs {
    /**
     * The metric to use to watch for changes.  An alarm will be created from this using
     * [alarmArgs], which will invoke the actual autoscaling policy when triggered.
     *
     * Note: the `period` of this metric will be set to `60s` from the default of `300s` to ensure
     * events come in in a timely enough manner to allow the ASG to respond accordingly.
     */
    metric: x.cloudwatch.Metric;

    /**
     * The arguments controlling the alarm that gets created.
     */
    alarmArgs: x.cloudwatch.AlarmArgs;

    /**
     * When a step scaling or simple scaling policy is executed, it changes the current capacity of
     * your Auto Scaling group using the scaling adjustment specified in the policy. A scaling
     * adjustment can't change the capacity of the group above the maximum group size or below the
     * minimum group size.
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

    /**
     * The number of instances by which to scale. adjustmentType determines the interpretation of
     * this number (e.g., as an absolute number or as a percentage of the existing Auto Scaling
     * group size). A positive increment adds to the current capacity and a negative value removes
     * from the current capacity.
     */
    scalingAdjustment?: pulumi.Input<number>;

    /**
     * The aggregation type for the policy's metrics. Without a value, AWS will treat the
     * aggregation type as "Average"
     */
    metricAggregationType?: pulumi.Input<MetricAggregationType>;

    /**
     * A set of adjustments that manage group scaling.
     */
    stepAdjustments: pulumi.Input<pulumi.Input<StepAdjustment>[]>;
}

export class StepScalingPolicy extends pulumi.ComponentResource {
    /**
     * Underlying [Policy] created to define the scaling strategy.
     */
    public readonly policy: aws.autoscaling.Policy;

    /**
     * Alarm that invokes the policy when triggered.
     */
    public readonly alarm: aws.cloudwatch.MetricAlarm;

    constructor(name: string, group: AutoScalingGroup,
                args: StepScalingPolicyArgs, opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:autoscaling:StepScalingPolicy", name, undefined, { parent: group, ...opts });

        const parentOpts = { parent: this };
        this.policy = new aws.autoscaling.Policy(name, {
            autoscalingGroupName: group.group.name,
            policyType: "StepScaling",
            ...args,
            stepAdjustments: pulumi.output(args.stepAdjustments).apply(
                steps => steps.map(({ scalingAdjustment, metricIntervalLowerBound, metricIntervalUpperBound })  => ({
                    scalingAdjustment,
                    metricIntervalLowerBound: toString(metricIntervalLowerBound),
                    metricIntervalUpperBound: toString(metricIntervalUpperBound),
                }))),
        }, parentOpts);

        this.alarm = args.metric.withPeriod(60).createAlarm(name, {
            ...args.alarmArgs,
            alarmActions: [this.policy.arn],
        }, parentOpts);

        this.registerOutputs();

        return;

        function toString(v: number | undefined) {
            return v === undefined ? undefined! : v.toString();
        }
    }
}
