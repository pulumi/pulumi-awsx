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
	_ "embed"
	"fmt"
	"strings"

	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

func generateEc2(awsSpec schema.PackageSpec) schema.PackageSpec {
	return schema.PackageSpec{
		Resources: map[string]schema.ResourceSpec{
			"awsx:ec2:Vpc":        vpcResource(awsSpec),
			"awsx:ec2:DefaultVpc": defaultVpcResource(awsSpec),
		},
		Types: map[string]schema.ComplexTypeSpec{
			"awsx:awsx:DefaultSecurityGroup":    defaultSecurityGroupArgs(awsSpec),
			"awsx:awsx:SecurityGroup":           securityGroupArgs(awsSpec),
			"awsx:ec2:NatGatewayStrategy":       natGatewayStrategyType(),
			"awsx:ec2:NatGatewayConfiguration":  natGatewayConfigurationType(),
			"awsx:ec2:SubnetType":               subnetType(),
			"awsx:ec2:SubnetAllocationStrategy": subnetAllocationStrategy(),
			"awsx:ec2:SubnetSpec":               subnetSpecType(),
			"awsx:ec2:VpcEndpointSpec":          vpcEndpointSpec(awsSpec),
		},
		Functions: map[string]schema.FunctionSpec{
			"awsx:ec2:getDefaultVpc": defaultVpcArgs(),
		},
	}
}

const (
	subnetSpecs           = "subnetSpecs"
	availabilityZoneNames = "availabilityZoneNames"
)

func defaultSecurityGroupArgs(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "Security Group with default setup unless explicitly skipped or an existing security group id provided.",
			Properties: map[string]schema.PropertySpec{
				"skip": {
					Description: "Skips creation of the security group if set to `true`.",
					TypeSpec: schema.TypeSpec{
						Type:  "boolean",
						Plain: true,
					},
				},
				"securityGroupId": {
					Description: "Id of existing security group to use instead of creating a new security group. Cannot be used in combination with `args` or `opts`.",
					TypeSpec: schema.TypeSpec{
						Type: "string",
					},
				},
				"args": {
					Description: "Args to use when creating the security group. Can't be specified if `securityGroupId` is used.",
					TypeSpec: schema.TypeSpec{
						Ref:   "#/types/awsx:awsx:SecurityGroup",
						Plain: true,
					},
				},
			},
		},
	}
}

func securityGroupArgs(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	role := awsSpec.Resources["aws:ec2/securityGroup:SecurityGroup"]

	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "The set of arguments for constructing a Security Group resource.",
			Properties:  renameAwsPropertiesRefs(awsSpec, role.InputProperties),
		},
	}
}

//go:embed ec2-vpc.md
var vpcDocs string

