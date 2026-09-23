package main

import (
	awsxnext "github.com/pulumi/pulumi-awsx-next/sdk/go/awsxnext"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		task, err := awsxnext.NewFargateTaskDefinitionV2(ctx, "task", &awsxnext.FargateTaskDefinitionV2Args{
			Cpu:    pulumi.Float64Ref(256),
			Memory: pulumi.Float64Ref(512),
			Containers: map[string]awsxnext.FargateContainerDefinitionOptionsArgs{
				"app": {Image: pulumi.String("public.ecr.aws/nginx/nginx:latest")},
			},
		})
		if err != nil {
			return err
		}
		ctx.Export("componentName", task.Name)
		ctx.Export("taskDefinitionArn", task.TaskDefinition.Arn())
		return nil
	})
}
