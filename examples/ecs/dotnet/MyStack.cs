using Pulumi;
using Aws = Pulumi.Aws;
using Awsx = Pulumi.Awsx;

class MyStack : Stack
{
    public MyStack()
    {
        var cluster = new Aws.Ecs.Cluster("default-cluster");

        var lb = new Awsx.Lb.ApplicationLoadBalancer("nginx-lb");

        var service = new Awsx.Ecs.FargateService("my-service", new FargateServiceArgs
        {
            Cluster = cluster.Arn,
            TaskDefinition = new Awsx.Ecs.FargateServiceTaskDefinitionArgs
            {
                Container = new Awsx.Ecs.TaskDefinitionContainerDefinitionArgs
                {
                    Image = "nginx:latest",
                    Cpu = 512,
                    Memory = 128,
                    Essential = true,
                    PortMappings = {new awsx.ecs.TaskDefinitionPortMappingArgs
                    {
                        TargetGroup = lb.default_target_group,
                    }},
                }
            }
        });

        this.Url = lb.AwsLoadBalancer.DnsName;
    }

    [Output] public Output<string> Url { get; set; }
}
