// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Cloudtrail
{
    [AwsxResourceType("awsx:cloudtrail:Trail")]
    public partial class Trail : global::Pulumi.ComponentResource
    {
        /// <summary>
        /// The managed S3 Bucket where the Trail will place its logs.
        /// </summary>
        [Output("bucket")]
        public Output<Pulumi.Aws.S3.Bucket?> Bucket { get; private set; } = null!;

        /// <summary>
        /// The managed Cloudwatch Log Group.
        /// </summary>
        [Output("logGroup")]
        public Output<Pulumi.Aws.CloudWatch.LogGroup?> LogGroup { get; private set; } = null!;

        /// <summary>
        /// The CloudTrail Trail.
        /// </summary>
        [Output("trail")]
        public Output<Pulumi.Aws.CloudTrail.Trail> AwsTrail { get; private set; } = null!;


        /// <summary>
        /// Create a Trail resource with the given unique name, arguments, and options.
        /// </summary>
        ///
        /// <param name="name">The unique name of the resource</param>
        /// <param name="args">The arguments used to populate this resource's properties</param>
        /// <param name="options">A bag of options that control this resource's behavior</param>
        public Trail(string name, TrailArgs? args = null, ComponentResourceOptions? options = null)
            : base("awsx:cloudtrail:Trail", name, args ?? new TrailArgs(), MakeResourceOptions(options, ""), remote: true)
        {
        }

        private static ComponentResourceOptions MakeResourceOptions(ComponentResourceOptions? options, Input<string>? id)
        {
            var defaultOptions = new ComponentResourceOptions
            {
                Version = Utilities.Version,
            };
            var merged = ComponentResourceOptions.Merge(defaultOptions, options);
            // Override the ID if one was specified for consistency with other language SDKs.
            merged.Id = id ?? merged.Id;
            return merged;
        }
    }

    public sealed class TrailArgs : global::Pulumi.ResourceArgs
    {
        [Input("advancedEventSelectors")]
        private InputList<Pulumi.Aws.CloudTrail.Inputs.TrailAdvancedEventSelectorArgs>? _advancedEventSelectors;

        /// <summary>
        /// Specifies an advanced event selector for enabling data event logging. Fields documented below. Conflicts with `event_selector`.
        /// </summary>
        public InputList<Pulumi.Aws.CloudTrail.Inputs.TrailAdvancedEventSelectorArgs> AdvancedEventSelectors
        {
            get => _advancedEventSelectors ?? (_advancedEventSelectors = new InputList<Pulumi.Aws.CloudTrail.Inputs.TrailAdvancedEventSelectorArgs>());
            set => _advancedEventSelectors = value;
        }

        /// <summary>
        /// Log group to which CloudTrail logs will be delivered.
        /// </summary>
        [Input("cloudWatchLogsGroup")]
        public Pulumi.Awsx.Awsx.Inputs.OptionalLogGroupArgs? CloudWatchLogsGroup { get; set; }

        /// <summary>
        /// Whether log file integrity validation is enabled. Defaults to `false`.
        /// </summary>
        [Input("enableLogFileValidation")]
        public Input<bool>? EnableLogFileValidation { get; set; }

        /// <summary>
        /// Enables logging for the trail. Defaults to `true`. Setting this to `false` will pause logging.
        /// </summary>
        [Input("enableLogging")]
        public Input<bool>? EnableLogging { get; set; }

        [Input("eventSelectors")]
        private InputList<Pulumi.Aws.CloudTrail.Inputs.TrailEventSelectorArgs>? _eventSelectors;

        /// <summary>
        /// Specifies an event selector for enabling data event logging. Fields documented below. Please note the [CloudTrail limits](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/WhatIsCloudTrail-Limits.html) when configuring these. Conflicts with `advanced_event_selector`.
        /// </summary>
        public InputList<Pulumi.Aws.CloudTrail.Inputs.TrailEventSelectorArgs> EventSelectors
        {
            get => _eventSelectors ?? (_eventSelectors = new InputList<Pulumi.Aws.CloudTrail.Inputs.TrailEventSelectorArgs>());
            set => _eventSelectors = value;
        }

        /// <summary>
        /// Whether the trail is publishing events from global services such as IAM to the log files. Defaults to `true`.
        /// </summary>
        [Input("includeGlobalServiceEvents")]
        public Input<bool>? IncludeGlobalServiceEvents { get; set; }

        [Input("insightSelectors")]
        private InputList<Pulumi.Aws.CloudTrail.Inputs.TrailInsightSelectorArgs>? _insightSelectors;

        /// <summary>
        /// Configuration block for identifying unusual operational activity. See details below.
        /// </summary>
        public InputList<Pulumi.Aws.CloudTrail.Inputs.TrailInsightSelectorArgs> InsightSelectors
        {
            get => _insightSelectors ?? (_insightSelectors = new InputList<Pulumi.Aws.CloudTrail.Inputs.TrailInsightSelectorArgs>());
            set => _insightSelectors = value;
        }

        /// <summary>
        /// Whether the trail is created in the current region or in all regions. Defaults to `false`.
        /// </summary>
        [Input("isMultiRegionTrail")]
        public Input<bool>? IsMultiRegionTrail { get; set; }

        /// <summary>
        /// Whether the trail is an AWS Organizations trail. Organization trails log events for the master account and all member accounts. Can only be created in the organization master account. Defaults to `false`.
        /// </summary>
        [Input("isOrganizationTrail")]
        public Input<bool>? IsOrganizationTrail { get; set; }

        /// <summary>
        /// KMS key ARN to use to encrypt the logs delivered by CloudTrail.
        /// </summary>
        [Input("kmsKeyId")]
        public Input<string>? KmsKeyId { get; set; }

        /// <summary>
        /// Name of the trail.
        /// </summary>
        [Input("name")]
        public Input<string>? Name { get; set; }

        /// <summary>
        /// S3 bucket designated for publishing log files.
        /// </summary>
        [Input("s3Bucket")]
        public Pulumi.Awsx.Awsx.Inputs.RequiredBucketArgs? S3Bucket { get; set; }

        /// <summary>
        /// S3 key prefix that follows the name of the bucket you have designated for log file delivery.
        /// </summary>
        [Input("s3KeyPrefix")]
        public Input<string>? S3KeyPrefix { get; set; }

        /// <summary>
        /// Name of the Amazon SNS topic defined for notification of log file delivery. Specify the SNS topic ARN if it resides in another region.
        /// </summary>
        [Input("snsTopicName")]
        public Input<string>? SnsTopicName { get; set; }

        [Input("tags")]
        private InputMap<string>? _tags;

        /// <summary>
        /// Map of tags to assign to the trail. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        /// </summary>
        public InputMap<string> Tags
        {
            get => _tags ?? (_tags = new InputMap<string>());
            set => _tags = value;
        }

        public TrailArgs()
        {
        }
        public static new TrailArgs Empty => new TrailArgs();
    }
}
