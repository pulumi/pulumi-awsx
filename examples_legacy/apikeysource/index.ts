// Copyright 2023, Pulumi Corporation.
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
import * as pulumi from "@pulumi/pulumi";
import * as data from "./data";

const config = new pulumi.Config("aws");
const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config.require("envRegion") }) };

const api = new awsx.classic.apigateway.API("authorizer-api", {
    apiKeySource: data.apikeysource,
    routes: [{
        path: "/",
        method: "GET",
        eventHandler: async () => {
            return {
                statusCode: 200,
                body: "Hello, world!",
            };
        },
    }],
}, providerOpts);

export const apiKeySource = api.restAPI.apiKeySource;