func vpcResource(awsSpec schema.PackageSpec) schema.ResourceSpec {
	awsVpcResource := awsSpec.Resources["aws:ec2/vpc:Vpc"]
	inputProperties := map[string]schema.PropertySpec{
		availabilityZoneNames: {
			Description: fmt.Sprintf("A list of availability zone names to which the subnets defined in %v will be deployed. Optional, defaults to the first 3 AZs in the current region.", subnetSpecs),
			TypeSpec:    plainArrayOfPlainStrings(),
		},
		"numberOfAvailabilityZones": {
			Description: fmt.Sprintf("A number of availability zones to which the subnets defined in %v will be deployed. Optional, defaults to the first 3 AZs in the current region.", subnetSpecs),
			TypeSpec: schema.TypeSpec{
				Type:  "integer",
				Plain: true,
			},
		},
		"cidrBlock": {
			Description: "The CIDR block for the VPC. Optional. Defaults to 10.0.0.0/16.",
			TypeSpec:    plainString(),
		},
		"natGateways": {
			Description: "Configuration for NAT Gateways. Optional. If private and public subnets are both specified, defaults to one gateway per availability zone. Otherwise, no gateways will be created.",
			TypeSpec: schema.TypeSpec{
				Ref:   localRef("ec2", "NatGatewayConfiguration"),
				Plain: true,
			},
		},
		"subnetStrategy": {
			Description: "The strategy to use when allocating subnets for the VPC. Optional. Defaults to `Legacy`.",
			TypeSpec: schema.TypeSpec{
				Ref:   localRef("ec2", "SubnetAllocationStrategy"),
				Plain: true,
			},
		},
		subnetSpecs: {
			Description: fmt.Sprintf("A list of subnet specs that should be deployed to each AZ specified in %s. Optional. Defaults to a (smaller) public subnet and a (larger) private subnet based on the size of the CIDR block for the VPC. Private subnets are allocated CIDR block ranges first, followed by Private subnets, and Isolated subnets are allocated last.", availabilityZoneNames),
			TypeSpec:    plainArrayOfPlainComplexType("SubnetSpec"),
		},
		"vpcEndpointSpecs": {
			Description: "A list of VPC Endpoints specs to be deployed as part of the VPC",
			TypeSpec:    plainArrayOfPlainComplexType("VpcEndpointSpec"),
		},
	}
	for k, v := range awsVpcResource.InputProperties {
		// We redefine some of the aws.Vpc properties above as plain types because they have default values in the
		// provider implementation. In this case, we should skip the property on the raw VPC resource:
		_, containsKey := inputProperties[k]
		if containsKey {
			continue
		}

		inputProperties[k] = renamePropertyRefs(v, "#/types/aws:", packageRef(awsSpec, "/types/aws:"))
	}

	return schema.ResourceSpec{
		IsComponent: true,
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Description: vpcDocs,
			Properties: map[string]schema.PropertySpec{
				"vpc": {
					Description: "The VPC.",
					TypeSpec:    awsType(awsSpec, "ec2", "vpc"),
					Language: map[string]schema.RawMessage{
						"csharp": schema.RawMessage(`{
									"name": "AwsVpc"
								}`),
					},
				},
				"vpcEndpoints": {
					Description: "The VPC Endpoints that are enabled",
					TypeSpec:    arrayOfAwsType(awsSpec, "ec2", "vpcEndpoint"),
				},
				"subnets": {
					Description: "The VPC's subnets.",
					TypeSpec:    arrayOfAwsType(awsSpec, "ec2", "subnet"),
				},
				"routeTables": {
					Description: "The Route Tables for the VPC.",
					TypeSpec:    arrayOfAwsType(awsSpec, "ec2", "routeTable"),
				},
				"routeTableAssociations": {
					Description: "The Route Table Associations for the VPC.",
					TypeSpec:    arrayOfAwsType(awsSpec, "ec2", "routeTableAssociation"),
				},
				"routes": {
					Description: "The Routes for the VPC.",
					TypeSpec:    arrayOfAwsType(awsSpec, "ec2", "route"),
				},
				"internetGateway": {
					Description: "The Internet Gateway for the VPC.",
					TypeSpec:    awsType(awsSpec, "ec2", "internetGateway"),
				},
				"natGateways": {
					Description: "The NAT Gateways for the VPC. If no NAT Gateways are specified, this will be an empty list.",
					TypeSpec:    arrayOfAwsType(awsSpec, "ec2", "natGateway"),
				},
				"eips": {
					Description: "The EIPs for any NAT Gateways for the VPC. If no NAT Gateways are specified, this will be an empty list.",
					TypeSpec:    arrayOfAwsType(awsSpec, "ec2", "eip"),
				},
				"publicSubnetIds": {
					TypeSpec: schema.TypeSpec{
						Type: "array",
						Items: &schema.TypeSpec{
							Type: "string",
						},
					},
				},
				"privateSubnetIds": {
					TypeSpec: schema.TypeSpec{
						Type: "array",
						Items: &schema.TypeSpec{
							Type: "string",
						},
					},
				},
				"isolatedSubnetIds": {
					TypeSpec: schema.TypeSpec{
						Type: "array",
						Items: &schema.TypeSpec{
							Type: "string",
						},
					},
				},
				"vpcId": {
					TypeSpec: schema.TypeSpec{
						Type: "string",
					},
				},
			},
			Required: []string{
				"vpc", "subnets", "routeTables", "routeTableAssociations", "routes", "internetGateway", "natGateways",
				"eips", "publicSubnetIds", "privateSubnetIds", "isolatedSubnetIds", "vpcId", "vpcEndpoints",
			},
		},
		InputProperties: inputProperties,
	}
}

func arrayOfAwsType(packageSpec schema.PackageSpec, awsNamespace, resourceNameCamelCase string) schema.TypeSpec {
	awsRefInput := fmt.Sprintf(
		"#/resources/aws:%s%s%s:%s",
		strings.ToLower(awsNamespace),
		"%2f",
		resourceNameCamelCase,
		strings.Title(resourceNameCamelCase),
	)

	return schema.TypeSpec{
		Type: "array",
		Items: &schema.TypeSpec{
			Ref: packageRef(packageSpec, awsRefInput),
		},
	}
}

func awsType(packageSpec schema.PackageSpec, awsNamespace, resourceNameCamelCase string) schema.TypeSpec {
	awsRefInput := fmt.Sprintf(
		"#/resources/aws:%s%s%s:%s",
		strings.ToLower(awsNamespace),
		"%2f",
		resourceNameCamelCase,
		strings.Title(resourceNameCamelCase),
	)
	return schema.TypeSpec{
		Ref: packageRef(packageSpec, awsRefInput),
	}
}

