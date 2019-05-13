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

import * as awsx from "@pulumi/awsx";

const vpc = awsx.ec2.Vpc.getDefault();
const cluster = new awsx.ecs.Cluster("testing", { vpc });

// build an anonymous image:
const listener = new awsx.elasticloadbalancingv2.NetworkListener("nginx2", { port: 80 });
const repository = new awsx.ecr.Repository("nginx2");
const service = new awsx.ecs.FargateService("nginx2", {
    cluster,
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: repository.buildAndPushImage("./app"),
                memory: 128,
                portMappings: [listener],
            },
        },
    },
    desiredCount: 2,
    waitForSteadyState: false,
});

export let vpcId = vpc.id;
export let serviceId = service.service.id;
export let endpoint = listener.endpoint;
