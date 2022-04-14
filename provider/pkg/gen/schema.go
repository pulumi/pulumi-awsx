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
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strings"

	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
	"github.com/pulumi/pulumi/sdk/v3/go/common/util/contract"
)

const (
	awsVersion            = "v4.37.1"
	awsNativeTypesVersion = "v0.13.0"
)

func awsRef(ref string) string {
	return fmt.Sprintf("/aws/%s/schema.json%s", awsVersion, ref)
}

// nolint: lll
func GenerateSchema() schema.PackageSpec {
	awsSpec := getAwsSpec()
	awsNativeSpec := getAwsNativeSpec()

	packageSpec := schema.PackageSpec{
		Name:        "awsx",
		Description: "Pulumi Amazon Web Services (AWS) AWSX Components.",
		License:     "Apache-2.0",
		Keywords:    []string{"pulumi", "aws", "awsx"},
		Homepage:    "https://pulumi.com",
		Repository:  "https://github.com/pulumi/pulumi-awsx",

		Functions: map[string]schema.FunctionSpec{},
		Resources: map[string]schema.ResourceSpec{
		},
		Types: map[string]schema.ComplexTypeSpec{
		},
		Language: map[string]schema.RawMessage{
			"csharp": rawMessage(map[string]interface{}{
				"packageReferences": map[string]string{
					"Pulumi":     "3.*",
					"Pulumi.Aws": "4.*",
				},
				"liftSingleValueMethodReturns": true,
			}),
			"go": rawMessage(map[string]interface{}{
				"generateResourceContainerTypes": true,
				"importBasePath":                 "github.com/pulumi/pulumi-awsx/sdk/go/awsx",
				"liftSingleValueMethodReturns":   true,
			}),
			"nodejs": rawMessage(map[string]interface{}{
				"dependencies": map[string]string{
					"@pulumi/pulumi": "^3.0.0",
					"@pulumi/aws":    "^4.23.0",
					"@pulumi/docker": "^3.0.0",
					"mime":           "^2.0.0",
				},
				"devDependencies": map[string]string{
					"@types/aws-lambda": "^8.10.23",
					"@types/node":       "^17.0.21",
					"@types/mime":       "^2.0.0",
					"typescript":        "^4.6.2",
				},
			}),
			"python": rawMessage(map[string]interface{}{
				"requires": map[string]string{
					"pulumi":     ">=3.0.0,<4.0.0",
					"pulumi-aws": ">=4.15.0,<5.0.0",
				},
				"usesIOClasses":                true,
				"readme":                       "Pulumi Amazon Web Services (AWS) AWSX Components.",
				"liftSingleValueMethodReturns": true,
			}),
		},
	}

	return extendSchemas(packageSpec,
		generateCloudtrail(awsSpec),
		generateEcs(awsSpec, awsNativeSpec),
		generateCloudwatch(awsSpec),
		generateIam(awsSpec))
}

func getAwsSpec() schema.PackageSpec {
	return getSpecFromUrl(fmt.Sprintf("https://raw.githubusercontent.com/pulumi/pulumi-aws/%s/provider/cmd/pulumi-resource-aws/schema.json", awsVersion))
}

func getAwsNativeSpec() schema.PackageSpec {
	return getSpecFromUrl(fmt.Sprintf("https://raw.githubusercontent.com/pulumi/pulumi-aws-native/%s/provider/cmd/pulumi-resource-aws-native/schema.json", awsNativeTypesVersion))
}

func getSpecFromUrl(url string) schema.PackageSpec {
	resp, err := http.Get(url)
	if err != nil {
		log.Fatal(err)
	}
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}
	var spec schema.PackageSpec
	err = json.Unmarshal(body, &spec)
	if err != nil {
		log.Fatal(err)
	}
	return spec
}

// Perform a simple string replacement on Refs in all sub-specs
func renameComplexRefs(spec schema.ComplexTypeSpec, old, new string) schema.ComplexTypeSpec {
	spec.Properties = renamePropertiesRefs(spec.Properties, old, new)
	return spec
}

func renamePropertiesRefs(propertySpec map[string]schema.PropertySpec, old, new string) map[string]schema.PropertySpec {
	properties := map[string]schema.PropertySpec{}
	for k, v := range propertySpec {
		properties[k] = renamePropertyRefs(v, old, new)
	}
	return properties
}

func renamePropertyRefs(propSpec schema.PropertySpec, old, new string) schema.PropertySpec {
	if propSpec.Ref != "" {
		propSpec.Ref = strings.Replace(propSpec.Ref, old, new, 1)
	}
	if propSpec.AdditionalProperties != nil {
		additionalProperties := renameTypeSpecRefs(*propSpec.AdditionalProperties, old, new)
		propSpec.AdditionalProperties = &additionalProperties
	}
	if propSpec.Items != nil {
		items := renameTypeSpecRefs(*propSpec.Items, old, new)
		propSpec.Items = &items
	}
	return propSpec
}

func renameTypeSpecRefs(typeSpec schema.TypeSpec, old, new string) schema.TypeSpec {
	if typeSpec.Ref != "" {
		typeSpec.Ref = strings.Replace(typeSpec.Ref, old, new, 1)
	}
	if typeSpec.AdditionalProperties != nil {
		additionalProperties := renameTypeSpecRefs(*typeSpec.AdditionalProperties, old, new)
		typeSpec.AdditionalProperties = &additionalProperties
	}
	if typeSpec.Items != nil {
		items := renameTypeSpecRefs(*typeSpec.Items, old, new)
		typeSpec.Items = &items
	}
	return typeSpec
}

func extendSchemas(spec schema.PackageSpec, extensions ...schema.PackageSpec) schema.PackageSpec {
	for _, extension := range extensions {
		for k, v := range extension.Resources {
			if _, found := spec.Resources[k]; found {
				log.Fatalf("resource already defined %q", k)
			}
			spec.Resources[k] = v
		}

		for k, v := range extension.Types {
			if _, found := spec.Types[k]; found {
				log.Fatalf("type already defined %q", k)
			}
			spec.Types[k] = v
		}

		for k, v := range extension.Functions {
			if _, found := spec.Functions[k]; found {
				log.Fatalf("function already defined %q", k)
			}
			spec.Functions[k] = v
		}
	}

	return spec
}

func rawMessage(v interface{}) schema.RawMessage {
	bytes, err := json.Marshal(v)
	contract.Assert(err == nil)
	return bytes
}
