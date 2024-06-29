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
	"github.com/stretchr/testify/assert"
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
			Dir:           filepath.Join(getCwd(t), "ecs", "nodejs"),
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

func TestLbWithSubnets(t *testing.T) {
	t.Skip("TODO[pulumi/pulumi-awsx#1246] flaky test but no way to increase custom timeout yet")
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "ts-lb-with-subnets"),
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

func TestNlbWithSecurityGroup(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "ts-nlb-with-security-group"),
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

func TestEcrDockerfile(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "ts-ecr-dockerfile"),
		})

	integration.ProgramTest(t, &test)
}

func TestDefaultVpc(t *testing.T) {
	t.Skip("https://github.com/pulumi/pulumi-awsx/issues/788")
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest:    false,
			Dir:              filepath.Join(getCwd(t), "ts-vpc-getDefaultVpc"),
			RetryFailedSteps: true, // Internet Gateway occasionally fails to delete on first attempt.
		})

	integration.ProgramTest(t, &test)
}

func TestVpcDefaultArgs(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest:    false,
			Dir:              filepath.Join(getCwd(t), "vpc", "nodejs", "default-args"),
			RetryFailedSteps: true, // Internet Gateway occasionally fails to delete on first attempt.
		})

	integration.ProgramTest(t, &test)
}

func TestVpcEipTagsPropagated(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest:    false,
			Dir:              filepath.Join(getCwd(t), "vpc", "nodejs", "export-eip-tags"),
			RetryFailedSteps: true, // Internet Gateway occasionally fails to delete on first attempt.
			Config:           map[string]string{"vpcAdditionalTag": "additionalTagVal"},
			ExtraRuntimeValidation: func(t *testing.T, stackInfo integration.RuntimeValidationStackInfo) {
				// Verify that the EIP has the tags we specified.
				eipTags := stackInfo.Outputs["eipTags"]
				assert.Equal(t, eipTags, map[string]interface{}{
					"Name":          "awsx-nodejs-export-eip-tags-1", // auto-applied
					"additionalTag": "additionalTagVal",
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestVpcWithServiceEndpoint(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest:    false,
			Dir:              filepath.Join(getCwd(t), "vpc", "nodejs", "vpc-with-service-endpoint"),
			RetryFailedSteps: true, // Internet Gateway occasionally fails to delete on first attempt.
		})

	integration.ProgramTest(t, &test)
}

func TestVpcSpecificSubnetSpecArgs(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest:    false,
			Dir:              filepath.Join(getCwd(t), "vpc", "nodejs", "specific-vpc-layout"),
			RetryFailedSteps: true, // Internet Gateway occasionally fails to delete on first attempt.
		})

	integration.ProgramTest(t, &test)
}

func TestVpcMultipleSimilarSubnetSpecArgs(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest:    false,
			Dir:              filepath.Join(getCwd(t), "vpc", "nodejs", "vpc-multiple-similar-subnet-types"),
			RetryFailedSteps: true, // Internet Gateway occasionally fails to delete on first attempt.
		})

	integration.ProgramTest(t, &test)
}

func TestHttpApi(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: filepath.Join(getCwd(t), "ts-http-api"),
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
