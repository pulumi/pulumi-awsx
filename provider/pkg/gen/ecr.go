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
			"awsx:ecr:buildAndPushImage":            buildAndPushImage(false),
			"awsx:ecr:Repository/buildAndPushImage": buildAndPushImage(true),
		},
		Types: map[string]schema.ComplexTypeSpec{
			"awsx:ecr:DockerBuild": dockerBuild(),
		},
	}
}

func repository(awsSpec schema.PackageSpec) schema.ResourceSpec {
	originalSpec := awsSpec.Resources["aws:ecr/repository:Repository"]
	inputProperties := renameAwsPropertiesRefs(originalSpec.InputProperties)

	return schema.ResourceSpec{
		IsComponent:     true,
		InputProperties: inputProperties,
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "",
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
			},
			Required: []string{"repository"},
		},
		Methods: map[string]string{
			"buildAndPushImage": "awsx:ecr:Repository/buildAndPushImage",
		},
	}
}

func buildAndPushImage(asMember bool) schema.FunctionSpec {
	spec := schema.FunctionSpec{
		Description: "Build and push a docker image to ECR",
		Inputs: &schema.ObjectTypeSpec{
			Description: "Arguments for building and publishing a docker image to ECR",
			Properties: map[string]schema.PropertySpec{},
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
		},
	}

	if asMember {
		// Pull args to top-level as there's nothing else
		spec.Inputs.Properties = dockerBuildProperties()
		spec.Inputs.Properties["__self__"] = schema.PropertySpec{
			TypeSpec: schema.TypeSpec{
				Ref: "#/resources/awsx:ecr:Repository",
			},
		}
		spec.Inputs.Required = []string{"__self__"}
	} else {
		spec.Inputs.Properties["docker"] = schema.PropertySpec{
		Description: "Arguments for building the docker image.",
			TypeSpec: schema.TypeSpec{
				Ref: "#/types/awsx:ecr:DockerBuild",
			},
		}
		spec.Inputs.Properties["repositoryName"] = schema.PropertySpec{
			TypeSpec: schema.TypeSpec{
				Type: "string",
			},
		}
		spec.Inputs.Properties["registryId"] = schema.PropertySpec{
			Description: "The Amazon Web Services account ID associated with the registry that contains the repository. If you do not specify a registry, the default registry is assumed.",
			TypeSpec: schema.TypeSpec{
				Type: "string",
			},
		}
		spec.Inputs.Required = []string{"repositoryName"}
	}

	return spec
}

func dockerBuild() schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "Arguments for building a docker image",
			Properties: dockerBuildProperties(),
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
