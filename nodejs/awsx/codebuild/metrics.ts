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

import * as cloudwatch from "../cloudwatch";

export namespace metrics {
    type CodebuildMetricName =
        "BuildDuration" | "Builds" | "DownloadSourceDuration" | "Duration" |
        "FailedBuilds" | "FinalizingDuration" | "InstallDuration" |
        "PostBuildDuration" | "PreBuildDuration" | "ProvisioningDuration" |
        "QueuedDuration" | "SubmittedDuration" | "SucceededBuilds" | "UploadArtifactsDuration";

    export interface CodebuildMetricChange extends cloudwatch.MetricChange {
        /**
         * Optional Project this metric should be filtered down to.
         */
        project?: aws.codebuild.Project;
    }

    function mergeChanges(
        resourceOrChange1: aws.codebuild.Project | CodebuildMetricChange | undefined,
        change2: cloudwatch.MetricChange) {

        const change1 = resourceOrChange1 instanceof aws.codebuild.Project
            ? { dimensions: { ProjectName: resourceOrChange1.name } }
            : resourceOrChange1;

        return cloudwatch.mergeDimensions(change1, change2);
    }

    /**
     * Creates an AWS/CodeBuild metric with the requested [metricName]. See
     * https://docs.aws.amazon.com/codebuild/latest/userguide/monitoring-builds.html for list of all
     * metric-names.
     *
     * Note, individual metrics can easily be obtained without supplying the name using the other
     * [metricXXX] functions.
     *
     * You can use Amazon CloudWatch to watch your builds, report when something is wrong, and take
     *  automatic actions when appropriate. You can monitor your builds at two levels:
     *
     *  * At the project level: These metrics are for all builds in the specified project only. To see
     *    metrics for a project, specify the ProjectName for the dimension in CloudWatch.
     *
     *  * At the AWS account level: These metrics are for all builds in one account. To see metrics at
     *    the AWS account level, do not enter a dimension in CloudWatch.
     *
     * CloudWatch metrics show the behavior of your builds over time. For example, you can monitor:
     *
     * * How many builds were attempted in a build project or an AWS account over time.
     * * How many builds were successful in a build project or an AWS account over time.
     * * How many builds failed in a build project or an AWS account over time.
     * * How much time CodeBuild spent executing builds in a build project or an AWS account over time.
     *
     * Metrics displayed in the CodeBuild console are always from the past three days. You can use the
     * CloudWatch console to view CodeBuild metrics over different durations.
     *
     * "ProjectName" is the only AWS CodeBuild metrics dimension. If it is specified, then the metrics
     * are for that project. If it is not specified, then the metrics are for the current AWS account.
     */
    function metric(metricName: CodebuildMetricName, resourceOrChange: aws.codebuild.Project | CodebuildMetricChange | undefined, change: cloudwatch.MetricChange) {
        return new cloudwatch.Metric({
            namespace: "AWS/CodeBuild",
            name: metricName,
            ...mergeChanges(resourceOrChange, change),
        });
    }

