// Code generated by pulumi-gen-awsx DO NOT EDIT.
// *** WARNING: Do not edit by hand unless you're certain you know what you are doing! ***

package cloudtrail

import (
	"context"
	"reflect"

	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/cloudtrail"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/cloudwatch"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/s3"
	"github.com/pulumi/pulumi-awsx/sdk/v3/go/awsx/awsx"
	"github.com/pulumi/pulumi-awsx/sdk/v3/go/awsx/internal"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type Trail struct {
	pulumi.ResourceState

	// The managed S3 Bucket where the Trail will place its logs.
	Bucket s3.BucketOutput `pulumi:"bucket"`
	// The managed Cloudwatch Log Group.
	LogGroup cloudwatch.LogGroupOutput `pulumi:"logGroup"`
	// The CloudTrail Trail.
	Trail cloudtrail.TrailOutput `pulumi:"trail"`
}

// NewTrail registers a new resource with the given unique name, arguments, and options.
func NewTrail(ctx *pulumi.Context,
	name string, args *TrailArgs, opts ...pulumi.ResourceOption) (*Trail, error) {
	if args == nil {
		args = &TrailArgs{}
	}

	opts = internal.PkgResourceDefaultOpts(opts)
	var resource Trail
	err := ctx.RegisterRemoteComponentResource("awsx:cloudtrail:Trail", name, args, &resource, opts...)
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

type trailArgs struct {
	// Specifies an advanced event selector for enabling data event logging. Fields documented below. Conflicts with `event_selector`.
	AdvancedEventSelectors []cloudtrail.TrailAdvancedEventSelector `pulumi:"advancedEventSelectors"`
	// Log group to which CloudTrail logs will be delivered.
	CloudWatchLogsGroup *awsx.OptionalLogGroup `pulumi:"cloudWatchLogsGroup"`
	// Whether log file integrity validation is enabled. Defaults to `false`.
	EnableLogFileValidation *bool `pulumi:"enableLogFileValidation"`
	// Enables logging for the trail. Defaults to `true`. Setting this to `false` will pause logging.
	EnableLogging *bool `pulumi:"enableLogging"`
	// Specifies an event selector for enabling data event logging. Fields documented below. Please note the [CloudTrail limits](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/WhatIsCloudTrail-Limits.html) when configuring these. Conflicts with `advanced_event_selector`.
	EventSelectors []cloudtrail.TrailEventSelector `pulumi:"eventSelectors"`
	// Whether the trail is publishing events from global services such as IAM to the log files. Defaults to `true`.
	IncludeGlobalServiceEvents *bool `pulumi:"includeGlobalServiceEvents"`
	// Configuration block for identifying unusual operational activity. See details below.
	InsightSelectors []cloudtrail.TrailInsightSelector `pulumi:"insightSelectors"`
	// Whether the trail is created in the current region or in all regions. Defaults to `false`.
	IsMultiRegionTrail *bool `pulumi:"isMultiRegionTrail"`
	// Whether the trail is an AWS Organizations trail. Organization trails log events for the master account and all member accounts. Can only be created in the organization master account. Defaults to `false`.
	IsOrganizationTrail *bool `pulumi:"isOrganizationTrail"`
	// KMS key ARN to use to encrypt the logs delivered by CloudTrail.
	KmsKeyId *string `pulumi:"kmsKeyId"`
	// Name of the trail.
	Name *string `pulumi:"name"`
	// Region where this resource will be [managed](https://docs.aws.amazon.com/general/latest/gr/rande.html#regional-endpoints). Defaults to the Region set in the provider configuration.
	Region *string `pulumi:"region"`
	// S3 bucket designated for publishing log files.
	S3Bucket *awsx.RequiredBucket `pulumi:"s3Bucket"`
	// S3 key prefix that follows the name of the bucket you have designated for log file delivery.
	S3KeyPrefix *string `pulumi:"s3KeyPrefix"`
	// Name of the Amazon SNS topic defined for notification of log file delivery. Specify the SNS topic ARN if it resides in another region.
	SnsTopicName *string `pulumi:"snsTopicName"`
	// Map of tags to assign to the trail. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
	Tags map[string]string `pulumi:"tags"`
}

// The set of arguments for constructing a Trail resource.
type TrailArgs struct {
	// Specifies an advanced event selector for enabling data event logging. Fields documented below. Conflicts with `event_selector`.
	AdvancedEventSelectors cloudtrail.TrailAdvancedEventSelectorArrayInput
	// Log group to which CloudTrail logs will be delivered.
	CloudWatchLogsGroup *awsx.OptionalLogGroupArgs
	// Whether log file integrity validation is enabled. Defaults to `false`.
	EnableLogFileValidation pulumi.BoolPtrInput
	// Enables logging for the trail. Defaults to `true`. Setting this to `false` will pause logging.
	EnableLogging pulumi.BoolPtrInput
	// Specifies an event selector for enabling data event logging. Fields documented below. Please note the [CloudTrail limits](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/WhatIsCloudTrail-Limits.html) when configuring these. Conflicts with `advanced_event_selector`.
	EventSelectors cloudtrail.TrailEventSelectorArrayInput
	// Whether the trail is publishing events from global services such as IAM to the log files. Defaults to `true`.
	IncludeGlobalServiceEvents pulumi.BoolPtrInput
	// Configuration block for identifying unusual operational activity. See details below.
	InsightSelectors cloudtrail.TrailInsightSelectorArrayInput
	// Whether the trail is created in the current region or in all regions. Defaults to `false`.
	IsMultiRegionTrail pulumi.BoolPtrInput
	// Whether the trail is an AWS Organizations trail. Organization trails log events for the master account and all member accounts. Can only be created in the organization master account. Defaults to `false`.
	IsOrganizationTrail pulumi.BoolPtrInput
	// KMS key ARN to use to encrypt the logs delivered by CloudTrail.
	KmsKeyId pulumi.StringPtrInput
	// Name of the trail.
	Name pulumi.StringPtrInput
	// Region where this resource will be [managed](https://docs.aws.amazon.com/general/latest/gr/rande.html#regional-endpoints). Defaults to the Region set in the provider configuration.
	Region pulumi.StringPtrInput
	// S3 bucket designated for publishing log files.
	S3Bucket *awsx.RequiredBucketArgs
	// S3 key prefix that follows the name of the bucket you have designated for log file delivery.
	S3KeyPrefix pulumi.StringPtrInput
	// Name of the Amazon SNS topic defined for notification of log file delivery. Specify the SNS topic ARN if it resides in another region.
	SnsTopicName pulumi.StringPtrInput
	// Map of tags to assign to the trail. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
	Tags pulumi.StringMapInput
}

func (TrailArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*trailArgs)(nil)).Elem()
}

