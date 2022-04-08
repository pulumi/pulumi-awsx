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

export class Trail extends pulumi.ComponentResource {
    /**
     * The managed CloudWatch Log Group.
     */
    public readonly logGroup: aws.cloudwatch.LogGroup | undefined;

    /**
     * The managed S3 Bucket where the Trail will place its logs.
     */
    public readonly bucket: aws.s3.Bucket | undefined;

    /**
     * The CloudTrail Trail.
     */
    public readonly trail: aws.cloudtrail.Trail;

    /**
     * Create a Trail resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args: TrailArgs, opts?: pulumi.CustomResourceOptions) {
        const aliasOpts = pulumi.mergeOptions(opts, {aliases: [{type: pulumi.output("aws:cloudtrail:x:Trail")}]});
        super("awsx:cloudtrail:Trail", name, {}, aliasOpts);

        let bucketName: pulumi.Output<string>;
        if (args.s3BucketName !== undefined) {
            bucketName = pulumi.output(args.s3BucketName);
        } else {
            this.bucket = bucketWithCloudTrailPolicy(name, this);
            bucketName = this.bucket.id;
        }

        let cloudWatchLogGroupArn: pulumi.Output<string> | undefined = undefined;
        if (args.sendToCloudWatchLogs) {
            this.logGroup = new aws.cloudwatch.LogGroup(name, args.cloudWatchLogGroupArgs, {parent: this});
            cloudWatchLogGroupArn = pulumi.interpolate`${this.logGroup.arn}:*`;
        }

        const trailArgs = {
            s3BucketName: bucketName,
            cloudWatchLogGroupArn: cloudWatchLogGroupArn,
            ...args,
        };

        this.trail = new aws.cloudtrail.Trail(name, trailArgs, {parent: this});
    }
}


type TrailArgs = utils.Overwrite<aws.cloudtrail.TrailArgs, {
    /**
     * If CloudTrail pushes logs to CloudWatch Logs in addition to S3.
     *
     * Disabled by default to reduce costs.
     *
     * @default false
     */
    sendToCloudWatchLogs?: boolean;

    /**
     * If sendToCloudWatchLogs is enabled, provide the log group configuration.
     */
    cloudWatchLogGroupArgs?: aws.cloudwatch.LogGroupArgs;

    /**
     * Specifies the name of the S3 bucket designated for publishing log files.
     */
    s3BucketName?: pulumi.Input<string>;
}>;

function bucketWithCloudTrailPolicy(name: string, parent: pulumi.Resource | undefined): aws.s3.Bucket {
    const bucket = new aws.s3.Bucket(name, {}, {parent: parent});
    const policy = new aws.s3.BucketPolicy(name, {
        bucket: bucket.id,
        policy: {
            Version: "2012-10-17",
            Statement: [{
                Sid: "AWSCloudTrailAclCheck",
                Effect: "Allow",
                Principal: aws.iam.Principals.CloudtrailPrincipal,
                Action: ["s3:GetBucketAcl"],
                Resource: [bucket.arn],
            }, {
                Sid: "AWSCloudTrailWrite",
                Effect: "Allow",
                Principal: {Service: "cloudtrail.amazonaws.com"},
                Action: ["s3:PutObject"],
                Resource: [pulumi.interpolate`${bucket.arn}/*`],
                Condition: {StringEquals: {"s3:x-amz-acl": "bucket-owner-full-control"}},
            }],
        },
    }, {parent: parent});
    return bucket;
}
