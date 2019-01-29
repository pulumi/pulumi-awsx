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

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

import { Config } from "@pulumi/pulumi";

console.log("EC2: Update1");

const vpc = new awsx.ec2.Vpc("ec2-testing-1");
const cluster1 = new awsx.ecs.Cluster("ec2-testing-1", { vpc });
export const clusterId = cluster1.id;

const autoScalingGroup = cluster1.createAutoScalingGroup("ec2-testing-1", {
    subnetIds: vpc.publicSubnetIds,
    templateParameters: {
        minSize: 10,
    },
    launchConfigurationArgs: {
        instanceType: "t2.medium",
        associatePublicIpAddress: true,
    },
});

export const autoScalingGroupId = autoScalingGroup.stack.id;