func vpcEndpointSpec(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	spec := awsSpec.Resources["aws:ec2/vpcEndpoint:VpcEndpoint"]
	properties := renameAwsPropertiesRefs(awsSpec, spec.InputProperties)
	delete(properties, "vpcId")

	properties["serviceName"] = schema.PropertySpec{
		Description: "The service name. For AWS services the service name is usually in the form " +
			"`com.amazonaws.<region>.<service>` (the SageMaker Notebook service is an exception to this rule, the " +
			"service name is in the form `aws.sagemaker.<region>.notebook`).",
		TypeSpec: schema.TypeSpec{
			Type:  "string",
			Plain: true,
		},
	}

	properties["autoAccept"] = schema.PropertySpec{
		Description: "Accept the VPC endpoint (the VPC endpoint and service need to be in the same AWS account).",
		TypeSpec: schema.TypeSpec{
			Type:  "boolean",
			Plain: true,
		},
	}

	properties["privateDnsEnabled"] = schema.PropertySpec{
		Description: "Whether or not to associate a private hosted zone with the specified VPC. Applicable " +
			"for endpoints of type Interface. Defaults to `false`.",
		TypeSpec: schema.TypeSpec{
			Type:  "boolean",
			Plain: true,
		},
	}

	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: spec.Description,
			Properties:  properties,
			Required:    []string{"serviceName"},
		},
	}
}

func subnetSpecType() schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "Configuration for a VPC subnet.",
			Properties: map[string]schema.PropertySpec{
				"type": {
					Description: "The type of subnet.",
					TypeSpec: schema.TypeSpec{
						Ref:   localRef("ec2", "SubnetType"),
						Plain: true,
					},
				},
				"name": {
					Description: "The subnet's name. Will be templated upon creation.",
					TypeSpec:    plainString(),
				},
				"cidrMask": {
					// The validation rules are too difficult to concisely describe here, so we'll leave that job to any
					// error messages generated from the component itself.
					Description: "The netmask for the subnet's CIDR block. This is optional, the default value is inferred from the `cidrMask`, `cidrBlocks` or based on an even distribution of available space from the VPC's CIDR block after being divided evenly by availability zone.",
					TypeSpec:    plainInt(),
				},
				"cidrBlocks": {
					Description: "An optional list of CIDR blocks to assign to the subnet spec for each AZ. If specified, the count must match the number of AZs being used for the VPC, and must also be specified for all other subnet specs.",
					TypeSpec:    plainArrayOfPlainStrings(),
				},
				"size": {
					Description: "Optional size of the subnet's CIDR block - the number of hosts. This value must be a power of 2 (e.g. 256, 512, 1024, etc.). This is optional, the default value is inferred from the `cidrMask`, `cidrBlocks` or based on an even distribution of available space from the VPC's CIDR block after being divided evenly by availability zone.",
					TypeSpec:    plainInt(),
				},
				"tags": {
					TypeSpec: schema.TypeSpec{
						Type:                 "object",
						AdditionalProperties: &schema.TypeSpec{Type: "string"},
					},
					Description: "A map of tags to assign to the resource.",
				},
			},
			Required: []string{
				"type",
			},
		},
	}
}

func subnetType() schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "string",
			Description: "A type of subnet within a VPC.",
		},
		Enum: []schema.EnumValueSpec{
			{
				Value:       "Public",
				Description: "A subnet whose hosts can directly communicate with the internet.",
			},
			{
				Value:       "Private",
				Description: "A subnet whose hosts can not directly communicate with the internet, but can initiate outbound network traffic via a NAT Gateway.",
			},
			{
				Value:       "Isolated",
				Description: "A subnet whose hosts have no connectivity with the internet.",
			},
			{
				Value:       "Unused",
				Description: "A subnet range which is reserved, but no subnet will be created.",
			},
		},
	}
}

func subnetAllocationStrategy() schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "string",
			Description: "Strategy for calculating subnet ranges from the subnet specifications.",
		},
		Enum: []schema.EnumValueSpec{
			{
				Value:       "Legacy",
				Description: "Group private subnets first, followed by public subnets, followed by isolated subnets.",
			},
			{
				Value:       "Auto",
				Description: "Order remains as specified by specs, allowing gaps where required.",
			},
			{
				Value:       "Exact",
				Description: "Whole range of VPC must be accounted for, using \"Unused\" spec types for deliberate gaps.",
			},
		},
	}
}

