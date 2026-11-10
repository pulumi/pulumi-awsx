# Task definitions

A task definition is a blueprint for your application. It describes the parameters and one or more containers that form your application.

## Example Usage

### Basic example

```yaml pulumi-example
name: experimental-task-definition
runtime: yaml
resources:
  task:
    type: awsx:experimental/ecs:TaskDefinition
    properties:
      containers:
        app:
          image: nginx:stable
          portMappings:
            - containerPort: 80
outputs:
  taskDefinitionArn: ${task.taskDefinitionArn}
```

### Capacity compatibility

Task compatibility defines which compute environments the task can run on:

1. **Fargate**
2. **EC2**
3. **Managed Instances**

Compatibility defaults to `FARGATE`. To support multiple environments, list them in `compatibilities`. AWSX validates the configuration against all selected environments. This does not select _where_ the task runs or provision capacity, it only declares where it _can_ run.

```yaml pulumi-example
name: experimental-task-definition
runtime: yaml
resources:
  task:
    type: awsx:experimental/ecs:TaskDefinition
    properties:
      compatibilities:
        - FARGATE
        - MANAGED_INSTANCES
        - EC2
      containers:
        app:
          image: nginx:stable
          portMappings:
            - containerPort: 80
output:
  taskDefinitionArn: ${task.taskDefinitionArn}
```

### Managed Instances compatibility

When `FARGATE` is included, AWSX selects a valid Fargate task size from the container requirements unless you provide explicit CPU and memory values. To use a task size outside the supported Fargate combinations, select only the environment you need.

This example targets Managed Instances and explicitly sets the task's CPU and memory:

```yaml pulumi-example
name: experimental-task-definition
runtime: yaml
resources:
  task:
    type: awsx:experimental/ecs:TaskDefinition
    properties:
      cpuUnits: 256
      memoryMiB: 256
      compatibilities:
        - MANAGED_INSTANCES
      containers:
        app:
          image: nginx:stable
          portMappings:
            - containerPort: 80
outputs:
  taskDefinitionArn: ${task.taskDefinitionArn}
```

### Environment variables and secrets

Use `environment` to configure ordinary values, Pulumi secrets, and references to AWS Secrets Manager or Systems Manager Parameter Store.

For secret sources, AWSX adds retrieval permissions to the task execution role. ECS retrieves the values when tasks start. The values are available as environment variables inside the container, rather than stored as plaintext in the ECS task definition.

### Pulumi secrets

```yaml pulumi-example
name: experimental-task-definition
runtime: yaml
config:
  apiToken:
    type: string
    secret: true
resources:
  task:
    type: awsx:experimental/ecs:TaskDefinition
    properties:
      containers:
        app:
          image: nginx:stable
          environment:
            API_TOKEN:
              value: ${apiToken}
          portMappings:
            - containerPort: 80
outputs:
  taskDefinitionArn: ${task.taskDefinitionArn}
```

AWSX creates a Secrets Manager secret for the Pulumi secret value and references a specific secret version. Changing the configuration value creates a new task-definition revision which will trigger a new deployment for services that reference the task definition.

### AWS Secrets Manager

Reference a secret managed outside the task-definition component. This example creates a JSON secret with a generated password, then injects only its `password` field.

```yaml pulumi-example
name: experimental-task-definition
runtime: yaml
resources:
  databaseSecret:
    type: aws-native:secretsmanager:Secret
    properties:
      generateSecretString:
        secretStringTemplate: '{"username":"app"}'
        generateStringKey: password
        passwordLength: 32
        excludePunctuation: true
  task:
    type: awsx:experimental/ecs:TaskDefinition
    properties:
      containers:
        app:
          image: nginx:stable
          environment:
            DATABASE_PASSWORD:
              secretsManager:
                secretArn: ${databaseSecret.awsId}
                jsonKey: password
          portMappings:
            - containerPort: 80
outputs:
  taskDefinitionArn: ${task.taskDefinitionArn}
```

