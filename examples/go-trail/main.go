package main

import (
	"github.com/pulumi/pulumi-awsx/sdk/go/awsx/cloudtrail"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create an AWS resource (S3 Bucket)
		trail, err := cloudtrail.NewTrail(ctx, "test-trail-go", &cloudtrail.TrailArgs{
			IncludeGlobalServiceEvents: pulumi.Bool(false),
			SendToCloudWatchLogs:       pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		ctx.Export("x", trail.Trail.ApplyT(func trail interface{}{
			
		}))

		//ctx.Export("trailArn", trailComp.Trail.ApplyT(func(arn string) string {
		//	return arn
		//}).(pulumi.StringOutput))
		//// Export the name of the bucket
		//ctx.Export("bucketName", bucket.ID())
		return nil
	})
}
