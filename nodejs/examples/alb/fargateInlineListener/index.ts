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

export default async () => {
    const config = new pulumi.Config("aws");
    const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config.require("envRegion") }) };

    const cluster = await awsx.ecs.Cluster.create("testing", {}, providerOpts);

    // A simple NGINX service, scaled out over two containers.
    const service = await awsx.ecs.FargateService.create("nginx", {
        cluster,
        taskDefinitionArgs: {
            containers: {
                nginx: {
                    image: "nginx",
                    memory: 128,
                    applicationListener: { port: 80, external: true, loadBalancer: { external: true } },
                },
            },
        },
        desiredCount: 2,
    }, providerOpts);

    return { endpoint: service.listeners.nginx.endpoint };
};