//go:build !go && !yaml && !python && !java && !dotnet
// +build !go,!yaml,!python,!java,!dotnet

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
	"testing"
)

func TestCloudTrailUpgrade(t *testing.T) {
	testProviderUpgrade(t, "../examples/cloudtrail/nodejs", &testProviderUpgradeOptions{linkNodeSDK: true})
}

func TestVpcWithDefaultArgsUpgrade(t *testing.T) {
	// 16 replaces locally, is this because of region differences?
	testProviderUpgrade(t, "../examples/vpc/nodejs/default-args", &testProviderUpgradeOptions{linkNodeSDK: true})
}

func TestVpcWithCustomProviderUpgrade(t *testing.T) {
	testProviderUpgrade(t, "../examples/vpc/nodejs/custom-provider", &testProviderUpgradeOptions{linkNodeSDK: true})
}

func TestVpcWithServiceEndpointUpgrade(t *testing.T) {
	testProviderUpgrade(t, "../examples/vpc/nodejs/vpc-with-service-endpoint", &testProviderUpgradeOptions{
		linkNodeSDK: true,
	})
}

func TestVpcWithMultipleSimilarSubnetTypesUpgrade(t *testing.T) {
	ex := "../examples/vpc/nodejs/vpc-multiple-similar-subnet-types"
	testProviderUpgrade(t, ex, &testProviderUpgradeOptions{linkNodeSDK: true})
}

func TestVpcSubnetsWithTagsUpgrade(t *testing.T) {
	testProviderUpgrade(t, "../examples/vpc/nodejs/vpc-subnets-with-tags", &testProviderUpgradeOptions{
		linkNodeSDK: true,
	})
}

func TestSpecificVpcLayoutUpgrade(t *testing.T) {
	testProviderUpgrade(t, "../examples/vpc/nodejs/specific-vpc-layout", &testProviderUpgradeOptions{
		linkNodeSDK: true,
	})
}

func TestEcrRepositoryUpgrade(t *testing.T) {
	testProviderUpgrade(t, "../examples/ts-ecr-repo", &testProviderUpgradeOptions{linkNodeSDK: true})
}

func TestLoadBalancerUpgrade(t *testing.T) {
	testProviderUpgrade(t, "../examples/ts-lb-simple", &testProviderUpgradeOptions{linkNodeSDK: true})
}

func TestNetworkLoadBalancerUpgrade(t *testing.T) {
	testProviderUpgrade(t, "../examples/ts-nlb-simple", &testProviderUpgradeOptions{linkNodeSDK: true})
}

func TestLoadBalancerAttachEc2Upgrade(t *testing.T) {
	testProviderUpgrade(t, "../examples/ts-lb-attach-ec2", &testProviderUpgradeOptions{linkNodeSDK: true})
}

func TestLoadBalancerWithSubnetsUpgrade(t *testing.T) {
	t.Skip("TODO[pulumi/pulumi-awsx#1267]")
	testProviderUpgrade(t, "../examples/ts-lb-with-subnets", &testProviderUpgradeOptions{linkNodeSDK: true})
}
