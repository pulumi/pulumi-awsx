package main

import (
	"fmt"

	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws"
	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/s3"
	"github.com/pulumi/pulumi-awsx/sdk/go/awsx/cloudtrail"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		callerIdentity, err := aws.GetCallerIdentity(ctx)
		if err != nil {
			return err
		}
		// Create an AWS resource (S3 Bucket)
		bucket, err := s3.NewBucket(ctx, "go-trail-bucket", &s3.BucketArgs{ForceDestroy: pulumi.Bool(true)})
		if err != nil {
			return err
		}
		bucketPolicy, err := s3.NewBucketPolicy(ctx, "bucketPolicy", &s3.BucketPolicyArgs{
			Bucket: bucket.ID(),
			Policy: pulumi.All(bucket.Bucket, callerIdentity.AccountId).ApplyT(func(args []interface{}) pulumi.Input {
				return pulumi.String(fmt.Sprintf(`{
					"Version": "2012-10-17",
					"Statement": [
						{
							"Sid": "AWSCloudTrailAclCheck",
							"Effect": "Allow",
							"Principal": {"Service": "cloudtrail.amazonaws.com"},
							"Action": "s3:GetBucketAcl",
							"Resource": "arn:aws:s3:::%s"
						},
						{
							"Sid": "AWSCloudTrailWrite",
							"Effect": "Allow",
							"Principal": {"Service": "cloudtrail.amazonaws.com"},
							"Action": "s3:PutObject",
							"Resource": "arn:aws:s3:::%s/prefix/AWSLogs/%s/*",
							"Condition": {"StringEquals": {"s3:x-amz-acl": "bucket-owner-full-control"}}
						}
					]
				}`, args[0], args[0], args[1]))
			}),
		})
		if err != nil {
			return err
		}

		trailComp, err := cloudtrail.NewTrail(ctx, "test-trail-go", &cloudtrail.TrailArgs{
			S3BucketName:               bucket.ID(),
			S3KeyPrefix:                pulumi.String("prefix"),
			IncludeGlobalServiceEvents: pulumi.Bool(false),
			SendToCloudWatchLogs:       pulumi.Bool(true),
		}, pulumi.DependsOn([]pulumi.Resource{bucketPolicy}))
		if err != nil {
			return err
		}

		ctx.Export("trailArn", trailComp.Arn)
		// Export the name of the bucket
		ctx.Export("bucketName", bucket.ID())
		return nil
	})
}
