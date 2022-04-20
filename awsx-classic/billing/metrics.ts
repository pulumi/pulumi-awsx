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

import * as pulumi from "@pulumi/pulumi";

import * as cloudwatch from "../cloudwatch";

export namespace metrics {
    type BillingMetricName =
        "EstimatedCharges";

    export interface BillingMetricChange extends cloudwatch.MetricChange {
        /**
         * Optional Currency dimension
         */
        currency: "USD";
        /**
         * Optional linked Amazon account id
         */
        linkedAccount?: string;
        /**
         * Optional Service this metric should be filtered down to.
         */
        serviceName?: "AmazonCloudWatch" | "AmazonEC2" | "AmazonKinesis" | "AmazonRoute53" | "AmazonS3" |
          "AmazonSNS" | "AWSCloudTrail" | "AWSCodePipeline" | "AWSConfig" | "AWSDataTransfer" |
          "awskms" | "AWSLambda" | "AWSMarketplace" | "AWSQueueService" | "AWSSecretsManager" |
          "awswaf" | "AWSXRay" | "CodeBuild";
    }

    /**
     * Creates an AWS/Billing metric with the requested [metricName]. See
     * https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html
     * for more information.
     */
    function metric(metricName: BillingMetricName, change: BillingMetricChange = {
        currency: "USD",
    }) {
        const dimensions: Record<string, pulumi.Input<string>> = {};

        if (change.currency !== undefined) {
            dimensions.Currency = change.currency;
        }

        if (change.linkedAccount !== undefined) {
            dimensions.LinkedAccount = change.linkedAccount;
        }

        if (change.serviceName !== undefined) {
            dimensions.ServiceName = change.serviceName;
        }

        return new cloudwatch.Metric({
            namespace: "AWS/Billing",
            name: metricName,
            ...change,
        }).withDimensions(dimensions);
    }

    /**
     * EstimatedCharges
     *
     * Units: currency
     * Valid CloudWatch statistics: Average, Maximum (recommended), Minimum
     */
    export function estimatedCharges(change?: BillingMetricChange) {
        return metric("EstimatedCharges", { statistic: "Maximum", currency: "USD", ...change });
    }
}
