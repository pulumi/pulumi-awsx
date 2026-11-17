import pulumi
from pulumi_awsx import ecs


task = ecs.TaskDefinition(
    "task",
    containers={
        "app": ecs.ContainerDefinitionArgs(
            image="public.ecr.aws/nginx/nginx:latest"
        )
    },
    cpu_units=256,
    memory_mi_b=512,
)

pulumi.export("taskDefinitionArn", task.task_definition_arn)
