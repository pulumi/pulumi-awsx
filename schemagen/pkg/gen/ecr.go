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

func generateEcr(awsSpec, dockerSpec schema.PackageSpec) schema.PackageSpec {
	return schema.PackageSpec{
		Resources: map[string]schema.ResourceSpec{
			"awsx:ecr:Repository": repository(awsSpec),
		},
		Functions: map[string]schema.FunctionSpec{
			"awsx:ecr:Repository/buildAndPushImage": buildAndPushImage(),
		},
		Types: map[string]schema.ComplexTypeSpec{
			"awsx:ecr:DockerBuild":         dockerBuild(),
			"awsx:ecr:lifecyclePolicy":     lifecyclePolicy(awsSpec),
			"awsx:ecr:lifecyclePolicyRule": lifecyclePolicyRule(awsSpec),
			"awsx:ecr:lifecycleTagStatus":  lifecycleTagStatus(awsSpec),
		},
	}
}

func repository(awsSpec schema.PackageSpec) schema.ResourceSpec {
	originalSpec := awsSpec.Resources["aws:ecr/repository:Repository"]
	inputProperties := renameAwsPropertiesRefs(originalSpec.InputProperties)
	inputProperties["lifecyclePolicy"] = schema.PropertySpec{
		Description: "A lifecycle policy consists of one or more rules that determine which images in a repository should be expired. If not provided, this will default to untagged images expiring after 1 day.",
		TypeSpec: schema.TypeSpec{
			Ref:   "#/types/awsx:ecr:lifecyclePolicy",
			Plain: true,
		},
	}

	return schema.ResourceSpec{
		IsComponent:     true,
		InputProperties: inputProperties,
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "A [Repository] represents an [aws.ecr.Repository] along with an associated [LifecyclePolicy] controlling how images are retained in the repo. \n\nDocker images can be built and pushed to the repo using the [buildAndPushImage] method.  This will call into the `@pulumi/docker/buildAndPushImage` function using this repo as the appropriate destination registry.",
			Properties: map[string]schema.PropertySpec{
				"repository": {
					Description: "Underlying Repository resource",
					TypeSpec: schema.TypeSpec{
						Ref: awsRef("#/resources/aws:ecr%2frepository:Repository"),
					},
					Language: map[string]schema.RawMessage{
						"csharp": rawMessage(map[string]string{
							"name": "AwsRepository",
						}),
					},
				},
				"lifecyclePolicy": {
					Description: "Underlying repository lifecycle policy",
					TypeSpec: schema.TypeSpec{
						Ref: awsRef("#/resources/aws:ecr%2flifecyclePolicy:LifecyclePolicy"),
					},
				},
			},
			Required: []string{"repository"},
		},
		Methods: map[string]string{
			"buildAndPushImage": "awsx:ecr:Repository/buildAndPushImage",
		},
	}
}

func lifecyclePolicy(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "Simplified lifecycle policy model consisting of one or more rules that determine which images in a repository should be expired. See https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html for more details.",
			Properties: map[string]schema.PropertySpec{
				"rules": {
					Description: "Specifies the rules to determine how images should be retired from this repository. Rules are ordered from lowest priority to highest.  If there is a rule with a `selection` value of `any`, then it will have the highest priority.",
					TypeSpec: schema.TypeSpec{
						Type: "array",
						Items: &schema.TypeSpec{
							Ref: "#/types/awsx:ecr:lifecyclePolicyRule",
						},
					},
				},
				"skip": {
					Description: "Skips creation of the policy if set to `true`.",
					TypeSpec: schema.TypeSpec{
						Type:  "boolean",
						Plain: true,
					},
				},
			},
		},
	}
}

func lifecyclePolicyRule(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "A lifecycle policy rule that determine which images in a repository should be expired.",
			Properties: map[string]schema.PropertySpec{
				"description": {
					Description: "Describes the purpose of a rule within a lifecycle policy.",
					TypeSpec: schema.TypeSpec{
						Type: "string",
					},
				},
				"maximumNumberOfImages": {
					Description: "The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.",
					TypeSpec: schema.TypeSpec{
						Type: "number",
					},
				},
				"maximumAgeLimit": {
					Description: "The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.",
					TypeSpec: schema.TypeSpec{
						Type: "number",
					},
				},
				"tagStatus": {
					Description: "Determines whether the lifecycle policy rule that you are adding specifies a tag for an image. Acceptable options are tagged, untagged, or any. If you specify any, then all images have the rule evaluated against them. If you specify tagged, then you must also specify a tagPrefixList value. If you specify untagged, then you must omit tagPrefixList.",
					TypeSpec: schema.TypeSpec{
						Ref: "#/types/awsx:ecr:lifecycleTagStatus",
					},
				},
				"tagPrefixList": {
					Description: "A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified \"tagStatus\": \"tagged\". For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.",
					TypeSpec: schema.TypeSpec{
						Type: "array",
						Items: &schema.TypeSpec{
							Type: "string",
						},
					},
				},
			},
			Required: []string{"tagStatus"},
		},
	}
}