    /**
     * Measures the duration of the build's BUILD phase.
     *
     * Units:Seconds
     * Valid CloudWatch statistics: Average (recommended), Maximum, Minimum
     */
    export function buildDuration(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function buildDuration(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function buildDuration(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("BuildDuration", resourceOrChange, { statistic: "Average", unit: "Seconds", ...change });
    }

    /**
     * Measures the number of builds triggered.
     *
     * Units: Count
     * Valid CloudWatch statistics: Sum
     */
    export function builds(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function builds(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function builds(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("Builds", resourceOrChange, { statistic: "Sum", unit: "Count", ...change });
    }

    /**
     * Measures the duration of the build's DOWNLOAD_SOURCE phase.
     *
     * Units:Seconds
     * Valid CloudWatch statistics: Average (recommended), Maximum, Minimum
     */
    export function downloadSourceDuration(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function downloadSourceDuration(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function downloadSourceDuration(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("DownloadSourceDuration", resourceOrChange, { statistic: "Average", unit: "Seconds", ...change });
    }

    /**
     * Measures the duration of all builds over time.
     *
     * Units: Seconds
     * Valid CloudWatch statistics: Average (recommended), Maximum, Minimum
     */
    export function duration(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function duration(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function duration(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("Duration", resourceOrChange, { statistic: "Average", unit: "Seconds", ...change });
    }

    /**
     * Measures the number of builds that failed because of client error or because of a timeout.
     *
     * Units: Count
     * Valid CloudWatch statistics: Sum
     */
    export function failedBuilds(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function failedBuilds(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function failedBuilds(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("FailedBuilds", resourceOrChange, { statistic: "Sum", unit: "Count", ...change });
    }

    /**
     * Measures the duration of the build's FINALIZING phase.
     *
     * Units:Seconds
     * Valid CloudWatch statistics: Average (recommended), Maximum, Minimum
     */
    export function finalizingDuration(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function finalizingDuration(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function finalizingDuration(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("FinalizingDuration", resourceOrChange, { statistic: "Average", unit: "Seconds", ...change });
    }

    /**
     * Measures the duration of the build's INSTALL phase.
     *
     * Units:Seconds
     * Valid CloudWatch statistics: Average (recommended), Maximum, Minimum
     */
    export function installDuration(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function installDuration(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function installDuration(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("InstallDuration", resourceOrChange, { statistic: "Average", unit: "Seconds", ...change });
    }

    /**
     * Measures the duration of the build's POST_BUILD phase.
     *
     * Units:Seconds
     * Valid CloudWatch statistics: Average (recommended), Maximum, Minimum
     */
    export function postBuildDuration(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function postBuildDuration(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function postBuildDuration(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("PostBuildDuration", resourceOrChange, { statistic: "Average", unit: "Seconds", ...change });
    }

    /**
     * Measures the duration of the build's PRE_BUILD phase.
     *
     * Units:Seconds
     * Valid CloudWatch statistics: Average (recommended), Maximum, Minimum
     */
    export function preBuildDuration(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function preBuildDuration(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function preBuildDuration(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("PreBuildDuration", resourceOrChange, { statistic: "Average", unit: "Seconds", ...change });
    }

    /**
     * Measures the duration of the build's PROVISIONING phase.
     *
     * Units:Seconds
     * Valid CloudWatch statistics: Average (recommended), Maximum, Minimum
     */
    export function provisioningDuration(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function provisioningDuration(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function provisioningDuration(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("ProvisioningDuration", resourceOrChange, { statistic: "Average", unit: "Seconds", ...change });
    }

    /**
     * Measures the duration of the build's QUEUED phase.
     *
     * Units:Seconds
     * Valid CloudWatch statistics: Average (recommended), Maximum, Minimum
     */
    export function queuedDuration(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function queuedDuration(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function queuedDuration(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("QueuedDuration", resourceOrChange, { statistic: "Average", unit: "Seconds", ...change });
    }

    /**
     * Measures the duration of the build's SUBMITTED phase.
     *
     * Units:Seconds
     * Valid CloudWatch statistics: Average (recommended), Maximum, Minimum
     */
    export function submittedDuration(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function submittedDuration(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function submittedDuration(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("SubmittedDuration", resourceOrChange, { statistic: "Average", unit: "Seconds", ...change });
    }

    /**
     * Measures the number of successful builds.
     *
     * Units: Count
     * Valid CloudWatch statistics: Sum
     */
    export function succeededBuilds(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function succeededBuilds(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function succeededBuilds(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("SucceededBuilds", resourceOrChange, { statistic: "Sum", unit: "Count", ...change });
    }

    /**
     * Measures the duration of the build's UPLOAD_ARTIFACTS phase.
     *
     * Units:Seconds
     * Valid CloudWatch statistics: Average (recommended), Maximum, Minimum
     */
    export function uploadArtifactsDuration(project: aws.codebuild.Project, change?: cloudwatch.MetricChange): cloudwatch.Metric;
    export function uploadArtifactsDuration(change?: CodebuildMetricChange): cloudwatch.Metric;
    export function uploadArtifactsDuration(resourceOrChange?: aws.codebuild.Project | CodebuildMetricChange, change?: cloudwatch.MetricChange) {
        return metric("UploadArtifactsDuration", resourceOrChange, { statistic: "Average", unit: "Seconds", ...change });
    }
}
