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

func generateLb(awsSpec schema.PackageSpec) schema.PackageSpec {
	return schema.PackageSpec{
		Resources: map[string]schema.ResourceSpec{
			"awsx:lb:ApplicationLoadBalancer": loadBalancer(awsSpec, false),
			"awsx:lb:NetworkLoadBalancer":     loadBalancer(awsSpec, true),
			"awsx:lb:TargetGroupAttachment":   targetGroupAttachment(awsSpec),
		},
		Types: map[string]schema.ComplexTypeSpec{
			"awsx:lb:Listener":    lbListener(awsSpec),
			"awsx:lb:TargetGroup": lbTargetGroup(awsSpec),
			// "awsx:lb:TargetGroupTargetHealthState": lbTargetGroupTargetHealthState(awsSpec),
		},
	}
}

func loadBalancer(awsSpec schema.PackageSpec, isNetworkLoadBalancer bool) schema.ResourceSpec {
	originalSpec := awsSpec.Resources["aws:lb/loadBalancer:LoadBalancer"]
	inputProperties := renameAwsPropertiesRefs(awsSpec, originalSpec.InputProperties)

	// Remove non-application properties
	if !isNetworkLoadBalancer {
		// enableCrossZoneLoadBalancing is only for NLB
		delete(inputProperties, "enableCrossZoneLoadBalancing")
	}
	if isNetworkLoadBalancer {
		// "enableHttp2" is only for ApplicationLoadBalancers
		delete(inputProperties, "enableHttp2")
	}
	delete(inputProperties, "loadBalancerType")

	// Allow passing actual subnets in
	inputProperties["subnetIds"] = inputProperties["subnets"]
	inputProperties["subnets"] = schema.PropertySpec{
		Description: "A list of subnets to attach to the LB. Only one of [subnets], " +
			"[subnetIds] or [subnetMappings] can be specified",
		TypeSpec: schema.TypeSpec{
			Type: "array",
			Items: &schema.TypeSpec{
				Ref: packageRef(awsSpec, "/resources/aws:ec2%2fsubnet:Subnet"),
			},
		},
	}
	if !isNetworkLoadBalancer {
		// For NLBs security groups cannot be added if none are currently present, and cannot all be removed once added.
		// Adding a default security group to NLBs would cause replacements during upgrades
		inputProperties["defaultSecurityGroup"] = schema.PropertySpec{
			Description: "Options for creating a default security group if [securityGroups] not specified.",
			TypeSpec: schema.TypeSpec{
				Ref:   "#/types/awsx:awsx:DefaultSecurityGroup",
				Plain: true,
			},
		}
	}
	inputProperties["defaultTargetGroup"] = schema.PropertySpec{
		Description: "Options creating a default target group.",
		TypeSpec: schema.TypeSpec{
			Ref:   "#/types/awsx:lb:TargetGroup",
			Plain: true,
		},
	}
	inputProperties["defaultTargetGroupPort"] = schema.PropertySpec{
		Description: "Port to use to connect with the target. Valid values are ports 1-65535. Defaults to 80.\n",
		TypeSpec: schema.TypeSpec{
			Type: "integer",
		},
	}
	inputProperties["listener"] = schema.PropertySpec{
		Description: "A listener to create. Only one of [listener] and [listeners] can be specified.",
		TypeSpec: schema.TypeSpec{
			Ref:   "#/types/awsx:lb:Listener",
			Plain: true,
		},
	}
	inputProperties["listeners"] = schema.PropertySpec{
		Description: "List of listeners to create. Only one of [listener] and [listeners] can be specified.",
		TypeSpec: schema.TypeSpec{
			Type:  "array",
			Plain: true,
			Items: &schema.TypeSpec{
				Ref:   "#/types/awsx:lb:Listener",
				Plain: true,
			},
		},
	}

	outputs := map[string]schema.PropertySpec{
		"loadBalancer": {
			Description: "Underlying Load Balancer resource",
			TypeSpec: schema.TypeSpec{
				Ref: packageRef(awsSpec, "/resources/aws:lb%2floadBalancer:LoadBalancer"),
			},
		},
		"vpcId": {
			Description: "Id of the VPC in which this load balancer is operating",
			TypeSpec: schema.TypeSpec{
				Type: "string",
			},
		},
		"defaultSecurityGroup": {
			Description: "Default security group, if auto-created",
			TypeSpec: schema.TypeSpec{
				Ref: packageRef(awsSpec, "/resources/aws:ec2%2fsecurityGroup:SecurityGroup"),
			},
		},
		"defaultTargetGroup": {
			Description: "Default target group, if auto-created",
			TypeSpec: schema.TypeSpec{
				Ref: packageRef(awsSpec, "/resources/aws:lb%2ftargetGroup:TargetGroup"),
			},
		},
		"listeners": {
			Description: "Listeners created as part of this load balancer",
			TypeSpec: schema.TypeSpec{
				Type: "array",
				Items: &schema.TypeSpec{
					Ref: packageRef(awsSpec, "/resources/aws:lb%2flistener:Listener"),
				},
			},
		},
	}

	if isNetworkLoadBalancer {
		// NLBs don't have a default Security Group
		delete(outputs, "defaultSecurityGroup")
	}

	var description string
	if isNetworkLoadBalancer {
		description = "Provides a Network Load Balancer resource with listeners and default target group."
	} else {
		description = "Provides an Application Load Balancer resource with listeners, " +
			"default target group and default security group."
	}

	return schema.ResourceSpec{
		IsComponent:     true,
		InputProperties: inputProperties,
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: description,
			Properties:  outputs,
			Required:    []string{"loadBalancer", "defaultTargetGroup"},
		},
	}
}