### AWS Systems Manager Parameter Store

```yaml pulumi-example
name: experimental-task-definition
runtime: yaml
config:
  sharedTokenParameterArn:
    type: string
resources:
  task:
    type: awsx:experimental/ecs:TaskDefinition
    properties:
      containers:
        app:
          image: nginx:stable
          environment:
            SHARED_TOKEN:
              ssmParameterArn: ${sharedTokenParameterArn}
          portMappings:
            - containerPort: 80
outputs:
  taskDefinitionArn: ${task.taskDefinitionArn}
```

Changing the value stored in the parameter will not trigger a deployment.

### Logging

The `TaskDefinition` creates a shared CloudWatch Logs log group by default where all container logs are sent. To control settings such as retention, create a log group and pass its ARN.

```yaml pulumi-example
name: task-logging
runtime: yaml
resources:
  applicationLogs:
    type: aws:cloudwatch:LogGroup
    properties:
      retentionInDays: 14

  task:
    type: awsx:experimental/ecs:TaskDefinition
    properties:
      containers:
        app:
          image: nginx:stable
          portMappings:
            - containerPort: 80
          logging:
            cloudwatch:
              logGroupArn: ${applicationLogs.arn}
              streamPrefix: app
outputs:
  taskDefinitionArn: ${task.taskDefinitionArn}
  logGroupName: ${applicationLogs.name}
```

AWSX grants the task execution role permission to write to this log group.

### CPU and memory

Task-level CPU and memory configure the resources allocated to the task. Container-level settings configure CPU reservations and memory limits within that allocation.

#### Automatic task sizing

For a small application that needs 0.5 vCPU and up to 1 GiB of memory, configure the container and leave task-level sizing unset:

```yaml pulumi-example
name: task-automatic-sizing
runtime: yaml
config:
  applicationImage:
    type: string
resources:
  task:
    type: awsx:experimental/ecs:TaskDefinition
    properties:
      containers:
        app:
          image: ${applicationImage}
          cpuUnits: 512
          memoryMiB: 1024
outputs:
  taskDefinitionArn: ${task.taskDefinitionArn}
```

AWSX selects a Fargate task with 512 CPU units and 1024 MiB of memory. This gives the task 0.5 vCPU and 1 GiB of memory.

#### Reserving headroom for memory bursts

A worker might normally need 1 GiB of memory but use up to 3 GiB while processing a job. A telemetry sidecar might normally need 256 MiB and should never exceed 512 MiB.

Use `memoryReservationMiB` for each container’s soft memory reservation and `memoryMiB` for its hard limit. Set task-level memory explicitly to provide room for bursts:

```yaml pulumi-example
name: task-memory-headroom
runtime: yaml
config:
  workerImage:
    type: string
  telemetryImage:
    type: string
resources:
  task:
    type: awsx:experimental/ecs:TaskDefinition
    properties:
      cpuUnits: 1024
      memoryMiB: 4096
      containers:
        worker:
          image: ${workerImage}
          cpuUnits: 768
          memoryReservationMiB: 1024
          memoryMiB: 3072

        telemetry:
          image: ${telemetryImage}
          cpuUnits: 256
          memoryReservationMiB: 256
          memoryMiB: 512
outputs:
  taskDefinitionArn: ${task.taskDefinitionArn}
```

The task has 1 vCPU and 4 GiB of memory. Within that allocation:

- The worker has a soft memory reservation of 1 GiB and a hard limit of 3 GiB.
- Telemetry has a soft memory reservation of 256 MiB and a hard limit of 512 MiB.
- When both containers compete for CPU, the worker has three times the CPU weight of telemetry.

When `memoryReservationMiB` is set, automatic sizing uses that reservation instead of the container’s hard memory limit. In this example, automatic sizing would select a 2 GiB task. Explicitly allocating 4 GiB provides enough headroom for the worker to grow toward its 3 GiB limit while telemetry continues running.
