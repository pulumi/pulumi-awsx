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
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strings"

	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
	"github.com/pulumi/pulumi/sdk/v3/go/common/util/contract"
)

const (
	awsVersion            = "v4.37.1"
	awsNativeTypesVersion = "v0.13.0"
)

func awsRef(ref string) string {
	return fmt.Sprintf("/aws/%s/schema.json%s", awsVersion, ref)
}

// nolint: lll
func GenerateSchema() schema.PackageSpec {
	awsSpec := getAwsSpec()
	awsNativeSpec := getAwsNativeSpec()

	packageSpec := schema.PackageSpec{
		Name:        "awsx",
		Description: "Pulumi Amazon Web Services (AWS) AWSX Components.",
		License:     "Apache-2.0",
		Keywords:    []string{"pulumi", "aws", "awsx"},
		Homepage:    "https://pulumi.com",
		Repository:  "https://github.com/pulumi/pulumi-awsx",

		Functions: map[string]schema.FunctionSpec{},
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
			"awsx:cloudwatch:DefaultLogGroup": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Log group with default setup unless explicitly skipped.",
					Properties: map[string]schema.PropertySpec{
						"skip": {
							Description: "Skip creation of the log group.",
							TypeSpec: schema.TypeSpec{
								Type:  "boolean",
								Plain: true,
							},
						},
						"existing": {
							Description: "Identity of an existing log group to use. Cannot be used in combination with `args` or `opts`.",
							TypeSpec: schema.TypeSpec{
								Ref:   "#/types/awsx:cloudwatch:ExistingLogGroup",
								Plain: true,
							},
						},
						"args": {
							Description: "Arguments to use instead of the default values during creation.",
							TypeSpec: schema.TypeSpec{
								Ref:   "#/types/awsx:cloudwatch:LogGroup",
								Plain: true,
							},
						},
					},
				},
			},
			"awsx:cloudwatch:ExistingLogGroup": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Reference to an existing log group.",
					Properties: map[string]schema.PropertySpec{
						"name": {
							Description: "Name of the log group.",
							TypeSpec: schema.TypeSpec{
								Type: "string",
							},
						},
						"region": {
							Description: "Region of the log group. If not specified, the provider region will be used.",
							TypeSpec: schema.TypeSpec{
								Type: "string",
							},
						},
					},
					Required: []string{"name"},
				},
			},
			"awsx:cloudwatch:LogGroup": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "The set of arguments for constructing a LogGroup resource.",
					Properties:  awsSpec.Resources["aws:cloudwatch/logGroup:LogGroup"].InputProperties,
				},
			},
			"awsx:iam:DefaultRoleWithPolicy": defaultRoleWithPolicyArgs(awsSpec),
			"awsx:iam:RoleWithPolicy":        roleWithPolicyArgs(awsSpec),
		},
		Language: map[string]schema.RawMessage{
			"csharp": rawMessage(map[string]interface{}{
				"packageReferences": map[string]string{
					"Pulumi":     "3.*",
					"Pulumi.Aws": "4.*",
				},
				"liftSingleValueMethodReturns": true,
			}),
			"go": rawMessage(map[string]interface{}{
				"generateResourceContainerTypes": true,
				"importBasePath":                 "github.com/pulumi/pulumi-awsx/sdk/go/awsx",
				"liftSingleValueMethodReturns":   true,
			}),
			"nodejs": rawMessage(map[string]interface{}{
				"dependencies": map[string]string{
					"@pulumi/pulumi": "^3.0.0",
					"@pulumi/aws":    "^4.23.0",
					"@pulumi/docker": "^3.0.0",
					"mime":           "^2.0.0",
				},
				"devDependencies": map[string]string{
					"@types/aws-lambda": "^8.10.23",
					"@types/node":       "^17.0.21",
					"@types/mime":       "^2.0.0",
					"typescript":        "^4.6.2",
				},
			}),
			"python": rawMessage(map[string]interface{}{
				"requires": map[string]string{
					"pulumi":     ">=3.0.0,<4.0.0",
					"pulumi-aws": ">=4.15.0,<5.0.0",
				},
				"usesIOClasses":                true,
				"readme":                       "Pulumi Amazon Web Services (AWS) AWSX Components.",
				"liftSingleValueMethodReturns": true,
			}),
		},
	}

	return extendSchemas(packageSpec, generateEcs(awsSpec, awsNativeSpec))
}

func getAwsSpec() schema.PackageSpec {
	return getSpecFromUrl(fmt.Sprintf("https://raw.githubusercontent.com/pulumi/pulumi-aws/%s/provider/cmd/pulumi-resource-aws/schema.json", awsVersion))
}

func getAwsNativeSpec() schema.PackageSpec {
	return getSpecFromUrl(fmt.Sprintf("https://raw.githubusercontent.com/pulumi/pulumi-aws-native/%s/provider/cmd/pulumi-resource-aws-native/schema.json", awsNativeTypesVersion))
}

