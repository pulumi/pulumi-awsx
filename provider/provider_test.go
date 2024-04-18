// Copyright 2016-2024, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package provider

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/pulumi/providertest"
	"github.com/pulumi/providertest/optproviderupgrade"
	"github.com/pulumi/providertest/pulumitest"
	"github.com/pulumi/providertest/pulumitest/assertpreview"
	"github.com/pulumi/providertest/pulumitest/opttest"
	"github.com/stretchr/testify/require"
)

func TestReportUpgradeCoverage(t *testing.T) {
	providertest.ReportUpgradeCoverage(t)
}

func skipIfShort(t *testing.T) {
	if testing.Short() {
		t.Skipf("Skipping in testing.Short() mode, assuming this is a CI run without credentials")
	}
}

type testProviderUpgradeOptions struct {
	// baselineVersion string
	linkNodeSDK bool
	// installDeps     bool
	// setEnvRegion    bool
}

func testProviderUpgrade(t *testing.T, dir string, opts *testProviderUpgradeOptions) {
	skipIfShort(t)
	t.Parallel()
	t.Helper()
	var (
		providerName    string = "awsx"
		baselineVersion string = "1.0.6"

		// need to supply v5.42.0 version of AWS as a dependency yeah
	)
	// if opts != nil && opts.baselineVersion != "" {
	// 	baselineVersion = opts.baselineVersion
	// }
	cwd, err := os.Getwd()
	require.NoError(t, err)
	options := []opttest.Option{
		//opttest.SkipInstall(),
		opttest.DownloadProviderVersion(providerName, baselineVersion),
		opttest.LocalProviderPath(providerName, filepath.Join(cwd, "..", "bin")),
	}
	// if opts == nil || !opts.installDeps {
	// 	options = append(options, opttest.SkipInstall())
	// }
	if opts != nil && opts.linkNodeSDK {
		options = append(options, opttest.YarnLink("@pulumi/awsx"))
	}
	test := pulumitest.NewPulumiTest(t, dir, options...)
	// if opts != nil && opts.setEnvRegion {
	// 	// test.SetConfig("aws:region", "INVALID_REGION")
	// 	// test.SetConfig("aws:envRegion", getEnvRegion(t))
	// }
	result := providertest.PreviewProviderUpgrade(
		t, test, providerName, baselineVersion,
		optproviderupgrade.DisableAttach(),
		// optproviderupgrade.BaselineOpts(opttest.SkipInstall()),
	)
	assertpreview.HasNoReplacements(t, result)
}
