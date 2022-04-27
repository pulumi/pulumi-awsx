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

func generateS3(awsSpec schema.PackageSpec) schema.PackageSpec {
	return schema.PackageSpec{
		Types: map[string]schema.ComplexTypeSpec{
			"awsx:awsx:DefaultBucket": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Bucket with default setup unless explicitly skipped.",
					Properties: map[string]schema.PropertySpec{
						"skip": {
							Description: "Skip creation of the bucket.",
							TypeSpec: schema.TypeSpec{
								Type:  "boolean",
								Plain: true,
							},
						},
						"existing": {
							Description: "Identity of an existing bucket to use. Cannot be used in combination with `args`.",
							TypeSpec: schema.TypeSpec{
								Ref:   "#/types/awsx:awsx:ExistingBucket",
								Plain: true,
							},
						},
						"args": {
							Description: "Arguments to use instead of the default values during creation.",
							TypeSpec: schema.TypeSpec{
								Ref:   "#/types/awsx:awsx:Bucket",
								Plain: true,
							},
						},
					},
				},
			},
			"awsx:awsx:RequiredBucket": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Bucket with default setup.",
					Properties: map[string]schema.PropertySpec{
						"existing": {
							Description: "Identity of an existing bucket to use. Cannot be used in combination with `args`.",
							TypeSpec: schema.TypeSpec{
								Ref:   "#/types/awsx:awsx:ExistingBucket",
								Plain: true,
							},
						},
						"args": {
							Description: "Arguments to use instead of the default values during creation.",
							TypeSpec: schema.TypeSpec{
								Ref:   "#/types/awsx:awsx:Bucket",
								Plain: true,
							},
						},
					},
				},
			},
			"awsx:awsx:ExistingBucket": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Reference to an existing bucket.",
					Properties: map[string]schema.PropertySpec{
						"arn": {
							Description: "Arn of the bucket. Only one of [arn] or [name] can be specified.",
							TypeSpec: schema.TypeSpec{
								Type: "string",
							},
						},
						"name": {
							Description: "Name of the bucket. Only one of [arn] or [name] can be specified.",
							TypeSpec: schema.TypeSpec{
								Type: "string",
							},
						},
					},
				},
			},
			"awsx:awsx:Bucket": bucketTypeSpec(awsSpec),
		},
	}
}

func bucketTypeSpec(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	properties := awsSpec.Resources["aws:s3/bucket:Bucket"].InputProperties
	properties["policy"] = schema.PropertySpec{
		Description: properties["policy"].Description,
		TypeSpec: schema.TypeSpec{
			Type: "string",
		},
	}
	properties["acl"] = schema.PropertySpec{
		Description: properties["acl"].Description,
		TypeSpec: schema.TypeSpec{
			Type: "string",
		},
	}
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "The set of arguments for constructing a Bucket resource.",
			Properties:  renamePropertiesRefs(properties, "#/types/aws:", awsRef("#/types/aws:")),
		},
	}
}
