---
title: AWSx (Pulumi AWS Components)
meta_desc: Well-Architected Infrastructure as Code for AWS. The easiest way to AWS — from development to production.
layout: package
---

<!-- Generated from docs/source/_index.md; do not edit directly. -->

The Amazon Web Services (AWS) AWSx library uses automatic well-architected best practices to make common infrastructure-as-code tasks in [AWS](https://aws.amazon.com/) easier and more secure. It uses the AWS SDK to manage and provision resources.

The AWSx provider must be configured with credentials to deploy and update resources in AWS; see [Installation & Configuration](./installation-configuration) for instructions.

**New to Pulumi and AWS?** [Get started with AWS using our AWSx tutorial](/docs/clouds/aws/guides/).

## Example

<div><pulumi-examples>
<div><pulumi-chooser type="language" options="typescript,python,go,csharp,java,yaml,hcl"></pulumi-chooser></div>

<div><pulumi-choosable type="language" values="typescript">

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

const vpc = new awsx.ec2.Vpc("vpc", {});
export const vpcId = vpc.vpcId;
export const privateSubnetIds = vpc.privateSubnetIds;
export const publicSubnetIds = vpc.publicSubnetIds;
```


</pulumi-choosable></div>

<div><pulumi-choosable type="language" values="python">

```python
import pulumi
import pulumi_awsx as awsx

vpc = awsx.ec2.Vpc("vpc")
pulumi.export("vpcId", vpc.vpc_id)
pulumi.export("privateSubnetIds", vpc.private_subnet_ids)
pulumi.export("publicSubnetIds", vpc.public_subnet_ids)
```


</pulumi-choosable></div>

<div><pulumi-choosable type="language" values="go">

```go
package main

import (
	"github.com/pulumi/pulumi-awsx/sdk/v3/go/awsx/ec2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		vpc, err := ec2.NewVpc(ctx, "vpc", nil)
		if err != nil {
			return err
		}
		ctx.Export("vpcId", vpc.VpcId)
		ctx.Export("privateSubnetIds", vpc.PrivateSubnetIds)
		ctx.Export("publicSubnetIds", vpc.PublicSubnetIds)
		return nil
	})
}
```


</pulumi-choosable></div>

<div><pulumi-choosable type="language" values="csharp">

```csharp
using System.Collections.Generic;
using System.Linq;
using Pulumi;
using Awsx = Pulumi.Awsx;

return await Deployment.RunAsync(() => 
{
    var vpc = new Awsx.Ec2.Vpc("vpc");

    return new Dictionary<string, object?>
    {
        ["vpcId"] = vpc.VpcId,
        ["privateSubnetIds"] = vpc.PrivateSubnetIds,
        ["publicSubnetIds"] = vpc.PublicSubnetIds,
    };
});
```


</pulumi-choosable></div>

<div><pulumi-choosable type="language" values="java">

```java
package generated_program;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.core.Output;
import com.pulumi.awsx.ec2.Vpc;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Map;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    public static void stack(Context ctx) {
        var vpc = new Vpc("vpc");

        ctx.export("vpcId", vpc.vpcId());
        ctx.export("privateSubnetIds", vpc.privateSubnetIds());
        ctx.export("publicSubnetIds", vpc.publicSubnetIds());
    }
}
```


</pulumi-choosable></div>

<div><pulumi-choosable type="language" values="yaml">

```yaml
name: awsx-networking-yaml
runtime: yaml
description: A minimal AWS Pulumi YAML program

resources:
  # Allocate a new VPC with the default settings:
  vpc:
    type: awsx:ec2:Vpc

outputs:
  vpcId: ${vpc.vpcId}
  privateSubnetIds: ${vpc.privateSubnetIds}
  publicSubnetIds: ${vpc.publicSubnetIds}
```


</pulumi-choosable></div>

<div><pulumi-choosable type="language" values="hcl">

```hcl
terraform {
  required_providers {
    awsx = {
      source = "pulumi/awsx"
    }
  }
}

# Allocate a new VPC with the default settings:
resource "awsx_ec2_vpc" "vpc" {
}

output "vpcId" {
  value = awsx_ec2_vpc.vpc.vpc_id
}

output "privateSubnetIds" {
  value = awsx_ec2_vpc.vpc.private_subnet_ids
}

