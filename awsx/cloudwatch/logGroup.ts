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
import { getRegion, getRegionFromOpts, parseArn } from "../utils";

export interface LogGroupId {
  logGroupName: string;
  logGroupRegion: string;
  arn: string;
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
  if (inputs?.skip) {
    return {};
  }
  return requiredLogGroup(name, inputs, defaults, opts);
}

export function optionalLogGroup(
  name: string,
  inputs: schema.OptionalLogGroupInputs | undefined,
  defaults: aws.cloudwatch.LogGroupArgs,
  opts: ResourceOptions,
): {
  logGroup?: aws.cloudwatch.LogGroup;
  logGroupId?: pulumi.Output<LogGroupId>;
} {
  if (!inputs?.enable) {
    return {};
  }
  return requiredLogGroup(name, inputs, defaults, opts);
}

export function requiredLogGroup(
  name: string,
  inputs: schema.RequiredLogGroupInputs | undefined,
  defaults: aws.cloudwatch.LogGroupArgs,
  opts: ResourceOptions,
): {
  logGroup?: aws.cloudwatch.LogGroup;
  logGroupId?: pulumi.Output<LogGroupId>;
} {
  if (inputs?.existing !== undefined && inputs.args !== undefined) {
    throw new Error("Can't define log group args if specifying an existing log group name");
  }
  const existing = inputs?.existing;
  if (existing !== undefined) {
    if (existing.arn) {
      return { logGroupId: makeLogGroupId({ arn: existing.arn }) };
    } else if (existing.name) {
      const region = existing.region ? pulumi.output(existing.region) : getRegionFromOpts(opts);
      return {
        logGroupId: makeLogGroupId({ name: existing.name, region }),
      };
    } else {
      throw new Error("One of an existing log group name or ARN must be specified");
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

function idFromArn(arn: string): LogGroupId {
  const { region, service, resourceType, resourceId } = parseArn(arn);
  if (service !== "logs" || resourceType !== "log-group") {
    throw new Error("Invalid log group ARN");
  }
  return {
    arn,
    logGroupName: resourceId,
    logGroupRegion: region,
  };
}

function buildArn(args: { region: string; name: string; accountId: string }) {
  return `arn:aws:logs:${args.region}:${args.accountId}:log-group:${args.name}`;
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
      throw new Error("Only one of an existing log group name or ARN can be specified");
    }
    return pulumi.output(args.arn).apply(idFromArn);
  } else {
    return pulumi
      .all([args.name, args.region, aws.getCallerIdentity()])
      .apply(([name, region, callerIdentity]) => {
        const arn = buildArn({
          name: name,
          region: region,
          accountId: callerIdentity.accountId,
        });
        return idFromArn(arn);
      });
  }
}
