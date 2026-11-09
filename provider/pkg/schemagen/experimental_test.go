// Copyright 2016-2026, Pulumi Corporation.
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
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

func TestNormalizeExperimental(t *testing.T) {
	t.Parallel()

	const externalRole = "/aws/v7.48.0/schema.json#/resources/aws:iam%2Frole:Role"
	inferred := schema.PackageSpec{
		Resources: map[string]schema.ResourceSpec{
			"awsx-next:index:TaskDefinition": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Properties: map[string]schema.PropertySpec{
						"executionRole": {TypeSpec: schema.TypeSpec{Ref: externalRole}},
					},
					Required: []string{"executionRole"},
				},
				InputProperties: map[string]schema.PropertySpec{
					"containers": {
						TypeSpec: schema.TypeSpec{
							Type: "object",
							AdditionalProperties: &schema.TypeSpec{
								Ref: "#/types/awsx-next:index:ContainerDefinitionOptions",
							},
						},
					},
				},
				RequiredInputs: []string{"containers"},
				IsComponent:    true,
			},
			"awsx-next:index:Service": {},
		},
		Types: map[string]schema.ComplexTypeSpec{
			"awsx-next:index:ContainerDefinitionOptions": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Properties: map[string]schema.PropertySpec{
						"dependencies": {
							TypeSpec: schema.TypeSpec{
								Type: "array",
								Items: &schema.TypeSpec{
									OneOf: []schema.TypeSpec{
										{Ref: "#/types/awsx-next:index:ContainerDependency"},
										{Ref: "#/resources/awsx-next:index:TaskDefinition"},
									},
								},
							},
						},
					},
				},
			},
			"awsx-next:index:ContainerDependency": {
				ObjectTypeSpec: schema.ObjectTypeSpec{Type: "object"},
			},
		},
	}

	normalized := normalizeExperimental(inferred)
	task := normalized.Resources["awsx:experimental/ecs:TaskDefinition"]
	require.True(t, task.IsComponent)
	assert.Equal(t, []string{"containers"}, task.RequiredInputs)
	assert.Equal(t, []string{"executionRole"}, task.Required)
	assert.Equal(t, externalRole, task.Properties["executionRole"].Ref)
	require.NotNil(t, task.InputProperties["containers"].AdditionalProperties)
	assert.Equal(t, "#/types/awsx:experimental/ecs:ContainerDefinitionOptions",
		task.InputProperties["containers"].AdditionalProperties.Ref)
	assert.Contains(t, normalized.Resources, "awsx:experimental/ecs:Service")
	assert.NotContains(t, normalized.Resources, "awsx-next:index:TaskDefinition")

	dependencies := normalized.Types["awsx:experimental/ecs:ContainerDefinitionOptions"].Properties["dependencies"]
	require.NotNil(t, dependencies.Items)
	require.Len(t, dependencies.Items.OneOf, 2)
	assert.Equal(t, "#/types/awsx:experimental/ecs:ContainerDependency", dependencies.Items.OneOf[0].Ref)
	assert.Equal(t, "#/resources/awsx:experimental/ecs:TaskDefinition", dependencies.Items.OneOf[1].Ref)
	assert.Contains(t, normalized.Types, "awsx:experimental/ecs:ContainerDependency")
}
