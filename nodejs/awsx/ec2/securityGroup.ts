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
import * as utils from "./../utils";

export class SecurityGroup extends pulumi.ComponentResource {
    public readonly securityGroup: aws.ec2.SecurityGroup;
    public readonly id: pulumi.Output<string>;
    public readonly vpc: pulumi.Output<x.ec2.Vpc>;

    public readonly egressRules: x.ec2.EgressSecurityGroupRule[] = [];
    public readonly ingressRules: x.ec2.IngressSecurityGroupRule[] = [];

    // tslint:disable-next-line:variable-name
    private readonly __isSecurityGroupInstance = true;

    constructor(name: string, args: SecurityGroupArgs = {}, opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:x:ec2:SecurityGroup", name, {}, opts);

        // We allow egress/ingress rules to be defined in-line for SecurityGroup (like terraform
        // does). However, we handle these by explicitly *not* passing this to the security group,
        // and instead manually making SecurityGroupRules.  This ensures that rules can be added
        // after the fact (for example, if someone wants to open an app-listener up later).
        // TerraForm doesn't support both inlined and after-the-fact rules.  So we just make
        // everything after-the-fact to make the programming model simple and to allow users to
        // mix/match both styles if they prefer.
        const egressRules = args.egress || [];
        const ingressRules = args.ingress || [];

        // Explicitly delete these props so we do *not* pass them into the SecurityGroup created
        // below.
        delete args.egress;
        delete args.ingress;

        this.vpc = utils.ifUndefined(args.vpc, x.ec2.Vpc.getDefault({ parent: this }));
        this.securityGroup = args.securityGroup || new aws.ec2.SecurityGroup(name, {
            ...args,
            vpcId: this.vpc.apply(v => v.id),
        }, { parent: this });

        this.id = this.securityGroup.id;

        this.registerOutputs();

        for (let i = 0, n = egressRules.length; i < n; i++) {
            this.createEgressRule(`${name}-egress-${i}`, egressRules[i]);
        }

        for (let i = 0, n = ingressRules.length; i < n; i++) {
            this.createIngressRule(`${name}-ingress-${i}`, ingressRules[i]);
        }
    }

    /** @internal */
    public static isSecurityGroupInstance(obj: any): obj is SecurityGroup {
        return !!(<SecurityGroup>obj).__isSecurityGroupInstance;
    }

    /**
     * Get an existing SecurityGroup resource's state with the given name and ID. This will not
     * cause a SecurityGroup to be created, and removing this SecurityGroup from your pulumi
     * application will not cause the existing cloud resource to be destroyed.
     */
    public static fromExistingId(
        name: string, id: pulumi.Input<string>,
        args: SecurityGroupArgs = {}, opts: pulumi.ComponentResourceOptions = {}): SecurityGroup {

        return new SecurityGroup(name, {
            ...args,
            securityGroup: aws.ec2.SecurityGroup.get(name, id, {}, opts),
        }, opts);
    }

    public createEgressRule(name: string, args: x.ec2.SimpleSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions): Promise<x.ec2.EgressSecurityGroupRule>;
    public createEgressRule(name: string, args: x.ec2.EgressSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions): Promise<x.ec2.EgressSecurityGroupRule>;
    public createEgressRule(name: string, args: x.ec2.SimpleSecurityGroupRuleArgs | x.ec2.EgressSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        return x.ec2.EgressSecurityGroupRule.create(name, this, args, opts);
    }

    public createIngressRule(name: string, args: x.ec2.SimpleSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions): Promise<x.ec2.IngressSecurityGroupRule>;
    public createIngressRule(name: string, args: x.ec2.IngressSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions): Promise<x.ec2.IngressSecurityGroupRule>;
    public createIngressRule(name: string, args: x.ec2.SimpleSecurityGroupRuleArgs | x.ec2.IngressSecurityGroupRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        return x.ec2.IngressSecurityGroupRule.create(name, this, args, opts);
    }
}

utils.Capture(SecurityGroup.prototype).createEgressRule.doNotCapture = true;
utils.Capture(SecurityGroup.prototype).createIngressRule.doNotCapture = true;

export type SecurityGroupOrId = SecurityGroup | pulumi.Input<string>;

/** @internal */
export function getSecurityGroups(
        vpc: pulumi.Input<x.ec2.Vpc>, name: string, args: SecurityGroupOrId[] | undefined,
        opts: pulumi.ResourceOptions | undefined) {
    if (!args) {
        return undefined;
    }

    const result: x.ec2.SecurityGroup[] = [];
    for (let i = 0, n = args.length; i < n; i++) {
        const obj = args[i];
        if (x.ec2.SecurityGroup.isSecurityGroupInstance(obj)) {
            result.push(obj);
        }
        else {
            result.push(x.ec2.SecurityGroup.fromExistingId(`${name}-${i}`, obj, { vpc }, opts));
        }
    }

    return result;
}

type OverwriteSecurityGroupArgs = utils.Overwrite<aws.ec2.SecurityGroupArgs, {
    name?: never;
    namePrefix?: never;
    vpcId?: never;

    vpc?: pulumi.Input<x.ec2.Vpc>;
    egress?: x.ec2.EgressSecurityGroupRuleArgs[];
    ingress?: x.ec2.IngressSecurityGroupRuleArgs[];
}>;

export interface SecurityGroupArgs {
    /**
     * An existing SecurityGroup to use for this awsx SecurityGroup.  If not provided, a default
     * one will be created.
     */
    securityGroup?: aws.ec2.SecurityGroup;

    /**
     * The vpc this security group applies to.  Or [Vpc.getDefault] if unspecified.
     */
    vpc?: pulumi.Input<x.ec2.Vpc>;

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
    egress?: x.ec2.EgressSecurityGroupRuleArgs[];

    /**
     * Can be specified multiple times for each ingress rule. Each ingress block supports fields
     * documented below.
     */
    ingress?: x.ec2.IngressSecurityGroupRuleArgs[];

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
