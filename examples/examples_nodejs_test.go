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
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ecr"
	"github.com/pulumi/providertest/pulumitest"
	"github.com/pulumi/providertest/pulumitest/optnewstack"
	"github.com/pulumi/providertest/pulumitest/opttest"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

func TestRegress1112(t *testing.T) {
	t.Skip() // TODO remove

	t.Setenv("AWS_REGION", "")
	os.Unsetenv("AWS_REGION")
	test := integration.ProgramTestOptions{
		Quick:       true,
		SkipRefresh: true,
	}.With(integration.ProgramTestOptions{
		Dependencies: []string{
			"@pulumi/awsx",
		},
		NoParallel:    true, // cannot use call t.Parallel after t.Setenv
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

func TestVpcIpam(t *testing.T) {
	t.Skip("TODO[pulumi/pulumi-awsx#1382] skipped until test IPAM sharing is figured out")
	t.Run("vpc-ipam-ipv4-auto-cidrblock", func(t *testing.T) {
		dir := filepath.Join(getCwd(t), "vpc", "nodejs", "vpc-ipam-ipv4-auto-cidrblock")
		validate := func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			regionName := stack.Outputs["regionName"].(string)
			assert.Equal(t, []interface{}{
				map[string]interface{}{
					"cidrMask": float64(27),
					"type":     "Private",
				},
				map[string]interface{}{
					"cidrMask": float64(28),
					"type":     "Public",
				},
			}, stack.Outputs["subnetLayout"])
			expectedSubnets := []interface{}{
				map[string]interface{}{
					"availabilityZone": fmt.Sprintf("%sa", regionName),
					"cidrBlock":        "172.20.0.32/28",
				},
				map[string]interface{}{
					"availabilityZone": fmt.Sprintf("%sa", regionName),
					"cidrBlock":        "172.20.0.0/27",
				},
				map[string]interface{}{
					"availabilityZone": fmt.Sprintf("%sb", regionName),
					"cidrBlock":        "172.20.0.96/28",
				},
				map[string]interface{}{
					"availabilityZone": fmt.Sprintf("%sb", regionName),
					"cidrBlock":        "172.20.0.64/27",
				},
				map[string]interface{}{
					"availabilityZone": fmt.Sprintf("%sc", regionName),
					"cidrBlock":        "172.20.0.160/28",
				},
				map[string]interface{}{
					"availabilityZone": fmt.Sprintf("%sc", regionName),
					"cidrBlock":        "172.20.0.128/27",
				},
			}
			actualSubnets := stack.Outputs["subnets"].([]any)
			assert.Equal(t, len(expectedSubnets), len(actualSubnets))
			for _, expsub := range expectedSubnets {
				assert.Contains(t, actualSubnets, expsub)
			}
		}
		test := getNodeJSBaseOptions(t).
			With(integration.ProgramTestOptions{
				Dir:                    dir,
				RetryFailedSteps:       true,
				NoParallel:             true, // test account has N=1 limit for IPAM
				Quick:                  true,
				ExtraRuntimeValidation: validate,
			})

		integration.ProgramTest(t, &test)
	})
	t.Run("vpc-ipam-ipv4-auto-cidrblock-with-specs", func(t *testing.T) {
		dir := filepath.Join(getCwd(t), "vpc", "nodejs", "vpc-ipam-ipv4-auto-cidrblock-with-specs")
		validate := func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
			regionName := stack.Outputs["regionName"].(string)
			assert.Equal(t, []interface{}{
				map[string]interface{}{
					"cidrMask": float64(25),
					"size":     float64(128),
					"name":     "private",
					"type":     "Private",
				},
				map[string]interface{}{
					"cidrMask": float64(27),
					"size":     float64(32),
					"name":     "public",
					"type":     "Public",
				},
			}, stack.Outputs["subnetLayout"])
			expectedSubnets := []interface{}{
				map[string]interface{}{
					"availabilityZone": fmt.Sprintf("%sa", regionName),
					"cidrBlock":        "172.20.0.128/27",
				},
				map[string]interface{}{
					"availabilityZone": fmt.Sprintf("%sa", regionName),
					"cidrBlock":        "172.20.0.0/25",
				},
				map[string]interface{}{
					"availabilityZone": fmt.Sprintf("%sb", regionName),
					"cidrBlock":        "172.20.1.128/27",
				},
				map[string]interface{}{
					"availabilityZone": fmt.Sprintf("%sb", regionName),
					"cidrBlock":        "172.20.1.0/25",
				},
				map[string]interface{}{
					"availabilityZone": fmt.Sprintf("%sc", regionName),
					"cidrBlock":        "172.20.2.128/27",
				},
				map[string]interface{}{
					"availabilityZone": fmt.Sprintf("%sc", regionName),
					"cidrBlock":        "172.20.2.0/25",
				},
			}
			actualSubnets := stack.Outputs["subnets"].([]any)
			assert.Equal(t, len(expectedSubnets), len(actualSubnets))
			for _, expsub := range expectedSubnets {
				assert.Contains(t, actualSubnets, expsub)
			}
		}
		test := getNodeJSBaseOptions(t).
			With(integration.ProgramTestOptions{
				Dir:                    dir,
				RetryFailedSteps:       true,
				NoParallel:             true, // test account has N=1 limit for IPAM
				Quick:                  true,
				ExtraRuntimeValidation: validate,
			})
		integration.ProgramTest(t, &test)
	})
}

func TestVpc(t *testing.T) {
	test := getNodeJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest:    false,
			Dir:              filepath.Join(getCwd(t), "vpc", "nodejs", "vpc-multiple-similar-subnet-types"),
			RetryFailedSteps: true, // Internet Gateway occasionally fails to delete on first attempt.
		})

	integration.ProgramTest(t, &test)
}

