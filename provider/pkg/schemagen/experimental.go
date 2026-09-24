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
	"awsx-next:index:ContainerDefinition":                   "awsx:experimental/ecs:ContainerDefinition",
	"awsx-next:index:ContainerDefinitionArgs":               "awsx:experimental/ecs:ContainerDefinitionArgs",
	"awsx-next:index:ContainerDefinitionDependency":         "awsx:experimental/ecs:ContainerDefinitionDependency",
	"awsx-next:index:ContainerDefinitionEnvironmentFile":    "awsx:experimental/ecs:ContainerDefinitionEnvironmentFile", //nolint:lll
	"awsx-next:index:ContainerDefinitionHealthCheck":        "awsx:experimental/ecs:ContainerDefinitionHealthCheck",
	"awsx-next:index:ContainerDefinitionSecret":             "awsx:experimental/ecs:ContainerDefinitionSecret",
	"awsx-next:index:ContainerDefinitionSystemControl":      "awsx:experimental/ecs:ContainerDefinitionSystemControl",
	"awsx-next:index:ContainerDefinitionVolumeFrom":         "awsx:experimental/ecs:ContainerDefinitionVolumeFrom",
	"awsx-next:index:ContainerRestartPolicy":                "awsx:experimental/ecs:ContainerRestartPolicy",
	"awsx-next:index:Device":                                "awsx:experimental/ecs:Device",
	"awsx-next:index:DevicePermissions":                     "awsx:experimental/ecs:DevicePermissions",
	"awsx-next:index:FirelensConfiguration":                 "awsx:experimental/ecs:FirelensConfiguration",
	"awsx-next:index:FirelensConfigurationType":             "awsx:experimental/ecs:FirelensConfigurationType", //nolint:lll
	"awsx-next:index:HostEntry":                             "awsx:experimental/ecs:HostEntry",
	"awsx-next:index:KernelCapabilities":                    "awsx:experimental/ecs:KernelCapabilities",
	"awsx-next:index:KeyValuePair":                          "awsx:experimental/ecs:KeyValuePair",
	"awsx-next:index:LinuxParameters":                       "awsx:experimental/ecs:LinuxParameters",
	"awsx-next:index:LogConfiguration":                      "awsx:experimental/ecs:LogConfiguration",
	"awsx-next:index:LogConfigurationLogDriver":             "awsx:experimental/ecs:LogConfigurationLogDriver", //nolint:lll
	"awsx-next:index:MountPoint":                            "awsx:experimental/ecs:MountPoint",
	"awsx-next:index:PortMapping":                           "awsx:experimental/ecs:PortMapping",
	"awsx-next:index:RepositoryCredentials":                 "awsx:experimental/ecs:RepositoryCredentials",
	"awsx-next:index:ResourceRequirement":                   "awsx:experimental/ecs:ResourceRequirement",
	"awsx-next:index:ResourceRequirementType":               "awsx:experimental/ecs:ResourceRequirementType",
	"awsx-next:index:Tmpfs":                                 "awsx:experimental/ecs:Tmpfs",
	"awsx-next:index:FargateTaskDefinitionV2":               "awsx:experimental/ecs:FargateTaskDefinitionV2",
	"awsx-next:index:LogGroup":                              "awsx:experimental/cloudwatch:LogGroup",
	"awsx-next:index:AwsLogDriverMode":                      "awsx:experimental/ecs:AwsLogDriverMode",
	"awsx-next:index:ContainerDefinitionVersionConsistency": "awsx:experimental/ecs:ContainerDefinitionVersionConsistency", //nolint:lll
	"awsx-next:index:ContainerDependency":                   "awsx:experimental/ecs:ContainerDependency",
	"awsx-next:index:ContainerDependencyCondition":          "awsx:experimental/ecs:ContainerDependencyCondition",
	"awsx-next:index:ContainerPortRange":                    "awsx:experimental/ecs:ContainerPortRange",
	"awsx-next:index:CredentialSpec":                        "awsx:experimental/ecs:CredentialSpec",
	"awsx-next:index:CredentialSpecAuthenticationMode":      "awsx:experimental/ecs:CredentialSpecAuthenticationMode", //nolint:lll
	"awsx-next:index:EnvironmentFile":                       "awsx:experimental/ecs:EnvironmentFile",
	"awsx-next:index:FargateAwsLogsLogDriver":               "awsx:experimental/ecs:FargateAwsLogsLogDriver",
	"awsx-next:index:FargateContainerDefinitionOptions":     "awsx:experimental/ecs:FargateContainerDefinitionOptions", //nolint:lll
	"awsx-next:index:FargateKernelCapabilities":             "awsx:experimental/ecs:FargateKernelCapabilities",
	"awsx-next:index:FargateLinuxParameters":                "awsx:experimental/ecs:FargateLinuxParameters",
	"awsx-next:index:FargateLogDriver":                      "awsx:experimental/ecs:FargateLogDriver",
	"awsx-next:index:FargatePortMapping":                    "awsx:experimental/ecs:FargatePortMapping",
	"awsx-next:index:HealthCheck":                           "awsx:experimental/ecs:HealthCheck",
	"awsx-next:index:LogGroupReference":                     "awsx:experimental/cloudwatch:LogGroupReference",
	"awsx-next:index:PortMappingAppProtocol":                "awsx:experimental/ecs:PortMappingAppProtocol",
	"awsx-next:index:PortMappingProtocol":                   "awsx:experimental/ecs:PortMappingProtocol",
	"awsx-next:index:S3BucketCredentialSpec":                "awsx:experimental/ecs:S3BucketCredentialSpec",
	"awsx-next:index:Secret":                                "awsx:experimental/ecs:Secret",
	"awsx-next:index:SecretsManagerSecret":                  "awsx:experimental/ecs:SecretsManagerSecret",
	"awsx-next:index:SystemControl":                         "awsx:experimental/ecs:SystemControl",
	"awsx-next:index:Ulimit":                                "awsx:experimental/ecs:Ulimit",
	"awsx-next:index:UlimitName":                            "awsx:experimental/ecs:UlimitName",
	"awsx-next:index:VolumeFrom":                            "awsx:experimental/ecs:VolumeFrom",
	"awsx-next:index:RuntimePlatform":                       "awsx:experimental/ecs:RuntimePlatform",
	"awsx-next:index:OperatingSystemFamily":                 "awsx:experimental/ecs:OperatingSystemFamily",
	"awsx-next:index:CpuArchitecture":                       "awsx:experimental/ecs:CpuArchitecture",
}

func generateNextComponents(packageDir string) schema.PackageSpec {
	absolutePackageDir, err := filepath.Abs(packageDir)
	if err != nil {
		log.Fatalf("resolving AWSX package directory: %v", err)
	}

	repositoryRoot := filepath.Dir(absolutePackageDir)
	nextComponentsDir := filepath.Join(repositoryRoot, "awsx-next")
	cmd := exec.Command("pulumi", "package", "get-schema", nextComponentsDir)
	cmd.Dir = repositoryRoot
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	output, err := cmd.Output()
	if err != nil {
		log.Fatalf("generating AWSX next component schema: %v\n%s", err, stderr.String())
	}

	var inferred schema.PackageSpec
	if err := json.Unmarshal(output, &inferred); err != nil {
		log.Fatalf("parsing AWSX next component schema: %v", err)
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
