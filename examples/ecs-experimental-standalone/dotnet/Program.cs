using Pulumi;
using Pulumi.AwsxExperimental;
using Pulumi.AwsxExperimental.Inputs;

return await Deployment.RunAsync(() =>
{
    var task = new FargateTaskDefinitionV2("task", new FargateTaskDefinitionV2Args
    {
        Cpu = 256,
        Memory = 512,
        Containers =
        {
            ["app"] = new FargateContainerDefinitionOptionsArgs
            {
                Image = "public.ecr.aws/nginx/nginx:latest",
            },
        },
    });

    return new Dictionary<string, object?>
    {
        ["componentName"] = task.Name,
        ["taskDefinitionArn"] = task.TaskDefinition.Apply(value => value.Arn),
    };
});
