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
	"fmt"
	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

func generateVpc(awsSpec schema.PackageSpec) schema.PackageSpec {
	packageSpec := schema.PackageSpec{
		Resources: map[string]schema.ResourceSpec{
			"awsx:vpc:Vpc": vpcResource(awsSpec),
		},
		Types: map[string]schema.ComplexTypeSpec{
			"awsx:vpc:NatGatewayStrategy":      natGatewayStrategyType(),
			"awsx:vpc:NatGatewayConfiguration": natGatewayConfigurationType(),
			"awsx:vpc:SubnetType":              subnetType(),
			"awsx:vpc:SubnetConfiguration":     subnetConfigType(),
		},
	}

	return packageSpec
}

const (
	subnetsPerAz          = "subnetsPerAz"
	availabilityZoneNames = "availabilityZoneNames"
)

func vpcResource(awsSpec schema.PackageSpec) schema.ResourceSpec {
	awsVpcResource := awsSpec.Resources["aws:ec2/vpc:Vpc"]
	inputProperties := map[string]schema.PropertySpec{
		availabilityZoneNames: {
			Description: fmt.Sprintf("A list of availability zones to which the subnets defined in %s will be deployed. Optional, defaults to the first 3 AZs in the current region.", subnetsPerAz),
			TypeSpec:    plainArrayOfPlainStrings(),
		},
		"cidrBlock": {
			Description: "The CIDR block for the VPC. Optional. Defaults to 10.0.0.0/16.",
			TypeSpec:    plainString(),
		},
		"natGateways": {
			Description: "Configuration for NAT Gateways. Optional. If private and public subnets are both specified, defaults to one gateway per availability zone. Otherwise, no gateways will be created.",
			TypeSpec: schema.TypeSpec{
				Ref:   localRef("NatGatewayConfiguration"),
				Plain: true,
			},
		},
		subnetsPerAz: {
			Description: fmt.Sprintf("A list of subnets that should be deployed to each AZ specified in %s. Optional. Defaults to a (smaller) public subnet and a (larger) private subnet based on the size of the CIDR block for the VPC.", availabilityZoneNames),
			TypeSpec:    plainArrayOfPlainComplexType("SubnetConfiguration"),
		},
	}
	for k, v := range awsVpcResource.InputProperties {
		// We redefine some of the aws.Vpc properties above as plain types because they have default values in the
		// provider implementation. In this case, we should skip the property on the raw VPC resource:
		_, containsKey := inputProperties[k]
		if containsKey {
			continue
		}

		inputProperties[k] = renamePropertyRefs(v, "#/types/aws:", awsRef("#/types/aws:"))
	}

	return schema.ResourceSpec{
		IsComponent: true,
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Properties: map[string]schema.PropertySpec{
				"vpc": {
					Description: "The VPC.",
					TypeSpec: schema.TypeSpec{
						Ref: awsRef("#/resources/aws:ec2%2fvpc:Vpc"),
					},
					Language: map[string]schema.RawMessage{
						"csharp": schema.RawMessage(`{
									"name": "AwsVpc"
								}`),
					},
				},
				"subnets": {
					Description: "The VPC's subnets.",
					TypeSpec: schema.TypeSpec{
						Type: "array",
						Items: &schema.TypeSpec{
							Ref: awsRef("#/resources/aws:ec2%2fsubnet:Subnet"),
						},
					},
				},
			},
		},
		InputProperties: inputProperties,
	}
}

func subnetConfigType() schema.ComplexTypeSpec {
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: "Configuration for a VPC subnet.",
			Properties: map[string]schema.PropertySpec{
				"type": {
					Description: "The type of subnet.",
					TypeSpec: schema.TypeSpec{
						Ref:   localRef("SubnetType"),
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
					Description: "The bitmask for the subnet's CIDR block.",
					TypeSpec:    plainInt(),
				},
			},
			Required: []string{
				"type",
				"name",
				"cidrMask",
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
						Ref:   localRef("NatGatewayStrategy"),
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
			Ref:   localRef(name),
			Plain: true,
		},
		Plain: true,
	}
}

func localRef(name string) string {
	return fmt.Sprintf("#/types/awsx:vpc:%s", name)
}
