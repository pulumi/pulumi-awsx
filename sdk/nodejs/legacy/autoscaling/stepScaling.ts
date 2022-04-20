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
import * as utils from "../utils";

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

export interface ScalingSteps {
    /**
     * Optional upper steps for this policy normally describing how to scale-out the
     * AutoScalingGroup. This must be non-empty.  An alarm will be created that will fire when the
     * desired metric goes greater-than-or-equal-to the value of the first step's `value`.  Each
     * step ranges from it's `value` (inclusive) to the `value` of the next step (exclusive).  For
     * the last step, the end part of the range is `Infinity`.
     *
     * Depending on which step range the alarm triggers for will determine which particular
     * [scalingAdjustment] will be performed.
     *
     * At least one of `upper` or `lower` must be non-empty.  If both are provided, `upper` and
     * `lower` must not overlap.
     */
    upper?: pulumi.Input<ScalingStep>[];

    /**
     * Optional lower steps for this step policy normally used to describe how to scale-in the
     * AutoScalingGroup.  If these are provided then the step policy will create two alarms.  One
     * for when the upper steps are breached and one for when the lower steps are breached.
     *
     * The latter alarm will fire when the desired metric goes less-than-or-equal-to the value of
     * the first step's `value`.  Each step ranges from it's `value` (inclusive) to the `value` of
     * the next step (exclusive).  For the last step, the end part of the range is `-Infinity`.
     *
     * Depending on which step range the alarm triggers for will determine which particular
     * [scalingAdjustment] will be performed.
     *
     * At least one of `upper` or `lower` must be non-empty.  If both are provided, `upper` and
     * `lower` must not overlap.
     */
    lower?: pulumi.Input<ScalingStep>[];
}

export interface ScalingStep {
    /**
     * The threshold value that causes this step to be followed.  If this an `upperStep` then values
     * `>=` to this will trigger this step's [scalingAdjustment].  If this is a `lowerStep` then
     * values `<=` to this will trigger this step's [scalingAdjustment].
     */
    value: pulumi.Input<number>;

    /**
     * The number of members by which to scale, when [value] breached. A
     * positive value scales up. A negative value scales down.
     */
    adjustment: pulumi.Input<number>;
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
     * A set of adjustments that manage group scaling.
     */
    steps: ScalingSteps;

    /**
     * When a step scaling or simple scaling policy is executed, it changes the current capacity of
     * your Auto Scaling group using the scaling adjustment specified in the policy. A scaling
     * adjustment can't change the capacity of the group above the maximum group size or below the
     * minimum group size.
     */
    adjustmentType: pulumi.Input<AdjustmentType>;

    /**
     * The estimated time, in seconds, until a newly launched instance will contribute CloudWatch
     * metrics. Without a value, AWS will default to the group's specified cooldown period.
     */
    estimatedInstanceWarmup?: pulumi.Input<number>;

    /**
     * The minimum number of instances to scale. If the value of [adjustmentType] is
     * ["PercentChangeInCapacity"], the scaling policy changes the DesiredCapacity of the Auto
     * Scaling group by at least this many instances.  Defaults to `1` if not specified.
     */
    minAdjustmentMagnitude?: pulumi.Input<number>;

    /**
     * The number of periods over which data is compared to the specified threshold before an alarm
     * is fired.  Defaults to `1` if unspecified.
     */
    evaluationPeriods?: pulumi.Input<number>;
}

