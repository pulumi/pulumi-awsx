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
import { ResourceOptions } from "@pulumi/pulumi";
import { NestedResourceOptions } from "./nestedResourceOptions";

import * as utils from "./utils";

export interface RoleWithPolicyArgs {
    /**
     * Name of the role policy.
     */
    name?: pulumi.Input<string>;
    /**
     * Policy that grants an entity permission to assume the role.
     */
    assumeRolePolicy: string | aws.iam.PolicyDocument;
    /**
     * Description of the role.
     */
    description?: pulumi.Input<string>;
    /**
     * Whether to force detaching any policies the role has before destroying it. Defaults to `false`.
     */
    forceDetachPolicies?: pulumi.Input<boolean>;
    /**
     * Configuration block defining an exclusive set of IAM inline policies associated with the IAM role. Defined below. If no blocks are configured, the provider will ignore any managing any inline policies in this resource. Configuring one empty block (i.e., `inlinePolicy {}`) will cause the provider to remove _all_ inline policies.
     */
    inlinePolicies?: pulumi.Input<pulumi.Input<aws.types.input.iam.RoleInlinePolicy>[]>;
    /**
     * Set of exclusive IAM managed policy ARNs to attach to the IAM role. If this attribute is not configured, the provider will ignore policy attachments to this resource. When configured, the provider will align the role's managed policy attachments with this set by attaching or detaching managed policies. Configuring an empty set (i.e., `managedPolicyArns = []`) will cause the provider to remove _all_ managed policy attachments.
     */
    managedPolicyArns?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * Maximum session duration (in seconds) that you want to set for the specified role. If you do not specify a value for this setting, the default maximum of one hour is applied. This setting can have a value from 1 hour to 12 hours.
     */
    maxSessionDuration?: pulumi.Input<number>;
    /**
     * Creates a unique friendly name beginning with the specified prefix. Conflicts with `name`.
     */
    namePrefix?: pulumi.Input<string>;
    /**
     * Path to the role. See [IAM Identifiers](https://docs.aws.amazon.com/IAM/latest/UserGuide/Using_Identifiers.html) for more information.
     */
    path?: pulumi.Input<string>;
    /**
     * ARN of the policy that is used to set the permissions boundary for the role.
     */
    permissionsBoundary?: pulumi.Input<string>;
    /**
     * Key-value mapping of tags for the IAM role. .If configured with a provider `defaultTags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
     */
    tags?: pulumi.Input<{
        [key: string]: pulumi.Input<string>;
    }>;
    /**
     * ARNs of the policies to attach to the created role.
     */
    policyArns?: string[];
}

export interface DefaultRoleWithPolicyArgs {
    /**
     * Skips creation of the role if set to `true`.
     */
    skip?: boolean;
    /**
     * ARN of existing role to use instead of creating a new role.
     */
    roleArn?: pulumi.Input<string>;
    /**
     * Args to use when creating the role and policies. Can't be specified if `roleArn` is used.
     */
    args?: RoleWithPolicyArgs;
    /**
     * Resource options to use for the role. Can't be specified if `roleArn` is used.
     */
    opts?: NestedResourceOptions;
}

/** @internal */
export function defaultRoleWithPolicies(
    name: string,
    inputs: DefaultRoleWithPolicyArgs | undefined,
    defaults: RoleWithPolicyArgs,
    opts: ResourceOptions
): {
    roleArn?: pulumi.Output<string>;
    role?: aws.iam.Role;
    policies?: aws.iam.RolePolicyAttachment[];
} {
    if (inputs?.roleArn !== undefined && inputs?.args !== undefined) {
        throw new Error("Can't define role args if specified an existing role ARN");
    }
    if (inputs?.skip === true) {
        return {};
    }
    if (inputs?.roleArn !== undefined) {
        return { roleArn: pulumi.output(inputs.roleArn) };
    }
    const innerArgs = inputs?.args;
    const assumeRolePolicy =
        typeof innerArgs?.assumeRolePolicy === "string"
            ? innerArgs?.assumeRolePolicy
            : JSON.stringify(innerArgs?.assumeRolePolicy);

    const role = new aws.iam.Role(name, { ...innerArgs, assumeRolePolicy }, { ...inputs?.opts, ...opts });
    const policies = innerArgs?.policyArns?.map(
        (policyArn) =>
            new aws.iam.RolePolicyAttachment(`${name}-${utils.sha1hash(policyArn)}`, { role, policyArn }, opts)
    );
    return { role, policies, roleArn: role.arn };
}

/** @internal */
export function createRoleAndPolicies(
    name: string,
    assumeRolePolicy: string | aws.iam.PolicyDocument,
    policyArns: string[],
    opts: pulumi.ComponentResourceOptions | undefined
) {
    if (typeof assumeRolePolicy !== "string") {
        assumeRolePolicy = JSON.stringify(assumeRolePolicy);
    }

    const role = new aws.iam.Role(name, { assumeRolePolicy }, opts);
    const policies: aws.iam.RolePolicyAttachment[] = [];

    for (let i = 0; i < policyArns.length; i++) {
        const policyArn = policyArns[i];
        policies.push(
            new aws.iam.RolePolicyAttachment(`${name}-${utils.sha1hash(policyArn)}`, { role, policyArn }, opts)
        );
    }

    return { role, policies };
}

/** @internal */
export function createRole(
    name: string,
    assumeRolePolicy: string | aws.iam.PolicyDocument,
    policyArns: string[],
    opts: pulumi.ComponentResourceOptions | undefined
) {
    const { role } = createRoleAndPolicies(name, assumeRolePolicy, policyArns, opts);
    return role;
}
