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

interface RolePolicyAttachments {
    /**
     * ARNs of the policies to attach to the created role.
     */
    policyArns?: string[];
}

/** The set of arguments for constructing a Role resource and Policy attach. */
export type RoleWithPolicyArgs = Omit<aws.iam.RoleArgs, "assumeRolePolicy"> & RolePolicyAttachments;

/** Role and policy attachments with default setup unless explicitly skipped or an existing role ARN provided. */
export interface DefaultRoleWithPolicyArgs {
    /**
     * Skips creation of the role if set to `true`.
     */
    skip?: boolean;
    /**
     * ARN of existing role to use instead of creating a new role. Cannot be used in combination with `args` or `opts`.
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
    defaults: aws.iam.RoleArgs & RolePolicyAttachments,
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
    const args = { ...defaults, ...inputs?.args };
    const assumeRolePolicy =
        typeof args.assumeRolePolicy === "string" ? args.assumeRolePolicy : JSON.stringify(args.assumeRolePolicy);

    const roleArgs = { ...args, assumeRolePolicy };
    delete roleArgs.policyArns;
    const roleOpts = { ...inputs?.opts, ...opts };

    const role = new aws.iam.Role(name, roleArgs, roleOpts);
    const policies = args.policyArns?.map(
        (policyArn) =>
            new aws.iam.RolePolicyAttachment(
                `${name}-${utils.sha1hash(policyArn)}`,
                { role: role.name, policyArn },
                opts
            )
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
