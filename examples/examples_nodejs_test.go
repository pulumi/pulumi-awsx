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

func TestAccTrailTs(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "cloudtrail", "nodejs"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccEcsCapacityProviderService(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "ecs", "capacity-provider-service-with-cluster-default-strategies"),
		})

	integration.ProgramTest(t, &test)
}

func TestLbSimple(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "ts-lb-simple"),
		})

	integration.ProgramTest(t, &test)
}

func TestLbAttachEc2(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "ts-lb-attach-ec2"),
		})

	integration.ProgramTest(t, &test)
}

func TestLbAttachLambda(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "ts-lb-attach-lambda"),
		})

	integration.ProgramTest(t, &test)
}

func TestNlbSimple(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "ts-nlb-simple"),
		})

	integration.ProgramTest(t, &test)
}

func TestEcrSimple(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "ts-ecr-simple"),
		})

	integration.ProgramTest(t, &test)
}

func TestDefaultVpc(t *testing.T) {
	t.Skip("https://github.com/pulumi/pulumi-awsx/issues/784")
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "ts-vpc-getDefaultVpc"),
		})

	integration.ProgramTest(t, &test)
}

func TestVpcDefaultArgs(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "vpc", "nodejs", "default-args"),
		})

	integration.ProgramTest(t, &test)
}

func TestVpcSpecificSubnetSpecArgs(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "vpc", "nodejs", "specific-vpc-layout"),
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
