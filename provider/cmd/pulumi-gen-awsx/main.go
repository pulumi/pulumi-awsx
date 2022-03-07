// Copyright 2016-2020, Pulumi Corporation.
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

package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/pkg/errors"
	dotnetgen "github.com/pulumi/pulumi/pkg/v3/codegen/dotnet"
	gogen "github.com/pulumi/pulumi/pkg/v3/codegen/go"
	pygen "github.com/pulumi/pulumi/pkg/v3/codegen/python"
	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
	"github.com/pulumi/pulumi/sdk/v3/go/common/util/contract"
)

const Tool = "pulumi-gen-awsx"

// Language is the SDK language.
type Language string

const (
	DotNet Language = "dotnet"
	Go     Language = "go"
	Python Language = "python"
	Schema Language = "schema"
)

func main() {
	printUsage := func() {
		fmt.Printf("Usage: %s <language> <out-dir> [schema-file] [version]\n", os.Args[0])
	}

	args := os.Args[1:]
	if len(args) < 2 {
		printUsage()
		os.Exit(1)
	}

	language, outdir := Language(args[0]), args[1]

	var schemaFile string
	var version string
	if language != Schema {
		if len(args) < 4 {
			printUsage()
			os.Exit(1)
		}
		schemaFile, version = args[2], args[3]
	}

	switch language {
	case DotNet:
		genDotNet(readSchema(schemaFile, version), outdir)
	case Go:
		genGo(readSchema(schemaFile, version), outdir)
	case Python:
		genPython(readSchema(schemaFile, version), outdir)
	case Schema:
		pkgSpec := generateSchema()
		mustWritePulumiSchema(pkgSpec, outdir)
	default:
		panic(fmt.Sprintf("Unrecognized language %q", language))
	}
}

const (
	awsVersion = "v4.37.1"
)

func awsRef(ref string) string {
	return fmt.Sprintf("/aws/%s/schema.json%s", awsVersion, ref)
}

// nolint: lll
func generateSchema() schema.PackageSpec {
	return schema.PackageSpec{
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
						"arn": {
							Description: "ARN of the trail.",
							TypeSpec: schema.TypeSpec{
								Type: "string",
							},
						},
						"homeRegion": {
							Description: "Region in which the trail was created.",
							TypeSpec: schema.TypeSpec{
								Type: "string",
							},
						},
						"tagsAll": {
							TypeSpec: schema.TypeSpec{
								Type:                 "object",
								AdditionalProperties: &schema.TypeSpec{Type: "string"},
							},
							Description: "Map of tags to assign to the trail. If configured with provider defaultTags present, tags with matching keys will overwrite those defined at the provider-level.",
						},
					},
					Required: []string{
						"arn",
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
		Language: map[string]schema.RawMessage{
			"csharp": rawMessage(map[string]interface{}{
				"packageReferences": map[string]string{
					"Pulumi":     "3.*",
					"Pulumi.Aws": "4.*",
				},
				"liftSingleValueMethodReturns": true,
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
			"go": rawMessage(map[string]interface{}{
				"generateResourceContainerTypes": true,
				"importBasePath":                 "github.com/pulumi/pulumi-awsx/sdk/go/awsx",
				"liftSingleValueMethodReturns":   true,
			}),
		},
	}
}

func rawMessage(v interface{}) schema.RawMessage {
	bytes, err := json.Marshal(v)
	contract.Assert(err == nil)
	return bytes
}

func readSchema(schemaPath string, version string) *schema.Package {
	// Read in, decode, and import the schema.
	schemaBytes, err := ioutil.ReadFile(schemaPath)
	if err != nil {
		panic(err)
	}

	var pkgSpec schema.PackageSpec
	if err = json.Unmarshal(schemaBytes, &pkgSpec); err != nil {
		panic(err)
	}
	pkgSpec.Version = version

	pkg, err := schema.ImportSpec(pkgSpec, nil)
	if err != nil {
		panic(err)
	}
	return pkg
}

func genDotNet(pkg *schema.Package, outdir string) {
	files, err := dotnetgen.GeneratePackage(Tool, pkg, map[string][]byte{})
	if err != nil {
		panic(err)
	}
	mustWriteFiles(outdir, files)
}

func genGo(pkg *schema.Package, outdir string) {
	files, err := gogen.GeneratePackage(Tool, pkg)
	if err != nil {
		panic(err)
	}
	mustWriteFiles(outdir, files)
}

func genPython(pkg *schema.Package, outdir string) {
	files, err := pygen.GeneratePackage(Tool, pkg, map[string][]byte{})
	if err != nil {
		panic(err)
	}
	mustWriteFiles(outdir, files)
}

func mustWriteFiles(rootDir string, files map[string][]byte) {
	for filename, contents := range files {
		mustWriteFile(rootDir, filename, contents)
	}
}

func mustWriteFile(rootDir, filename string, contents []byte) {
	outPath := filepath.Join(rootDir, filename)

	if err := os.MkdirAll(filepath.Dir(outPath), 0755); err != nil {
		panic(err)
	}
	err := ioutil.WriteFile(outPath, contents, 0600)
	if err != nil {
		panic(err)
	}
}

func mustWritePulumiSchema(pkgSpec schema.PackageSpec, outdir string) {
	schemaJSON, err := json.MarshalIndent(pkgSpec, "", "    ")
	if err != nil {
		panic(errors.Wrap(err, "marshaling Pulumi schema"))
	}
	mustWriteFile(outdir, "schema.json", schemaJSON)
}