func targetGroupAttachment(awsSpec schema.PackageSpec) schema.ResourceSpec {
	return schema.ResourceSpec{
		IsComponent: true,
		InputProperties: map[string]schema.PropertySpec{
			"targetGroup": {
				Description: "Target Group to attach to. Exactly one of [targetGroup] or [targetGroupArn] must be specified.",
				TypeSpec: schema.TypeSpec{
					Ref: packageRef(awsSpec, "/resources/aws:lb%2ftargetGroup:TargetGroup"),
				},
			},
			"targetGroupArn": {
				Description: "ARN of the Target Group to attach to. Exactly one of " +
					"[targetGroup] or [targetGroupArn] must be specified.",
				TypeSpec: schema.TypeSpec{
					Type: "string",
				},
			},
			"instance": {
				Description: "EC2 Instance to attach to the Target Group. Exactly 1 of " +
					"[instance], [instanceId], [lambda] or [lambdaArn] must be provided.",
				TypeSpec: schema.TypeSpec{
					Ref: packageRef(awsSpec, "/resources/aws:ec2%2finstance:Instance"),
				},
			},
			"instanceId": {
				Description: "ID of an EC2 Instance to attach to the Target Group. Exactly " +
					"1 of [instance], [instanceId], [lambda] or [lambdaArn] must " +
					"be provided.",
				TypeSpec: schema.TypeSpec{
					Type: "string",
				},
			},
			"lambda": {
				Description: "Lambda Function to attach to the Target Group. Exactly 1 of " +
					"[instance], [instanceId], [lambda] or [lambdaArn] must be " +
					"provided.",
				TypeSpec: schema.TypeSpec{
					Ref: packageRef(awsSpec, "/resources/aws:lambda%2ffunction:Function"),
				},
				Language: map[string]schema.RawMessage{
					"python": rawMessage(map[string]string{
						"name": "function",
					}),
				},
			},
			"lambdaArn": {
				Description: "ARN of a Lambda Function to attach to the Target Group. " +
					"Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] " +
					"must be provided.",
				TypeSpec: schema.TypeSpec{
					Type: "string",
				},
			},
		},
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type: "object",
			Description: "Attach an EC2 instance or Lambda to a Load Balancer. This " +
				"will create required permissions if attaching to a Lambda Function.",
			Properties: map[string]schema.PropertySpec{
				"targetGroupAttachment": {
					Description: "Underlying Target Group Attachment resource",
					TypeSpec: schema.TypeSpec{
						Ref: packageRef(awsSpec, "/resources/aws:lb%2ftargetGroupAttachment:TargetGroupAttachment"),
					},
					Language: map[string]schema.RawMessage{
						"csharp": rawMessage(map[string]string{
							"name": "Attachment",
						}),
					},
				},
				"lambdaPermission": {
					Description: "Auto-created Lambda permission, if targeting a Lambda function",
					TypeSpec: schema.TypeSpec{
						Ref: packageRef(awsSpec, "/resources/aws:lambda%2fpermission:Permission"),
					},
				},
			},
			Required: []string{"targetGroupAttachment"},
		},
	}
}

func lbListener(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	spec := awsSpec.Resources["aws:lb/listener:Listener"]
	properties := renameAwsPropertiesRefs(awsSpec, spec.InputProperties)
	delete(properties, "loadBalancerArn")

	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: spec.Description,
			Properties:  properties,
		},
	}
}

func lbTargetGroup(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	spec := awsSpec.Resources["aws:lb/targetGroup:TargetGroup"]
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: spec.Description,
			Properties:  renameAwsPropertiesRefs(awsSpec, spec.InputProperties),
		},
	}
}
