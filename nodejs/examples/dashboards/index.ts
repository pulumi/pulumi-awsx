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
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as fetch from "node-fetch";

// Examples of different types of metrics and alarms that can be set.

const provider = new aws.Provider("custom", { region: "us-west-2" });

const topic = new aws.sns.Topic("sites-to-process-topic", /*args:*/ undefined, { provider });
const subscription = topic.onEvent("for-each-url", async (event) => {
    const records = event.Records || [];
    for (const record of records) {
        const url = record.Sns.Message;

        console.log(`${url}: Processing`);

        // Fetch the contents at the URL
        console.log(`${url}: Getting`);
        try {
            const res = await fetch.default(url);
        } catch (err) {
            console.log(`${url}: Failed to GET`);
            return;
        }
    }
}, /*args:*/ undefined, { providers: { aws: provider } });

// Get the metric for the lambda that processing our topic requests.
const funcMetric = awsx.lambda.metrics.duration({ function: subscription.func });

// Create an alarm if this lambda takes more than 1000ms to complete in a period of 10 minutes over
// at least five periods in a row.
const funcAlarm1 = funcMetric.with({ unit: "Milliseconds", period: 600 })
                             .createAlarm("SlowUrlProcessing", { threshold: 1000, evaluationPeriods: 5 });

// Also create a dashboard to track this.
const dashboard = new awsx.cloudwatch.Dashboard("TopicData", {
    widgets: [
        new awsx.cloudwatch.SingleNumberMetricWidget({
            title: "Requests in the last minute",
            width: 10,
            metrics: awsx.lambda.metrics.invocations({
                function: subscription.func,
                statistic: "Sum",
                period: 60,
            }),
        }),
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
}, { provider });

export const dashboardUrl = dashboard.url;