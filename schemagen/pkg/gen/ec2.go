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

func generateEc2(awsSpec schema.PackageSpec) schema.PackageSpec {
	return schema.PackageSpec{
		Types: map[string]schema.ComplexTypeSpec{
			"awsx:awsx:DefaultSecurityGroup": defaultSecurityGroupArgs(awsSpec),
			"awsx:awsx:SecurityGroup":        securityGroupArgs(awsSpec),
		},
	}
}

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
