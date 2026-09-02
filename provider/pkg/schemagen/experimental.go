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
	"bytes"
	"encoding/json"
	"log"
	"os/exec"
	"path/filepath"

	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

var experimentalTokenMappings = map[string]string{
	"awsx-experimental:index:FargateTaskDefinitionV2":               "awsx:experimental/ecs:FargateTaskDefinitionV2",
	"awsx-experimental:index:LogGroup":                              "awsx:experimental/cloudwatch:LogGroup",
	"awsx-experimental:index:AwsLogDriverMode":                      "awsx:experimental/ecs:AwsLogDriverMode",
	"awsx-experimental:index:ContainerDefinitionVersionConsistency": "awsx:experimental/ecs:ContainerDefinitionVersionConsistency", //nolint:lll
	"awsx-experimental:index:ContainerDependency":                   "awsx:experimental/ecs:ContainerDependency",
	"awsx-experimental:index:ContainerDependencyCondition":          "awsx:experimental/ecs:ContainerDependencyCondition",
	"awsx-experimental:index:ContainerPortRange":                    "awsx:experimental/ecs:ContainerPortRange",
	"awsx-experimental:index:CredentialSpec":                        "awsx:experimental/ecs:CredentialSpec",
	"awsx-experimental:index:CredentialSpecAuthenticationMode":      "awsx:experimental/ecs:CredentialSpecAuthenticationMode", //nolint:lll
	"awsx-experimental:index:EnvironmentFile":                       "awsx:experimental/ecs:EnvironmentFile",
	"awsx-experimental:index:FargateAwsLogsLogDriver":               "awsx:experimental/ecs:FargateAwsLogsLogDriver",
	"awsx-experimental:index:FargateContainerDefinitionOptions":     "awsx:experimental/ecs:FargateContainerDefinitionOptions", //nolint:lll
	"awsx-experimental:index:FargateKernelCapabilities":             "awsx:experimental/ecs:FargateKernelCapabilities",
	"awsx-experimental:index:FargateLinuxParameters":                "awsx:experimental/ecs:FargateLinuxParameters",
	"awsx-experimental:index:FargateLogDriver":                      "awsx:experimental/ecs:FargateLogDriver",
	"awsx-experimental:index:FargatePortMapping":                    "awsx:experimental/ecs:FargatePortMapping",
	"awsx-experimental:index:HealthCheck":                           "awsx:experimental/ecs:HealthCheck",
	"awsx-experimental:index:LogGroupReference":                     "awsx:experimental/cloudwatch:LogGroupReference",
	"awsx-experimental:index:PortMappingAppProtocol":                "awsx:experimental/ecs:PortMappingAppProtocol",
	"awsx-experimental:index:PortMappingProtocol":                   "awsx:experimental/ecs:PortMappingProtocol",
	"awsx-experimental:index:S3BucketCredentialSpec":                "awsx:experimental/ecs:S3BucketCredentialSpec",
	"awsx-experimental:index:Secret":                                "awsx:experimental/ecs:Secret",
	"awsx-experimental:index:SecretsManagerSecret":                  "awsx:experimental/ecs:SecretsManagerSecret",
	"awsx-experimental:index:SystemControl":                         "awsx:experimental/ecs:SystemControl",
	"awsx-experimental:index:Ulimit":                                "awsx:experimental/ecs:Ulimit",
	"awsx-experimental:index:UlimitName":                            "awsx:experimental/ecs:UlimitName",
	"awsx-experimental:index:VolumeFrom":                            "awsx:experimental/ecs:VolumeFrom",
}

func generateExperimental(packageDir string) schema.PackageSpec {
	absolutePackageDir, err := filepath.Abs(packageDir)
	if err != nil {
		log.Fatalf("resolving AWSX package directory: %v", err)
	}

	repositoryRoot := filepath.Dir(absolutePackageDir)
	experimentalDir := filepath.Join(repositoryRoot, "awsx-experimental")
	cmd := exec.Command("pulumi", "package", "get-schema", experimentalDir)
	cmd.Dir = repositoryRoot
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	output, err := cmd.Output()
	if err != nil {
		log.Fatalf("generating AWSX experimental schema: %v\n%s", err, stderr.String())
	}

	var inferred schema.PackageSpec
	if err := json.Unmarshal(output, &inferred); err != nil {
		log.Fatalf("parsing AWSX experimental schema: %v", err)
	}

	return normalizeExperimental(inferred)
}

func normalizeExperimental(inferred schema.PackageSpec) schema.PackageSpec {
	result := schema.PackageSpec{
		Resources: map[string]schema.ResourceSpec{},
		Types:     map[string]schema.ComplexTypeSpec{},
	}

	for token, resource := range inferred.Resources {
		resource.Properties = renameExperimentalRefs(resource.Properties)
		resource.InputProperties = renameExperimentalRefs(resource.InputProperties)
		result.Resources[renameExperimentalToken(token)] = resource
	}

	for token, typ := range inferred.Types {
		typ.Properties = renameExperimentalRefs(typ.Properties)
		result.Types[renameExperimentalToken(token)] = typ
	}

	return result
}

func renameExperimentalToken(token string) string {
	if replacement, ok := experimentalTokenMappings[token]; ok {
		return replacement
	}
	return token
}

func renameExperimentalRefs(properties map[string]schema.PropertySpec) map[string]schema.PropertySpec {
	for old, replacement := range experimentalTokenMappings {
		properties = renamePropertiesRefs(properties, "#/types/"+old, "#/types/"+replacement)
		properties = renamePropertiesRefs(properties, "#/resources/"+old, "#/resources/"+replacement)
	}
	return properties
}
