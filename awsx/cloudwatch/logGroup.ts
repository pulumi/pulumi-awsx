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
import { ResourceOptions } from "@pulumi/pulumi";
import * as schema from "../schema-types";
import { getRegion, getRegionFromOpts } from "../utils";

export interface LogGroupId {
    logGroupName: string;
    logGroupRegion: string;
    arn: string;
}

function makeLogGroupId(
    args:
        | {
              name: pulumi.Input<string>;
              region: pulumi.Input<string>;
          }
        | { arn: pulumi.Input<string> },
): pulumi.Output<LogGroupId> {
    if ("arn" in args) {
        if ("name" in args) {
            throw new Error(
                "Only one of an existing log group name or ARN can be specified",
            );
        }
        return pulumi.output(args.arn).apply((arn) => {
            const prefix = "arn:aws:logs:";
            const [
                arnPrefix,
                awsNs,
                logsNs,
                logGroupRegion,
                accountId,
                logGroupNs,
                logGroupName,
            ] = arn.split(":");
            if (
                arnPrefix !== "arn" ||
                awsNs !== "aws" ||
                logsNs !== "logs" ||
                logGroupNs !== "log-group"
            ) {
                throw new Error("Invalid log group ARN");
            }
            return {
                logGroupName,
                logGroupRegion,
                arn,
            };
        });
    } else {
        return pulumi
            .all([args.name, args.region, aws.getCallerIdentity()])
            .apply(([logGroupName, logGroupRegion, callerIdentity]) => ({
                logGroupName,
                logGroupRegion,
                arn: `arn:aws:logs/${logGroupRegion}/${callerIdentity.accountId}/log-group/${logGroupName}:*`,
            }));
    }
}

export function defaultLogGroup(
    name: string,
    inputs: schema.DefaultLogGroupInputs | undefined,
    defaults: aws.cloudwatch.LogGroupArgs,
    opts: ResourceOptions,
): {
    logGroup?: aws.cloudwatch.LogGroup;
    logGroupId?: pulumi.Output<LogGroupId>;
} {
    if (inputs?.existing !== undefined && inputs.args !== undefined) {
        throw new Error(
            "Can't define log group args if specifying an existing log group name",
        );
    }
    if (inputs?.skip) {
        return {};
    }
    const existing = inputs?.existing;
    if (existing !== undefined) {
        if (existing.arn) {
            return { logGroupId: makeLogGroupId({ arn: existing.arn }) };
        } else if (existing.name) {
            const region = existing.region
                ? pulumi.output(existing.region)
                : getRegionFromOpts(opts);
            return {
                logGroupId: makeLogGroupId({ name: existing.name, region }),
            };
        } else {
            throw new Error(
                "One of an existing log group name or ARN must be specified",
            );
        }
    }
    const args = { ...defaults, ...inputs?.args };
    const logGroupOpts = opts;
    const logGroup = new aws.cloudwatch.LogGroup(name, args, logGroupOpts);
    const region = getRegion(logGroup);
    return {
        logGroup,
        logGroupId: makeLogGroupId({ name: logGroup.name, region }),
    };
}
