# Services

You can use an Amazon ECS service to run and maintain a specified number of instances of a task definition simultaneously in an Amazon ECS cluster. If one of your tasks fails or stops, the Amazon ECS service scheduler launches another instance of your task definition to replace it. This helps maintain your desired number of tasks in the service.

This component uses both the [AWS](https://www.pulumi.com/registry/packages/aws/) and [AWS Cloud Control](https://www.pulumi.com/registry/packages/aws-native/) providers so make sure they are both configured to use the same account and region.

## Example Usage

### Basic example

```yaml pulumi-example
name: experimental-service
runtime: yaml
resources:
  cluster:
    type: aws:ecs/cluster:Cluster
  vpc:
    type: awsx:ec2:Vpc
  taskDefinition:
    type: awsx:experimental/ecs:TaskDefinition
    properties:
      containers:
        app:
          image: nginx:stable
          portMappings:
            - containerPort: 80
  service:
    type: awsx:experimental/ecs:Service
    properties:
      clusterArn: ${cluster.arn}
      taskDefinitionArn: ${taskDefinition.taskDefinitionArn}
      vpcSubnetIds: ${vpc.privateSubnetIds}
```

The task definition must use `awsvpc` networking and be compatible with the service's selected capacity. The AWSX `TaskDefinitition` use `awsvpc` networking by default.

### Application Load Balancer

Use `loadBalancerAttachments` to route requests from an existing Application Load Balancer listener to a container in the service.

```yaml pulumi-example
name: experimental-service-alb
runtime: yaml
resources:
  vpc:
    type: awsx:ec2:Vpc
    properties:
      numberOfAvailabilityZones: 2
  frontend:
    type: aws:ec2/securityGroup:SecurityGroup
    properties:
      vpcId: ${vpc.vpcId}
  frontendHttp:
    type: aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule
    properties:
      securityGroupId: ${frontend.id}
      ipProtocol: -1
      cidrIpv4: 0.0.0.0/0
  frontendEgress:
    type: aws:vpc/securityGroupEgressRule:SecurityGroupEgressRule
    properties:
      securityGroupId: ${frontend.id}
      ipProtocol: tcp
      fromPort: 80
      toPort: 80
      cidrIpv4: ${vpc.vpc.cidrBlock}
  alb:
    type: aws:lb/loadBalancer:LoadBalancer
    properties:
      loadBalancerType: application
      internal: false
      subnets: ${vpc.publicSubnetIds}
      securityGroups:
        - ${frontend.id}
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

With `match` omitted, the attachment forwards all request paths. The listener's default 404 response is a fallback for requests that do not match a forwarding rule.

### Single attachment

A single attachment can express all traffic going to the backend service.

- One hostname serving many paths.
- Multiple hostnames route to the same backend
- Several path patterns route to the same backend

For example, an application that serves `/users`, `/orders`, and `/admin` through `api.example.com` can create a single attachment
that matches on hostname and let the backend application handle the URL paths.

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
  service:
    type: awsx:experimental/ecs:Service
    properties:
      clusterArn: ${cluster.arn}
      taskDefinitionArn: ${taskDefinition.taskDefinitionArn}
      vpcSubnetIds: ${vpc.privateSubnetIds}
      deploymentStrategy:
        canary:
          canaryPercent: 10
          canaryBakeTimeMinutes: 10
          bakeTimeMinutes: 5
      loadBalancerAttachments:
        app:
          application:
            containerName: app
            containerPort: 80
            targetHealthCheck:
              path: /health
            listenerArn: ${listener.arn}
            priority: 50
            match:
              hostnames:
                values:
                  - api.example.com
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
```

You could also select only specific paths to send to the backend service.

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
  service:
    type: awsx:experimental/ecs:Service
    properties:
      clusterArn: ${cluster.arn}
      taskDefinitionArn: ${taskDefinition.taskDefinitionArn}
      vpcSubnetIds: ${vpc.privateSubnetIds}
      deploymentStrategy:
        canary:
          canaryPercent: 10
          canaryBakeTimeMinutes: 10
          bakeTimeMinutes: 5
      loadBalancerAttachments:
        app:
          application:
            containerName: app
            containerPort: 80
            targetHealthCheck:
              path: /health
            listenerArn: ${listener.arn}
            priority: 50
            match:
              hostnames:
                values:
                  - api.example.com
              pathPatterns:
                values:
                  - '/api/*'
                  - '/admin/*'
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
```

This matches requests where the hostname is `api.example.com` **AND** the path matches either `/api/*` **OR** `/admin/*`. Alternatives within a condition are combined with OR, different condition types are combined with AND.

The rule of thumb here is that if you can express the routing logic in a single attachment then you should.

### Multiple attachments to same backend

You can use separate attachments when the same container and port needs more than one independently evaluated production forwarding rule.

- Different priorities, hostname/path pairings, or condition lists that cannot fit in one rule
- Two listeners directly forward application traffic to the same backend
- External and internal clients reach the same application through different load balancers

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
  service:
    type: awsx:experimental/ecs:Service
    properties:
      clusterArn: ${cluster.arn}
      taskDefinitionArn: ${taskDefinition.taskDefinitionArn}
      vpcSubnetIds: ${vpc.privateSubnetIds}
      deploymentStrategy:
        canary:
          canaryPercent: 10
          canaryBakeTimeMinutes: 10
          bakeTimeMinutes: 5
      loadBalancerAttachments:
        api:
          application:
            containerName: app
            containerPort: 80
            targetHealthCheck:
              path: /health
            listenerArn: ${listener.arn}
            priority: 10
            match:
              hostnames:
                values:
                  - api.example.com
              pathPatterns:
                values:
                  - '/api/*'
        admin:
          application:
            containerName: app
            containerPort: 80
            targetHealthCheck:
              path: /health
            listenerArn: ${listener.arn}
            priority: 20
            match:
              hostnames:
                values:
                  - admin.example.com
              pathPatterns:
                values:
                  - '/admin/*'
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
```

These attachments preserve two specific hostname/path pairings.

- `api.example.com` with `/api/*`
- `admin.example.com` with `/admin/*`

Combining both hostnames and both paths in one rule would also permit the cross-pairings (`api.example.com/admin/*` _and_ `admin.example.com/api/*`). If those pairings must remain distinct, use separate rules and attachments.

For progressive deployments, each production rule has its own primary/alternate target-group pair. Both attachments follow the same service-wide deployment configuration.

#### Different listeners or ALBs

The same pattern works with different `listenerArn` values. For example, maybe you configure a private Load Balancer and a public Load Balancer to route to the same backend. In that case you need two attachments.

> **Automatic ingress limitation:** When attachments share an application or health-check port, automatic ingress requires them to use the same ALB source security group. Different ALBs with different source groups require `manageIngress: false` and user managed task ingress.
>
> AWSX declares ingress resources during preview, when ALB security-group IDs may still be unknown. This restriction avoids duplicate rules without creating resources inside an apply.

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
  taskGroup:
    type: aws:ec2/securityGroup:SecurityGroup
    properties:
      vpcId: ${vpc.vpcId}
  taskEgress:
    type: aws:vpc/securityGroupEgressRule:SecurityGroupEgressRule
    properties:
      securityGroupId: ${taskGroup.id}
      ipProtocol: -1
      cidrIpv4: 0.0.0.0/0
  privateIngress:
    type: aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule
    properties:
      securityGroupId: ${taskGroup.id}
      referencedSecurityGroupId: ${privateAlbGroup.id}
      ipProtocol: tcp
      fromPort: 80
      toPort: 80
  publicIngress:
    type: aws:vpc/securityGroupIngressRule:SecurityGroupIngressRule
    properties:
      securityGroupId: ${taskGroup.id}
      referencedSecurityGroupId: ${frontend.id}
      ipProtocol: tcp
      fromPort: 80
      toPort: 80
  service:
    type: awsx:experimental/ecs:Service
    properties:
      clusterArn: ${cluster.arn}
      taskDefinitionArn: ${taskDefinition.taskDefinitionArn}
      vpcSubnetIds: ${vpc.privateSubnetIds}
      deploymentStrategy:
        canary:
          canaryPercent: 10
          canaryBakeTimeMinutes: 10
          bakeTimeMinutes: 5
      manageIngress: false
      securityGroupIds:
        - ${taskGroup.id}
      loadBalancerAttachments:
        public:
          application:
            containerName: app
            containerPort: 80
            listenerArn: ${listener.arn}
            priority: 50
            match:
              pathPatterns:
                values:
                  - '/*'
        private:
          application:
            containerName: app
            containerPort: 80
            listenerArn: ${privateListener.arn}
            priority: 50
            match:
              pathPatterns:
                values:
                  - '/*'
    options:
      dependsOn:
        - ${taskEgress}
        - ${privateIngress}
        - ${publicIngress}
        - ${frontendHttp}
        - ${frontendEgress}
        - ${privateFrontendHttp}
        - ${privateFrontendEgress}
```

If health checks use a separate port, allow that port from both ALB security groups too.

### Multiple attachments to different backends

You can use separate attachments when different containers or ports in a single task receive different traffic.

- A UI container and an API container run together in a single task
- One container serves multiple load-balanced ports

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
  service:
    type: awsx:experimental/ecs:Service
    properties:
      clusterArn: ${cluster.arn}
      taskDefinitionArn: ${uiApiTask.taskDefinitionArn}
      vpcSubnetIds: ${vpc.privateSubnetIds}
      deploymentStrategy:
        canary:
          canaryPercent: 10
          canaryBakeTimeMinutes: 10
          bakeTimeMinutes: 5
      loadBalancerAttachments:
        ui:
          application:
            containerName: ui
            containerPort: 3000
            targetHealthCheck:
              path: /health
            listenerArn: ${listener.arn}
            priority: 10
            match:
              hostnames:
                values:
                  - www.example.com
        api:
          application:
            containerName: api
            containerPort: 8080
            targetHealthCheck:
              path: /health
            listenerArn: ${listener.arn}
            priority: 20
            match:
              hostnames:
                values:
                  - api.example.com
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
        - ${frontendUiEgress}
        - ${frontendApiEgress}
```

### Deployment strategies

Deployment strategies control how ECS replaces tasks and shifts traffic to a new service revision:

1. **Rolling (default)** replaces tasks within the service.
2. **Blue/green** shifts production traffic to the new revision once it is ready.
3. **Linear** shifts production traffic in increments.
4. **Canary** shifts an initial percentage of production traffic, then shifts the remainder after an observation period.

To select a strategy explicitly, configure exactly one of `rolling`, `blueGreen`, `linear`, or `canary` in `deploymentStrategy`. For blue/green, linear, and canary deployments, each load balancer attachment uses two target groups. ECS manages the forwarding weights during deployment. AWSX ignores changes to those weights so Pulumi does not reset the current traffic allocation. Make sure to `refresh` the stack before subsequent updates to retain ECS's current allocation in state.

#### Rolling deployments

Rolling deployments replace existing tasks with tasks using the new revision. The basic example above uses rolling deployments. To configure rolling deployment settings explicitly:

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
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
      deploymentStrategy:
        rolling:
          failureAction: Rollback
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
```

By default, a failed deployment rolls back to the last successfully completed deployment when one is available.

#### Blue/green deployments

Blue/green deployments start a new service revision before shifting all production traffic to it.

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
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
      deploymentStrategy:
        blueGreen:
          bakeTimeMinutes: 5
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
```

`bakeTimeMinutes` is the amount of time ECS keeps the previous revision running after production traffic is shifted to the new revision. After the `bakeTimeMinutes` is up, the old revision is removed. See [the AWS docs for more details](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-blue-green.html).

#### Linear deployments

Linear deployments shift production traffic to the new revision in increments. This example shifts traffic in 20% increments, with a 3-minute observation period (`stepBakeTimeMinutes`) between shifts:

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
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
      deploymentStrategy:
        linear:
          stepPercent: 20
          stepBakeTimeMinutes: 3
          bakeTimeMinutes: 5
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
```

After all production traffic shifts, ECS keeps the previous revision running for another 5 minutes (`bakeTimeMinutes`).

Linear deployments require at least one load balancer attachment, see [the AWS docs for more details](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-linear.html).

#### Canary deployments

Canary deployments send an initial percentage of production traffic to the new revision before shifting the remainder.

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
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
      deploymentStrategy:
        canary:
          canaryPercent: 10
          canaryBakeTimeMinutes: 10
          bakeTimeMinutes: 5
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
```

This configuration sends 10% of production traffic (`canaryPercent`) to the new revision for 10 minutes (`canaryBakeTimeMinutes`). ECS then shifts the remaining traffic and keeps the previous revision running for another 5 minutes (`bakeTimeMinutes`).

Canary deployments require at least one load balancer attachment, see [the AWS docs for more details](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/canary-deployment.html).

### Deployment lifecycle hooks

Use `lambdaHooks` to validate a deployment with a Lambda function, or `pauseHooks` to wait for an external approval or validation workflow.

#### Lambda hooks

Add Lambda hooks inside the selected deployment strategy. This example invokes an existing Lambda function before a rolling deployment starts replacement tasks.

The Lambda Function must implement the [ECS Lambda hook contract](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/lambda-lifecycle-hooks.html) and perform the pre-deployment checks your application requires.

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
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
      deploymentStrategy:
        rolling:
          lambdaHooks:
            - functionArn: arn:aws:lambda:us-west-2:123456789012:function:deployment-validation
              hookDetails:
                someKey: someValue
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
```

The existing function's execution role must grant any permissions its checks require, such as reading configuration or writing logs. This is separate from the invocation role that lets ECS call the function.

The `hookDetails` field is a dictionary that you can use to pass data into your lifecycle hook function.

#### Pause hooks

Pause hooks wait for an external workflow to continue or roll back the deployment. This example pauses a rolling deployment before replacement tasks start:

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
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
      deploymentStrategy:
        rolling:
          pauseHooks:
            - timeoutMinutes: 30
              timeoutAction: ROLLBACK
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
```

See the [AWS docs](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/pause-lifecycle-hooks.html) for more details on pause hooks.

Lambda and pause hooks at the same stage run in parallel and every hook must complete before the deployment proceeds.

#### Progressive deployment hooks

For blue/green, linear, and canary deployments, you can specify the lifecycle stages where each hook will run. This example uses an existing validation function, adds a header-based test route, and invokes the function after test traffic reaches the new revision.

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
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
            testTraffic:
              match:
                headers:
                  - name: X-Deployment-Test
                    values:
                      - 'true'
      deploymentStrategy:
        canary:
          canaryPercent: 10
          canaryBakeTimeMinutes: 10
          bakeTimeMinutes: 5
          lambdaHooks:
            - functionArn: arn:aws:lambda:us-west-2:123456789012:function:deployment-validation
              lifecycleStages:
                - POST_TEST_TRAFFIC_SHIFT
          pauseHooks:
            - lifecycleStages:
                - PRE_PRODUCTION_TRAFFIC_SHIFT
              timeoutMinutes: 30
              timeoutAction: ROLLBACK
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
```

Use `POST_TEST_TRAFFIC_SHIFT` with a test traffic route to validate the new revision before production traffic shifts.

For canary and linear deployments, `PRE_PRODUCTION_TRAFFIC_SHIFT` pauses before each traffic shift. Each pause has a new hook ID and requires a separate decision.

### Test traffic

Use `testTraffic` to route validation requests to the new revision before production traffic shifts. In this example ECS will provision the new revision, shift just the test traffic (all requests with headers matching `X-Deployment-Test`) over to the new revision, and then pause so you can validate the new revision before allowing production traffic to shift.

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
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
            testTraffic:
              match:
                headers:
                  - name: X-Deployment-Test
                    values:
                      - 'true'
      deploymentStrategy:
        blueGreen:
          bakeTimeMinutes: 5
          pauseHooks:
            - lifecycleStages:
                - POST_TEST_TRAFFIC_SHIFT
              timeoutMinutes: 30
              timeoutAction: ROLLBACK
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
```

An outside workflow must then call `ContinueServiceDeployment` with `CONTINUE` or `ROLLBACK`.

### Deployment timeouts

By default, Pulumi waits for the service to reach a steady state. For progressive deployments, this includes the traffic shifts and bake periods which can be substantial depending on the configuration.

The component attempts to calculate the timeout based on how the progressive deployments have been configured, but if you need to manually control the timeout you can set `deploymentTimeout`.

```yaml pulumi-example fixture=Service.fixture.yaml
resources:
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
      deploymentTimeout: 2h
    options:
      dependsOn:
        - ${frontendHttp}
        - ${frontendEgress}
```

This timeout applies to Pulumi's create and update operations. Reaching it fails the Pulumi operation but does not stop the ECS deployment.

If you have a separate process that monitors the ECS deployment and don't want the Pulumi operation to wait, you can set `waitForSteadyState: false`.