/**
 * Step scaling policies increase or decrease the current capacity of your Auto Scaling group based
 * on a set of scaling adjustments, known as step adjustments. The adjustments vary based on the
 * size of the alarm breach.
 *
 * For example, consider the following StepScaling description for an ASG that has both a current
 * capacity and a desired capacity of 10. The current and desired capacity is maintained while the
 * aggregated metric value is greater than 40 and less than 60.
 *
 * ```ts
 *  const policy = {
 *      // ... other values
 *      adjustmentType: "PercentChangeInCapacity",
 *      steps: {
 *          upper: [{ value: 60, adjustment: 10 }, { value: 70, adjustment: 30 }],
 *          lower: [{ value: 40, adjustment: -10 }, { value: 30, adjustment: -30 }]
 *      },
 *  };
 * ```
 *
 * If the metric value gets to 60, Application Auto Scaling increases the desired capacity of the
 * group by 1, to 11. That's based on the second step adjustment of the scale-out policy (add 10
 * percent of 10). After the new capacity is added, Application Auto Scaling increases the current
 * capacity to 11. If the metric value rises to 70 even after this increase in capacity, Application
 * Auto Scaling increases the target capacity by 3, to 14. That's based on the third step adjustment
 * of the scale-out policy (add 30 percent of 11, 3.3, rounded down to 3).
 *
 * If the metric value gets to 40, Application Auto Scaling decreases the target capacity by 1, to
 * 13, based on the second step adjustment of the scale-in policy (remove 10 percent of 14, 1.4,
 * rounded down to 1). If the metric value falls to 30 even after this decrease in capacity,
 * Application Auto Scaling decreases the target capacity by 3, to 10, based on the third step
 * adjustment of the scale-in policy (remove 30 percent of 13, 3.9, rounded down to 3).
 */
export class StepScalingPolicy extends pulumi.ComponentResource {
    /**
     * Underlying [Policy] created to define the scaling strategy for the upper set of steps.
     */
    public readonly upperPolicy: aws.autoscaling.Policy | undefined;

    /**
     * Alarm that invokes [upperPolicy] when the metric goes above the lowest value of the upper
     * range of steps.
     */
    public readonly upperAlarm: aws.cloudwatch.MetricAlarm | undefined;

    /**
     * Underlying [Policy] created to define the scaling strategy for the lower set of steps.
     */
    public readonly lowerPolicy: aws.autoscaling.Policy | undefined;

    /**
     * Alarm that invokes [lowerPolicy] when the metric goes below the highest value of the lower
     * range of steps.
     */
    public readonly lowerAlarm: aws.cloudwatch.MetricAlarm | undefined;

    constructor(name: string, group: AutoScalingGroup,
                args: StepScalingPolicyArgs, opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:autoscaling:StepScalingPolicy", name, undefined, { parent: group, ...opts });

        if (!args.steps.upper && !args.steps.lower) {
            throw new Error("At least one of [args.steps.upper] and [args.steps.lower] must be provided.");
        }

        const convertedSteps = pulumi.output(args.steps).apply(s => convertSteps(s));

        const metricAggregationType = pulumi.output(args.metric.statistic).apply(s => {
            if (s !== "Minimum" && s !== "Maximum" && s !== "Average") {
                throw new Error(`[args.metric.statistic] must be one of "Minimum", "Maximum" or "Average", but was: ${s}`);
            }

            return s;
        });

        const commonArgs = {
            autoscalingGroupName: group.group.name,
            policyType: "StepScaling",
            metricAggregationType,
            ...args,
        };

        // AutoScaling recommends a metric of 60 to ensure that adjustments can happen in a timely
        // manner.
        const metric = args.metric.withPeriod(60);
        const evaluationPeriods = utils.ifUndefined(args.evaluationPeriods, 1);

        if (args.steps.upper) {
            this.upperPolicy = new aws.autoscaling.Policy(`${name}-upper`, {
                ...commonArgs,
                stepAdjustments: convertedSteps.upper.stepAdjustments,
            }, { parent: this });

            this.upperAlarm = metric.createAlarm(`${name}-upper`, {
                evaluationPeriods,
                // step ranges and alarms are inclusive on the lower end.
                comparisonOperator: "GreaterThanOrEqualToThreshold",
                threshold: convertedSteps.upper.threshold,
                alarmActions: [this.upperPolicy.arn],
            }, { parent: this });
        }

        if (args.steps.lower) {
            this.lowerPolicy = new aws.autoscaling.Policy(`${name}-lower`, {
                ...commonArgs,
                stepAdjustments: convertedSteps.lower.stepAdjustments,
            }, { parent: this });

            this.lowerAlarm = metric.createAlarm(`${name}-lower`, {
                evaluationPeriods,
                // step ranges and alarms are inclusive on the upper end.
                comparisonOperator: "LessThanOrEqualToThreshold",
                threshold: convertedSteps.lower.threshold,
                alarmActions: [this.lowerPolicy.arn],
            }, { parent: this });
        }

        this.registerOutputs();
    }
}

