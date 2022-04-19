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
//go:build nodejs || all
// +build nodejs all

package examples

import (
	"path/filepath"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func TestAccEcsCapactiyProviderService(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "ecs", "capacity-provider-service-with-cluster-default-strategies"),
		})

	integration.ProgramTest(t, &test)
}

func getNodeJSBaseOptions(t *testing.T) integration.ProgramTestOptions {
	base := getBaseOptions(t)
	nodeBase := base.With(integration.ProgramTestOptions{
		Dependencies: []string{
			"@pulumi/awsx",
		},
	})

	return nodeBase
}
