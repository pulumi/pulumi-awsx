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

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

export = async () => {
    const config = new pulumi.Config("aws");
    const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config.require("envRegion") }) };

    const cluster = await awsx.ecs.Cluster.create("testing", {}, providerOpts);

    // build an anonymous image:
    const listener = await awsx.elasticloadbalancingv2.NetworkListener.create("service", { vpc: cluster.vpc, port: 80 }, providerOpts);
    const repository = await awsx.ecr.Repository.create("repository", {}, providerOpts);
    const service = await awsx.ecs.FargateService.create("service", {
        cluster,
        taskDefinitionArgs: {
            containers: {
                service: {
                    image: repository.buildAndPushImage("./app"),
                    memory: 128,
                    portMappings: [listener],
                },
            },
        },
        desiredCount: 2,
        waitForSteadyState: false,
    }, providerOpts);

    const cluster2 = await awsx.ecs.Cluster.create("testing2", undefined, { provider: new aws.Provider("prov2", {
        region: "us-west-1"
    })});

    return {
        vpcId: cluster.vpc.id,
        serviceId: service.service.id,
        endpoint: listener.endpoint,
    };
};