output "publicSubnetIds" {
  value = awsx_ec2_vpc.vpc.public_subnet_ids
}
```


</pulumi-choosable></div>

</pulumi-examples></div>

## ECS

The experimental ECS components in `awsx.experimental.ecs` allow you to deploy containerized applications to AWS.

- A [TaskDefinition](./api-docs/experimental/ecs/taskdefinition/) describes the containers and parameters that form your application.
- A [Service](./api-docs/experimental/ecs/service/) runs and maintains tasks from a task-definition revision, connects them to load balancers, and manages deployments.

These components can be combined with the other AWSX components (`Vpc`, `Image`, etc) to deploy your entire application infrastructure.

### How services connect to load balancers

The `Service` component is designed to be used in combination with Load Balancers and progressive deployments. There are several resources that will be mentioned in this guide.

- **Load Balancer**: The Load Balancer that distributes incoming traffic across (potentially) multiple targets
- **Listener**: A process that checks for connection requests using the protocol and port that you configure. The listener receives a request and evaluates it against each rule in priority order.
- **Listener Rule**: Matches requests using conditions and applies actions, such as forwarding to a target group, redirecting, or returning a fixed response.
- **Target Groups**: Route requests to individual registered targets (e.g. EC2 Instances or IPs).

**Client → ALB listener → listener rule → target group → task container**

An **attachment** connects a forwarding rule to one container and port in the service. For example, an attachment can route requests for `api.example.com` to an `app` container on port 80. AWSX creates the target groups and forwarding rule, and ECS registers the tasks as targets.

<div><pulumi-examples>
<div><pulumi-chooser type="language" options="typescript,python,go,csharp,java,yaml"></pulumi-chooser></div>

<div><pulumi-choosable type="language" values="typescript">

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const vpc = new awsx.ec2.Vpc("vpc", {
    subnetStrategy: awsx.ec2.SubnetAllocationStrategy.AutoMerge,
    subnetNameTagStrategy: awsx.ec2.SubnetNameTagStrategy.AvailabilityZone,
});
const frontend = new aws.ec2.SecurityGroup("frontend", {vpcId: vpc.vpcId});
const frontendHttp = new aws.vpc.SecurityGroupIngressRule("frontendHttp", {
    securityGroupId: frontend.id,
    ipProtocol: "tcp",
    fromPort: 80,
    toPort: 80,
    cidrIpv4: "0.0.0.0/0",
});
const frontendEgress = new aws.vpc.SecurityGroupEgressRule("frontendEgress", {
    securityGroupId: frontend.id,
    ipProtocol: "-1",
    cidrIpv4: "0.0.0.0/0",
});
const alb = new aws.lb.LoadBalancer("alb", {
    loadBalancerType: "application",
    internal: false,
    subnets: vpc.publicSubnetIds,
    securityGroups: [frontend.id],
});
const listener = new aws.lb.Listener("listener", {
    loadBalancerArn: alb.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{
        type: "fixed-response",
        fixedResponse: {
            statusCode: "404",
            contentType: "text/plain",
            messageBody: "Not found",
        },
    }],
});
const cluster = new aws.ecs.Cluster("cluster", {});
const repository = new awsx.ecr.Repository("repository", {});
const image = new awsx.ecr.Image("image", {
    repositoryUrl: repository.repository.repositoryUrl,
    context: "./app",
    platform: "linux/amd64",
});
const taskDefinition = new awsx.experimental.ecs.TaskDefinition("taskDefinition", {containers: {
    app: {
        image: image.imageUri,
        portMappings: [{
            containerPort: 80,
        }],
    },
}});
const service = new awsx.experimental.ecs.Service("service", {
    clusterArn: cluster.arn,
    taskDefinitionArn: taskDefinition.taskDefinitionArn,
    vpcSubnetIds: vpc.privateSubnetIds,
    loadBalancerAttachments: {
        app: {
            application: {
                containerName: "app",
                containerPort: 80,
                listenerArn: listener.arn,
                priority: 10,
                targetHealthCheck: {
                    path: "/health",
                },
            },
        },
    },
}, {
    dependsOn: [
        frontendHttp,
        frontendEgress,
    ],
});
export const url = pulumi.interpolate`http://${alb.dnsName}`;
```


</pulumi-choosable></div>

<div><pulumi-choosable type="language" values="python">

```python
import pulumi
import pulumi_aws as aws
import pulumi_awsx as awsx

