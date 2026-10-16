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
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/pulumi/pulumi/sdk/v3/go/auto/optpreview"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAccEcsServiceWithLoadBalancer(t *testing.T) {
	// Check before constructing a Pulumi test, so an unconfigured local run creates no stack.
	getEnvRegion(t)
	pt := newExperimentalPackageTest(t, "service-load-balancer-nodejs")
	result := pt.Up(t)

	url, ok := result.Outputs["url"].Value.(string)
	require.True(t, ok)
	client := &http.Client{Timeout: 10 * time.Second}
	for _, route := range []struct {
		name   string
		path   string
		status int
		body   string
	}{
		{"api", "/api/ping", http.StatusOK, "api-ok\n"},
		{"admin", "/admin/ping", http.StatusOK, "admin-ok\n"},
		{"listener-default", "/unmatched", http.StatusNotFound, "listener-default\n"},
	} {
		t.Run(route.name, func(t *testing.T) {
			// This checks actual ALB-to-task traffic, including health checks on a separate port.
			// The final case also proves the service did not replace the caller's default action.
			require.EventuallyWithT(t, func(c *assert.CollectT) {
				response, err := client.Get(url + route.path)
				if !assert.NoError(c, err) {
					return
				}
				defer response.Body.Close()
				body, err := io.ReadAll(io.LimitReader(response.Body, 1024))
				if !assert.NoError(c, err) {
					return
				}
				assert.Equal(c, route.status, response.StatusCode)
				assert.Equal(c, route.body, string(body))
			}, 2*time.Minute, 5*time.Second)
		})
	}

	// Initial acceptance and a no-change preview are separate claims. This does not test a
	// progressive rollout, certificate rotation, or refresh/update of an existing deployment.
	pt.Preview(t, optpreview.ExpectNoChanges())
}