func TestAccEcsParallel(t *testing.T) {
	t.Skip() // TODO remove

	maxDuration(15*time.Minute, t, func(t *testing.T) {
		test := getNodeJSBaseOptions(t).
			With(integration.ProgramTestOptions{
				RunUpdateTest: false,
				Dir:           filepath.Join(getCwd(t), "ecs-parallel"),
				EditDirs: []integration.EditDir{
					{
						Dir:      filepath.Join(getCwd(t), "ecs-parallel", "step2"),
						Additive: true,
					},
				},
			})

		integration.ProgramTest(t, &test)
	})
}

func TestDockerUpgrade(t *testing.T) {
	t.Skip() // TODO remove

	providerName := "awsx"
	baselineVersion := "2.19.0"
	t.Parallel()
	cwd := getCwd(t)
	options := []opttest.Option{
		opttest.DownloadProviderVersion(providerName, baselineVersion),
		opttest.NewStackOptions(optnewstack.DisableAutoDestroy()),
	}
	pt := pulumitest.NewPulumiTest(t, filepath.Join(cwd, "ts-ecr-simple"), options...)

	t.Logf("Running `pulumi up` with v%s of the awsx provider", baselineVersion)
	result := pt.Up(t)
	require.Contains(t, result.Outputs, "image", "image should be in the outputs")
	originalImageUri := result.Outputs["image"].Value.(string)
	require.NotEmpty(t, originalImageUri, "imageUri should not be empty")

	state := pt.ExportStack(t)
	pt = pt.CopyToTempDir(t,
		opttest.Defaults(),
		opttest.NewStackOptions(optnewstack.EnableAutoDestroy()),
		opttest.LocalProviderPath("awsx", filepath.Join(cwd, "..", "bin")),
		opttest.YarnLink("@pulumi/awsx"),
	)
	pt.ImportStack(t, state)

	t.Log("Running `pulumi up` with the latest version of the awsx provider")
	result = pt.Up(t)
	require.Contains(t, result.Outputs, "image", "image should be in the outputs")
	updatedImageUri := result.Outputs["image"].Value.(string)
	require.NotEmpty(t, updatedImageUri, "imageUri should not be empty")

	originalImage := strings.Split(originalImageUri, "@sha256:")[0]
	updatedImage := strings.Split(updatedImageUri, "@sha256:")[0]
	require.Equal(t, originalImage, updatedImage, "original and updated image should be the same")

	require.Contains(t, result.Outputs, "repositoryName", "repositoryName should be in the outputs")
	repoName := result.Outputs["repositoryName"].Value.(string)
	require.NotEmpty(t, repoName, "repositoryName should not be empty")

	t.Logf("Verifying images in ECR repository %q", repoName)
	client := createEcrClient(t)
	describeImagesInput := &ecr.DescribeImagesInput{
		RepositoryName: aws.String(repoName),
	}

	var describeImagesOutput *ecr.DescribeImagesOutput
	var err error
	for retries := 0; retries < 10; retries++ {
		describeImagesOutput, err = client.DescribeImages(context.TODO(), describeImagesInput)
		require.NoError(t, err, "failed to describe images")
		if len(describeImagesOutput.ImageDetails) >= 2 {
			break
		}
		time.Sleep(5 * time.Second)
	}
	require.NotEmpty(t, describeImagesOutput.ImageDetails, "image details should not be empty")
	require.Len(t, describeImagesOutput.ImageDetails, 2, "should have 2 images")

	// Extract digests from URIs
	getDigest := func(uri string) string {
		parts := strings.Split(uri, "@sha256:")
		require.Len(t, parts, 2, "URI should contain sha256 digest")
		return parts[1]
	}
	originalDigest := getDigest(originalImageUri)
	updatedDigest := getDigest(updatedImageUri)

	// Find matching digests in ECR response
	foundOriginal := false
	foundUpdated := false
	for _, img := range describeImagesOutput.ImageDetails {
		digest := strings.TrimPrefix(*img.ImageDigest, "sha256:")
		if digest == originalDigest {
			foundOriginal = true
		}
		if digest == updatedDigest {
			foundUpdated = true
		}
	}

	assert.Truef(t, foundOriginal, "original image digest %q should exist in ECR", originalDigest)
	assert.Truef(t, foundUpdated, "updated image digest %q should exist in ECR", updatedDigest)
}

func getNodeJSBaseOptions(t *testing.T) integration.ProgramTestOptions {
	t.Skip() // TODO remove

	base := getBaseOptions(t)
	nodeBase := base.With(integration.ProgramTestOptions{
		Dependencies: []string{
			"@pulumi/awsx",
		},
	})

	return nodeBase
}