func getSpecFromUrl(url string) schema.PackageSpec {
	resp, err := http.Get(url)
	if err != nil {
		log.Fatal(err)
	}
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}
	var spec schema.PackageSpec
	err = json.Unmarshal(body, &spec)
	if err != nil {
		log.Fatal(err)
	}
	return spec
}

func defaultRoleWithPolicyArgs(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "Role and policy attachments with default setup unless explicitly skipped or an existing role ARN provided.",
			Properties: map[string]schema.PropertySpec{
				"skip": {
					Description: "Skips creation of the role if set to `true`.",
					TypeSpec: schema.TypeSpec{
						Type:  "boolean",
						Plain: true,
					},
				},
				"roleArn": {
					Description: "ARN of existing role to use instead of creating a new role. Cannot be used in combination with `args` or `opts`.",
					TypeSpec: schema.TypeSpec{
						Type: "string",
					},
				},
				"args": {
					Description: "Args to use when creating the role and policies. Can't be specified if `roleArn` is used.",
					TypeSpec: schema.TypeSpec{
						Ref:   "#/types/awsx:iam:RoleWithPolicy",
						Plain: true,
					},
				},
			},
		},
	}
}

func roleWithPolicyArgs(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	role := awsSpec.Resources["aws:iam/role:Role"]
	properties := map[string]schema.PropertySpec{}
	for k, v := range role.InputProperties {
		properties[k] = v
	}

	// The assumeRolePolicy ref doesn't point to a valid type ... and we don't need it for now
	delete(properties, "assumeRolePolicy")
	properties["inlinePolicies"].Items.Ref = awsRef(properties["inlinePolicies"].Items.Ref)

	properties["policyArns"] = schema.PropertySpec{
		Description: "ARNs of the policies to attach to the created role.",
		TypeSpec: schema.TypeSpec{
			Type: "array",
			Items: &schema.TypeSpec{
				Type:  "string",
				Plain: true,
			},
			Plain: true,
		},
	}

	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "The set of arguments for constructing a Role resource and Policy attachments.",
			Properties:  properties,
		},
	}
}

// Perform a simple string replacement on Refs in all sub-specs
func renameComplexRefs(spec schema.ComplexTypeSpec, old, new string) schema.ComplexTypeSpec {
	spec.Properties = renamePropertiesRefs(spec.Properties, old, new)
	return spec
}

func renamePropertiesRefs(propertySpec map[string]schema.PropertySpec, old, new string) map[string]schema.PropertySpec {
	properties := map[string]schema.PropertySpec{}
	for k, v := range propertySpec {
		properties[k] = renamePropertyRefs(v, old, new)
	}
	return properties
}

func renamePropertyRefs(propSpec schema.PropertySpec, old, new string) schema.PropertySpec {
	if propSpec.Ref != "" {
		propSpec.Ref = strings.Replace(propSpec.Ref, old, new, 1)
	}
	if propSpec.AdditionalProperties != nil {
		additionalProperties := renameTypeSpecRefs(*propSpec.AdditionalProperties, old, new)
		propSpec.AdditionalProperties = &additionalProperties
	}
	if propSpec.Items != nil {
		items := renameTypeSpecRefs(*propSpec.Items, old, new)
		propSpec.Items = &items
	}
	return propSpec
}

func renameTypeSpecRefs(typeSpec schema.TypeSpec, old, new string) schema.TypeSpec {
	if typeSpec.Ref != "" {
		typeSpec.Ref = strings.Replace(typeSpec.Ref, old, new, 1)
	}
	if typeSpec.AdditionalProperties != nil {
		additionalProperties := renameTypeSpecRefs(*typeSpec.AdditionalProperties, old, new)
		typeSpec.AdditionalProperties = &additionalProperties
	}
	if typeSpec.Items != nil {
		items := renameTypeSpecRefs(*typeSpec.Items, old, new)
		typeSpec.Items = &items
	}
	return typeSpec
}

func extendSchemas(spec schema.PackageSpec, extensions ...schema.PackageSpec) schema.PackageSpec {
	for _, extension := range extensions {
		for k, v := range extension.Resources {
			if _, found := spec.Resources[k]; found {
				log.Fatalf("resource already defined %q", k)
			}
			spec.Resources[k] = v
		}

		for k, v := range extension.Types {
			if _, found := spec.Types[k]; found {
				log.Fatalf("type already defined %q", k)
			}
			spec.Types[k] = v
		}

		for k, v := range extension.Functions {
			if _, found := spec.Functions[k]; found {
				log.Fatalf("function already defined %q", k)
			}
			spec.Functions[k] = v
		}
	}

	return spec
}

func rawMessage(v interface{}) schema.RawMessage {
	bytes, err := json.Marshal(v)
	contract.Assert(err == nil)
	return bytes
}
