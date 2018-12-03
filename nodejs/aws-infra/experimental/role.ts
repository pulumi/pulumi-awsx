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

import * as utils from "../utils";

/** @internal */
export function createRoleAndPolicies(
    name: string,
    assumeRolePolicy: string | aws.iam.PolicyDocument,
    policyArns: string[],
    opts: pulumi.ResourceOptions | undefined) {

    if (typeof assumeRolePolicy !== "string") {
        assumeRolePolicy = JSON.stringify(assumeRolePolicy);
    }

    const role = new aws.iam.Role(name, { assumeRolePolicy }, opts);
    const policies: aws.iam.RolePolicyAttachment[] = [];

    for (let i = 0; i < policyArns.length; i++) {
        const policyArn = policyArns[i];
        policies.push(new aws.iam.RolePolicyAttachment(
            `${name}-${utils.sha1hash(policyArn)}`, { role, policyArn }, opts));
    }

    return { role, policies };
}

/** @internal */
export function createRole(
    name: string,
    assumeRolePolicy: string | aws.iam.PolicyDocument,
    policyArns: string[],
    opts: pulumi.ResourceOptions | undefined) {

    const { role } = createRoleAndPolicies(name, assumeRolePolicy, policyArns, opts);
    return role;
}
