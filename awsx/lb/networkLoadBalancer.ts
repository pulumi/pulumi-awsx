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
import { getDefaultVpc } from "../vpc";

export class NetworkLoadBalancer extends schema.NetworkLoadBalancer {
    constructor(
        name: string,
        args: schema.NetworkLoadBalancerArgs,
        opts: pulumi.ComponentResourceOptions = {},
    ) {
        super(
            name,
            {},
            pulumi.mergeOptions(opts, {
                aliases: [
                    {
                        name: "awsx:x:elasticloadbalancingv2:NetworkLoadBalancer",
                    },
                ],
            }),
        );

        const {
            subnetIds,
            subnets,
            defaultTargetGroup,
            listener,
            listeners,
            /* tslint:disable */ //rest args will always be last so don't have trailing commas
            ...restArgs
            /* tslint:enable */
        } = args;
        const lbArgs: aws.lb.LoadBalancerArgs = restArgs;

        const definedSubnetArgs = utils.countDefined([
            subnetIds,
            subnets,
            restArgs.subnetMappings,
        ]);
        if (definedSubnetArgs > 1) {
            throw new Error(
                "Only one of [subnets], [subnetIds] or [subnetMappings] can be specified",
            );
        }
        if (subnets) {
            lbArgs.subnets = pulumi
                .output(subnets)
                .apply((subnets) => subnets.map((s) => s.id));
            this.vpcId = pulumi
                .output(subnets)
                .apply((subnets) => subnets[0].vpcId);
        } else if (subnetIds) {
            lbArgs.subnets = subnetIds;
            this.vpcId = pulumi
                .output(subnetIds)
                .apply((ids) => aws.ec2.getSubnet({ id: ids[0] })).vpcId;
        } else if (restArgs.subnetMappings) {
            this.vpcId = pulumi
                .output(restArgs.subnetMappings!)
                .apply((s) => aws.ec2.getSubnet({ id: s[0].subnetId })).vpcId;
        } else {
            const defaultVpc = pulumi.output(getDefaultVpc());
            this.vpcId = defaultVpc.vpcId;
            lbArgs.subnets = defaultVpc.publicSubnetIds;
        }

        if (listener && listeners) {
            throw new Error(
                "Only one of [listener] and [listeners] can be specified",
            );
        }

        // this is a network loadbalancer so we set this explicitly
        // we have removed this from the input properties in the schema
        lbArgs.loadBalancerType = "network";
        // enableHttp2 is not valid in NLB
        lbArgs.enableHttp2 = false;
        // idleTimeout is not valid in NLB
        lbArgs.idleTimeout = 0;

        this.loadBalancer = new aws.lb.LoadBalancer(name, lbArgs, {
            parent: this,
        });

        this.defaultTargetGroup = new aws.lb.TargetGroup(
            name,
            {
                vpcId: this.vpcId,
                protocol: "TCP",
                port: 80,
                ...defaultTargetGroup,
            },
            { parent: this },
        );

        const defaultActions = [
            {
                type: "forward",
                targetGroupArn: this.defaultTargetGroup.arn,
            },
        ];

        if (listener) {
            this.listeners = [
                new aws.lb.Listener(
                    `${name}-0`,
                    {
                        defaultActions,
                        protocol: "TCP",
                        port: 80,
                        ...listener,
                        loadBalancerArn: this.loadBalancer.arn,
                    },
                    { parent: this },
                ),
            ];
        } else if (listeners) {
            this.listeners = listeners.map(
                (args, i) =>
                    new aws.lb.Listener(
                        `${name}-${i}`,
                        {
                            defaultActions,
                            protocol: "TCP",
                            port: 80,
                            ...args,
                            loadBalancerArn: this.loadBalancer.arn,
                        },
                        { parent: this },
                    ),
            );
        } else {
            this.listeners = [
                new aws.lb.Listener(
                    `${name}-0`,
                    {
                        defaultActions,
                        protocol: "TCP",
                        port: 80,
                        loadBalancerArn: this.loadBalancer.arn,
                    },
                    { parent: this },
                ),
            ];
        }
    }
}