vpc = awsx.ec2.Vpc("vpc",
    subnet_strategy=awsx.ec2.SubnetAllocationStrategy.AUTO_MERGE,
    subnet_name_tag_strategy=awsx.ec2.SubnetNameTagStrategy.AVAILABILITY_ZONE)
frontend = aws.ec2.SecurityGroup("frontend", vpc_id=vpc.vpc_id)
frontend_http = aws.vpc.SecurityGroupIngressRule("frontendHttp",
    security_group_id=frontend.id,
    ip_protocol="tcp",
    from_port=80,
    to_port=80,
    cidr_ipv4="0.0.0.0/0")
frontend_egress = aws.vpc.SecurityGroupEgressRule("frontendEgress",
    security_group_id=frontend.id,
    ip_protocol="-1",
    cidr_ipv4="0.0.0.0/0")
alb = aws.lb.LoadBalancer("alb",
    load_balancer_type="application",
    internal=False,
    subnets=vpc.public_subnet_ids,
    security_groups=[frontend.id])
listener = aws.lb.Listener("listener",
    load_balancer_arn=alb.arn,
    port=80,
    protocol="HTTP",
    default_actions=[{
        "type": "fixed-response",
        "fixed_response": {
            "status_code": "404",
            "content_type": "text/plain",
            "message_body": "Not found",
        },
    }])
cluster = aws.ecs.Cluster("cluster")
repository = awsx.ecr.Repository("repository")
image = awsx.ecr.Image("image",
    repository_url=repository.repository.repository_url,
    context="./app",
    platform="linux/amd64")
task_definition = awsx.experimental.ecs.TaskDefinition("taskDefinition", containers={
    "app": {
        "image": image.image_uri,
        "port_mappings": [{
            "container_port": float(80),
        }],
    },
})
service = awsx.experimental.ecs.Service("service",
    cluster_arn=cluster.arn,
    task_definition_arn=task_definition.task_definition_arn,
    vpc_subnet_ids=vpc.private_subnet_ids,
    load_balancer_attachments={
        "app": {
            "application": {
                "container_name": "app",
                "container_port": float(80),
                "listener_arn": listener.arn,
                "priority": float(10),
                "target_health_check": {
                    "path": "/health",
                },
            },
        },
    },
    opts = pulumi.ResourceOptions(depends_on=[
            frontend_http,
            frontend_egress,
        ]))
pulumi.export("url", alb.dns_name.apply(lambda dns_name: f"http://{dns_name}"))
```


</pulumi-choosable></div>

<div><pulumi-choosable type="language" values="go">

```go
package main

