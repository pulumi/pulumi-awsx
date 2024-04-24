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
import * as schema from "./schema-types";
import * as utils from "./utils";

interface RolePolicyAttachments {
  /**
   * ARNs of the policies to attach to the created role.
   */
  policyArns?: string[];
}

/** @internal */
export function defaultExecutionRolePolicyARNs() {
  return [
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    // aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
  ];
}

/** @internal */
export function defaultRoleAssumeRolePolicy(): aws.iam.PolicyDocument {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Principal: {
          Service: "ecs-tasks.amazonaws.com",
        },
        Effect: "Allow",
        Sid: "",
      },
    ],
  };
}

/** @internal */
export function defaultTaskRolePolicyARNs() {
  return [
    // Provides full access to Lambda
    // aws.iam.ManagedPolicy.LambdaFullAccess,
    // Required for lambda compute to be able to run Tasks
    // aws.iam.ManagedPolicy.AmazonECSFullAccess,
  ];
}

/** @internal */
export function defaultRoleWithPolicies(
  name: string,
  inputs: schema.DefaultRoleWithPolicyInputs | undefined,
  defaults: aws.iam.RoleArgs & RolePolicyAttachments,
  opts: ResourceOptions,
): {
  roleArn?: pulumi.Output<string>;
  role?: aws.iam.Role;
  policies?: pulumi.Output<aws.iam.RolePolicyAttachment[]>;
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
    typeof args.assumeRolePolicy === "string"
      ? args.assumeRolePolicy
      : JSON.stringify(args.assumeRolePolicy);

  const roleArgs = { ...args, assumeRolePolicy };
  delete roleArgs.policyArns;

  const role = new aws.iam.Role(name, roleArgs, opts);

  const policies = args.policyArns ?
    pulumi.Output.create(args.policyArns).apply(unwrapped =>
      unwrapped.map(policyArn =>
        new aws.iam.RolePolicyAttachment(
          `${name}-${utils.sha1hash(policyArn)}`,
          { role: role.name, policyArn },
          opts,
        ),
      ),
    ) : undefined;

  return { role, policies, roleArn: role.arn };
}
