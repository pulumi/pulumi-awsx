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

export abstract class SecurityGroupRule extends pulumi.ComponentResource {
    public readonly instance: aws.ec2.SecurityGroupRule;

    constructor(type: string, name: string,
                securityGroup: x.ec2.SecurityGroup,
                args: SecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        super(type, name, args, opts || { parent: securityGroup });

        const instance = new aws.ec2.SecurityGroupRule(name, {
            ...args,
            securityGroupId: securityGroup.instance.id,
        });

        this.instance = instance;

        this.registerOutputs({
            instance,
        });
    }
}

export class EgressSecurityGroupRule extends SecurityGroupRule {
    constructor(name: string, securityGroup: x.ec2.SecurityGroup,
                args: EgressSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        super("awsinfra:x:ec2:EgressSecurityGroupRule", name, securityGroup, {
            ...args,
            type: "egress",
        }, opts);

        securityGroup.egressRules.push(this);
    }
}

export class IngressSecurityGroupRule extends SecurityGroupRule {
    constructor(name: string, securityGroup: x.ec2.SecurityGroup,
                args: IngressSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions) {

        super("awsinfra:x:ec2:IngressSecurityGroupRule", name, securityGroup, {
            ...args,
            type: "ingress",
        }, opts);

        securityGroup.ingressRules.push(this);
    }
}

type OverwriteSecurityGroupRuleArgs = utils.Overwrite<aws.ec2.SecurityGroupRuleArgs, {
    securityGroupId?: never;
    type: pulumi.Input<"ingress" | "egress">;
}>;

export interface SecurityGroupRuleArgs {
    /**
     * List of CIDR blocks. Cannot be specified with `source_security_group_id`.
     */
    cidrBlocks?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * Description of the rule.
     */
    description?: pulumi.Input<string>;

    /**
     * The start port (or ICMP type number if protocol is "icmp").
     */
    fromPort: pulumi.Input<number>;

    /**
     * List of IPv6 CIDR blocks.
     */
    ipv6CidrBlocks?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * List of prefix list IDs (for allowing access to VPC endpoints). Only valid with `egress`.
     */
    prefixListIds?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The protocol. If not icmp, tcp, udp, or all use the [protocol
     * number](https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml)
     */
    protocol: pulumi.Input<string>;

    /**
     * If true, the security group itself will be added as
     * a source to this ingress rule.
     */
    self?: pulumi.Input<boolean>;

    /**
     * The security group id to allow access to/from, depending on the `type`. Cannot be specified
     * with `cidr_blocks`.
     */
    sourceSecurityGroupId?: pulumi.Input<string>;

    /**
     * The end port (or ICMP code if protocol is "icmp").
     */
    toPort: pulumi.Input<number>;

    /**
     * The type of rule being created. Valid options are `ingress` (inbound)
     * or `egress` (outbound).
     */
    type: pulumi.Input<"ingress" | "egress">;
}

type OverwriteEgressSecurityGroupRuleArgs = utils.Overwrite<SecurityGroupRuleArgs, {
    type?: never;
}>;

export interface EgressSecurityGroupRuleArgs {
    /**
     * List of CIDR blocks. Cannot be specified with `source_security_group_id`.
     */
    cidrBlocks?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * Description of the rule.
     */
    description?: pulumi.Input<string>;
    /**
     * The start port (or ICMP type number if protocol is "icmp").
     */
    fromPort: pulumi.Input<number>;
    /**
     * List of IPv6 CIDR blocks.
     */
    ipv6CidrBlocks?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * List of prefix list IDs (for allowing access to VPC endpoints).
     */
    prefixListIds?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * The protocol. If not icmp, tcp, udp, or all use the [protocol
     * number](https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml)
     */
    protocol: pulumi.Input<string>;
    /**
     * If true, the security group itself will be added as
     * a source to this ingress rule.
     */
    self?: pulumi.Input<boolean>;
    /**
     * The security group id to allow access to/from,
     * depending on the `type`. Cannot be specified with `cidr_blocks`.
     */
    sourceSecurityGroupId?: pulumi.Input<string>;
    /**
     * The end port (or ICMP code if protocol is "icmp").
     */
    toPort: pulumi.Input<number>;
}

type OverwriteIngressSecurityGroupRuleArgs = utils.Overwrite<SecurityGroupRuleArgs, {
    type?: never;
    prefixListIds?: never;
}>;

export interface IngressSecurityGroupRuleArgs {
    /**
     * List of CIDR blocks. Cannot be specified with `source_security_group_id`.
     */
    cidrBlocks?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * Description of the rule.
     */
    description?: pulumi.Input<string>;
    /**
     * The start port (or ICMP type number if protocol is "icmp").
     */
    fromPort: pulumi.Input<number>;
    /**
     * List of IPv6 CIDR blocks.
     */
    ipv6CidrBlocks?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * The protocol. If not icmp, tcp, udp, or all use the [protocol
     * number](https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml)
     */
    protocol: pulumi.Input<string>;
    /**
     * If true, the security group itself will be added as
     * a source to this ingress rule.
     */
    self?: pulumi.Input<boolean>;
    /**
     * The security group id to allow access to/from,
     * depending on the `type`. Cannot be specified with `cidr_blocks`.
     */
    sourceSecurityGroupId?: pulumi.Input<string>;
    /**
     * The end port (or ICMP code if protocol is "icmp").
     */
    toPort: pulumi.Input<number>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteSecurityGroupRuleArgs, SecurityGroupRuleArgs>();
const test2: string = utils.checkCompat<OverwriteEgressSecurityGroupRuleArgs, EgressSecurityGroupRuleArgs>();
const test3: string = utils.checkCompat<OverwriteIngressSecurityGroupRuleArgs, IngressSecurityGroupRuleArgs>();
