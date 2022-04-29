using Pulumi;
using Aws = Pulumi.Aws;
using Awsx = Pulumi.Awsx;

class MyStack : Stack
{
    public MyStack()
    {
        var cluster = new Aws.Ecs.Cluster("default-cluster");

        var lb = new Awsx.Lb.ApplicationLoadBalancer("nginx-lb");

        var service = new Awsx.Ecs.FargateService("my-service", new Awsx.Ecs.FargateServiceArgs
        {
            Cluster = cluster.Arn,
            TaskDefinition = new Awsx.Ecs.Inputs.FargateServiceTaskDefinitionArgs
            {
                Container = new Awsx.Ecs.Inputs.TaskDefinitionContainerDefinitionArgs
                {
                    Image = "nginx:latest",
                    Cpu = 512,
                    Memory = 128,
                    Essential = true,
                    PortMappings = {new Awsx.ecs.Inputs.TaskDefinitionPortMappingArgs
                    {
                        TargetGroup = lb.default_target_group,
                    }},
                }
            }
        });

        this.Url = lb.LoadBalancer.DnsName;
    }

    [Output] public Output<string> Url { get; set; }
}
