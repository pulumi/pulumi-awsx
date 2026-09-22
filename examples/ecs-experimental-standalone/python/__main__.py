import pulumi
import pulumi_awsx_experimental as awsx_experimental


task = awsx_experimental.FargateTaskDefinitionV2(
    "task",
    containers={
        "app": awsx_experimental.FargateContainerDefinitionOptionsArgs(
            image="public.ecr.aws/nginx/nginx:latest"
        )
    },
    cpu=256,
    memory=512,
)

pulumi.export("componentName", task.name)
pulumi.export("taskDefinitionArn", task.task_definition.arn)
