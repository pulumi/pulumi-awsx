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
//go:build nodejs || all
// +build nodejs all

package examples

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/require"
)

func TestNodeJSCompatibility(t *testing.T) {
	for _, nodeMajor := range []string{"22", "24", "26"} {
		t.Run("Node"+nodeMajor, func(t *testing.T) {
			node := miseExecutable(t, "node@"+nodeMajor, "node")
			path := filepath.Dir(node) + string(os.PathListSeparator) + os.Getenv("PATH")

			for _, testCase := range []struct {
				name                   string
				dir                    string
				runtimeTypeScriptMajor string
			}{
				{name: "TypeScript3.8", dir: "node-typescript-3.8"},
				{name: "TypeScript7", dir: "node-typescript-7", runtimeTypeScriptMajor: "6"},
			} {
				t.Run(testCase.name, func(t *testing.T) {
					test := integration.ProgramTestOptions{
						Dir:          filepath.Join(getCwd(t), "compatibility", testCase.dir),
						Dependencies: []string{"@pulumi/awsx"},
						Env:          []string{"PATH=" + path},
						NoParallel:   true,
						Quick:        true,
						RunBuild:     true,
						ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
							require.Equal(t, "10.0.0.0/24", stack.Outputs["cidr"])
							require.Equal(t, float64(3), stack.Outputs["modernAvailabilityZones"])
							require.Equal(t, float64(2), stack.Outputs["classicAvailabilityZones"])

							nodeVersion, ok := stack.Outputs["nodeVersion"].(string)
							require.True(t, ok)
							require.True(t, strings.HasPrefix(nodeVersion, "v"+nodeMajor+"."),
								"expected Node %s, got %s", nodeMajor, nodeVersion)

							if testCase.runtimeTypeScriptMajor != "" {
								typescriptVersion, ok := stack.Outputs["typescriptVersion"].(string)
								require.True(t, ok)
								require.True(t, strings.HasPrefix(typescriptVersion, testCase.runtimeTypeScriptMajor+"."),
									"expected TypeScript %s, got %s", testCase.runtimeTypeScriptMajor, typescriptVersion)
							}
						},
					}

					integration.ProgramTest(t, &test)
				})
			}
		})
	}

	t.Run("Bun1.3", func(t *testing.T) {
		bun := miseExecutable(t, "bun@1.3", "bun")
		bunInstall := t.TempDir()
		registerBunLink(t, bun, bunInstall)
		path := filepath.Dir(bun) + string(os.PathListSeparator) + os.Getenv("PATH")

		test := integration.ProgramTestOptions{
			Dir:          filepath.Join(getCwd(t), "compatibility", "bun"),
			Dependencies: []string{"@pulumi/awsx"},
			BunBin:       bun,
			Env:          []string{"BUN_INSTALL=" + bunInstall, "PATH=" + path},
			NoParallel:   true,
			Quick:        true,
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				require.Equal(t, "10.0.0.0/24", stack.Outputs["cidr"])
				bunVersion, ok := stack.Outputs["bunVersion"].(string)
				require.True(t, ok)
				require.True(t, strings.HasPrefix(bunVersion, "1.3."), "expected Bun 1.3, got %s", bunVersion)
			},
		}

		integration.ProgramTest(t, &test)
	})
}

func miseExecutable(t *testing.T, tool, executable string) string {
	t.Helper()
	command := exec.Command("mise", "x", tool, "--", executable, "-e", "console.log(process.execPath)")
	output, err := command.Output()
	if exitError, ok := err.(*exec.ExitError); ok {
		t.Fatalf("find %s executable with Mise: %v\n%s", tool, err, exitError.Stderr)
	}
	require.NoError(t, err)

	path := strings.TrimSpace(string(output))
	require.FileExists(t, path)
	return path
}

func registerBunLink(t *testing.T, bun, bunInstall string) {
	t.Helper()
	command := exec.Command(bun, "link")
	command.Dir = filepath.Join(getCwd(t), "..", "sdk", "nodejs", "bin")
	command.Env = append(os.Environ(), "BUN_INSTALL="+bunInstall)
	output, err := command.CombinedOutput()
	require.NoError(t, err, fmt.Sprintf("register the built AWSX SDK with Bun:\n%s", output))
}