type TrailInput interface {
	pulumi.Input

	ToTrailOutput() TrailOutput
	ToTrailOutputWithContext(ctx context.Context) TrailOutput
}

func (*Trail) ElementType() reflect.Type {
	return reflect.TypeOf((**Trail)(nil)).Elem()
}

func (i *Trail) ToTrailOutput() TrailOutput {
	return i.ToTrailOutputWithContext(context.Background())
}

func (i *Trail) ToTrailOutputWithContext(ctx context.Context) TrailOutput {
	return pulumi.ToOutputWithContext(ctx, i).(TrailOutput)
}

// TrailArrayInput is an input type that accepts TrailArray and TrailArrayOutput values.
// You can construct a concrete instance of `TrailArrayInput` via:
//
//	TrailArray{ TrailArgs{...} }
type TrailArrayInput interface {
	pulumi.Input

	ToTrailArrayOutput() TrailArrayOutput
	ToTrailArrayOutputWithContext(context.Context) TrailArrayOutput
}

type TrailArray []TrailInput

func (TrailArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*Trail)(nil)).Elem()
}

func (i TrailArray) ToTrailArrayOutput() TrailArrayOutput {
	return i.ToTrailArrayOutputWithContext(context.Background())
}

func (i TrailArray) ToTrailArrayOutputWithContext(ctx context.Context) TrailArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(TrailArrayOutput)
}

