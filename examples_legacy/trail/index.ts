import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";

const current = aws.getCallerIdentity({});
const bucket = new aws.s3.Bucket("ts-trail-bucket", {});
const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
    bucket: bucket.id,
    policy: pulumi.all([bucket.id, bucket.id, current]).apply(([bucketId, bucketId1, current]) => `  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Sid": "AWSCloudTrailAclCheck",
              "Effect": "Allow",
              "Principal": {
                "Service": "cloudtrail.amazonaws.com"
              },
              "Action": "s3:GetBucketAcl",
              "Resource": "arn:aws:s3:::${bucketId}"
          },
          {
              "Sid": "AWSCloudTrailWrite",
              "Effect": "Allow",
              "Principal": {
                "Service": "cloudtrail.amazonaws.com"
              },
              "Action": "s3:PutObject",
              "Resource": "arn:aws:s3:::${bucketId1}/prefix/AWSLogs/${current.accountId}/*",
              "Condition": {
                  "StringEquals": {
                      "s3:x-amz-acl": "bucket-owner-full-control",
                  }
              }
          }
      ]
  }
`),
});

const trailComp = new awsx.cloudtrail.Trail("test-nodejs", {
    s3BucketName: bucket.id,
    s3KeyPrefix: "prefix",
    includeGlobalServiceEvents: false,
    sendToCloudWatchLogs: true,
    cloudWatchLogGroupArgs: {}
})

export const trailName = trailComp.trail.name;
