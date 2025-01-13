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
//go:build dotnet || all
// +build dotnet all

package examples

import (
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/require"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestAccTrailDotnet(t *testing.T) {
	test := getDotnetBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "cloudtrail", "dotnet"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccEcsDotnet(t *testing.T) {
	test := getDotnetBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "ecs", "dotnet"),
		})

	integration.ProgramTest(t, &test)
}

func getDotnetBaseOptions(t *testing.T) integration.ProgramTestOptions {
	t.Skip() // TODO remove

	if os.Getenv("PULUMI_LOCAL_NUGET") == "" {
		localNugetDir, err := filepath.Abs("../nuget")
		if err != nil {
			t.Fatalf("Failed to get absolute path to nuget directory, ensure you run `make build_dotnet install_dotnet_sdk` first: %v", err)
		}
		os.Setenv("PULUMI_LOCAL_NUGET", localNugetDir)
		sourceName := "pulumi-awsx"
		output, err := exec.Command("dotnet", "nuget", "list", "source").CombinedOutput()
		require.NoError(t, err, "failed to list nuget sources")
		if !strings.Contains(string(output), sourceName) {
			err := exec.Command("dotnet", "nuget", "add", "source", localNugetDir, "-n", sourceName).Run()
			require.NoError(t, err, "failed to add nuget source")
		}
	}

	region := getEnvRegion(t)
	base := getBaseOptions(t)
	dotnetBase := base.With(integration.ProgramTestOptions{
		Config: map[string]string{
			"aws:region": region,
		},
		Dependencies: []string{
			"Pulumi.Awsx",
		},
	})

	return dotnetBase
}
