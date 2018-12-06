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

    public createEgressRule(name: string, args: EgressSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        return new EgressSecurityGroupRule(name, {
            ...args,
            securityGroup: this,
        }, opts || { parent: this });
    }

    public createIngressRule(name: string, args: IngressSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        return new IngressSecurityGroupRule(name, {
            ...args,
            securityGroup: this,
        }, opts || { parent: this });
    }
}

export abstract class SecurityGroupRule extends pulumi.ComponentResource {
    public readonly instance: aws.ec2.SecurityGroupRule;
    public readonly securityGroup: SecurityGroup;

    constructor(type: string, name: string, args: SecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        super(type, name, args, opts);

        const instance = new aws.ec2.SecurityGroupRule(name, {
            ...args,
            securityGroupId: args.securityGroup.instance.id,
        });

        this.instance = instance;
        this.securityGroup = args.securityGroup;

        this.registerOutputs({
            instance,
        });
    }
}

export class EgressSecurityGroupRule extends SecurityGroupRule {
    constructor(name: string, args: EgressSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        if (!args.securityGroup) {
            throw new Error("[securityGroup] must be provided when creating an EgressSecurityGroupRule.");
        }

        super("awsinfra:x:ec2:EgressSecurityGroupRule", name, {
            ...args,
            securityGroup: args.securityGroup,
            type: "egress",
        }, opts);
    }
}

export class IngressSecurityGroupRule extends SecurityGroupRule {
    constructor(name: string, args: IngressSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        if (!args.securityGroup) {
            throw new Error("[securityGroup] must be provided when creating an IngressSecurityGroupRule.");
        }

        super("awsinfra:x:ec2:IngressSecurityGroupRule", name, {
            ...args,
            securityGroup: args.securityGroup,
            type: "ingress",
        }, opts);
    }
}

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

export interface SecurityGroupRuleArgs {
    /**
     * The security group to apply this rule to.
     */
    securityGroup: SecurityGroup;

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

export interface EgressSecurityGroupRuleArgs {
    /**
     * The security group to apply this rule to.
     */
    securityGroup?: SecurityGroup;

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

export interface IngressSecurityGroupRuleArgs {
    /**
     * The security group to apply this rule to.
     */
    securityGroup?: SecurityGroup;

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
