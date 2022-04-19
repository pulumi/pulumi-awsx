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
	awsTrail := awsSpec.Resources["aws:cloudtrail/trail:Trail"]
	inputProperties := map[string]schema.PropertySpec{}
	for k, v := range awsTrail.InputProperties {
		inputProperties[k] = renamePropertyRefs(v, "#/types/aws:", awsRef("#/types/aws:"))
	}
	delete(inputProperties, "cloudWatchLogsGroupArn")
	delete(inputProperties, "cloudWatchLogsRoleArn")
	delete(inputProperties, "s3BucketName")
	inputProperties["s3Bucket"] = schema.PropertySpec{
		Description: "S3 bucket designated for publishing log files.",
		TypeSpec: schema.TypeSpec{
			Ref:   "#/types/awsx:s3:RequiredBucket",
			Plain: true,
		},
	}
	inputProperties["cloudWatchLogsGroup"] = schema.PropertySpec{
		Description: "Log group to which CloudTrail logs will be delivered.",
		TypeSpec: schema.TypeSpec{
			Ref:   "#/types/awsx:cloudwatch:OptionalLogGroup",
			Plain: true,
		},
	}
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
						"trail",
					},
				},
				InputProperties: inputProperties,
				RequiredInputs:  []string{},
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
