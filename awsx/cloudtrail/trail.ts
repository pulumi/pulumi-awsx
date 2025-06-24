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
import { optionalLogGroup } from "../cloudwatch/logGroup";
import { BucketId, requiredBucket } from "../s3/bucket";
import * as schema from "../schema-types";

export class Trail extends schema.Trail {
  constructor(name: string, args: schema.TrailArgs, opts?: pulumi.CustomResourceOptions) {
    const { s3Bucket, cloudWatchLogsGroup, ...trailCustomArgs } = args;
    const aliasOpts = pulumi.mergeOptions(opts, {
      aliases: [{ type: "aws:cloudtrail:x:Trail" }],
    });
    super(name, {}, aliasOpts);

    const { bucket, bucketId } = requiredBucket(name, s3Bucket, {}, { parent: this });
    this.bucket = bucket;
    const policy = createBucketCloudtrailPolicy(name, bucketId, bucket, this);

    const { logGroup, logGroupId } = optionalLogGroup(
      name,
      cloudWatchLogsGroup,
      {},
      { parent: this },
    );
    this.logGroup = logGroup;

    const trailArgs = {
      ...trailCustomArgs,
      s3BucketName: bucketId.name,
      cloudWatchLogGroupArn: logGroupId?.apply((arn) => arn + ":*"),
    };

    this.trail = new aws.cloudtrail.Trail(name, trailArgs, {
      parent: this,
      dependsOn: [policy],
    });
    this.registerOutputs();
  }
}

function createBucketCloudtrailPolicy(
  name: string,
  bucketId: BucketId,
  bucket: aws.s3.Bucket | undefined,
  parent: pulumi.Resource | undefined,
) {
  const opts: pulumi.ResourceOptions = { parent: parent };
  if (bucket !== undefined) {
    opts.dependsOn = [bucket];
  }
  return new aws.s3.BucketPolicy(
    name,
    {
      bucket: bucketId.name,
      policy: bucketId.arn.apply(defaultCloudTrailPolicy),
    },
    opts,
  );
}

function defaultCloudTrailPolicy(bucketArn: string): aws.types.input.iam.PolicyDocument {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AWSCloudTrailAclCheck",
        Effect: "Allow",
        Principal: aws.iam.Principals.CloudtrailPrincipal,
        Action: ["s3:GetBucketAcl"],
        Resource: [bucketArn],
      },
      {
        Sid: "AWSCloudTrailWrite",
        Effect: "Allow",
        Principal: { Service: "cloudtrail.amazonaws.com" },
        Action: ["s3:PutObject"],
        Resource: [`${bucketArn}/*`],
        Condition: {
          StringEquals: {
            "s3:x-amz-acl": "bucket-owner-full-control",
          },
        },
      },
    ],
  };
}
