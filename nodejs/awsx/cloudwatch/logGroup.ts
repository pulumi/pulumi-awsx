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
import { NestedResourceOptions } from "../nestedResourceOptions";
import { getRegion, getRegionFromOpts } from "../utils";

/** Reference to an existing log group. */
export interface ExistingLogGroup {
    /** Name of the log group. */
    name: pulumi.Input<string>;
    /** Region of the log group. If not specified, the provider region will be used. */
    region?: pulumi.Input<string>;
}

/** Log group with default setup unless explicitly skipped */
export interface DefaultLogGroupArgs {
    /** Skip creation of the log group. */
    skip?: boolean;
    /** Identity of an existing log group to use. Cannot be used in combination with `args` or `opts`. */
    existing?: ExistingLogGroup;
    /** Arguments to use instead of the default values during creation. */
    args?: aws.cloudwatch.LogGroupArgs;
    /** Resource options to be used during creation of the log group. */
    opts?: NestedResourceOptions;
}

export interface LogGroupId {
    logGroupName: string;
    logGroupRegion: string;
}

function makeLogGroupId(args: {
    name: pulumi.Input<string>;
    region: pulumi.Input<string>;
}): pulumi.Output<LogGroupId> {
    return pulumi
        .all([args.name, args.region])
        .apply(([logGroupName, logGroupRegion]) => ({
            logGroupName,
            logGroupRegion,
        }));
}

export function defaultLogGroup(
    name: string,
    inputs: DefaultLogGroupArgs | undefined,
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
        aws.cloudwatch.getLogGroup({ name });
        const region = existing.region
            ? pulumi.output(existing.region)
            : getRegionFromOpts(opts);
        return { logGroupId: makeLogGroupId({ name: existing.name, region }) };
    }
    const args = { ...defaults, ...inputs?.args };
    const logGroupOpts = { ...inputs?.opts, ...opts };
    const logGroup = new aws.cloudwatch.LogGroup(name, args, logGroupOpts);
    const region = getRegion(logGroup);
    return {
        logGroup,
        logGroupId: makeLogGroupId({ name: logGroup.name, region }),
    };
}
