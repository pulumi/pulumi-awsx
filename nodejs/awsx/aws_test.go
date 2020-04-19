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

package examples

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/pulumi/pulumi/pkg/v2/operations"
	"github.com/pulumi/pulumi/pkg/v2/resource/stack"
	"github.com/pulumi/pulumi/pkg/v2/testing/integration"
	"github.com/pulumi/pulumi/sdk/v2/go/common/resource"
	"github.com/pulumi/pulumi/sdk/v2/go/common/resource/config"
	"github.com/pulumi/pulumi/sdk/v2/go/common/util/contract"
)

func TestAccCluster(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "../examples/cluster"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccDashboards(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "../examples/dashboards"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccEcr(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "../examples/ecr"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccMetrics1x(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:      path.Join(getCwd(t), "../examples/metrics/1.0"),
			RunBuild: true,
		})

	integration.ProgramTest(t, &test)
}

func TestAccMetrics2x(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:      path.Join(getCwd(t), "../examples/metrics/2.0"),
			RunBuild: true,
		})

	integration.ProgramTest(t, &test)
}

func TestAccMetricsMixedVersions(t *testing.T) {
	// When using 1.x and 2.x together, we should expect to see a failure in type assignment.
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "../examples/metrics/mixed"),
			// It doesn't actually fail unless we RunBuild (e.g. `yarn build` which invokes tsc).
			// Sadly, "ExpectFailure" doesn't actually do the right thing w.r.t. RunBuild.
			RunBuild: true,
			// So, we'll take over execution of the lifecycle instead below.
		})

	pt := integration.ProgramTestManualLifeCycle(t, &test)
	defer func() {
		pt.TestLifeCycleDestroy()
		pt.TestCleanUp()
	}()

	assert.Error(t, pt.TestLifeCyclePrepare())
}

