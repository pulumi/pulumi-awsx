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

package gen

import (
	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

func generateEcsx(awsSpec, awsNativeSpec schema.PackageSpec) schema.PackageSpec {
	fargateTaskDefinitionResource := fargateTaskDefinition(awsSpec)
	packageSpec := schema.PackageSpec{
		Resources: map[string]schema.ResourceSpec{
			"awsx:ecsx:FargateService":        fargateService(awsSpec),
			"awsx:ecsx:FargateTaskDefinition": fargateTaskDefinitionResource,
		},
		Types: map[string]schema.ComplexTypeSpec{
			"awsx:ecsx:FargateServiceTaskDefinition": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: fargateTaskDefinitionResource.Description,
					Properties:  fargateTaskDefinitionResource.InputProperties,
				},
			},
		},
	}

	for k, v := range containerDefinitionTypes(awsNativeSpec) {
		packageSpec.Types[k] = v
	}

	return packageSpec
}

func fargateService(awsSpec schema.PackageSpec) schema.ResourceSpec {
	service := awsSpec.Resources["aws:ecs/service:Service"]
	inputProperties := map[string]schema.PropertySpec{}
	for k, v := range service.InputProperties {
		inputProperties[k] = renamePropertyRefs(v, "#/types/aws:", awsRef("#/types/aws:"))
	}
	delete(inputProperties, "launchType")
	delete(inputProperties, "taskDefinition")
	delete(inputProperties, "waitForSteadyState")
	inputProperties["continueBeforeSteadyState"] = schema.PropertySpec{
		Description: "If `true`, this provider will not wait for the service to reach a steady state (like [`aws ecs wait services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html)) before continuing. Default `false`.",
		TypeSpec: schema.TypeSpec{
			Type: "boolean",
		},
	}
	inputProperties["taskDefinition"] = schema.PropertySpec{
		Description: "Family and revision (`family:revision`) or full ARN of the task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.",
		TypeSpec: schema.TypeSpec{
			Type: "string",
		},
	}
	inputProperties["taskDefinitionArgs"] = schema.PropertySpec{
		Description: "The args of task definition that you want to run in your service. Either [taskDefinition] or [taskDefinitionArgs] must be provided.",
		TypeSpec: schema.TypeSpec{
			Ref: "#/types/awsx:ecsx:FargateServiceTaskDefinition",
		},
	}

	return schema.ResourceSpec{
		IsComponent: true,
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Description: "Create an ECS Service resource for Fargate with the given unique name, arguments, and options.\nCreates Task definition if `taskDefinitionArgs` is specified.",
			Properties: map[string]schema.PropertySpec{
				"service": {
					Description: "Underlying ECS Service resource",
					TypeSpec: schema.TypeSpec{
						Ref: awsRef("#/resources/aws:ecs%2fservice:Service"),
					},
				},
				"taskDefinition": {
					Description: "Underlying Fargate component resource if created from args",
					TypeSpec: schema.TypeSpec{
						Ref: awsRef("#/resources/aws:ecs%2FtaskDefinition:TaskDefinition"),
					},
				},
			},
			Required: []string{"service"},
		},
		InputProperties: inputProperties,
		RequiredInputs:  []string{"networkConfiguration"},
	}
}

