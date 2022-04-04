// Copyright 2016-2018, Pulumi Corporation.
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

package example

import (
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func TestAccCluster(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "./cluster"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccCapacityProviderServiceWithClusterDefaultStrategies(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "./ecs/capacity-provider-service-with-cluster-default-strategies"),
		})

	integration.ProgramTest(t, &test)
}

func TestEcsxAccCapacityProviderServiceWithClusterDefaultStrategies(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "./ecsx/capacity-provider-service-with-cluster-default-strategies"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccCapacityProviderServiceEC2CustomStrategy(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "./ecs/capacity-provider-service-ec2-custom-strategy"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccTaskDefinitionWithProxyConfiguration(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "./ecs/task-definitions-with-proxy-config"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccFargateServiceWithFirelensLogging(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "./ecs/fargate-service-with-firelens"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccDashboards(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "./dashboards"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccEcr(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "./ecr"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccMetrics(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "./metrics"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccVpcIgnoreSubnetChanges(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "./vpcIgnoreSubnetChanges"),
			StackName: addRandomSuffix("vpcIgnoreSubnetChanges"),
			EditDirs: []integration.EditDir{
				{
					Dir:             "step2",
					Additive:        true,
					ExpectNoChanges: true,
				},
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccVpc(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "./vpc"),
			StackName: addRandomSuffix("vpc"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccNlb_fargateShort(t *testing.T) {
	t.Skip("Temporarily skipping due to https://github.com/pulumi/pulumi-awsx/issues/686")
	envRegion := getEnvRegion(t)
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:                    path.Join(getCwd(t), "./nlb/fargateShort"),
			StackName:              addRandomSuffix("fargate"),
			ExtraRuntimeValidation: containersRuntimeValidator(envRegion, true /*isFargate*/, true /*short*/),
			EditDirs: []integration.EditDir{
				{
					Dir:             "step2",
					Additive:        true,
					ExpectNoChanges: true,
				},
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccNlb_fargateShortInlineListener(t *testing.T) {
	t.Skip("Temporarily skipping due to https://github.com/pulumi/pulumi-awsx/issues/686")
	envRegion := getEnvRegion(t)
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:                    path.Join(getCwd(t), "./nlb/fargateShortInlineListener"),
			StackName:              addRandomSuffix("fargate"),
			ExtraRuntimeValidation: containersRuntimeValidator(envRegion, true /*isFargate*/, true /*short*/),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAlb_ec2(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "./alb/ec2"),
			StackName: addRandomSuffix("ec2"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccApi(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "./api"),
			ExtraRuntimeValidation: validateAPITests([]apiTest{
				{
					urlStackOutputKey: "url",
					urlPath:           "/a",
					requiredParameters: &requiredParameters{
						queryParameters:             []string{"key"},
						expectedBodyWithoutQueryStr: `{"message": "Missing required request parameters: [key]"}`,
					},
					requiredAuth: &requiredAuth{
						queryParameters: map[string]string{
							"auth": "password",
						},
					},
					expectedBody: "<h1>Hello world!</h1>",
				},
				// {
				// 	urlStackOutputKey: "url",
				// 	urlPath:           "/b",
				// 	requiredAuth: &requiredAuth{
				// 		queryParameters: map[string]string{
				// 			"auth": "password",
				// 		},
				// 	},
				// 	requiredAPIKey: &requiredAPIKey{
				// 		stackOutput: "apiKeyValue",
				// 	},
				// 	expectedBody: "Hello, world!",
				// },
				// {
				// 	urlStackOutputKey: "url",
				// 	urlPath:           "/www/file1.txt",
				// 	requiredParameters: &requiredParameters{
				// 		queryParameters:             []string{"key"},
				// 		expectedBodyWithoutQueryStr: `{"message": "Missing required request parameters: [key]"}`,
				// 	},
				// 	requiredAuth: &requiredAuth{
				// 		headers: map[string]string{
				// 			"Authorization": "Allow",
				// 		},
				// 	},
				// 	requiredAPIKey: &requiredAPIKey{
				// 		stackOutput: "apiKeyValue",
				// 	},
				// 	expectedBody: "contents1\n",
				// },
				// {
				// 	urlStackOutputKey: "url",
				// 	urlPath:           "/integration",
				// 	requiredParameters: &requiredParameters{
				// 		queryParameters:             []string{"key"},
				// 		expectedBodyWithoutQueryStr: `{"message": "Missing required request parameters: [key]"}`,
				// 	},
				// 	requiredAuth: &requiredAuth{
				// 		queryParameters: map[string]string{
				// 			"auth": "password",
				// 		},
				// 	},
				// 	requiredAPIKey: &requiredAPIKey{
				// 		stackOutput: "apiKeyValue",
				// 	},
				// 	skipBodyValidation: true,
				// },
				{
					urlStackOutputKey: "authorizerUrl",
					urlPath:           "/www_old/file1.txt",
					requiredAuth: &requiredAuth{
						queryParameters: map[string]string{
							"auth": "Allow",
						},
						headers: map[string]string{
							"secret": "test",
						},
					},
					expectedBody: "contents1\n",
				},
				{
					urlStackOutputKey: "cognitoUrl",
					urlPath:           "/www_old/sub/file1.txt",
					requiredToken: &requiredToken{
						header:       "Authorization",
						getAuthToken: getCognitoUserToken,
					},
					expectedBody: "othercontents1\n",
				},
			}),
			EditDirs: []integration.EditDir{{
				Dir:      "./api/step2",
				Additive: true,
				ExtraRuntimeValidation: validateAPITests([]apiTest{
					{
						urlStackOutputKey: "url",
						urlPath:           "/b",
						expectedBody:      "<h1>Hello world!</h1>",
					},
				}),
			}},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAlb_fargate(t *testing.T) {
	skipIfShort(t)
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "./alb/fargate"),
			StackName: addRandomSuffix("fargate"),
			EditDirs: []integration.EditDir{
				{
					Dir:             "step2",
					Additive:        true,
					ExpectNoChanges: true,
				},
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAlb_fargateInlineListener(t *testing.T) {
	skipIfShort(t)
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "./alb/fargateInlineListener"),
			StackName: addRandomSuffix("fargate"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAlb_ec2Instance(t *testing.T) {
	skipIfShort(t)
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "./alb/ec2Instance"),
			StackName: addRandomSuffix("ec2Instance"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAlb_lambdaTarget(t *testing.T) {
	skipIfShort(t)
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "./alb/lambdaTarget"),
			StackName: addRandomSuffix("lambdaTarget"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccNlb_fargate(t *testing.T) {
	t.Skip("Temporarily skipping due to https://github.com/pulumi/pulumi-awsx/issues/686")
	skipIfShort(t)
	envRegion := getEnvRegion(t)
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "./nlb/fargate"),
			StackName: addRandomSuffix("fargate"),
			Config: map[string]string{
				"aws:region":               "INVALID_REGION",
				"aws:envRegion":            envRegion,
				"containers:redisPassword": "SECRETPASSWORD",
			},
			PreviewCommandlineFlags: []string{
				"--diff",
			},
			ExtraRuntimeValidation: containersRuntimeValidator(envRegion, true /*isFargate*/, false /*short*/),
		})

	integration.ProgramTest(t, &test)
}