import (
	"fmt"

	awsec2 "github.com/pulumi/pulumi-aws/sdk/v7/go/aws/ec2"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/ecs"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/lb"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/vpc"
	"github.com/pulumi/pulumi-awsx/sdk/v3/go/awsx/ec2"
	"github.com/pulumi/pulumi-awsx/sdk/v3/go/awsx/ecr"
	"github.com/pulumi/pulumi-awsx/sdk/v3/go/awsx/experimental"
	experimentalecs "github.com/pulumi/pulumi-awsx/sdk/v3/go/awsx/experimental/ecs"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		vpc2, err := ec2.NewVpc(ctx, "vpc", &ec2.VpcArgs{
			SubnetStrategy:        ec2.SubnetAllocationStrategyAutoMerge,
			SubnetNameTagStrategy: ec2.SubnetNameTagStrategyAvailabilityZone,
		})
		if err != nil {
			return err
		}
		frontend, err := awsec2.NewSecurityGroup(ctx, "frontend", &awsec2.SecurityGroupArgs{
			VpcId: vpc2.VpcId,
		})
		if err != nil {
			return err
		}
		frontendHttp, err := vpc.NewSecurityGroupIngressRule(ctx, "frontendHttp", &vpc.SecurityGroupIngressRuleArgs{
			SecurityGroupId: frontend.ID().ToIDOutput().ToStringOutput(),
			IpProtocol:      pulumi.String("tcp"),
			FromPort:        pulumi.Int(80),
			ToPort:          pulumi.Int(80),
			CidrIpv4:        pulumi.String("0.0.0.0/0"),
		})
		if err != nil {
			return err
		}
		frontendEgress, err := vpc.NewSecurityGroupEgressRule(ctx, "frontendEgress", &vpc.SecurityGroupEgressRuleArgs{
			SecurityGroupId: frontend.ID().ToIDOutput().ToStringOutput(),
			IpProtocol:      pulumi.String("-1"),
			CidrIpv4:        pulumi.String("0.0.0.0/0"),
		})
		if err != nil {
			return err
		}
		alb, err := lb.NewLoadBalancer(ctx, "alb", &lb.LoadBalancerArgs{
			LoadBalancerType: pulumi.String("application"),
			Internal:         pulumi.Bool(false),
			Subnets:          vpc2.PublicSubnetIds,
			SecurityGroups: pulumi.StringArray{
				frontend.ID().ToIDOutput().ToStringOutput(),
			},
		})
		if err != nil {
			return err
		}
		listener, err := lb.NewListener(ctx, "listener", &lb.ListenerArgs{
			LoadBalancerArn: alb.Arn,
			Port:            pulumi.Int(80),
			Protocol:        pulumi.String("HTTP"),
			DefaultActions: lb.ListenerDefaultActionArray{
				&lb.ListenerDefaultActionArgs{
					Type: pulumi.String("fixed-response"),
					FixedResponse: &lb.ListenerDefaultActionFixedResponseArgs{
						StatusCode:  pulumi.String("404"),
						ContentType: pulumi.String("text/plain"),
						MessageBody: pulumi.String("Not found"),
					},
				},
			},
		})
		if err != nil {
			return err
		}
		cluster, err := ecs.NewCluster(ctx, "cluster", nil)
		if err != nil {
			return err
		}
		repository, err := ecr.NewRepository(ctx, "repository", nil)
		if err != nil {
			return err
		}
		image, err := ecr.NewImage(ctx, "image", &ecr.ImageArgs{
			RepositoryUrl: repository.Repository.ApplyT(func(repository *ecr.Repository) (string, error) {
				return repository.RepositoryUrl, nil
			}).(pulumi.StringOutput),
			Context:  pulumi.String("./app"),
			Platform: pulumi.String("linux/amd64"),
		})
		if err != nil {
			return err
		}
		taskDefinition, err := experimentalecs.NewTaskDefinition(ctx, "taskDefinition", &experimentalecs.TaskDefinitionArgs{
			Containers: map[string]*ecs.ContainerDefinitionOptionsArgs{
				"app": ecs.ContainerDefinitionOptionsArgs{
					Image: image.ImageUri,
					PortMappings: []ecs.AwsvpcPortMappingArgs{
						{
							ContainerPort: 80,
						},
					},
				},
			},
		})
		if err != nil {
			return err
		}
		_, err = experimentalecs.NewService(ctx, "service", &experimentalecs.ServiceArgs{
			ClusterArn:        cluster.Arn,
			TaskDefinitionArn: taskDefinition.TaskDefinitionArn,
			VpcSubnetIds:      vpc2.PrivateSubnetIds,
			LoadBalancerAttachments: map[string]ecs.ServiceLoadBalancerArgs{
				"app": ecs.ServiceLoadBalancerArgs{
					Application: ecs.ApplicationServiceLoadBalancerArgs{
						ContainerName: "app",
						ContainerPort: 80,
						ListenerArn:   listener.Arn,
						Priority:      10,
						TargetHealthCheck: ecs.TargetGroupHealthCheckArgs{
							Path: "/health",
						},
					},
				},
			},
		}, pulumi.DependsOn([]pulumi.Resource{
			frontendHttp,
			frontendEgress,
		}))
		if err != nil {
			return err
		}
		ctx.Export("url", alb.DnsName.ApplyT(func(dnsName string) (string, error) {
			return fmt.Sprintf("http://%v", dnsName), nil
		}).(pulumi.StringOutput))
		return nil
	})
}
```


</pulumi-choosable></div>

<div><pulumi-choosable type="language" values="csharp">

```csharp
using System.Collections.Generic;
using System.Linq;
using Pulumi;
using Aws = Pulumi.Aws;
using Awsx = Pulumi.Awsx;

