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

export class Repository extends schema.Repository {
    constructor(
        name: string,
        args: schema.RepositoryArgs,
        opts: pulumi.ComponentResourceOptions,
    ) {
        super(name, {}, opts);
        const lowerCaseName = name.toLowerCase();
        const { lifecyclePolicy, ...repoArgs } = args;

        this.repository = new aws.ecr.Repository(lowerCaseName, repoArgs, {
            parent: this,
        });
        if (!lifecyclePolicy?.skip) {
            this.lifecyclePolicy = new aws.ecr.LifecyclePolicy(lowerCaseName, {
                repository: this.repository.name,
                policy: buildLifecyclePolicy(lifecyclePolicy),
            });
        }
    }
}

function buildLifecyclePolicy(
    lifecyclePolicy: schema.lifecyclePolicyInputs | undefined,
): pulumi.Input<aws.ecr.LifecyclePolicyDocument> {
    const rules = lifecyclePolicy?.rules;
    if (!rules) {
        return convertRules([
            {
                description: "remove untagged images",
                tagStatus: "untagged",
                maximumNumberOfImages: 1,
            },
        ]);
    }
    return pulumi.output(rules).apply((rules) => convertRules(rules));
}

function convertRules(
    rules: pulumi.Unwrap<schema.lifecyclePolicyRuleInputs>[],
): aws.ecr.LifecyclePolicyDocument {
    const result: aws.ecr.LifecyclePolicyDocument = { rules: [] };

    const nonAnyRules = rules.filter((r) => r.tagStatus !== "any");
    const anyRules = rules.filter((r) => r.tagStatus === "any");

    if (anyRules.length >= 2) {
        throw new Error(`At most one [selection: "any"] rule can be provided.`);
    }

    // Place the 'any' rule last so it has higest priority.
    const orderedRules = [...nonAnyRules, ...anyRules];

    let rulePriority = 1;
    for (const rule of orderedRules) {
        result.rules.push(convertRule(rule, rulePriority));
        rulePriority++;
    }

    return result;
}

function convertRule(
    rule: pulumi.Unwrap<schema.lifecyclePolicyRuleInputs>,
    rulePriority: number,
): aws.ecr.PolicyRule {
    return {
        rulePriority,
        description: rule.description,
        selection: { ...convertTag(), ...convertCount() },
        action: { type: "expire" },
    };

    function convertCount() {
        if (rule.maximumNumberOfImages !== undefined) {
            return {
                countType: "imageCountMoreThan",
                countNumber: rule.maximumNumberOfImages,
                countUnit: undefined,
            } as const;
        } else if (rule.maximumAgeLimit !== undefined) {
            return {
                countType: "sinceImagePushed",
                countNumber: rule.maximumAgeLimit,
                countUnit: "days",
            } as const;
        } else {
            throw new Error(
                "Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided with a rule.",
            );
        }
    }

    function convertTag() {
        if (rule.tagStatus === "any" || rule.tagStatus === "untagged") {
            return { tagStatus: rule.tagStatus };
        } else {
            if (!rule.tagPrefixList || rule.tagPrefixList.length === 0) {
                throw new Error("tagPrefixList cannot be empty.");
            }

            return {
                tagStatus: "tagged",
                tagPrefixList: rule.tagPrefixList,
            } as const;
        }
    }
}
