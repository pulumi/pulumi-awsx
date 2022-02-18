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

import * as utils from "./utils";

export interface OptionalRoleWithPolicyArgs {
    /**
     * Skips creation of the role if set to `true`.
     */
    skip?: boolean;
    /**
     * Pulumi resource name for the role.
     */
    resourceName: string;
    /**
     * ARNs of the policies to attach to the created role.
     */
    policyArns: string[];
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
}

/** @internal */
export function optionalRoleWithPolicies(
    args: OptionalRoleWithPolicyArgs,
    opts: pulumi.ComponentResourceOptions | undefined
): { role?: aws.iam.Role; policies?: aws.iam.RolePolicyAttachment[] } {
    const { resourceName, policyArns, ...roleArgs } = args;
    if (args.skip) {
        return {};
    }
    const assumeRolePolicy =
        typeof args.assumeRolePolicy === "string" ? args.assumeRolePolicy : JSON.stringify(args.assumeRolePolicy);

    const role = new aws.iam.Role(resourceName, { ...roleArgs, assumeRolePolicy }, opts);
    const policies = policyArns.map(
        (policyArn) =>
            new aws.iam.RolePolicyAttachment(`${resourceName}-${utils.sha1hash(policyArn)}`, { role, policyArn }, opts)
    );
    return { role, policies };
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
