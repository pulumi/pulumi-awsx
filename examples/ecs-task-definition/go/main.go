package main

import (
	"github.com/pulumi/pulumi-awsx/sdk/v3/go/awsx/ecs"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		task, err := ecs.NewTaskDefinition(ctx, "task", &ecs.TaskDefinitionArgs{
			CpuUnits:  pulumi.Float64Ref(256),
			MemoryMiB: pulumi.Float64Ref(512),
			Containers: map[string]ecs.ContainerDefinitionOptionsArgs{
				"app": {Image: "public.ecr.aws/nginx/nginx:latest"},
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
