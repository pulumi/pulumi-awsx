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
	"strings"

	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
)

func generateNextComponents(packageDir string) schema.PackageSpec {
	absolutePackageDir, err := filepath.Abs(packageDir)
	if err != nil {
		log.Fatalf("resolving AWSX package directory: %v", err)
	}

	repositoryRoot := filepath.Dir(absolutePackageDir)
	cmd := exec.Command("pulumi", "package", "get-schema", "./awsx-next")
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

	return normalizeNextComponents(inferred)
}

// Publish Lambda and ECS components under their respective AWSX modules.
// External provider references are left intact.
func normalizeNextComponents(inferred schema.PackageSpec) schema.PackageSpec {
	const oldPrefix = "awsx-next:index:"
	const ecsPrefix = "awsx:ecs:"
	// Lambda resources and their supporting types all start with WebFunction.
	const oldLambdaPrefix = oldPrefix + "WebFunction"
	const lambdaPrefix = "awsx:lambda:WebFunction"
	renameToken := func(token string) string {
		if strings.HasPrefix(token, oldLambdaPrefix) {
			return lambdaPrefix + strings.TrimPrefix(token, oldLambdaPrefix)
		}
		return strings.Replace(token, oldPrefix, ecsPrefix, 1)
	}
	renameRefs := func(properties map[string]schema.PropertySpec) map[string]schema.PropertySpec {
		for _, section := range []string{"#/types/", "#/resources/"} {
			properties = renamePropertiesRefs(properties, section+oldLambdaPrefix, section+lambdaPrefix)
			properties = renamePropertiesRefs(properties, section+oldPrefix, section+ecsPrefix)
		}
		return properties
	}

	result := schema.PackageSpec{
		Resources: map[string]schema.ResourceSpec{},
		Types:     map[string]schema.ComplexTypeSpec{},
	}
	for token, resource := range inferred.Resources {
		resource.Properties = renameRefs(resource.Properties)
		resource.InputProperties = renameRefs(resource.InputProperties)
		result.Resources[renameToken(token)] = resource
	}
	for token, typ := range inferred.Types {
		typ.Properties = renameRefs(typ.Properties)
		result.Types[renameToken(token)] = typ
	}
	return result
}
