using System.Collections.Generic;
using Pulumi;
using Pulumi.AwsxNext;
using Pulumi.AwsxNext.Inputs;

return await Deployment.RunAsync(() =>
{
    var task = new TaskDefinition("task", new TaskDefinitionArgs
    {
        CpuUnits = 256,
        MemoryMiB = 512,
        Containers =
        {
            ["app"] = new ContainerDefinitionOptionsArgs
            {
                Image = "public.ecr.aws/nginx/nginx:latest",
            },
        },
    });

    return new Dictionary<string, object?>
    {
        ["componentName"] = task.Name,
        ["taskDefinitionArn"] = task.TaskDefinitionArn,
    };
});
