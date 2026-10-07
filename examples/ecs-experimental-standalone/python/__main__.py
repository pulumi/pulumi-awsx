import pulumi
import pulumi_awsx_next as awsx_next


task = awsx_next.FargateTaskDefinitionV2(
    "task",
    containers={
        "app": awsx_next.FargateContainerDefinitionOptionsArgs(
            image="public.ecr.aws/nginx/nginx:latest"
        )
    },
    cpu=256,
    memory=512,
)

pulumi.export("componentName", task.name)
pulumi.export("taskDefinitionArn", task.task_definition.arn)