func lifecycleTagStatus(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type: "string",
		},
		Enum: []schema.EnumValueSpec{
			{
				Name:        "any",
				Description: "Evaluate rule against all images",
				Value:       "any",
			},
			{
				Name:        "untagged",
				Description: "Only evaluate rule against untagged images",
				Value:       "untagged",
			},
			{
				Name:        "tagged",
				Description: "Only evaluated rule against images with specified prefixes",
				Value:       "tagged",
			},
		},
	}
}

func buildAndPushImage() schema.FunctionSpec {
	spec := schema.FunctionSpec{
		Description: "Build and push a docker image to ECR",
		Inputs: &schema.ObjectTypeSpec{
			Description: "Arguments for building and publishing a docker image to ECR",
			Properties:  map[string]schema.PropertySpec{},
		},
		Outputs: &schema.ObjectTypeSpec{
			Description: "Outputs from the pushed docker image",
			Properties: map[string]schema.PropertySpec{
				"image": {
					Description: "Unique identifier of the pushed image",
					TypeSpec: schema.TypeSpec{
						Type: "string",
					},
				},
			},
			Required: []string{"image"},
		},
	}

	// Pull args to top-level as there's nothing else
	spec.Inputs.Properties = dockerBuildProperties()
	spec.Inputs.Properties["__self__"] = schema.PropertySpec{
		TypeSpec: schema.TypeSpec{
			Ref: "#/resources/awsx:ecr:Repository",
		},
	}
	spec.Inputs.Required = []string{"__self__"}

	return spec
}

func dockerBuild() schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "Arguments for building a docker image",
			Properties:  dockerBuildProperties(),
		},
	}
}

func dockerBuildProperties() map[string]schema.PropertySpec {
	return map[string]schema.PropertySpec{
		"path": {
			Description: "Path to a directory to use for the Docker build context, usually the directory in which the Dockerfile resides (although dockerfile may be used to choose a custom location independent of this choice). If not specified, the context defaults to the current working directory; if a relative path is used, it is relative to the current working directory that Pulumi is evaluating.",
			TypeSpec: schema.TypeSpec{
				Type: "string",
			},
		},
		"dockerfile": {
			Description: "dockerfile may be used to override the default Dockerfile name and/or location.  By default, it is assumed to be a file named Dockerfile in the root of the build context.",
			TypeSpec: schema.TypeSpec{
				Type: "string",
			},
		},
		"args": {
			Description: "An optional map of named build-time argument variables to set during the Docker build.  This flag allows you to pass built-time variables that can be accessed like environment variables inside the `RUN` instruction.",
			TypeSpec: schema.TypeSpec{
				Type: "object",
				AdditionalProperties: &schema.TypeSpec{
					Type: "string",
				},
			},
		},
		"cacheFrom": {
			Description: "Images to consider as cache sources",
			TypeSpec: schema.TypeSpec{
				Type: "array",
				Items: &schema.TypeSpec{
					Type: "string",
				},
			},
		},
		"extraOptions": {
			Description: "An optional catch-all list of arguments to provide extra CLI options to the docker build command.  For example `['--network', 'host']`.",
			TypeSpec: schema.TypeSpec{
				Type: "array",
				Items: &schema.TypeSpec{
					Type: "string",
				},
			},
		},
		"env": {
			Description: "Environment variables to set on the invocation of `docker build`, for example to support `DOCKER_BUILDKIT=1 docker build`.",
			TypeSpec: schema.TypeSpec{
				Type: "object",
				AdditionalProperties: &schema.TypeSpec{
					Type: "string",
				},
			},
		},
		"target": {
			Description: "The target of the dockerfile to build",
			TypeSpec: schema.TypeSpec{
				Type: "string",
			},
		},
	}
}
