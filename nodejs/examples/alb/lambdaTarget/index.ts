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

    // Create a security group to let traffic flow.
    const sg = await awsx.ec2.SecurityGroup.create("web-sg", {
        vpc: await awsx.ec2.Vpc.getDefault(providerOpts),
        egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: [ "0.0.0.0/0" ] }],
    }, providerOpts);

    // Creates an ALB associated with the default VPC for this region and listen on port 80.
    const alb = await awsx.elasticloadbalancingv2.ApplicationLoadBalancer.create("web-traffic",
        { external: true, securityGroups: [ sg ] }, providerOpts);

    const tg = await alb.createTargetGroup("web-target-group", { targetType: "lambda", port: 80 });
    const listener = await tg.createListener("web-listener", { port: 80 });

    alb.attachTarget("lambda-target", async (request) => {
        console.log(JSON.stringify(request));
        return {
            isBase64Encoded: false,
            statusCode: 200,
            headers: {
                "Set-cookie": "cookies",
                "Content-Type": "application/json"
            },
            body: "Hello from Lambda (optional)",
        };
    });

    // Export the resulting URL so that it's easy to access.
    return { endpoint: listener.endpoint };
};