interface AwsStepAdjustment {
    metricIntervalLowerBound: string | undefined;
    metricIntervalUpperBound: string | undefined;
    scalingAdjustment: number;
}

/** @internal */
export function convertSteps(steps: pulumi.Unwrap<ScalingSteps>) {
    // First, order so that smaller values comes first.
    const upperSteps = sortSteps(steps.upper);
    const lowerSteps = sortSteps(steps.lower);

    const result = {
        upper: convertUpperSteps(upperSteps),
        lower: convertLowerSteps(lowerSteps),
    };

    if (upperSteps && lowerSteps) {
        const lowerStep = lowerSteps[lowerSteps.length - 1];
        const upperStep = upperSteps[0];
        if (lowerStep.value >= upperStep.value) {
            throw new Error(`Lower and upper steps cannot overlap. Lower step value ${lowerStep.value} greater than upper step value ${upperStep.value}`);
        }
    }

    return result;
}

/** @internal */
export function convertUpperSteps(upperSteps: pulumi.Unwrap<ScalingStep>[] | undefined) {
    // First, order so that smaller values comes first.
    upperSteps = sortSteps(upperSteps);

    if (!upperSteps) {
        return undefined!;
    }

    if (upperSteps.length === 0) {
        throw new Error("[args.steps.upper] must be non-empty.");
    }

    // The threshold is the value of the first step.  This is the point where we'll set the alarm
    // to fire.  Note: in the aws description, steps are offset from this.  So if the breach-point is
    // 50, and the step value is 65, then we'll set metricIntervalLowerBound to 15.
    const threshold = upperSteps[0].value;

    const stepAdjustments: AwsStepAdjustment[] = [];
    for (let i = 0, n = upperSteps.length; i < n; i++) {
        const step = upperSteps[i];
        const nextStep = i === n - 1 ? undefined : upperSteps[i + 1];

        if (nextStep) {
            if (step.value === nextStep.value) {
                throw new Error(`Upper steps contained two steps with the same [value]: ${step.value}`);
            }
        }

        stepAdjustments.push({
            metricIntervalLowerBound: (step.value - threshold).toString(),
            // if this is the last step, extend it to infinity (using 'undefined').  Otherwise,
            // extend it to the next step.
            metricIntervalUpperBound: nextStep ? (nextStep.value - threshold).toString() : undefined,
            scalingAdjustment: step.adjustment,
        });
    }

    return { threshold, stepAdjustments };
}

function sortSteps(steps: pulumi.UnwrappedObject<x.autoscaling.ScalingStep>[] | undefined) {
    if (!steps) {
        return undefined;
    }

    return steps.sort((s1, s2) => s1.value - s2.value);
}

/** @internal */
export function convertLowerSteps(lowerSteps: pulumi.Unwrap<ScalingStep>[] | undefined) {
    // First, order so that smaller values comes first.
    lowerSteps = sortSteps(lowerSteps);

    if (!lowerSteps) {
        return undefined!;
    }

    if (lowerSteps.length === 0) {
        throw new Error("[args.steps.lower] must be non-empty.");
    }

    // The threshold is the value of the last step.  This is the point where we'll set the alarm to
    // fire.  Note: in the aws description, steps are offset from this.  So if the breach-point is
    // 50, and the step value is 35, then we'll set metricIntervalUpperBound to -15.
    const threshold = lowerSteps[lowerSteps.length - 1].value;

    const stepAdjustments: AwsStepAdjustment[] = [];
    for (let i = 0, n = lowerSteps.length; i < n; i++) {
        const step = lowerSteps[i];
        const previousStep = i === 0 ? undefined : lowerSteps[i - 1];
        if (previousStep) {
            if (step.value === previousStep.value) {
                throw new Error(`Lower steps contained two steps with the same [value]: ${step.value}`);
            }
        }

        stepAdjustments.push({
            // if this is the first step, extend it to -infinity (using 'undefined').  Otherwise,
            // extend it to the next step.
            metricIntervalLowerBound: previousStep ? (previousStep.value - threshold).toString() : undefined,
            metricIntervalUpperBound: (step.value - threshold).toString(),
            scalingAdjustment: step.adjustment,
        });
    }

    return { threshold, stepAdjustments };
}
