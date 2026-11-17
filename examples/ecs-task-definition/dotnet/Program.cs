using System.Collections.Generic;
using Pulumi;
using Pulumi.Awsx.Ecs;
using Pulumi.Awsx.Ecs.Inputs;

return await Deployment.RunAsync(() =>
{
    var task = new TaskDefinition("task", new TaskDefinitionArgs
    {
        CpuUnits = 256,
        MemoryMiB = 512,
        Containers =
        {
            ["app"] = new ContainerDefinitionArgs
            {
                Image = "public.ecr.aws/nginx/nginx:latest",
            },
        },
    });

    return new Dictionary<string, object?>
    {
        ["taskDefinitionArn"] = task.TaskDefinitionArn,
    };
});
