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

        const {
            subnetIds,
            subnets,
            defaultTargetGroup,
            defaultSecurityGroup,
            listeners,
            ...restArgs
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
            throw new Error(
                "One of [subnets], [subnetIds] or [subnetMappings] must be specified",
            );
        }

        if (!lbArgs.securityGroups && !defaultSecurityGroup?.skip) {
            if (
                defaultSecurityGroup?.args &&
                defaultSecurityGroup.securityGroupId
            ) {
                throw new Error(
                    "Only one of [defaultSecurityGroup] [args] or [securityGroupId] can be specified",
                );
            }
            const securityGroupId = defaultSecurityGroup?.securityGroupId;
            if (securityGroupId) {
                lbArgs.securityGroups = [securityGroupId];
            } else {
                const securityGroup = new aws.ec2.SecurityGroup(
                    name,
                    defaultSecurityGroup?.args ?? {}, // TODO: Add ingress/egress for listeners
                    { parent: this },
                );
                this.defaultSecurityGroup = securityGroup;
                lbArgs.securityGroups = [securityGroup.id];
            }
        }

        this.loadBalancer = new aws.lb.LoadBalancer(name, lbArgs, {
            parent: this,
        });

        this.defaultTargetGroup = new aws.lb.TargetGroup(
            name,
            { vpcId: this.vpcId, ...defaultTargetGroup },
            { parent: this },
        );

        if (listeners) {
            const defaultActions: aws.lb.ListenerArgs["defaultActions"] = [
                {
                    type: "forward",
                    targetGroupArn: this.defaultTargetGroup.arn,
                },
            ];
            this.listeners = listeners.map(
                (args, i) =>
                    // TODO: Check name compat with classic
                    new aws.lb.Listener(
                        `${name}-${i}`,
                        {
                            defaultActions: defaultActions,
                            ...args,
                            loadBalancerArn: this.loadBalancer.arn,
                        },
                        { parent: this },
                    ),
            );
        }
    }
}
