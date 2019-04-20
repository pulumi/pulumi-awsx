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
export type MetricAggregationType = "Minimum" | "Maximum" | "Average";

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

    /**
     * The minimum number of instances to scale. If the value of [adjustmentType] is
     * ["PercentChangeInCapacity"], the scaling policy changes the DesiredCapacity of the Auto
     * Scaling group by at least this many instances.
     */
    minAdjustmentMagnitude?: pulumi.Input<number>;
}

export interface SimplePolicyArgs extends PolicyArgs {
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

export interface StepPolicyArgs extends PolicyArgs {
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
