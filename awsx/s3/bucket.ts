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

export interface BucketId {
    name: pulumi.Output<string>;
    arn: pulumi.Output<string>;
}

export function requiredBucket(
    name: string,
    inputs: schema.RequiredBucketInputs | undefined,
    defaults: aws.s3.BucketArgs,
    opts: ResourceOptions,
): {
    bucket?: aws.s3.Bucket;
    bucketId: BucketId;
} {
    if (inputs?.existing !== undefined && inputs.args !== undefined) {
        throw new Error(
            "Can't define bucket args if specifying an existing bucket",
        );
    }
    const existing = inputs?.existing;
    if (existing !== undefined) {
        if (existing.arn) {
            const arn = pulumi.output(existing.arn);
            return { bucketId: { arn, name: arn.apply(nameFromArn) } };
        } else if (existing.name) {
            const name = pulumi.output(existing.name);
            return { bucketId: { arn: name.apply(arnFromName), name } };
        } else {
            throw new Error(
                "One of an existing log group name or ARN must be specified",
            );
        }
    }
    const args = { forceDestroy: true, ...defaults, ...inputs?.args };
    const bucket = new aws.s3.Bucket(name, args, opts);
    return {
        bucket,
        bucketId: { arn: bucket.arn, name: bucket.bucket },
    };
}

export function defaultBucket(
    name: string,
    inputs: schema.DefaultBucketInputs | undefined,
    defaults: aws.s3.BucketArgs,
    opts: ResourceOptions,
): {
    bucket?: aws.s3.Bucket;
    bucketId?: BucketId;
} {
    if (inputs?.skip) {
        return {};
    }
    return requiredBucket(name, inputs, defaults, opts);
}

function nameFromArn(bucketArn: string) {
    const parsed = parseArn(bucketArn);
    return parsed.resourceId;
}

function arnFromName(bucketName: string) {
    return `arn:aws:::${bucketName}`;
}
