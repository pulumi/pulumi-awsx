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

	"github.com/pulumi/pulumi-cloud/examples"
	"github.com/pulumi/pulumi/pkg/operations"
	"github.com/pulumi/pulumi/pkg/resource"
	"github.com/pulumi/pulumi/pkg/resource/config"
	"github.com/pulumi/pulumi/pkg/resource/stack"
	"github.com/pulumi/pulumi/pkg/testing/integration"
	"github.com/pulumi/pulumi/pkg/util/contract"
)

func Test_Examples(t *testing.T) {
	region := os.Getenv("AWS_REGION")
	if region == "" {
		t.Skipf("Skipping test due to missing AWS_REGION environment variable")
	}
	fmt.Printf("AWS Region: %v\n", region)

	cwd, err := os.Getwd()
	if !assert.NoError(t, err, "expected a valid working directory: %v", err) {
		return
	}

	shortTests := []integration.ProgramTestOptions{
		{
			Dir: path.Join(cwd, "./examples/cluster"),
			Config: map[string]string{
				"aws:region":     region,
				"cloud:provider": "aws",
			},
			Dependencies: []string{
				"@pulumi/aws-infra",
			},
		},
		{
			Dir:       path.Join(cwd, "./examples/vpc"),
			StackName: addRandomSuffix("vpc"),
			Config: map[string]string{
				"aws:region": region,
			},
			Dependencies: []string{
				"@pulumi/aws-infra",
			},
		},
		{
			Dir:       path.Join(cwd, "./examples/fargate"),
			StackName: addRandomSuffix("fargate"),
			Config: map[string]string{
				"aws:region":               region,
				"cloud:provider":           "aws",
				"containers:redisPassword": "SECRETPASSWORD",
			},
			Dependencies: []string{
				"@pulumi/aws-infra",
			},
			Quick:       true,
			SkipRefresh: true,
			PreviewCommandlineFlags: []string{
				"--diff",
			},
			ExtraRuntimeValidation: containersRuntimeValidator(region, true /*isFargate*/),
		},
	}

	longTests := []integration.ProgramTestOptions{

		{
			Dir:       path.Join(cwd, "./examples/ec2"),
			StackName: addRandomSuffix("ec2"),
			Config: map[string]string{
				"aws:region":               region,
				"cloud:provider":           "aws",
				"containers:redisPassword": "SECRETPASSWORD",
			},
			Dependencies: []string{
				"@pulumi/aws-infra",
			},
			Quick:       true,
			SkipRefresh: true,
			PreviewCommandlineFlags: []string{
				"--diff",
			},
			EditDirs: []integration.EditDir{
				{
					Additive: true,
					Dir:      path.Join(cwd, "./examples/ec2/update1"),
				},
				{
					Additive:               true,
					Dir:                    path.Join(cwd, "./examples/ec2/update2"),
					ExtraRuntimeValidation: containersRuntimeValidator(region, false /*isFargate*/),
				},
			},
		},
	}

	// Run the short or long tests depending on the config.  Note that we only run long tests on
	// travis after already running short tests.  So no need to actually run both at the same time
	// ever.
	var tests []integration.ProgramTestOptions
	if testing.Short() {
		tests = shortTests
	} else {
		tests = longTests
	}

	for _, ex := range tests {
		example := ex.With(integration.ProgramTestOptions{
			ReportStats: integration.NewS3Reporter("us-west-2", "eng.pulumi.com", "testreports"),
			// TODO[pulumi/pulumi#1900]: This should be the default value, every test we have causes some sort of
			// change during a `pulumi refresh` for reasons outside our control.
			ExpectRefreshChanges: true,
		})
		t.Run(example.Dir, func(t *testing.T) {
			integration.ProgramTest(t, &example)
		})
	}
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
		state, err := stack.DeserializeResource(res)
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

func containersRuntimeValidator(region string, isFargate bool) func(t *testing.T, stackInfo integration.RuntimeValidationStackInfo) {
	return func(t *testing.T, stackInfo integration.RuntimeValidationStackInfo) {
		var baseURL string
		var ok bool
		if isFargate {
			baseURL, ok = stackInfo.Outputs["fargateFrontendURL"].(string)
		} else {
			baseURL, ok = stackInfo.Outputs["ec2FrontendURL"].(string)
		}

		assert.True(t, ok, "expected a `frontendURL` output property of type string")

		// Validate the GET /test endpoint
		{
			resp := examples.GetHTTP(t, baseURL+"test", 200)
			contentType := resp.Header.Get("Content-Type")
			assert.Equal(t, "application/json", contentType)
			bytes, err := ioutil.ReadAll(resp.Body)
			assert.NoError(t, err)
			var endpoints map[string]map[string]interface{}
			err = json.Unmarshal(bytes, &endpoints)
			assert.NoError(t, err)
			t.Logf("GET %v [%v/%v]: %v - %v", baseURL+"test", resp.StatusCode, contentType, string(bytes), endpoints)
		}

		// Validate the GET / endpoint
		{
			// Call the endpoint twice so that things have time to warm up.
			http.Get(baseURL)
			resp := examples.GetHTTP(t, baseURL, 200)
			contentType := resp.Header.Get("Content-Type")
			assert.Equal(t, "application/json", contentType)
			bytes, err := ioutil.ReadAll(resp.Body)
			assert.NoError(t, err)
			t.Logf("GET %v [%v/%v]: %v", baseURL, resp.StatusCode, contentType, string(bytes))
		}

		// Validate the GET /nginx endpoint
		{
			// https://github.com/pulumi/pulumi-cloud/issues/666
			// We are only making the proxy route in fargate testing.
			if isFargate {
				resp := examples.GetHTTP(t, baseURL+"nginx", 200)
				contentType := resp.Header.Get("Content-Type")
				assert.Equal(t, "text/html", contentType)
				bytes, err := ioutil.ReadAll(resp.Body)
				assert.NoError(t, err)
				t.Logf("GET %v [%v/%v]: %v", baseURL+"nginx", resp.StatusCode, contentType, string(bytes))
			}
			{
				resp := examples.GetHTTP(t, baseURL+"nginx/doesnotexist", 404)
				contentType := resp.Header.Get("Content-Type")
				assert.Equal(t, "text/html", contentType)
				bytes, err := ioutil.ReadAll(resp.Body)
				assert.NoError(t, err)
				t.Logf("GET %v [%v/%v]: %v", baseURL+"nginx/doesnotexist", resp.StatusCode, contentType, string(bytes))
			}
		}

		// Validate the GET /run endpoint
		{
			resp := examples.GetHTTP(t, baseURL+"run", 200)
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
			resp := examples.GetHTTP(t, baseURL+"custom", 200)
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
			nginxLogs, exists := getLogsWithPrefix(logsByResource, "fargate-nginx-")
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
			helloWorldLogs, exists := getLogsWithPrefix(logsByResource, "fargate-hello-world-")
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
			redisLogs, exists := getLogsWithPrefix(logsByResource, "fargate-mycache-")
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
