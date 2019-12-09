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

const config = new pulumi.Config("aws");
const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config.require("envRegion") }) };

const vpcWithDifferentCidrBlock = awsx.ec2.Vpc.create("custom1", {
    cidrBlock: "192.168.0.0/16",
}, providerOpts);

const vpcWithOnlyPublicSubnets = awsx.ec2.Vpc.create("custom2", {
    cidrBlock: "193.168.0.0/16",
    subnets: [{
        type: "public"
    }]
}, providerOpts);

const vpcWithOnlyPrivateSubnets = awsx.ec2.Vpc.create("custom3", {
    cidrBlock: "194.168.0.0/16",
    subnets: [{
        type: "private"
    }]
}, providerOpts);

const vpcWithIpv6 = awsx.ec2.Vpc.create("custom4", {
    assignGeneratedIpv6CidrBlock: true,
}, providerOpts);

const vpcWithProvider = awsx.ec2.Vpc.create("custom5", {
    assignGeneratedIpv6CidrBlock: true,
}, { provider: new aws.Provider("prov2", { region: "us-east-1" }) });

const vpcWithLocations = awsx.ec2.Vpc.create("custom6", {
    cidrBlock: "10.0.0.0/16",
    subnets: [
        { type: "public", location: "10.0.0.0/24" },
        { type: "private", location: "10.0.1.0/24" },
        { type: "isolated", name: "db", location: "10.0.2.0/24" },
        { type: "isolated", name: "redis", location: "10.0.3.0/24" },
    ],
}, providerOpts);
