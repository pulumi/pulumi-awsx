# Experimental ECS examples

Each service program is self-contained and declares one deployment strategy.
Start with the basic ALB example, then choose the rollout behavior you need.

| Program                                                          | Shows                                                                   | Acceptance test                         |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------- |
| [Basic ALB attachment](service-load-balancer-nodejs/)            | Rolling service, two routes, separate health-check port, optional HTTPS | `TestAccEcsServiceWithLoadBalancer`     |
| [Blue/green](service-blue-green-nodejs/)                         | Test traffic before switching production                                | `TestAccEcsServiceBlueGreenDeployment`  |
| [Canary with validation](service-canary-nodejs/)                 | Staged traffic and Lambda validation with an explicit invocation role   | `TestAccEcsServiceCanaryDeployment`     |
| [Linear](service-linear-nodejs/)                                 | Traffic shifts in equal increments                                      | `TestAccEcsServiceLinearDeployment`     |
| [Rolling lifecycle hook](service-rolling-lifecycle-hook-nodejs/) | Pre-scale-up hook with a service-generated invocation role              | `TestAccEcsServiceRollingLifecycleHook` |

The `nodejs`, `python`, `go`, and `dotnet` directories demonstrate experimental task-definition components without deploying a service.

## Running a service example

From its directory:

```sh
pulumi package add ../../../awsx-next
pulumi stack init dev
pulumi config set aws:region us-west-2
pulumi config set aws-native:region us-west-2
pulumi up
```

AWS credentials must be available to both providers. Task definitions and service
forwarding rules use AWS Native. Both components check that the providers target
the same account and effective region. The standalone `nodejs` task example also
uses an engine transform to edit a container on `aws-native:ecs:TaskDefinition`.
Frontend networking and the listener belong to the program. The service manages
backend routing and task-side ingress.

Each deployment creates billable AWS resources. Run `pulumi destroy` when finished.

## Integration coverage

From `examples/`, with AWS credentials and `AWS_REGION` configured:

```sh
go test -tags=nodejs -run '^(TestAccEcsServiceWithLoadBalancer|TestAccEcsServiceBlueGreenDeployment|TestAccEcsServiceCanaryDeployment|TestAccEcsServiceLinearDeployment|TestAccEcsServiceRollingLifecycleHook)$' -timeout 120m
```

The same five scenarios run as before, now against separate programs. Blue/green
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
