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
			"awsx:lb:ApplicationLoadBalancer": applicationLoadBalancer(awsSpec),
		},
		Types: map[string]schema.ComplexTypeSpec{
		},
	}
}

func applicationLoadBalancer(awsSpec schema.PackageSpec) schema.ResourceSpec {
	originalSpec := awsSpec.Resources["aws:lb/loadBalancer:LoadBalancer"]
	inputProperties := renameAwsPropertiesRefs(originalSpec.InputProperties)
	delete(inputProperties, "enableCrossZoneLoadBalancing")
	delete(inputProperties, "loadBalancerType")

	return schema.ResourceSpec{
		IsComponent: true,
		InputProperties: inputProperties,
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type: "object",
			Description: "",
			Properties: map[string]schema.PropertySpec{
				"loadBalancer": {
					Description: "Underlying Load Balancer resource",
					TypeSpec: schema.TypeSpec{
						Ref: awsRef("#/resources/aws:lb%2floadBalancer:LoadBalancer"),
					},
				},
			},
		},
	}
}
