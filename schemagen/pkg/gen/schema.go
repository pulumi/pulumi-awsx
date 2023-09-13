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
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"path"
	"strings"

	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
	"github.com/pulumi/pulumi/sdk/v3/go/common/util/contract"
)

const (
	awsNativeTypesVersion = "0.72.0"
)

// nolint: lll
func GenerateSchema(packageDir string) schema.PackageSpec {
	dependencies := readPackageDependencies(packageDir)
	awsSpec := getPackageSpec("aws", dependencies.Aws)
	awsNativeSpec := getPackageSpec("aws-native", awsNativeTypesVersion)
	dockerSpec := getPackageSpec("docker", dependencies.Docker)

	packageSpec := schema.PackageSpec{
		Name:        "awsx",
		DisplayName: "AWSx (Pulumi Crosswalk for AWS)",
		Description: "Pulumi Amazon Web Services (AWS) AWSX Components.",
		License:     "Apache-2.0",
		Publisher:   "Pulumi",
		Keywords:    []string{"pulumi", "aws", "awsx", "kind/component", "category/cloud"},
		Homepage:    "https://pulumi.com",
		Repository:  "https://github.com/pulumi/pulumi-awsx",

		Functions: map[string]schema.FunctionSpec{},
		Resources: map[string]schema.ResourceSpec{},
		Types:     map[string]schema.ComplexTypeSpec{},
		Language: map[string]schema.RawMessage{
			"csharp": rawMessage(map[string]interface{}{
				"packageReferences": map[string]string{
					// We use .* format rather than [x,y) because then it prefers the maximum satisfiable version
					"Pulumi":        "3.*",
					"Pulumi.Aws":    "6.*",
					"Pulumi.Docker": "3.*",
				},
				"liftSingleValueMethodReturns": true,
			}),
			"go": rawMessage(map[string]interface{}{
				"generateResourceContainerTypes": true,
				"importBasePath":                 "github.com/pulumi/pulumi-awsx/sdk/v2/go/awsx",
				"liftSingleValueMethodReturns":   true,
				"internalDependencies":           []string{"github.com/pulumi/pulumi-docker/sdk/v3/go/docker"},
			}),
			"java": rawMessage(map[string]interface{}{
				"dependencies": map[string]string{
					"com.pulumi:aws": dependencies.Aws,
				},
			}),
			"nodejs": rawMessage(map[string]interface{}{
				"dependencies": map[string]string{
					"@aws-sdk/client-ecs": "^3.405.0",
					"@pulumi/pulumi":      "^3.0.0",
					"@pulumi/aws":         "^" + dependencies.Aws,
					"@pulumi/docker":      "^" + dependencies.Docker,
					"@types/aws-lambda":   "^8.10.23",
					"aws-sdk":             "^2.1450.0",
					"mime":                "^2.0.0",
				},
				"devDependencies": map[string]string{
					"@types/node": "^18",
					"@types/mime": "^2.0.0",
					"typescript":  "^4.6.2",
				},
			}),
			"python": rawMessage(map[string]interface{}{
				"requires": map[string]string{
					"pulumi":        ">=3.76.1,<4.0.0",
					"pulumi-aws":    ">=6.0.4,<7.0.0",
					"pulumi-docker": fmt.Sprintf(">=%s,<4.0.0", dependencies.Docker),
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
		generateLb(awsSpec),
		generateCloudwatch(awsSpec),
		generateIam(awsSpec),
		generateS3(awsSpec),
		generateEc2(awsSpec),
		generateEcr(awsSpec, dockerSpec),
	)
}

func packageRef(spec schema.PackageSpec, ref string) string {
	version := spec.Version
	refWithoutHash := strings.TrimLeft(ref, "#")
	return fmt.Sprintf("/%s/%s/schema.json#%s", spec.Name, version, refWithoutHash)
}

func getPackageSpec(name, version string) schema.PackageSpec {
	// If the version has a commit hash, strip it off since they are not used in GitHub URLs by tag.
	urlVersion := version
	if before, _, found := strings.Cut(version, "+"); found {
		urlVersion = before
	}

	url := fmt.Sprintf("https://raw.githubusercontent.com/pulumi/pulumi-%s/v%s/provider/cmd/pulumi-resource-%s/schema.json", name, urlVersion, name)
	spec := getSpecFromUrl(url)
	if spec.Version == "" {
		// Version is rarely included, so we'll just add it.
		spec.Version = "v" + version
	}
	return spec
}

func getSpecFromUrl(url string) schema.PackageSpec {
	resp, err := http.Get(url)
	if err != nil {
		log.Fatalf("Could not GET %s: %v", url, err)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Could not read %s: %v", url, err)
	}
	var spec schema.PackageSpec
	err = json.Unmarshal(body, &spec)
	if err != nil {
		log.Fatalf("Could not parse %s: %v", url, err)
	}

	return spec
}

// Perform a simple string replacement on Refs in all sub-specs
func renameComplexRefs(spec schema.ComplexTypeSpec, old, new string) schema.ComplexTypeSpec {
	spec.Properties = renamePropertiesRefs(spec.Properties, old, new)
	return spec
}

func renameAwsPropertiesRefs(spec schema.PackageSpec, propertySpec map[string]schema.PropertySpec) map[string]schema.PropertySpec {
	return renamePropertiesRefs(propertySpec, "#/types/aws:", packageRef(spec, "/types/aws:"))
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
	if propSpec.OneOf != nil {
		propSpec.OneOf = renameTypeSpecsRefs(propSpec.OneOf, old, new)
	}
	return propSpec
}

func renameTypeSpecsRefs(typeSpec []schema.TypeSpec, old, new string) []schema.TypeSpec {
	newSpecs := make([]schema.TypeSpec, len(typeSpec))
	for i, spec := range typeSpec {
		newSpecs[i] = renameTypeSpecRefs(spec, old, new)
	}
	return newSpecs
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

type Dependencies struct {
	Aws    string `json:"@pulumi/aws"`
	Docker string `json:"@pulumi/docker"`
	Pulumi string `json:"@pulumi/pulumi"`
}

type PackageJson struct {
	Dependencies Dependencies
}

func readPackageDependencies(packageDir string) Dependencies {
	content, err := ioutil.ReadFile(path.Join(packageDir, "package.json"))
	if err != nil {
		log.Fatal("Error when opening file: ", err)
	}

	var payload PackageJson
	err = json.Unmarshal(content, &payload)
	if err != nil {
		log.Fatal("Error during Unmarshal(): ", err)
	}

	return payload.Dependencies
}
