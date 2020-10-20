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

export class Function extends pulumi.ComponentResource {
    /**
     * The managed IAM Role.
     */
    public readonly role: aws.iam.Role | undefined;

    /**
     * The Function.
     */
    public readonly function: aws.lambda.Function;

    /**
     * Create a Function resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args: FunctionArgs, opts?: pulumi.CustomResourceOptions) {
        super("aws:lambda:x:Function", name, {}, opts);

        let roleArn: pulumi.Input<aws.ARN>;

        if (args.role === undefined) {
            this.role = new aws.iam.Role(name, {
                assumeRolePolicy: args.assumeRolePolicy ??
                    aws.iam.assumeRolePolicyForPrincipal({Service: "lambda.amazonaws.com"}),
            }, {parent: this});

            const attachment = new aws.iam.RolePolicyAttachment(name, {
                role: this.role,
                policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
            }, {parent: this});

            roleArn = this.role.arn;
        } else {
            roleArn = args.role;
        }

        const functionArgs = {
            role: roleArn,
            ...args,
        };

        this.function = new aws.lambda.Function(name, functionArgs, {parent: this});
    }
}

type FunctionArgs = utils.Overwrite<aws.lambda.FunctionArgs, {
    /**
     * IAM role to attach to the Lambda Function.
     */
    readonly role?: pulumi.Input<aws.ARN>;

    /**
     * The policy that grants an entity permission to assume the role, when auto-generating the role.
     */
    readonly assumeRolePolicy?: pulumi.Input<string | aws.iam.PolicyDocument>
}>;
