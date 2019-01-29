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

import * as awsinfra from "@pulumi/aws-infra";
import * as pulumi from "@pulumi/pulumi";

const prefix = "infratest";
const numAvailabilityZones = 2;
const instanceType = "t2.small";

let network = new awsinfra.Network(`${prefix}-net`, {
    numberOfAvailabilityZones: numAvailabilityZones, // Create subnets in many AZs
    usePrivateSubnets: true,                         // Run compute inside private subnets in each AZ
});

const cluster = new awsinfra.Cluster(prefix, {
    minSize: numAvailabilityZones, // Ensure we keep at least one VM per AZ
    network: network,              // The network to provision this cluster inside
    addEFS: false,                 // Don't provision an EFS file system for this cluster
    instanceType: instanceType,    // Use a configured value for cluster VM sizes
});

// Export details of the network and cluster
export let vpcId: pulumi.Output<string> = network.vpcId;
export let privateSubnetIds = pulumi.all(network.subnetIds).apply(ids => ids.join(","));
export let publicSubnetIds = pulumi.all(network.publicSubnetIds).apply(ids => ids.join(","));
export let securityGroupIds = pulumi.all(network.securityGroupIds).apply(ids => ids.join(","));
export let ecsClusterARN: pulumi.Output<string> = cluster.ecsClusterARN;
export let ecsClusterSecurityGroup: pulumi.Output<string> | undefined = cluster.securityGroupId;
