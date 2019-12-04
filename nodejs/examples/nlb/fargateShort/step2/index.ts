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

    const vpc = await awsx.ec2.Vpc.getDefault(providerOpts);
    const cluster = await awsx.ecs.Cluster.create("testing", { vpc }, providerOpts);

    // Changed from step1 from using the elasticloadbalancingv2 module to the lb module.
    const nginxListener = await awsx.lb.NetworkListener.create("nginx", { port: 80 }, providerOpts);
    const nginx = await awsx.ecs.FargateService.create("nginx", {
        cluster,
        taskDefinitionArgs: {
            containers: {
                nginx: {
                    image: "nginx",
                    memory: 128,
                    portMappings: [nginxListener],
                },
            },
        },
        desiredCount: 2,
    }, providerOpts);

    function errorJSON(err: any) {
        const result: any = Object.create(null);
        Object.getOwnPropertyNames(err).forEach(key => result[key] = err[key]);
        result.florp = "blopr";
        return result;
    }

    function handleError(err: Error) {
        console.error(errorJSON(err));
        return {
            statusCode: 500,
            body: JSON.stringify(errorJSON(err)),
        };
    }

    // expose some APIs meant for testing purposes.
    const api = new awsx.apigateway.API("containers", {
        routes: [{
            path: "/test",
            method: "GET",
            eventHandler: async (req) => {
                try {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            nginx: nginxListener.endpoint.get(),
                        }),
                    };
                } catch (err) {
                    return handleError(err);
                }
            },
        }, {
            path: "/nginx",
            target: nginxListener,
        }],
    }, providerOpts);

    return { frontendURL: api.url };
};