return await Deployment.RunAsync(() => 
{
    var vpc = new Awsx.Ec2.Vpc("vpc", new()
    {
        SubnetStrategy = Awsx.Ec2.SubnetAllocationStrategy.AutoMerge,
        SubnetNameTagStrategy = Awsx.Ec2.SubnetNameTagStrategy.AvailabilityZone,
    });

    var frontend = new Aws.Ec2.SecurityGroup("frontend", new()
    {
        VpcId = vpc.VpcId,
    });

    var frontendHttp = new Aws.Vpc.SecurityGroupIngressRule("frontendHttp", new()
    {
        SecurityGroupId = frontend.Id,
        IpProtocol = "tcp",
        FromPort = 80,
        ToPort = 80,
        CidrIpv4 = "0.0.0.0/0",
    });

    var frontendEgress = new Aws.Vpc.SecurityGroupEgressRule("frontendEgress", new()
    {
        SecurityGroupId = frontend.Id,
        IpProtocol = "-1",
        CidrIpv4 = "0.0.0.0/0",
    });

    var alb = new Aws.LB.LoadBalancer("alb", new()
    {
        LoadBalancerType = "application",
        Internal = false,
        Subnets = vpc.PublicSubnetIds,
        SecurityGroups = new[]
        {
            frontend.Id,
        },
    });

    var listener = new Aws.LB.Listener("listener", new()
    {
        LoadBalancerArn = alb.Arn,
        Port = 80,
        Protocol = "HTTP",
        DefaultActions = new[]
        {
            new Aws.LB.Inputs.ListenerDefaultActionArgs
            {
                Type = "fixed-response",
                FixedResponse = new Aws.LB.Inputs.ListenerDefaultActionFixedResponseArgs
                {
                    StatusCode = "404",
                    ContentType = "text/plain",
                    MessageBody = "Not found",
                },
            },
        },
    });

    var cluster = new Aws.Ecs.Cluster("cluster");

    var repository = new Awsx.Ecr.Repository("repository");

    var image = new Awsx.Ecr.Image("image", new()
    {
        RepositoryUrl = repository.Repository.Apply(repository => repository.RepositoryUrl),
        Context = "./app",
        Platform = "linux/amd64",
    });

    var taskDefinition = new Awsx.Experimental.Ecs.TaskDefinition("taskDefinition", new()
    {
        Containers = 
        {
            { "app", new Awsx.Experimental.Ecs.Inputs.ContainerDefinitionOptionsArgs
            {
                Image = image.ImageUri,
                PortMappings = new()
                {
                    new Awsx.Experimental.Ecs.Inputs.AwsvpcPortMappingArgs
                    {
                        ContainerPort = 80.0,
                    },
                },
            } },
        },
    });

    var service = new Awsx.Experimental.Ecs.Service("service", new()
    {
        ClusterArn = cluster.Arn,
        TaskDefinitionArn = taskDefinition.TaskDefinitionArn,
        VpcSubnetIds = vpc.PrivateSubnetIds,
        LoadBalancerAttachments = 
        {
            { "app", new Awsx.Experimental.Ecs.Inputs.ServiceLoadBalancerArgs
            {
                Application = new Awsx.Experimental.Ecs.Inputs.ApplicationServiceLoadBalancerArgs
                {
                    ContainerName = "app",
                    ContainerPort = 80.0,
                    ListenerArn = listener.Arn,
                    Priority = 10.0,
                    TargetHealthCheck = new Awsx.Experimental.Ecs.Inputs.TargetGroupHealthCheckArgs
                    {
                        Path = "/health",
                    },
                },
            } },
        },
    }, new ComponentResourceOptions
    {
        DependsOn =
        {
            frontendHttp,
            frontendEgress,
        },
    });

    return new Dictionary<string, object?>
    {
        ["url"] = alb.DnsName.Apply(dnsName => $"http://{dnsName}"),
    };
});
```


</pulumi-choosable></div>

<div><pulumi-choosable type="language" values="java">

```java
package generated_program;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.core.Output;
import com.pulumi.awsx.ec2.Vpc;
import com.pulumi.awsx.ec2.VpcArgs;
import com.pulumi.aws.ec2.SecurityGroup;
import com.pulumi.aws.ec2.SecurityGroupArgs;
import com.pulumi.aws.vpc.SecurityGroupIngressRule;
import com.pulumi.aws.vpc.SecurityGroupIngressRuleArgs;
import com.pulumi.aws.vpc.SecurityGroupEgressRule;
import com.pulumi.aws.vpc.SecurityGroupEgressRuleArgs;
import com.pulumi.aws.lb.LoadBalancer;
import com.pulumi.aws.lb.LoadBalancerArgs;
import com.pulumi.aws.lb.Listener;
import com.pulumi.aws.lb.ListenerArgs;
import com.pulumi.aws.lb.inputs.ListenerDefaultActionArgs;
import com.pulumi.aws.lb.inputs.ListenerDefaultActionFixedResponseArgs;
import com.pulumi.aws.ecs.Cluster;
import com.pulumi.awsx.ecr.Repository;
import com.pulumi.awsx.ecr.Image;
import com.pulumi.awsx.ecr.ImageArgs;
import com.pulumi.awsx.experimental.TaskDefinition;
import com.pulumi.awsx.experimental.TaskDefinitionArgs;
import com.pulumi.awsx.experimental.inputs.ContainerDefinitionOptionsArgs;
import com.pulumi.awsx.experimental.inputs.AwsvpcPortMappingArgs;
import com.pulumi.awsx.experimental.Service;
import com.pulumi.awsx.experimental.ServiceArgs;
import com.pulumi.awsx.experimental.inputs.ServiceLoadBalancerArgs;
import com.pulumi.awsx.experimental.inputs.ApplicationServiceLoadBalancerArgs;
import com.pulumi.awsx.experimental.inputs.TargetGroupHealthCheckArgs;
import com.pulumi.resources.CustomResourceOptions;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Map;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    public static void stack(Context ctx) {
        var vpc = new Vpc("vpc", VpcArgs.builder()
            .subnetStrategy("AutoMerge")
            .subnetNameTagStrategy("AvailabilityZone")
            .build());

        var frontend = new SecurityGroup("frontend", SecurityGroupArgs.builder()
            .vpcId(vpc.vpcId())
            .build());

        var frontendHttp = new SecurityGroupIngressRule("frontendHttp", SecurityGroupIngressRuleArgs.builder()
            .securityGroupId(frontend.id())
            .ipProtocol("tcp")
            .fromPort(80)
            .toPort(80)
            .cidrIpv4("0.0.0.0/0")
            .build());

        var frontendEgress = new SecurityGroupEgressRule("frontendEgress", SecurityGroupEgressRuleArgs.builder()
            .securityGroupId(frontend.id())
            .ipProtocol("-1")
            .cidrIpv4("0.0.0.0/0")
            .build());

        var alb = new LoadBalancer("alb", LoadBalancerArgs.builder()
            .loadBalancerType("application")
            .internal(false)
            .subnets(vpc.publicSubnetIds())
            .securityGroups(frontend.id())
            .build());

        var listener = new Listener("listener", ListenerArgs.builder()
            .loadBalancerArn(alb.arn())
            .port(80)
            .protocol("HTTP")
            .defaultActions(ListenerDefaultActionArgs.builder()
                .type("fixed-response")
                .fixedResponse(ListenerDefaultActionFixedResponseArgs.builder()
                    .statusCode("404")
                    .contentType("text/plain")
                    .messageBody("Not found")
                    .build())
                .build())
            .build());

        var cluster = new Cluster("cluster");

        var repository = new Repository("repository");

        var image = new Image("image", ImageArgs.builder()
            .repositoryUrl(repository.repository().applyValue(_repository -> _repository.repositoryUrl()))
            .context("./app")
            .platform("linux/amd64")
            .build());

        var taskDefinition = new TaskDefinition("taskDefinition", TaskDefinitionArgs.builder()
            .containers(Map.of("app", ContainerDefinitionOptionsArgs.builder()
                .image(image.imageUri())
                .portMappings(AwsvpcPortMappingArgs.builder()
                    .containerPort(80.0)
                    .build())
                .build()))
            .build());

        var service = new Service("service", ServiceArgs.builder()
            .clusterArn(cluster.arn())
            .taskDefinitionArn(taskDefinition.taskDefinitionArn())
            .vpcSubnetIds(vpc.privateSubnetIds())
            .loadBalancerAttachments(Map.of("app", ServiceLoadBalancerArgs.builder()
                .application(ApplicationServiceLoadBalancerArgs.builder()
                    .containerName("app")
                    .containerPort(80.0)
                    .listenerArn(listener.arn())
                    .priority(10.0)
                    .targetHealthCheck(TargetGroupHealthCheckArgs.builder()
                        .path("/health")
                        .build())
                    .build())
                .build()))
            .build(), CustomResourceOptions.builder()
                .dependsOn(                
                    frontendHttp,
                    frontendEgress)
                .build());

        ctx.export("url", alb.dnsName().applyValue(_dnsName -> String.format("http://%s", _dnsName)));
    }
}
```


</pulumi-choosable></div>

<div><pulumi-choosable type="language" values="yaml">

```yaml
name: experimental-service-alb
runtime: yaml
resources:
  vpc:
    type: awsx:ec2:Vpc
    properties:
      subnetStrategy: AutoMerge
      subnetNameTagStrategy: AvailabilityZone
  frontend:
    type: aws:ec2/securityGroup:SecurityGroup
    properties:
      vpcId: ${vpc.vpcId}
  # Ingress rule allowing http port 80 from the internet
  frontendHttp:
    type: aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule
    properties:
      securityGroupId: ${frontend.id}
      ipProtocol: tcp
      fromPort: 80
      toPort: 80
      cidrIpv4: 0.0.0.0/0
  # Egress all from the Load Balancer
  frontendEgress:
    type: aws:vpc/securityGroupEgressRule:SecurityGroupEgressRule
    properties:
      securityGroupId: ${frontend.id}
      ipProtocol: -1
      cidrIpv4: 0.0.0.0/0
  # Create a public facing Application Load Balancer
  alb:
    type: aws:lb/loadBalancer:LoadBalancer
    properties:
      loadBalancerType: application
      internal: false
      subnets: ${vpc.publicSubnetIds}
      securityGroups:
        - ${frontend.id}
  # Create a production listener for HTTP port 80.
  # Default action is a fixed-response. Other rules will be added by the Service component
  listener:
    type: aws:lb/listener:Listener
    properties:
      loadBalancerArn: ${alb.arn}
      port: 80
      protocol: HTTP
      defaultActions:
        - type: fixed-response
          fixedResponse:
            statusCode: '404'
            contentType: text/plain
            messageBody: Not found
  cluster:
    type: aws:ecs/cluster:Cluster
  repository:
    type: awsx:ecr:Repository
  # Build and push your app image to ECR
  image:
    type: awsx:ecr:Image
    properties:
      repositoryUrl: ${repository.repository.repositoryUrl}
      context: ./app
      platform: linux/amd64
  taskDefinition:
    type: awsx:experimental/ecs:TaskDefinition
    properties:
      containers:
        app:
          image: ${image.imageUri}
          portMappings:
            - containerPort: 80
  # Create your ECS Service attached to the load balancer targeting the "app" container on port 80
  service:
    type: awsx:experimental/ecs:Service
    properties:
      clusterArn: ${cluster.arn}
      taskDefinitionArn: ${taskDefinition.taskDefinitionArn}
      vpcSubnetIds: ${vpc.privateSubnetIds}
      loadBalancerAttachments:
        app:
          application:
            containerName: app
            containerPort: 80
            listenerArn: ${listener.arn}
            priority: 10
            targetHealthCheck:
              path: /health
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
outputs:
  url: http://${alb.dnsName}