// TrailMapInput is an input type that accepts TrailMap and TrailMapOutput values.
// You can construct a concrete instance of `TrailMapInput` via:
//
//	TrailMap{ "key": TrailArgs{...} }
type TrailMapInput interface {
	pulumi.Input

	ToTrailMapOutput() TrailMapOutput
	ToTrailMapOutputWithContext(context.Context) TrailMapOutput
}

type TrailMap map[string]TrailInput

func (TrailMap) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*Trail)(nil)).Elem()
}

func (i TrailMap) ToTrailMapOutput() TrailMapOutput {
	return i.ToTrailMapOutputWithContext(context.Background())
}

func (i TrailMap) ToTrailMapOutputWithContext(ctx context.Context) TrailMapOutput {
	return pulumi.ToOutputWithContext(ctx, i).(TrailMapOutput)
}

type TrailOutput struct{ *pulumi.OutputState }

func (TrailOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**Trail)(nil)).Elem()
}

func (o TrailOutput) ToTrailOutput() TrailOutput {
	return o
}

func (o TrailOutput) ToTrailOutputWithContext(ctx context.Context) TrailOutput {
	return o
}

// The managed S3 Bucket where the Trail will place its logs.
func (o TrailOutput) Bucket() s3.BucketOutput {
	return o.ApplyT(func(v *Trail) s3.BucketOutput { return v.Bucket }).(s3.BucketOutput)
}

// The managed Cloudwatch Log Group.
func (o TrailOutput) LogGroup() cloudwatch.LogGroupOutput {
	return o.ApplyT(func(v *Trail) cloudwatch.LogGroupOutput { return v.LogGroup }).(cloudwatch.LogGroupOutput)
}

// The CloudTrail Trail.
func (o TrailOutput) Trail() cloudtrail.TrailOutput {
	return o.ApplyT(func(v *Trail) cloudtrail.TrailOutput { return v.Trail }).(cloudtrail.TrailOutput)
}

type TrailArrayOutput struct{ *pulumi.OutputState }

func (TrailArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*Trail)(nil)).Elem()
}

func (o TrailArrayOutput) ToTrailArrayOutput() TrailArrayOutput {
	return o
}

func (o TrailArrayOutput) ToTrailArrayOutputWithContext(ctx context.Context) TrailArrayOutput {
	return o
}

func (o TrailArrayOutput) Index(i pulumi.IntInput) TrailOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) *Trail {
		return vs[0].([]*Trail)[vs[1].(int)]
	}).(TrailOutput)
}

type TrailMapOutput struct{ *pulumi.OutputState }

func (TrailMapOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*Trail)(nil)).Elem()
}

func (o TrailMapOutput) ToTrailMapOutput() TrailMapOutput {
	return o
}

func (o TrailMapOutput) ToTrailMapOutputWithContext(ctx context.Context) TrailMapOutput {
	return o
}

func (o TrailMapOutput) MapIndex(k pulumi.StringInput) TrailOutput {
	return pulumi.All(o, k).ApplyT(func(vs []interface{}) *Trail {
		return vs[0].(map[string]*Trail)[vs[1].(string)]
	}).(TrailOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*TrailInput)(nil)).Elem(), &Trail{})
	pulumi.RegisterInputType(reflect.TypeOf((*TrailArrayInput)(nil)).Elem(), TrailArray{})
	pulumi.RegisterInputType(reflect.TypeOf((*TrailMapInput)(nil)).Elem(), TrailMap{})
	pulumi.RegisterOutputType(TrailOutput{})
	pulumi.RegisterOutputType(TrailArrayOutput{})
	pulumi.RegisterOutputType(TrailMapOutput{})
}
