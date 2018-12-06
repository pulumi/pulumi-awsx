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
import { Network } from "./../../network";

import * as utils from "./../../utils";

export class SecurityGroup extends pulumi.ComponentResource {
    public readonly instance: aws.ec2.SecurityGroup;
    public readonly network: Network;

    public readonly egressRules: x.ec2.SecurityGroupRule[] = [];
    public readonly ingressRules: x.ec2.SecurityGroupRule[] = [];

    constructor(name: string, args: SecurityGroupArgs, opts?: pulumi.ComponentResourceOptions) {
        super("awsinfra:x:ec2:SecurityGroup", name, args, opts);

        const network = args.network || Network.getDefault();
        const instance = args.instance || new aws.ec2.SecurityGroup(name, {
            ...args,
            vpcId: network.vpcId,
        }, { parent: this });

        this.instance = instance;
        this.network = network;

        this.registerOutputs({
            instance,
            network,
        });
    }

    public createEgressRule(
            name: string, args: x.ec2.EgressSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        return new x.ec2.EgressSecurityGroupRule(name, this, args, opts);
    }

    public createIngressRule(
            name: string, args: x.ec2.IngressSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        return new x.ec2.IngressSecurityGroupRule(name, this, args, opts);
    }
}

type OverwriteSecurityGroupArgs = utils.Overwrite<aws.ec2.SecurityGroupArgs, {
    name?: never;
    namePrefix?: never;
    vpcId?: never;

    network?: Network;
}>;

export interface SecurityGroupArgs {
    /**
     * An existing SecurityGroup to use for this awsinfra SecurityGroup.  If not provided, a default
     * one will be created.
     */
    instance?: aws.ec2.SecurityGroup;

    /**
     * The network this security group applies to.  Or [Network.getDefault] if unspecified.
     */
    network?: Network;

    /**
     * The security group description. Defaults to "Managed by Terraform". Cannot be "". __NOTE__:
     * This field maps to the AWS `GroupDescription` attribute, for which there is no Update API. If
     * you'd like to classify your security groups in a way that can be updated, use `tags`.
     */
    description?: pulumi.Input<string>;

    /**
     * Can be specified multiple times for each egress rule. Each egress block supports fields
     * documented below.
     */
    egress?: aws.ec2.SecurityGroupArgs["egress"];

    /**
     * Can be specified multiple times for each ingress rule. Each ingress block supports fields
     * documented below.
     */
    ingress?: aws.ec2.SecurityGroupArgs["ingress"];

    /**
     * Instruct Terraform to revoke all of the Security Groups attached ingress and egress rules
     * before deleting the rule itself. This is normally not needed, however certain AWS services
     * such as Elastic Map Reduce may automatically add required rules to security groups used with
     * the service, and those rules may contain a cyclic dependency that prevent the security groups
     * from being destroyed without removing the dependency first. Default `false`
     */
    revokeRulesOnDelete?: pulumi.Input<boolean>;

    tags?: pulumi.Input<aws.Tags>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteSecurityGroupArgs, SecurityGroupArgs>();