```


</pulumi-choosable></div>

</pulumi-examples></div>

### How deployments work

A service's deployment strategy controls how ECS replaces tasks and shifts traffic to a new revision:

- **Rolling**, the default, replaces tasks within the service. Each load balancer attachment uses one target group.
- **Blue/green** shifts production traffic to the new revision once it is ready.
- **Canary** sends an initial percentage of production traffic to the new revision, waits through an observation period, then shifts the remaining traffic.
- **Linear** shifts production traffic in increments, with an observation period between shifts.

Progressive deployments (blue/green, canary, linear) work by provisioning two target groups (`blue` and `green`) per attachment. You attach both target groups to a to a single listener rule with initial weights forwarding 100% of traffic to the `blue` target group.

The component creates a production rule equivalent to the following. This is an illustration of the underlying resources, not an additional rule you need to create.

```yaml
resources:
  rule:
    type: aws:lb/listenerRule:ListenerRule
    properties:
      listenerArn: ${listener.arn}
      conditions:
        - hostHeader:
            values:
              - api.example.com
      actions:
        - type: forward
          forward:
            targetGroups:
              - arn: ${primaryTargetGroup.arn}
                weight: 1
              - arn: ${alternateTargetGroup.arn}
                weight: 0
```

After the initial deployment, the ECS service will manage the weights on the listener rule as part of the progressive deployment. For example, if using a `blue/green` deployment it will change the weight on the `primaryTargetGroup` to `0` and the weight on the `alternateTargetGroup` to `1`. ECS is only able to do this at this grouping level. You can have multiple `ListenerRule + PrimaryTargetGroup + AlternateTargetGroup` pairings, but the same deployment configuration applies across all of them.

For a complete application example and detailed strategy, hook, and timeout settings, see the [Service documentation](./api-docs/experimental/ecs/service/).
