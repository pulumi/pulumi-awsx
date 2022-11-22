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
            AssignPublicIp = true,
            TaskDefinitionArgs = new Awsx.Ecs.Inputs.FargateServiceTaskDefinitionArgs
            {
                Container = new Awsx.Ecs.Inputs.TaskDefinitionContainerDefinitionArgs
                {
                    Image = "nginx:latest",
                    Cpu = 512,
                    Memory = 128,
                    Essential = true,
                    PortMappings = {new Awsx.Ecs.Inputs.TaskDefinitionPortMappingArgs
                    {
                        TargetGroup = lb.DefaultTargetGroup,
                    }},
                }
            }
        });

        this.Url = lb.LoadBalancer.Apply(lb => lb.DnsName);
    }

    [Output] public Output<string> Url { get; set; }
}
