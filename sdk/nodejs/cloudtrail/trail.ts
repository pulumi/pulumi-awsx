// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import { input as inputs, output as outputs } from "../types";
import * as utilities from "../utilities";

import * as pulumiAws from "@pulumi/aws";

export class Trail extends pulumi.ComponentResource {
    /** @internal */
    public static readonly __pulumiType = 'awsx:cloudtrail:Trail';

    /**
     * Returns true if the given object is an instance of Trail.  This is designed to work even
     * when multiple copies of the Pulumi SDK have been loaded into the same process.
     */
    public static isInstance(obj: any): obj is Trail {
        if (obj === undefined || obj === null) {
            return false;
        }
        return obj['__pulumiType'] === Trail.__pulumiType;
    }

    /**
     * The managed S3 Bucket where the Trail will place its logs.
     */
    public /*out*/ readonly bucket!: pulumi.Output<pulumiAws.s3.Bucket | undefined>;
    /**
     * The managed Cloudwatch Log Group.
     */
    public /*out*/ readonly logGroup!: pulumi.Output<pulumiAws.cloudwatch.LogGroup | undefined>;
    /**
     * The CloudTrail Trail.
     */
    public /*out*/ readonly trail!: pulumi.Output<pulumiAws.cloudtrail.Trail>;

    /**
     * Create a Trail resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args?: TrailArgs, opts?: pulumi.ComponentResourceOptions) {
        let resourceInputs: pulumi.Inputs = {};
        opts = opts || {};
        if (!opts.id) {
            resourceInputs["advancedEventSelectors"] = args ? args.advancedEventSelectors : undefined;
            resourceInputs["cloudWatchLogsGroup"] = args ? args.cloudWatchLogsGroup : undefined;
            resourceInputs["enableLogFileValidation"] = args ? args.enableLogFileValidation : undefined;
            resourceInputs["enableLogging"] = args ? args.enableLogging : undefined;
            resourceInputs["eventSelectors"] = args ? args.eventSelectors : undefined;
            resourceInputs["includeGlobalServiceEvents"] = args ? args.includeGlobalServiceEvents : undefined;
            resourceInputs["insightSelectors"] = args ? args.insightSelectors : undefined;
            resourceInputs["isMultiRegionTrail"] = args ? args.isMultiRegionTrail : undefined;
            resourceInputs["isOrganizationTrail"] = args ? args.isOrganizationTrail : undefined;
            resourceInputs["kmsKeyId"] = args ? args.kmsKeyId : undefined;
            resourceInputs["name"] = args ? args.name : undefined;
            resourceInputs["s3Bucket"] = args ? args.s3Bucket : undefined;
            resourceInputs["s3KeyPrefix"] = args ? args.s3KeyPrefix : undefined;
            resourceInputs["snsTopicName"] = args ? args.snsTopicName : undefined;
            resourceInputs["tags"] = args ? args.tags : undefined;
            resourceInputs["bucket"] = undefined /*out*/;
            resourceInputs["logGroup"] = undefined /*out*/;
            resourceInputs["trail"] = undefined /*out*/;
        } else {
            resourceInputs["bucket"] = undefined /*out*/;
            resourceInputs["logGroup"] = undefined /*out*/;
            resourceInputs["trail"] = undefined /*out*/;
        }
        opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
        super(Trail.__pulumiType, name, resourceInputs, opts, true /*remote*/);
    }
}

/**
 * The set of arguments for constructing a Trail resource.
 */
export interface TrailArgs {
    /**
     * Specifies an advanced event selector for enabling data event logging. Fields documented below. Conflicts with `event_selector`.
     */
    advancedEventSelectors?: pulumi.Input<pulumi.Input<pulumiAws.types.input.cloudtrail.TrailAdvancedEventSelector>[]>;
    /**
     * Log group to which CloudTrail logs will be delivered.
     */
    cloudWatchLogsGroup?: inputs.cloudwatch.OptionalLogGroupArgs;
    /**
     * Whether log file integrity validation is enabled. Defaults to `false`.
     */
    enableLogFileValidation?: pulumi.Input<boolean>;
    /**
     * Enables logging for the trail. Defaults to `true`. Setting this to `false` will pause logging.
     */
    enableLogging?: pulumi.Input<boolean>;
    /**
     * Specifies an event selector for enabling data event logging. Fields documented below. Please note the [CloudTrail limits](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/WhatIsCloudTrail-Limits.html) when configuring these. Conflicts with `advanced_event_selector`.
     */
    eventSelectors?: pulumi.Input<pulumi.Input<pulumiAws.types.input.cloudtrail.TrailEventSelector>[]>;
    /**
     * Whether the trail is publishing events from global services such as IAM to the log files. Defaults to `true`.
     */
    includeGlobalServiceEvents?: pulumi.Input<boolean>;
    /**
     * Configuration block for identifying unusual operational activity. See details below.
     */
    insightSelectors?: pulumi.Input<pulumi.Input<pulumiAws.types.input.cloudtrail.TrailInsightSelector>[]>;
    /**
     * Whether the trail is created in the current region or in all regions. Defaults to `false`.
     */
    isMultiRegionTrail?: pulumi.Input<boolean>;
    /**
     * Whether the trail is an AWS Organizations trail. Organization trails log events for the master account and all member accounts. Can only be created in the organization master account. Defaults to `false`.
     */
    isOrganizationTrail?: pulumi.Input<boolean>;
    /**
     * KMS key ARN to use to encrypt the logs delivered by CloudTrail.
     */
    kmsKeyId?: pulumi.Input<string>;
    /**
     * Specifies the name of the advanced event selector.
     */
    name?: pulumi.Input<string>;
    /**
     * S3 bucket designated for publishing log files.
     */
    s3Bucket?: inputs.s3.RequiredBucketArgs;
    /**
     * S3 key prefix that follows the name of the bucket you have designated for log file delivery.
     */
    s3KeyPrefix?: pulumi.Input<string>;
    /**
     * Name of the Amazon SNS topic defined for notification of log file delivery.
     */
    snsTopicName?: pulumi.Input<string>;
    /**
     * Map of tags to assign to the trail. If configured with provider defaultTags present, tags with matching keys will overwrite those defined at the provider-level.
     */
    tags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
}
