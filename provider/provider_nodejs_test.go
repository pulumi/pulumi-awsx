//go:build !go && !yaml && !python && !java && !dotnet
// +build !go,!yaml,!python,!java,!dotnet

// Copyright 2016-2023, Pulumi Corporation.
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
	"path/filepath"
	"testing"

	"github.com/pulumi/providertest"
)

// Quick tests to validate the provider behavior against the example programs.
//
// Of specific interest are upgrade tests that check for lack of replacements when upgrading stacks
// from a baseline to the current version of the provider.
func TestExamples(t *testing.T) {
	examples := []string{

		"cloudtrail/nodejs",

		"vpc/nodejs/default-args",
		"vpc/nodejs/specific-vpc-layout",
		"vpc/nodejs/vpc-with-service-endpoint",
		"vpc/nodejs/vpc-multiple-similar-subnet-types",
		"vpc/nodejs/vpc-subnets-with-tags",

		// TODO[pulumi/pulumi-awsx#1114] this passes locally on Mac OS and Pulumi 3.86.0 but is failing in CI.
		// "ts-nlb-simple",
		// "ts-lb-simple",

		// TODO[pulumi/pulumi-awsx#1112] skipping recording a few programs that time out locally after 20min.
		// "ts-lb-with-subnets",
		// "ts-lb-attach-lambda",
		// "ts-lb-attach-ec2",

		// TODO[pulumi/providertest#21] ecs/nodejs clobbers cloudtrail/nodejs.
		// "ecs/nodejs"

		// Skipping because it does not work on pre-2.x versions, so upgrade tests cannot run.
		// "vpc/nodejs/custom-provider", // enableClassiclink and enableClassiclinkDnsSupport removed from outputs
		// "ts-vpc-getDefaultVpc",  // Property 'vpc' does not exist
		// "ts-ecr-simple", // docker.Patch -> docker.Context
	}

	for _, ex := range examples {
		dir := filepath.Join("..", "examples", ex)
		t.Run(ex, test(dir).Run)
	}
}

func test(dir string, opts ...providertest.Option) *providertest.ProviderTest {
	opts = append(opts,
		providertest.WithProviderName("awsx"),

		providertest.WithSkippedUpgradeTestMode(
			providertest.UpgradeTestMode_Quick,
			"Quick mode is only supported for providers written in Go at the moment"),

		providertest.WithBaselineVersion("1.0.6"), // latest v1

		providertest.WithExtraBaselineDependencies(map[string]string{
			"aws": "5.42.0", // latest v5
		}),
	)

	return providertest.NewProviderTest(dir, opts...)
}
