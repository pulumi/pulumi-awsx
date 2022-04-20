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
import * as pulumi from "@pulumi/pulumi";

import * as x from "..";
import * as utils from "../utils";

export class InternetGateway
        extends pulumi.ComponentResource
        implements x.ec2.SubnetRouteProvider {
    public readonly vpc: x.ec2.Vpc;
    public readonly internetGateway: aws.ec2.InternetGateway;

    constructor(name: string, vpc: x.ec2.Vpc, args: aws.ec2.InternetGatewayArgs, opts?: pulumi.ComponentResourceOptions);
    constructor(name: string, vpc: x.ec2.Vpc, args: ExistingInternetGatewayArgs, opts?: pulumi.ComponentResourceOptions);
    constructor(name: string, vpc: x.ec2.Vpc, args: aws.ec2.InternetGatewayArgs | ExistingInternetGatewayArgs, opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:x:ec2:InternetGateway", name, {}, { parent: vpc, ...opts });

        this.vpc = vpc;

        if (isExistingInternetGatewayArgs(args)) {
            this.internetGateway = args.internetGateway;
        }
        else {
            this.internetGateway = new aws.ec2.InternetGateway(name, {
                ...args,
                vpcId: vpc.id,
            }, { parent: this });
        }

        this.registerOutputs();
    }

    public route(name: string, opts: pulumi.ComponentResourceOptions): x.ec2.RouteArgs {
        return {
            // From above: For IPv4 traffic, specify 0.0.0.0/0 in the Destination box, and
            // select the internet gateway ID in the Target list.
            destinationCidrBlock: "0.0.0.0/0",
            gatewayId: this.internetGateway.id,
        };
    }
}

export interface ExistingInternetGatewayArgs {
    /**
     * Optional existing instance to use to make the [awsx.ec2.InternetGateway] out of.
     */
    internetGateway: aws.ec2.InternetGateway;
}

function isExistingInternetGatewayArgs(obj: any): obj is ExistingInternetGatewayArgs {
    return !!(<ExistingInternetGatewayArgs>obj).internetGateway;
}
