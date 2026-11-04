package main

import (
	awsxnext "github.com/pulumi/pulumi-awsx-next/sdk/go/awsxnext"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		task, err := awsxnext.NewTaskDefinition(ctx, "task", &awsxnext.TaskDefinitionArgs{
			CpuUnits:  pulumi.Float64Ref(256),
			MemoryMiB: pulumi.Float64Ref(512),
			Containers: map[string]awsxnext.ContainerDefinitionOptionsArgs{
				"app": {Image: pulumi.String("public.ecr.aws/nginx/nginx:latest")},
			},
		})
		if err != nil {
			return err
		}
		ctx.Export("componentName", task.Name)
		ctx.Export("taskDefinitionArn", task.TaskDefinitionArn)
		return nil
	})
}
