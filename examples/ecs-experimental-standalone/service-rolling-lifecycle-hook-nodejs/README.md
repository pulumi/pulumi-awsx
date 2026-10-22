# Fargate rolling with a lifecycle hook deployment

The service invokes a Lambda at PRE_SCALE_UP, before starting new tasks. The Lambda validates nested hook settings, returns IN_PROGRESS, then succeeds on reinvocation. It does not expect the new revision to serve traffic before scale-up. Omitting invocationRoleArn lets the service create a scoped ECS invocation role.

The self-contained program creates a VPC, public ALB, listener, task definition,
and service. Two attachments route `/api/*` and `/admin/*` to the same container,
with health checks on a separate port. The main program declares its deployment
strategy directly; there is no strategy-selection configuration.

See [setup and other examples](../README.md). This example uses HTTP. For optional
TLS/SNI configuration, see the [basic ALB example](../service-load-balancer-nodejs/).

## Deploying another revision

The initial revision defaults to `v1`. After the first deployment:

```sh
pulumi config set previousRevision v1
pulumi config set revision v2
pulumi up
```

Each revision changes the task definition and response bodies.

## Lambda implementation

[validationHook.ts](validationHook.ts) contains the callback, its execution role,
and its log group. `index.ts` shows the hook's service configuration. Resolved
endpoint and revision values travel through `hookDetails`, rather than being
captured in the Lambda closure. Retry state is scoped to the ECS execution ID.

## Acceptance test

From `examples/`, with AWS credentials and `AWS_REGION` configured:

```sh
go test -tags=nodejs -run '^TestAccEcsServiceRollingLifecycleHook$' -timeout 90m
```

The integration test deploys v1 and v2, verifies hook execution, final routing, and clean previews. The test creates billable resources and destroys its stack during cleanup.
