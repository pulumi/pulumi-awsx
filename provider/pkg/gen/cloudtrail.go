// Copyright 2016-2022, Pulumi Corporation.
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

package gen

import (
	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

func generateCloudtrail(awsSpec schema.PackageSpec) schema.PackageSpec {
	return schema.PackageSpec{
		Resources: map[string]schema.ResourceSpec{
			"awsx:cloudtrail:Trail": {
				IsComponent: true,
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Description: "",
					Properties: map[string]schema.PropertySpec{
						"bucket": {
							Description: "The managed S3 Bucket where the Trail will place its logs.",
							TypeSpec: schema.TypeSpec{
								Ref: awsRef("#/resources/aws:s3%2Fbucket:Bucket"),
							},
						},
						"logGroup": {
							Description: "The managed Cloudwatch Log Group.",
							TypeSpec: schema.TypeSpec{
								Ref: awsRef("#/resources/aws:cloudwatch%2FlogGroup:LogGroup"),
							},
						},
						"trail": {
							Description: "The CloudTrail Trail.",
							TypeSpec: schema.TypeSpec{
								Ref: awsRef("#/resources/aws:cloudtrail%2Ftrail:Trail"),
							},
							Language: map[string]schema.RawMessage{
								"csharp": schema.RawMessage(`{
									"name": "AwsTrail"
								}`),
							},
						},
					},
					Required: []string{
						"bucket",
						"trail",
					},
				},
				InputProperties: map[string]schema.PropertySpec{
					"advancedEventSelectors": {
						Description: "Specifies an advanced event selector for enabling data event logging.",
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Ref: awsRef("#/types/aws:cloudtrail%2FTrailAdvancedEventSelector:TrailAdvancedEventSelector")},
						},
					},
					"cloudWatchLogGroupArgs": {
						TypeSpec:    schema.TypeSpec{Ref: "#/types/awsx:cloudtrail:LogGroup"},
						Description: "If sendToCloudWatchLogs is enabled, provide the log group configuration.",
					},
					"cloudWatchLogsGroupArn": {
						Description: "Log group name using an ARN that represents the log group to which CloudTrail logs will be delivered. Note that CloudTrail requires the Log Stream wildcard.",
						TypeSpec: schema.TypeSpec{
							Type: "string",
						},
					},
					"cloudWatchLogsRoleArn": {
						Description: "Role for the CloudWatch Logs endpoint to assume to write to a user’s log group.",
						TypeSpec: schema.TypeSpec{
							Type: "string",
						},
					},
					"enableLogFileValidation": {
						Description: "Whether log file integrity validation is enabled. Defaults to `false`.",
						TypeSpec: schema.TypeSpec{
							Type: "boolean",
						},
					},
					"enableLogging": {
						Description: "Enables logging for the trail. Defaults to `true`. Setting this to `false` will pause logging.",
						TypeSpec: schema.TypeSpec{
							Type: "boolean",
						},
					},
					"eventSelectors": {
						Description: "Specifies an event selector for enabling data event logging. Please note the CloudTrail limits when configuring these",
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Ref: awsRef("#/types/aws:cloudtrail%2FTrailEventSelector:TrailEventSelector")},
						},
					},
					"includeGlobalServiceEvents": {
						Description: "Whether the trail is publishing events from global services such as IAM to the log files. Defaults to `true`.",
						TypeSpec: schema.TypeSpec{
							Type: "boolean",
						},
					},
					"insightSelectors": {
						Description: "Configuration block for identifying unusual operational activity.",
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Ref: awsRef("#/types/aws:cloudtrail%2FTrailInsightSelector:TrailInsightSelector")},
						},
					},
					"isMultiRegionTrail": {
						Description: "Whether the trail is created in the current region or in all regions. Defaults to `false`.",
						TypeSpec: schema.TypeSpec{
							Type: "boolean",
						},
					},
					"isOrganizationTrail": {
						Description: "Whether the trail is an AWS Organizations trail. Organization trails log events for the master account and all member accounts. Can only be created in the organization master account. Defaults to `false`",
						TypeSpec: schema.TypeSpec{
							Type: "boolean",
						},
					},
					"kmsKeyId": {
						Description: "KMS key ARN to use to encrypt the logs delivered by CloudTrail.",
						TypeSpec: schema.TypeSpec{
							Type: "string",
						},
					},
					"s3BucketName": {
						Description: "Name of the S3 bucket designated for publishing log files.",
						TypeSpec: schema.TypeSpec{
							Type: "string",
						},
					},
					"s3KeyPrefix": {
						Description: "S3 key prefix that follows the name of the bucket you have designated for log file delivery.",
						TypeSpec: schema.TypeSpec{
							Type: "string",
						},
					},
					"sendToCloudWatchLogs": {
						Description: "If CloudTrail pushes logs to CloudWatch Logs in addition to S3. Disabled by default to reduce costs. Defaults to `false`",
						TypeSpec: schema.TypeSpec{
							Type: "boolean",
						},
					},
					"snsTopicName": {
						Description: "Name of the Amazon SNS topic defined for notification of log file delivery.",
						TypeSpec: schema.TypeSpec{
							Type: "string",
						},
					},
					"tags": {
						TypeSpec: schema.TypeSpec{
							Type:                 "object",
							AdditionalProperties: &schema.TypeSpec{Type: "string"},
						},
						Description: "Map of tags to assign to the trail. If configured with provider defaultTags present, tags with matching keys will overwrite those defined at the provider-level.",
					},
				},
				RequiredInputs: []string{},
			},
		},
		Types: map[string]schema.ComplexTypeSpec{
			"awsx:cloudtrail:LogGroup": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Defines the log group configuration for the CloudWatch Log Group to send logs to.",
					Properties: map[string]schema.PropertySpec{
						"kmsKeyId": {
							Description: "The ARN of the KMS Key to use when encrypting log data.",
							TypeSpec: schema.TypeSpec{
								Type: "string",
							},
						},
						"namePrefix": {
							Description: "Creates a unique name beginning with the specified prefix",
							TypeSpec: schema.TypeSpec{
								Type: "string",
							},
						},
						"retentionInDays": {
							Description: "Specifies the number of days you want to retain log events in the specified log group. Possible values are: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653, and 0. If you select 0, the events in the log group are always retained and never expire.",
							TypeSpec: schema.TypeSpec{
								Type: "integer",
							},
						},
						"tags": {
							TypeSpec: schema.TypeSpec{
								Type:                 "object",
								AdditionalProperties: &schema.TypeSpec{Type: "string"},
							},
							Description: "A map of tags to assign to the resource. If configured with provider defaultTags present, tags with matching keys will overwrite those defined at the provider-level.",
						},
					},
				},
			},
		},
	}
}
