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

	inferred := schema.PackageSpec{
		Resources: map[string]schema.ResourceSpec{
			"awsx-next:index:FargateTaskDefinitionV2": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Properties: map[string]schema.PropertySpec{
						"definition": {
							TypeSpec: schema.TypeSpec{Ref: "#/types/awsx-next:index:FargateContainerDefinitionOptions"},
						},
					},
				},
				InputProperties: map[string]schema.PropertySpec{
					"logGroup": {
						TypeSpec: schema.TypeSpec{Ref: "#/types/awsx-next:index:LogGroupReference"},
					},
				},
			},
			"awsx-next:index:LogGroup": {},
		},
		Types: map[string]schema.ComplexTypeSpec{
			"awsx-next:index:ContainerPortRange": {
				ObjectTypeSpec: schema.ObjectTypeSpec{Type: "object"},
			},
			"awsx-next:index:FargateContainerDefinitionOptions": {
				ObjectTypeSpec: schema.ObjectTypeSpec{Type: "object"},
			},
			"awsx-next:index:LogGroupReference": {
				ObjectTypeSpec: schema.ObjectTypeSpec{Type: "object"},
			},
		},
	}

	normalized := normalizeExperimental(inferred)

	resource, ok := normalized.Resources["awsx:experimental/ecs:FargateTaskDefinitionV2"]
	require.True(t, ok)
	assert.Equal(
		t,
		"#/types/awsx:experimental/ecs:FargateContainerDefinitionOptions",
		resource.Properties["definition"].Ref,
	)
	assert.Equal(
		t,
		"#/types/awsx:experimental/cloudwatch:LogGroupReference",
		resource.InputProperties["logGroup"].Ref,
	)
	assert.Contains(t, normalized.Resources, "awsx:experimental/cloudwatch:LogGroup")
	assert.Contains(t, normalized.Types, "awsx:experimental/ecs:ContainerPortRange")
	assert.Contains(t, normalized.Types, "awsx:experimental/ecs:FargateContainerDefinitionOptions")
	assert.Contains(t, normalized.Types, "awsx:experimental/cloudwatch:LogGroupReference")
}
