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

func generateIam(awsSpec schema.PackageSpec) schema.PackageSpec {
	return schema.PackageSpec{
		Types: map[string]schema.ComplexTypeSpec{
			"awsx:iam:DefaultRoleWithPolicy": defaultRoleWithPolicyArgs(awsSpec),
			"awsx:iam:RoleWithPolicy":        roleWithPolicyArgs(awsSpec),
		},
	}
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