func TestAccVpcIgnoreSubnetChanges(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "../examples/vpcIgnoreSubnetChanges"),
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
			Dir:       path.Join(getCwd(t), "../examples/vpc"),
			StackName: addRandomSuffix("vpc"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccNlb_fargateShort(t *testing.T) {
	envRegion := getEnvRegion(t)
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:                    path.Join(getCwd(t), "../examples/nlb/fargateShort"),
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
	envRegion := getEnvRegion(t)
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:                    path.Join(getCwd(t), "../examples/nlb/fargateShortInlineListener"),
			StackName:              addRandomSuffix("fargate"),
			ExtraRuntimeValidation: containersRuntimeValidator(envRegion, true /*isFargate*/, true /*short*/),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAlb_ec2(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "../examples/alb/ec2"),
			StackName: addRandomSuffix("ec2"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccApi(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "../examples/api"),
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
				Dir:      "../examples/api/step2",
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
			Dir:       path.Join(getCwd(t), "../examples/alb/fargate"),
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
			Dir:       path.Join(getCwd(t), "../examples/alb/fargateInlineListener"),
			StackName: addRandomSuffix("fargate"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAlb_ec2Instance(t *testing.T) {
	skipIfShort(t)
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "../examples/alb/ec2Instance"),
			StackName: addRandomSuffix("ec2Instance"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccAlb_lambdaTarget(t *testing.T) {
	skipIfShort(t)
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "../examples/alb/lambdaTarget"),
			StackName: addRandomSuffix("lambdaTarget"),
		})

	integration.ProgramTest(t, &test)
}

func TestAccNlb_fargate(t *testing.T) {
	skipIfShort(t)
	envRegion := getEnvRegion(t)
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:       path.Join(getCwd(t), "../examples/nlb/fargate"),
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

func skipIfShort(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping long-running test in short mode")
	}
}

func getEnvRegion(t *testing.T) string {
	envRegion := os.Getenv("AWS_REGION")
	if envRegion == "" {
		t.Skipf("Skipping test due to missing AWS_REGION environment variable")
	}
	fmt.Printf("AWS Region: %v\n", envRegion)

	return envRegion
}

func getCwd(t *testing.T) string {
	cwd, err := os.Getwd()
	if err != nil {
		t.FailNow()
	}

	return cwd
}

func getBaseOptions(t *testing.T) integration.ProgramTestOptions {
	envRegion := getEnvRegion(t)
	baseJS := integration.ProgramTestOptions{
		Config: map[string]string{
			"aws:envRegion": envRegion,
		},
		Dependencies: []string{
			"@pulumi/awsx",
		},
		Env: []string{
			"NODE_PRESERVE_SYMLINKS=1",
		},
		Quick:                true,
		SkipRefresh:          true,
		ExpectRefreshChanges: true,
		ReportStats:          integration.NewS3Reporter("us-west-2", "eng.pulumi.com", "testreports"),
	}

	return baseJS
}

func getDefaultProviderOptions(t *testing.T) integration.ProgramTestOptions {
	baseJS := integration.ProgramTestOptions{
		Dependencies: []string{
			"@pulumi/awsx",
		},
		Quick:       true,
		SkipRefresh: true,
		// TODO[pulumi/pulumi#1900]: This should be the default value, every test we have causes some sort of
		// change during a `pulumi refresh` for reasons outside our control.
		ExpectRefreshChanges: true,
		ReportStats:          integration.NewS3Reporter("us-west-2", "eng.pulumi.com", "testreports"),
	}

	return baseJS
}

func getAllMessageText(logs []operations.LogEntry) string {
	allMessageText := ""
	for _, logEntry := range logs {
		allMessageText = allMessageText + logEntry.Message + "\n"
	}
	return allMessageText
}

func getLogs(t *testing.T, region string, stackInfo integration.RuntimeValidationStackInfo,
	query operations.LogQuery) *[]operations.LogEntry {

	var states []*resource.State
	for _, res := range stackInfo.Deployment.Resources {
		state, err := stack.DeserializeResource(res, config.NewPanicCrypter())
		if !assert.NoError(t, err) {
			return nil
		}
		states = append(states, state)
	}

	tree := operations.NewResourceTree(states)
	if !assert.NotNil(t, tree) {
		return nil
	}
	cfg := map[config.Key]string{
		config.MustMakeKey("aws", "region"): region,
	}
	ops := tree.OperationsProvider(cfg)

	// Validate logs from example
	logs, err := ops.GetLogs(query)
	if !assert.NoError(t, err) {
		return nil
	}
	return logs
}

func containersRuntimeValidator(region string, isFargate bool, short bool) func(t *testing.T, stackInfo integration.RuntimeValidationStackInfo) {
	return func(t *testing.T, stackInfo integration.RuntimeValidationStackInfo) {
		baseURL, ok := stackInfo.Outputs["frontendURL"].(string)

		assert.True(t, ok, "expected a `frontendURL` output property of type string")

		// Validate the GET /test endpoint
		{
			resp := GetURL(t, baseURL+"test", 200)
			contentType := resp.Header.Get("Content-Type")
			assert.Equal(t, "application/json", contentType)
			bytes, err := ioutil.ReadAll(resp.Body)
			assert.NoError(t, err)
			var endpoints map[string]map[string]interface{}
			err = json.Unmarshal(bytes, &endpoints)
			assert.NoError(t, err)
			t.Logf("GET %v [%v/%v]: %v - %v", baseURL+"test", resp.StatusCode, contentType, string(bytes), endpoints)
		}

		// Validate the GET /nginx endpoint
		{
			// https://github.com/pulumi/pulumi-cloud/issues/666
			// We are only making the proxy route in fargate testing.
			if isFargate {
				resp := GetURL(t, baseURL+"nginx", 200)
				contentType := resp.Header.Get("Content-Type")
				assert.Equal(t, "text/html", contentType)
				bytes, err := ioutil.ReadAll(resp.Body)
				assert.NoError(t, err)
				t.Logf("GET %v [%v/%v]: %v", baseURL+"nginx", resp.StatusCode, contentType, string(bytes))
			}
			{
				resp := GetURL(t, baseURL+"nginx/doesnotexist", 404)
				contentType := resp.Header.Get("Content-Type")
				assert.Equal(t, "text/html", contentType)
				bytes, err := ioutil.ReadAll(resp.Body)
				assert.NoError(t, err)
				t.Logf("GET %v [%v/%v]: %v", baseURL+"nginx/doesnotexist", resp.StatusCode, contentType, string(bytes))
			}
		}

		if !short {
			// Validate the GET / endpoint
			{
				// Call the endpoint twice so that things have time to warm up.
				http.Get(baseURL)
				resp := GetURL(t, baseURL, 200)
				contentType := resp.Header.Get("Content-Type")
				assert.Equal(t, "application/json", contentType)
				bytes, err := ioutil.ReadAll(resp.Body)
				assert.NoError(t, err)
				t.Logf("GET %v [%v/%v]: %v", baseURL, resp.StatusCode, contentType, string(bytes))
			}

			// Validate the GET /run endpoint
			{
				resp := GetURL(t, baseURL+"run", 200)
				contentType := resp.Header.Get("Content-Type")
				assert.Equal(t, "application/json", contentType)
				bytes, err := ioutil.ReadAll(resp.Body)
				assert.NoError(t, err)
				var data map[string]interface{}
				err = json.Unmarshal(bytes, &data)
				assert.NoError(t, err)
				success, ok := data["success"]
				assert.Equal(t, true, ok)
				assert.Equal(t, true, success)
				t.Logf("GET %v [%v/%v]: %v - %v", baseURL+"run", resp.StatusCode, contentType, string(bytes), data)
			}

			// Validate the GET /custom endpoint
			{
				resp := GetURL(t, baseURL+"custom", 200)
				contentType := resp.Header.Get("Content-Type")
				assert.Equal(t, "application/json", contentType)
				bytes, err := ioutil.ReadAll(resp.Body)
				assert.NoError(t, err)
				assert.True(t, strings.HasPrefix(string(bytes), "Hello, world"))
				t.Logf("GET %v [%v/%v]: %v", baseURL+"custom", resp.StatusCode, contentType, string(bytes))
			}

			// Wait for five minutes before getting logs.
			time.Sleep(5 * time.Minute)

			// Validate logs from example
			logs := getLogs(t, region, stackInfo, operations.LogQuery{})
			if !assert.NotNil(t, logs, "expected logs to be produced") {
				return
			}
			if !assert.True(t, len(*logs) > 10) {
				return
			}
			logsByResource := map[string][]operations.LogEntry{}
			for _, l := range *logs {
				cur, _ := logsByResource[l.ID]
				logsByResource[l.ID] = append(cur, l)
			}

			// for id, logs := range logsByResource {
			// 	t.Logf("LogId (%v): %v\n%v", len(logs), id, getAllMessageText(logs))
			// }

			// NGINX logs
			//  {examples-nginx 1512871243078 18.217.247.198 - - [10/Dec/2017:02:00:43 +0000] "GET / HTTP/1.1" ...

			// https://github.com/pulumi/pulumi-cloud/issues/666
			// We are only making the proxy route in fargate testing.
			if isFargate {
				nginxLogs, exists := getLogsWithPrefix(logsByResource, "nginx-")
				if !assert.True(t, exists) {
					return
				}
				if !assert.True(t, len(nginxLogs) > 0) {
					return
				}
				assert.Contains(t, getAllMessageText(nginxLogs), "GET /")
			}

			// Hello World container Task logs
			//  {examples-hello-world 1512871250458 Hello from Docker!}
			{
				helloWorldLogs, exists := getLogsWithPrefix(logsByResource, "hello-world-")
				if !assert.True(t, exists) {
					return
				}
				if !assert.True(t, len(helloWorldLogs) > 3) {
					return
				}
				assert.Contains(t, getAllMessageText(helloWorldLogs), "Hello from Docker!")
			}

			// Cache Redis container  logs
			//  {examples-mycache 1512870479441 1:C 10 Dec 01:47:59.440 # oO0OoO0OoO0Oo Redis is starting ...
			{
				redisLogs, exists := getLogsWithPrefix(logsByResource, "mycache-")
				if !assert.True(t, exists) {
					return
				}
				if !assert.True(t, len(redisLogs) > 5) {
					return
				}
				assert.Contains(t, getAllMessageText(redisLogs), "Redis is starting")
			}
		}
	}
}

func GetURL(t *testing.T, url string, statusCode int) *http.Response {
	var resp *http.Response
	var err error
	for i := 0; i <= 10; i++ {
		resp, err = http.Get(url)
		if err == nil && resp.StatusCode == statusCode {
			return resp
		}

		if err != nil {
			t.Logf("Got error trying to get %v. %v", url, err.Error())
		}

		if resp != nil && resp.StatusCode != statusCode {
			t.Logf("Expected to get status code %v for %v. Got: %v", statusCode, url, resp.StatusCode)
		}

		time.Sleep(1 * time.Minute)
	}

	if !assert.NoError(t, err, "expected to be able to GET "+url) {
		t.FailNow()
	}

	if !assert.Equal(t, statusCode, resp.StatusCode, "Got unexpected status code. Body was:") {
		contentType := resp.Header.Get("Content-Type")
		bytes, _ := ioutil.ReadAll(resp.Body)
		t.Logf("GET %v [%v/%v]: %v", url, resp.StatusCode, contentType, string(bytes))
		t.FailNow()
	}

	return nil
}

func getLogsWithPrefix(logsByResource map[string][]operations.LogEntry, prefix string) ([]operations.LogEntry, bool) {
	for key, logs := range logsByResource {
		if strings.HasPrefix(key, prefix) {
			return logs, true
		}
	}

	return nil, false
}

func addRandomSuffix(s string) string {
	b := make([]byte, 4)
	_, err := rand.Read(b)
	contract.AssertNoError(err)
	return s + "-" + hex.EncodeToString(b)
}

type apiTest struct {
	urlStackOutputKey  string
	urlPath            string
	requiredParameters *requiredParameters
	requiredAuth       *requiredAuth
	requiredToken      *requiredToken
	requiredAPIKey     *requiredAPIKey
	expectedBody       string
	skipBodyValidation bool
}

type requiredAuth struct {
	headers         map[string]string
	queryParameters map[string]string
}

type requiredToken struct {
	header       string
	getAuthToken func(t *testing.T, stack integration.RuntimeValidationStackInfo) string
}

type requiredAPIKey struct {
	stackOutput string
}

type requiredParameters struct {
	queryParameters             []string
	expectedBodyWithoutQueryStr string
}

func validateAPITests(apiTests []apiTest) func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
	return func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		for _, tt := range apiTests {
			url := stack.Outputs[tt.urlStackOutputKey].(string) + tt.urlPath

			req, err := http.NewRequest(http.MethodGet, url, nil)
			if err != nil {
				t.Logf("Got error trying to create request for %v", url)
			}

			if tt.requiredAuth != nil {
				resp := GetHTTP(t, req, 401)
				assertRequestBody(t, `{"message":"401 Unauthorized"}`, false /*skipBodyValidation*/, resp)

				for header, val := range tt.requiredAuth.headers {
					req.Header.Add(header, val)
				}

				q := req.URL.Query()
				for param, val := range tt.requiredAuth.queryParameters {
					q.Add(param, val)
				}
				req.URL.RawQuery = q.Encode()
			}

			if tt.requiredToken != nil {
				resp := GetHTTP(t, req, 401)
				assertRequestBody(t, `{"message":"401 Unauthorized"}`, false /*skipBodyValidation*/, resp)

				token := tt.requiredToken.getAuthToken(t, stack)
				req.Header.Add(tt.requiredToken.header, token)
			}

			if tt.requiredAPIKey != nil {
				resp := GetHTTP(t, req, 403)
				assertRequestBody(t, `{"message":"Forbidden"}`, false /*skipBodyValidation*/, resp)

				apikey := stack.Outputs[tt.requiredAPIKey.stackOutput].(string)
				req.Header.Add("x-api-key", apikey)
			}

			if tt.requiredParameters != nil {
				resp := GetHTTP(t, req, 400)
				assertRequestBody(t, tt.requiredParameters.expectedBodyWithoutQueryStr, false /*skipBodyValidation*/, resp)

				q := req.URL.Query()
				for _, param := range tt.requiredParameters.queryParameters {
					q.Add(param, "test")
				}
				req.URL.RawQuery = q.Encode()
			}

			resp := GetHTTP(t, req, 200)
			assertRequestBody(t, tt.expectedBody, tt.skipBodyValidation, resp)
		}
	}
}

func assertRequestBody(t *testing.T, expectedBody string, skipBodyValidation bool, resp *http.Response) {
	defer resp.Body.Close()
	if !skipBodyValidation {
		bytes, err := ioutil.ReadAll(resp.Body)
		assert.NoError(t, err)
		assert.Equal(t, expectedBody, string(bytes))
	}
}

func GetHTTP(t *testing.T, req *http.Request, statusCode int) *http.Response {
	var resp *http.Response
	var err error
	var httpClient http.Client
	url := req.URL.String()

	for i := 0; i <= 10; i++ {

		resp, err = httpClient.Do(req)
		if err == nil && resp.StatusCode == statusCode {
			return resp
		}

		if err != nil {
			t.Logf("Got error trying to get %v. %v", url, err.Error())
		}

		if resp != nil && resp.StatusCode != statusCode {
			t.Logf("Expected to get status code %v for %v. Got: %v", statusCode, url, resp.StatusCode)
		}

		time.Sleep(1 * time.Minute)
	}

	if !assert.NoError(t, err, "expected to be able to GET "+url) ||
		!assert.Equal(t, statusCode, resp.StatusCode, "Got unexpected status code") {

		t.FailNow()
	}

	return nil
}
