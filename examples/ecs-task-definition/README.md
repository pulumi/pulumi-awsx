# ECS task and service examples

Each service program is self-contained and declares one deployment strategy.
Start with the basic ALB example, then choose the rollout behavior you need.

| Program                                                          | Shows                                                                   | Acceptance test                         |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------- |
| [Basic ALB attachment](../ecs-service-load-balancer/nodejs/)            | Rolling service, two routes, separate health-check port, optional HTTPS | `TestAccEcsServiceWithLoadBalancer`     |
| [Blue/green](../ecs-service-blue-green/nodejs/)                         | Test traffic before switching production                                | `TestAccEcsServiceBlueGreenDeployment`  |
| [Canary with validation](../ecs-service-canary/nodejs/)                 | Staged traffic and Lambda validation with an explicit invocation role   | `TestAccEcsServiceCanaryDeployment`     |
| [Linear](../ecs-service-linear/nodejs/)                                 | Traffic shifts in equal increments                                      | `TestAccEcsServiceLinearDeployment`     |
| [Rolling lifecycle hook](../ecs-service-rolling-lifecycle-hook/nodejs/) | Pre-scale-up hook with a service-generated invocation role              | `TestAccEcsServiceRollingLifecycleHook` |
| [Custom capacity](../ecs-service-capacity/nodejs/) | Single-update deployment with explicit and inherited capacity | `TestAccEcsServiceManagedInstances`, `TestAccEcsServiceEC2` |

The `nodejs`, `python`, `go`, and `dotnet` directories demonstrate the unified
`TaskDefinition` component without deploying a service. The service programs use
`Service` and pass the task revision through `taskDefinitionArn`.

These examples create clusters without default capacity strategies, so omitting
`capacity` exercises the Fargate launch-type fallback. All service tasks use Linux.
Fargate platform selection uses the ECS default. The [capacity example](../ecs-service-capacity/nodejs/) covers explicit provider selection
and inherited cluster defaults on EC2 and Managed Instances. It verifies a
single-update deployment and a no-change preview without
duplicating strategy-wiring unit tests or the ALB and deployment-strategy tests.

## Running a service example

Build and link the repository SDK first with `make build_nodejs install_nodejs_sdk`.
From the service program's `nodejs` directory:

```sh
yarn install
yarn link @pulumi/awsx
pulumi stack init dev
pulumi config set aws:region us-west-2
pulumi config set aws-native:region us-west-2
pulumi up
```

AWS credentials must be available to both providers. Task definitions and service
forwarding rules use AWS Native. Both components check that the providers target
the same account and effective region. The `nodejs` task example also
uses an engine transform to edit a container on `aws-native:ecs:TaskDefinition`.
Frontend networking and the listener belong to the program. The service manages
backend routing and task-side ingress.

Each deployment creates billable AWS resources. Run `pulumi destroy` when finished.

## Integration coverage

From `examples/`, with AWS credentials and `AWS_REGION` configured:

```sh
go test -tags=nodejs -run '^(TestAccEcsServiceWithLoadBalancer|TestAccEcsServiceBlueGreenDeployment|TestAccEcsServiceCanaryDeployment|TestAccEcsServiceLinearDeployment|TestAccEcsServiceRollingLifecycleHook)$' -timeout 120m
```

The progressive scenarios and cleanup can exceed a one-hour AWS credential session.
When using short-lived credentials, run each test separately with fresh credentials
rather than wrapping the entire suite in one credential session.

Each service scenario has its own top-level example directory. Blue/green
updates from v1 to v2. Canary and linear also update to v3. The rolling-hook
example updates to v2. Tests verify HTTP routing, hook execution where applicable,
and no-change previews, then destroy their stacks. Progressive updates refresh
state first to preserve ECS-managed traffic weights.

The Lambda implementations live in each hook example's `validationHook.ts`.
Go retains rollout driving, final HTTP checks, and a successful-hook log check.
It does not duplicate the canary Lambda's intermediate traffic assertions.

Progressive-to-rolling transitions remain outside these scenarios while
[pulumi/pulumi-awsx#2209](https://github.com/pulumi/pulumi-awsx/issues/2209) is open.
Pause continuation, pause timeout actions, and hook-triggered rollback are not covered.
