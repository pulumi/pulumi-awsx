---
title: AWSx (Pulumi AWS Components)
meta_desc: Well-Architected Infrastructure as Code for AWS. The easiest way to AWS — from development to production.
layout: package
---

The Amazon Web Services (AWS) AWSx library uses automatic well-architected best practices to make common infrastructure-as-code tasks in [AWS](https://aws.amazon.com/) easier and more secure. It uses the AWS SDK to manage and provision resources.

The AWSx provider must be configured with credentials to deploy and update resources in AWS; see [Installation & Configuration](./installation-configuration) for instructions.

**New to Pulumi and AWS?** [Get started with AWS using our AWSx tutorial](/docs/clouds/aws/guides/).

## Example

<!--Start PulumiCodeChooser -->

```yaml pulumi-example
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

<!--End PulumiCodeChooser -->

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

```yaml pulumi-example
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
