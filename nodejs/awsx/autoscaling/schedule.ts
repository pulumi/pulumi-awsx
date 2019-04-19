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

/**
 * Creates an appropriate [cron](https://en.wikipedia.org/wiki/Cron) format string that can be
 * used as the [recurrence] property of [ScheduleArgs].
 */
export function cronExpression(a: ScheduleRecurrenceArgs) {
    checkRange(a.minute, "minute", 0, 59);
    checkRange(a.hour, "hour", 0, 23);
    checkRange(a.dayOfMonth, "dayOfMonth", 1, 31);
    checkRange(a.month, "month", 1, 12);
    checkRange(a.dayOfWeek, "dayOfWeek", 0, 7);

    return `${val(a.minute)} ${val(a.hour)} ${val(a.dayOfMonth)} ${val(a.month)} ${val(a.dayOfWeek)}`;

    function val(v: number | undefined) {
        return v === undefined ? "*" : v;
    }

    function checkRange(
            val: number | undefined, name: keyof ScheduleRecurrenceArgs,
            minInclusive: number, maxInclusive: number) {
        if (val !== undefined) {
            if (val < minInclusive || val > maxInclusive) {
                throw new Error(`Value for [args.${name}] was not in the inclusive range [${minInclusive}, ${maxInclusive}].`);
            }
        }
    }
}

export interface ScheduleRecurrenceArgs {
    /** 0 to 59.  Leave undefined to indicate no specific value. */
    minute?: number;

    /** 0 to 23.  Leave undefined to indicate no specific value.  All times UTC */
    hour?: number;

    /** 1 to 31.  Leave undefined to indicate no specific value. */
    dayOfMonth?: number;

    /** 1 to 12.  Leave undefined to indicate no specific value. */
    month?: number;

    /** 0 to 7.  (0 and 7 both represent Sunday). Leave undefined to indicate no specific value. */
    dayOfWeek?: number;
}

export interface ScheduleArgs {
    /**
     * The name of this scaling action.  If not provided, the name of the requested
     * [aws.autoscaling.Schedule] will be used for this.
     */
    scheduledActionName?: pulumi.Input<string>;
    /**
     * The number of EC2 instances that should be running in the group. Do not pass a value if you don't want to change
     * the size at the scheduled time.
     */
    desiredCapacity?: pulumi.Input<number>;
    /**
     * The time for this action to end, in "YYYY-MM-DDThh:mm:ssZ" format in UTC/GMT only (for
     * example, 2014-06-01T00:00:00Z ). If you try to schedule your action in the past, Auto Scaling
     * returns an error message.
     */
    endTime?: pulumi.Input<string>;
    /**
     * The maximum size for the Auto Scaling group. Do not pass a value if you don't want to change
     * the size at the scheduled time.
     */
    maxSize?: pulumi.Input<number>;
    /**
     * The minimum size for the Auto Scaling group. Do not pass a value if you don't want to change
     * the size at the scheduled time.
     */
    minSize?: pulumi.Input<number>;
    /**
     * The time when recurring future actions will start. Start time is specified by the user
     * following the Unix cron syntax format. [cronExpression] can be used to easily create values
     * of this.
     */
    recurrence?: pulumi.Input<string | ScheduleRecurrenceArgs>;
    /**
     * The time for this action to start, in "YYYY-MM-DDThh:mm:ssZ" format in UTC/GMT only (for
     * example, 2014-06-01T00:00:00Z ). If you try to schedule your action in the past, Auto Scaling
     * returns an error message.
     */
    startTime?: pulumi.Input<string>;
}