func natGatewayConfigurationType() schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "Configuration for NAT Gateways.",
			Properties: map[string]schema.PropertySpec{
				"strategy": {
					Description: "The strategy for deploying NAT Gateways.",
					TypeSpec: schema.TypeSpec{
						Ref:   localRef("ec2", "NatGatewayStrategy"),
						Plain: true,
					},
				},
				"elasticIpAllocationIds": {
					Description: "A list of EIP allocation IDs to assign to the NAT Gateways. Optional. If specified, the number of supplied values must match the chosen strategy (either one, or the number of availability zones).",
					TypeSpec:    plainArrayOfPulumiStrings(),
				},
			},
			Required: []string{"strategy"},
		},
	}
}

func natGatewayStrategyType() schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "string",
			Description: "A strategy for creating NAT Gateways for private subnets within a VPC.",
		},
		Enum: []schema.EnumValueSpec{
			{
				Value:       "None",
				Description: "Do not create any NAT Gateways. Resources in private subnets will not be able to access the internet.",
			},
			{
				Value:       "Single",
				Description: "Create a single NAT Gateway for the entire VPC. This configuration is not recommended for production infrastructure as it creates a single point of failure.",
			},
			{
				Value:       "OnePerAz",
				Description: "Create a NAT Gateway in each availability zone. This is the recommended configuration for production infrastructure.",
			},
		},
	}
}

func defaultVpcResource(spec schema.PackageSpec) schema.ResourceSpec {
	return schema.ResourceSpec{
		IsComponent: true,
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Description: "Pseudo resource representing the default VPC and associated subnets for an account and region. This does not create any resources. This will be replaced with `getDefaultVpc` in the future.",
			Properties: map[string]schema.PropertySpec{
				"vpcId": {
					Description: "The VPC ID for the default VPC",
					TypeSpec: schema.TypeSpec{
						Type: "string",
					},
				},
				"publicSubnetIds": {
					TypeSpec: schema.TypeSpec{
						Type: "array",
						Items: &schema.TypeSpec{
							Type: "string",
						},
					},
				},
				"privateSubnetIds": {
					TypeSpec: schema.TypeSpec{
						Type: "array",
						Items: &schema.TypeSpec{
							Type: "string",
						},
					},
				},
			},
			Required: []string{"vpcId", "publicSubnetIds", "privateSubnetIds"},
		},
	}
}

func defaultVpcArgs() schema.FunctionSpec {
	spec := schema.FunctionSpec{
		Description:        "[NOT YET IMPLEMENTED] Get the Default VPC for a region.",
		DeprecationMessage: "Waiting for https://github.com/pulumi/pulumi/issues/7583. Use the DefaultVpc resource until resolved.",
		Inputs: &schema.ObjectTypeSpec{
			Description: "Arguments for getting the default VPC",
			Properties:  map[string]schema.PropertySpec{},
		},
		Outputs: &schema.ObjectTypeSpec{
			Description: "Outputs from the default VPC configuration",
			Properties: map[string]schema.PropertySpec{
				"vpcId": {
					Description: "The VPC ID for the default VPC",
					TypeSpec: schema.TypeSpec{
						Type: "string",
					},
				},
				"publicSubnetIds": {
					TypeSpec: schema.TypeSpec{
						Type: "array",
						Items: &schema.TypeSpec{
							Type: "string",
						},
					},
				},
				"privateSubnetIds": {
					TypeSpec: schema.TypeSpec{
						Type: "array",
						Items: &schema.TypeSpec{
							Type: "string",
						},
					},
				},
			},
			Required: []string{"vpcId", "publicSubnetIds", "privateSubnetIds"},
		},
	}
	return spec
}

func plainInt() schema.TypeSpec {
	return schema.TypeSpec{
		Type:  "integer",
		Plain: true,
	}
}

func plainString() schema.TypeSpec {
	return schema.TypeSpec{
		Type:  "string",
		Plain: true,
	}
}

func plainArrayOfPlainStrings() schema.TypeSpec {
	return schema.TypeSpec{
		Type: "array",
		Items: &schema.TypeSpec{
			Type:  "string",
			Plain: true,
		},
		Plain: true,
	}
}

func plainArrayOfPulumiStrings() schema.TypeSpec {
	return schema.TypeSpec{
		Type: "array",
		Items: &schema.TypeSpec{
			Type: "string",
		},
		Plain: true,
	}
}

func plainArrayOfPlainComplexType(name string) schema.TypeSpec {
	return schema.TypeSpec{
		Type: "array",
		Items: &schema.TypeSpec{
			Ref:   localRef("ec2", name),
			Plain: true,
		},
		Plain: true,
	}
}