func fargateTaskDefinition(awsSpec schema.PackageSpec) schema.ResourceSpec {
	taskDefinition := awsSpec.Resources["aws:ecs/taskDefinition:TaskDefinition"]
	inputProperties := map[string]schema.PropertySpec{}
	for k, v := range taskDefinition.InputProperties {
		inputProperties[k] = renamePropertyRefs(v, "#/types/aws:", awsRef("#/types/aws:"))
	}
	delete(inputProperties, "containerDefinitions")
	delete(inputProperties, "cpu")
	delete(inputProperties, "executionRoleArn")
	delete(inputProperties, "family")
	delete(inputProperties, "memory")
	delete(inputProperties, "taskRoleArn")

	inputProperties["container"] = schema.PropertySpec{
		Description: "Single container to make a TaskDefinition from.  Useful for simple cases where there aren't\nmultiple containers, especially when creating a TaskDefinition to call [run] on.\n\nEither [container] or [containers] must be provided.",
		TypeSpec: schema.TypeSpec{
			Ref:   "#/types/awsx:ecsx:TaskDefinitionContainerDefinition",
			Plain: true,
		},
	}
	inputProperties["containers"] = schema.PropertySpec{
		Description: "All the containers to make a TaskDefinition from.  Useful when creating a Service that will\ncontain many containers within.\n\nEither [container] or [containers] must be provided.",
		TypeSpec: schema.TypeSpec{
			Type: "object",
			AdditionalProperties: &schema.TypeSpec{
				Ref: "#/types/awsx:ecsx:TaskDefinitionContainerDefinition",
			},
			Plain: true,
		},
	}
	inputProperties["cpu"] = schema.PropertySpec{
		Description: "The number of cpu units used by the task. If not provided, a default will be computed based on the cumulative needs specified by [containerDefinitions]",
		TypeSpec: schema.TypeSpec{
			Type: "string",
		},
	}
	inputProperties["executionRole"] = schema.PropertySpec{
		Description: "The execution role that the Amazon ECS container agent and the Docker daemon can assume.\nWill be created automatically if not defined.",
		TypeSpec: schema.TypeSpec{
			Ref:   "#/types/awsx:iam:DefaultRoleWithPolicy",
			Plain: true,
		},
	}
	inputProperties["family"] = schema.PropertySpec{
		Description: "An optional unique name for your task definition. If not specified, then a default will be created.",
		TypeSpec: schema.TypeSpec{
			Type: "string",
		},
	}
	inputProperties["logGroup"] = schema.PropertySpec{
		Description: "A set of volume blocks that containers in your task may use.",
		TypeSpec: schema.TypeSpec{
			Ref:   "#/types/awsx:cloudwatch:DefaultLogGroup",
			Plain: true,
		},
	}
	inputProperties["memory"] = schema.PropertySpec{
		Description: "The amount (in MiB) of memory used by the task.  If not provided, a default will be computed\nbased on the cumulative needs specified by [containerDefinitions]",
		TypeSpec: schema.TypeSpec{
			Type: "string",
		},
	}
	inputProperties["taskRole"] = schema.PropertySpec{
		Description: "IAM role that allows your Amazon ECS container task to make calls to other AWS services.\nWill be created automatically if not defined.",
		TypeSpec: schema.TypeSpec{
			Ref:   "#/types/awsx:iam:DefaultRoleWithPolicy",
			Plain: true,
		},
	}

	return schema.ResourceSpec{
		IsComponent: true,
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Description: "Create a TaskDefinition resource with the given unique name, arguments, and options.\nCreates required log-group and task & execution roles.\nPresents required Service load balancers if target group included in port mappings.",
			Properties: map[string]schema.PropertySpec{
				"taskDefinition": {
					Description: "Underlying ECS Task Definition resource",
					TypeSpec: schema.TypeSpec{
						Ref: awsRef("#/resources/aws:ecs%2FtaskDefinition:TaskDefinition"),
					},
				},
				"logGroup": {
					Description: "Auto-created Log Group resource for use by containers.",
					TypeSpec: schema.TypeSpec{
						Ref: awsRef("#/resources/aws:cloudwatch%2FlogGroup:LogGroup"),
					},
				},
				"taskRole": {
					Description: "Auto-created IAM role that allows your Amazon ECS container task to make calls to other AWS services.",
					TypeSpec: schema.TypeSpec{
						Ref: awsRef("#/resources/aws:iam%2Frole:Role"),
					},
				},
				"executionRole": {
					Description: "Auto-created IAM task execution role that the Amazon ECS container agent and the Docker daemon can assume.",
					TypeSpec: schema.TypeSpec{
						Ref: awsRef("#/resources/aws:iam%2Frole:Role"),
					},
				},
				"loadBalancers": {
					Description: "Computed load balancers from target groups specified of container port mappings.",
					TypeSpec: schema.TypeSpec{
						Type: "array",
						Items: &schema.TypeSpec{
							Ref: awsRef("#/types/aws:ecs%2FServiceLoadBalancer:ServiceLoadBalancer"),
						},
					},
				},
			},
			Required: []string{"taskDefinition", "loadBalancers"},
		},
		InputProperties: inputProperties,
	}
}

// Do a deep copy of the ContainerDefinition types from AWS-native to avoid re-defining by hand
// Manually list all dependencies to also copy. If new dependencies are added the SDK builds will fail
// indicating that we need to add them to be copied here. We're not just referencing from aws-native
// as that would require adding a new package dependency just for the purpose of accessing some interfaces.
func containerDefinitionTypes(awsNativeSpec schema.PackageSpec) map[string]schema.ComplexTypeSpec {
	names := []string{
		"TaskDefinitionContainerDefinition",
		"TaskDefinitionContainerDependency",
		"TaskDefinitionKeyValuePair",
		"TaskDefinitionEnvironmentFile",
		"TaskDefinitionHostEntry",
		"TaskDefinitionFirelensConfiguration",
		"TaskDefinitionHealthCheck",
		"TaskDefinitionLinuxParameters",
		"TaskDefinitionLogConfiguration",
		"TaskDefinitionMountPoint",
		"TaskDefinitionPortMapping",
		"TaskDefinitionRepositoryCredentials",
		"TaskDefinitionResourceRequirement",
		"TaskDefinitionSecret",
		"TaskDefinitionSystemControl",
		"TaskDefinitionUlimit",
		"TaskDefinitionVolumeFrom",
		"TaskDefinitionKernelCapabilities",
		"TaskDefinitionDevice",
		"TaskDefinitionTmpfs",
		"TaskDefinitionSecret",
	}
	types := map[string]schema.ComplexTypeSpec{}
	for _, name := range names {
		types["awsx:ecsx:"+name] = renameComplexRefs(awsNativeSpec.Types["aws-native:ecs:"+name], "aws-native:ecs:", "awsx:ecsx:")
	}
	types["awsx:ecsx:TaskDefinitionPortMapping"].Properties["targetGroup"] = schema.PropertySpec{
		TypeSpec: schema.TypeSpec{
			Ref: awsRef("#/resources/aws:lb%2FtargetGroup:TargetGroup"),
		},
	}
	return types
}
