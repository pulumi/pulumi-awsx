package main

import (
	"github.com/pulumi/pulumi-awsx/sdk/v3/go/awsx/cloudtrail"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		trail, err := cloudtrail.NewTrail(ctx, "test-trail-go", &cloudtrail.TrailArgs{
			IncludeGlobalServiceEvents: pulumi.Bool(false),
			EnableLogging:              pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		ctx.Export("bucketName", trail.Bucket.Bucket())
		ctx.Export("bucketArn", trail.Bucket.Arn())

		return nil
	})
}
