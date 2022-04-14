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
    type S3MetricName =
        "BucketSizeBytes" | "NumberOfObjects" |
        "AllRequests" | "GetRequests" | "PutRequests" | "DeleteRequests" |
        "HeadRequests" | "PostRequests" | "SelectRequests" |
        "SelectScannedBytes" | "SelectReturnedBytes" | "ListRequests" |
        "BytesDownloaded" | "BytesUploaded" | "4xxErrors" | "5xxErrors" |
        "FirstByteLatency" | "TotalRequestLatency";

    export interface S3MetricChange extends cloudwatch.MetricChange {
        /**
         * Optional bucket to filter metrics down to.
         */
        bucket?: aws.s3.Bucket;

        /**
         * This dimension filters the data that you have stored in a bucket by the following types
         * of storage:
         *
         * * StandardStorage - The number of bytes used for objects in the STANDARD storage class.
         * * IntelligentTieringAAStorage - The number of bytes used for objects in the Archive
         *   Access tier of INTELLIGENT_TIERING storage class.
         * * IntelligentTieringDAAStorage - The number of bytes used for objects in the Deep
         *   Archive Access tier of INTELLIGENT_TIERING storage class.
         * * IntelligentTieringFAStorage - The number of bytes used for objects in the Frequent
         *   Access tier of INTELLIGENT_TIERING storage class.
         * * IntelligentTieringIAStorage - The number of bytes used for objects in the Infrequent
         *   Access tier of INTELLIGENT_TIERING storage class.
         * * StandardIAStorage - The number of bytes used for objects in the Standard-Infrequent
         *   Access (STANDARD_IA) storage class. This extra data is necessary to identify and
         *   restore your object. You are charged GLACIER rates for this additional storage.
         * * StandardIASizeOverhead - The number of bytes used for objects smaller than 128 KB in
         *   size in the STANDARD_IA storage class.
         * * IntAAObjectOverhead - For each object in INTELLIGENT_TIERING storage class in the
         *   Archive Access tier, GLACIER adds 32 KB of storage for index and related metadata.
         *   This extra data is necessary to identify and restore your object. You are charged
         *   GLACIER rates for this additional storage.
         * * IntAAS3ObjectOverhead - For each object in INTELLIGENT_TIERING storage class in the
         *   Archive Access tier, Amazon S3 uses 8 KB of storage for the name of the object and
         *   other metadata. You are charged STANDARD rates for this additional storage.
         * * IntDAAObjectOverhead - For each object in INTELLIGENT_TIERING storage class in the
         *   Deep Archive Access tier, GLACIER adds 32 KB of storage for index and related
         *   metadata. This extra data is necessary to identify and restore your object. You are
         *   charged S3 Glacier Deep Archive storage rates for this additional storage.
         * * IntDAAS3ObjectOverhead - For each object in INTELLIGENT_TIERING storage class in the
         *   Deep Archive Access tier, Amazon S3 adds 8 KB of storage for index and related
         *   metadata. This extra data is necessary to identify and restore your object. You are
         *   charged STANDARD rates for this additional storage.
         * * OneZoneIAStorage - The number of bytes used for objects in the OneZone-Infrequent
         *   Access (ONEZONE_IA) storage class.
         * * OneZoneIASizeOverhead - The number of bytes used for objects smaller than 128 KB in
         *   size in the ONEZONE_IA storage class.
         * * ReducedRedundancyStorage - The number of bytes used for objects in the Reduced
         *   Redundancy Storage (RRS) class.
         * * GlacierStorage - The number of bytes used for objects in the GLACIER storage class.
         * * GlacierStagingStorage - The number of bytes used for parts of Multipart objects
         *   before the CompleteMultipartUpload request is completed on objects in the GLACIER
         *   storage class.
         * * GlacierObjectOverhead - For each archived object, GLACIER adds 32 KB of storage for
         *   index and related metadata. This extra data is necessary to identify and restore
         *   your object. You are charged GLACIER rates for this additional storage.
         * * GlacierS3ObjectOverhead - For each object archived to GLACIER , Amazon S3 uses 8 KB
         *   of storage for the name of the object and other metadata. You are charged STANDARD
         *   rates for this additional storage.
         * * DeepArchiveStorage - The number of bytes used for objects in the S3 Glacier Deep
         *   Archive storage class.
         * * DeepArchiveObjectOverhead - For each archived object, S3 Glacier Deep Archive adds
         *   32 KB of storage for index and related metadata. This extra data is necessary to
         *   identify and restore your object. You are charged S3 Glacier Deep Archive rates
         *   for this additional storage.
         * * DeepArchiveS3ObjectOverhead - For each object archived to S3 Glacier Deep Archive,
         *   Amazon S3 uses 8 KB of storage for the name of the object and other metadata. You
         *   are charged STANDARD rates for this additional storage.
         * * DeepArchiveStagingStorage – The number of bytes used for parts of Multipart objects
         *   before the CompleteMultipartUpload request is completed on objects in the S3
         *   Glacier Deep Archive storage class.
         * * AllStorageTypes - All available storage types, used by NumberOfObjects metric
         *
         * For more information, see
         * [Metrics-and-dimensions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html).
         */
        storageType?: "StandardStorage" | "IntelligentTieringAAStorage" | "IntelligentTieringDAAStorage" |
            "IntelligentTieringFAStorage" | "IntelligentTieringIAStorage" | "StandardIAStorage" |
            "StandardIASizeOverhead" | "IntAAObjectOverhead" | "IntAAS3ObjectOverhead" | "IntDAAObjectOverhead" |
            "IntDAAS3ObjectOverhead" | "OneZoneIAStorage" | "OneZoneIASizeOverhead" | "ReducedRedundancyStorage" |
            "GlacierStorage" | "GlacierStagingStorage" | "GlacierObjectOverhead" | "GlacierS3ObjectOverhead" |
            "DeepArchiveStorage" | "DeepArchiveObjectOverhead" | "DeepArchiveS3ObjectOverhead" |
            "DeepArchiveStagingStorage" | "AllStorageTypes";

        /**
         * This dimension filters metrics configurations that you specify for request metrics on a
         * bucket, for example, a prefix or a tag. You specify a filter id when you create a metrics
         * configuration. For more information, see
         * [Metrics-Configurations-for-Buckets](https://docs.aws.amazon.com/AmazonS3/latest/dev/metrics-configurations.html).
         */
        filterId?: string;
    }

    /**
     * Creates an AWS/S3 metric with the requested [metricName]. See
     * https://docs.aws.amazon.com/AmazonS3/latest/dev/cloudwatch-monitoring.html for list of all
     * metric-names.
     *
     * Note, individual metrics can easily be obtained without supplying the name using the other
     * [metricXXX] functions.
     *
     * Amazon CloudWatch metrics for Amazon S3 can help you understand and improve the performance
     * of applications that use Amazon S3. There are two ways that you can use CloudWatch with
     * Amazon S3.
     *
     * Daily Storage Metrics for Buckets ‐ You can monitor bucket storage using CloudWatch, which
     * collects and processes storage data from Amazon S3 into readable, daily metrics. These
     * storage metrics for Amazon S3 are reported once per day and are provided to all customers at
     * no additional cost.
     *
     * Request metrics ‐ You can choose to monitor Amazon S3 requests to quickly identify and act on
     * operational issues. The metrics are available at 1 minute intervals after some latency to
     * process. These CloudWatch metrics are billed at the same rate as the Amazon CloudWatch Custom
     * Metrics. For information on CloudWatch pricing, see Amazon CloudWatch Pricing. To learn more
     * about how to opt-in to getting these metrics, see Metrics Configurations for Buckets.
     *
     * When enabled, request metrics are reported for all object operations. By default, these
     * 1-minute metrics are available at the Amazon S3 bucket level. You can also define a filter
     * for the metrics collected –using a shared prefix or object tag– allowing you to align metrics
     * filters to specific business applications, workflows, or internal organizations.
     *
     * The following dimensions are used to filter Amazon S3 metrics:
     *
     * 1. "BucketName": This dimension filters the data you request for the identified bucket only.
     * 2. "StorageType": This dimension filters the data that you have stored in a bucket by the
     *    following types of storage:
     *
     *   * StandardStorage - The number of bytes used for objects in the STANDARD storage class.
     *   * IntelligentTieringFAStorage - The number of bytes used for objects in the Frequent Access
     *     tier of INTELLIGENT_TIERING storage class.
     *   * IntelligentTieringIAStorage - The number of bytes used for objects in the Infrequent
     *     Access tier of INTELLIGENT_TIERING storage class.
     *   * StandardIAStorage - The number of bytes used for objects in the Standard - Infrequent
     *     Access (STANDARD_IA) storage class.
     *   * StandardIASizeOverhead - The number of bytes used for objects smaller than 128 KB in size
     *     in the STANDARD_IA storage class.
     *   * OneZoneIAStorage - The number of bytes used for objects in the OneZone - Infrequent
     *     Access (ONEZONE_IA) storage class.
     *   * OneZoneIASizeOverhead - The number of bytes used for objects smaller than 128 KB in size
     *     in the ONEZONE_IA storage class.
     *   * ReducedRedundancyStorage - The number of bytes used for objects in the Reduced Redundancy
     *     Storage (RRS) class.
     *   * GlacierStorage - The number of bytes used for objects in the Glacier (GLACIER) storage
     *     class.
     *   * GlacierStorageOverhead - For each object archived to Glacier, Amazon S3 uses 8 KB of
     *     storage for the name of the object and other metadata. You are charged standard Amazon S3
     *     rates for this additional storage. For each archived object, Glacier adds 32 KB of
     *     storage for index and related metadata. This extra data is necessary to identify and
     *     restore your object. You are charged Glacier rates for this additional storage.
     *
     * 3. "FilterId": This dimension filters metrics configurations that you specify for request
     *    metrics on a bucket, for example, a prefix or a tag. You specify a filter id when you
     *    create a metrics configuration. For more information, see
     *    [Metrics-Configurations-for-Buckets](https://docs.aws.amazon.com/AmazonS3/latest/dev/metrics-configurations.html).
     */
    function metric(metricName: S3MetricName, change: S3MetricChange = {}) {
        const dimensions: Record<string, pulumi.Input<string>> = {};
        if (change.bucket !== undefined) {
            dimensions.BucketName = change.bucket.bucket;
        }

        if (change.storageType !== undefined) {
            dimensions.StorageType = change.storageType;
        }

        if (change.filterId !== undefined) {
            dimensions.FilterId = change.filterId;
        }

        return new cloudwatch.Metric({
            namespace: "AWS/S3",
            name: metricName,
            ...change,
        }).withDimensions(dimensions);
    }

    /**
     * The amount of data in bytes stored in a bucket in the STANDARD storage class,
     * INTELLIGENT_TIERING storage class, Standard - Infrequent Access (STANDARD_IA) storage class,
     * OneZone - Infrequent Access (ONEZONE_IA), Reduced Redundancy Storage (RRS) class, or Glacier
     * (GLACIER) storage class. This value is calculated by summing the size of all objects in the
     * bucket (both current and noncurrent objects), including the size of all parts for all
     * incomplete multipart uploads to the bucket.
     *
     * Units: Bytes
     *
     * Valid statistics: Average
     */
    export function bucketSizeBytes(change?: S3MetricChange) {
        return metric("BucketSizeBytes", { unit: "Bytes", ...change });
    }

    /**
     * The total number of objects stored in a bucket for all storage classes except for the GLACIER
     * storage class. This value is calculated by counting all objects in the bucket (both current
     * and noncurrent objects) and the total number of parts for all incomplete multipart uploads to
     * the bucket.
     *
     * Units: Count
     *
     * Valid statistics: Average
     */
    export function numberOfObjects(change?: S3MetricChange) {
        return metric("NumberOfObjects", { unit: "Count", ...change });
    }

    /**
     * The total number of HTTP requests made to an Amazon S3 bucket, regardless of type. If you're
     * using a metrics configuration with a filter, then this metric only returns the HTTP requests
     * made to the objects in the bucket that meet the filter's requirements.
     *
     * Units: Count
     *
     * Valid statistics: Sum
     */
    export function allRequests(change?: S3MetricChange) {
        return metric("AllRequests", { statistic: "Sum", unit: "Count", ...change });
    }

    /**
     * The number of HTTP GET requests made for objects in an Amazon S3 bucket. This doesn't include
     * list operations.
     *
     * Note: Paginated list-oriented requests, like List Multipart Uploads, List Parts, Get Bucket
     * Object versions, and others, are not included in this metric.
     *
     * Units: Count
     *
     * Valid statistics: Sum
     */
    export function getRequests(change?: S3MetricChange) {
        return metric("GetRequests", { statistic: "Sum", unit: "Count", ...change });
    }

    /**
     * The number of HTTP PUT requests made for objects in an Amazon S3 bucket.
     *
     * Units: Count
     *
     * Valid statistics: Sum
     */
    export function putRequests(change?: S3MetricChange) {
        return metric("PutRequests", { statistic: "Sum", unit: "Count", ...change });
    }

    /**
     * The number of HTTP DELETE requests made for objects in an Amazon S3 bucket. This also
     * includes Delete Multiple Objects requests. This metric shows the number of requests, not the
     * number of objects deleted.
     *
     * Units: Count
     *
     * Valid statistics: Sum
     */
    export function deleteRequests(change?: S3MetricChange) {
        return metric("DeleteRequests", { statistic: "Sum", unit: "Count", ...change });
    }

    /**
     * The number of HTTP HEAD requests made to an Amazon S3 bucket.
     *
     * Units: Count
     *
     * Valid statistics: Sum
     */
    export function headRequests(change?: S3MetricChange) {
        return metric("HeadRequests", { statistic: "Sum", unit: "Count", ...change });
    }

    /**
     * The number of HTTP POST requests made to an Amazon S3 bucket.
     *
     * Note: Delete Multiple Objects and SELECT Object Content requests are not included in this
     * metric.
     *
     * Units: Count
     *
     * Valid statistics: Sum
     */
    export function postRequests(change?: S3MetricChange) {
        return metric("PostRequests", { statistic: "Sum", unit: "Count", ...change });
    }

    /**
     * The number of Amazon S3 SELECT Object Content requests made for objects in an Amazon S3
     * bucket.
     *
     * Units: Count
     *
     * Valid statistics: Sum
     */
    export function selectRequests(change?: S3MetricChange) {
        return metric("SelectRequests", { statistic: "Sum", unit: "Count", ...change });
    }

    /**
     * The number of bytes of data scanned with Amazon S3 SELECT Object Content requests in an
     * Amazon S3 bucket.
     *
     * Units: Bytes
     *
     * Valid statistics: Average (bytes per request), Sum (bytes per period), Sample Count, Min, Max
     */
    export function selectScannedBytes(change?: S3MetricChange) {
        return metric("SelectScannedBytes", { unit: "Bytes", ...change });
    }

    /**
     * The number of bytes of data returned with Amazon S3 SELECT Object Content requests in an
     * Amazon S3 bucket.
     *
     * Units: Bytes
     *
     * Valid statistics: Average (bytes per request), Sum (bytes per period), Sample Count, Min, Max
     */
    export function selectReturnedBytes(change?: S3MetricChange) {
        return metric("SelectReturnedBytes", { unit: "Bytes", ...change });
    }

    /**
     * The number of HTTP requests that list the contents of a bucket.
     *
     * Units: Count
     *
     * Valid statistics: Sum
     */
    export function listRequests(change?: S3MetricChange) {
        return metric("ListRequests", { statistic: "Sum", unit: "Bytes", ...change });
    }

    /**
     * The number bytes downloaded for requests made to an Amazon S3 bucket, where the response
     * includes a body.
     *
     * Units: Bytes
     *
     * Valid statistics: Average (bytes per request), Sum (bytes per period), Sample Count, Min, Max
     */
    export function bytesDownloaded(change?: S3MetricChange) {
        return metric("BytesDownloaded", { unit: "Bytes", ...change });
    }

    /**
     * The number bytes uploaded that contain a request body, made to an Amazon S3 bucket.
     *
     * Units: Bytes
     *
     * Valid statistics: Average (bytes per request), Sum (bytes per period), Sample Count, Min, Max
     */
    export function bytesUploaded(change?: S3MetricChange) {
        return metric("BytesUploaded", { unit: "Bytes", ...change });
    }

    /**
     * he number of HTTP 4xx client error status code requests made to an Amazon S3 bucket with a
     * value of either 0 or 1. The average statistic shows the error rate, and the sum statistic
     * shows the count of that type of error, during each period.
     *
     * Units: Count
     *
     * Valid statistics: Average (reports per request), Sum (reports per period), Min, Max, Sample
     * Count
     */
    export function errors4xx(change?: S3MetricChange) {
        return metric("4xxErrors", { unit: "Count", ...change });
    }

    /**
     * The number of HTTP 5xx server error status code requests made to an Amazon S3 bucket with a
     * value of either 0 or 1. The average statistic shows the error rate, and the sum statistic
     * shows the count of that type of error, during each period.
     *
     * Units: Count
     *
     * Valid statistics: Average (reports per request), Sum (reports per period), Min, Max, Sample
     * Count
     */
    export function errors5xx(change?: S3MetricChange) {
        return metric("5xxErrors", { unit: "Count", ...change });
    }

    /**
     * The per-request time from the complete request being received by an Amazon S3 bucket to when
     * the response starts to be returned.
     *
     * Units: Milliseconds
     *
     * Valid statistics: Average, Sum, Min, Max, Sample Count
     */
    export function firstByteLatency(change?: S3MetricChange) {
        return metric("FirstByteLatency", { unit: "Milliseconds", ...change });
    }

    /**
     * The elapsed per-request time from the first byte received to the last byte sent to an Amazon
     * S3 bucket. This includes the time taken to receive the request body and send the response
     * body, which is not included in FirstByteLatency.
     *
     * Units: Milliseconds
     *
     * Valid statistics: Average, Sum, Min, Max, Sample Count
     */
    export function totalRequestLatency(change?: S3MetricChange) {
        return metric("TotalRequestLatency", { unit: "Milliseconds", ...change });
    }
}
