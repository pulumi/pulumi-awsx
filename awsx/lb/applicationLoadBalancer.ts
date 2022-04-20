// Copyright 2016-2022, Pulumi Corporation.
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
import * as pulumi from "@pulumi/pulumi";
import * as schema from "../schema-types";
import * as utils from "../utils";

export class ApplicationLoadBalancer extends schema.ApplicationLoadBalancer {
    constructor(
        name: string,
        args: schema.ApplicationLoadBalancerArgs,
        opts: pulumi.ComponentResourceOptions = {},
    ) {
        super(
            name,
            {},
            pulumi.mergeOptions(opts, {
                aliases: [
                    {
                        name: "awsx:x:elasticloadbalancingv2:ApplicationLoadBalancer",
                    },
                ],
            }),
        );
        this.loadBalancer = new aws.lb.LoadBalancer(name, args, {
            parent: this,
        });
    }
}
