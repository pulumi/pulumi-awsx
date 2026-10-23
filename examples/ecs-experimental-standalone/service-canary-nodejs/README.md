# Fargate canary deployment

ECS shifts 50 percent of production traffic, waits one minute, then shifts the rest. A Lambda checks test-only traffic before production moves and checks production responses against ECS's reported weights during the shift. The program supplies an explicit, narrowly scoped ECS invocation role.

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
pulumi up --refresh
```

Refresh before progressive updates so Pulumi preserves ECS-managed traffic weights.

## Lambda implementation

[validationHook.ts](validationHook.ts) contains the callback, its execution role,
and its log group. `index.ts` shows the hook's service configuration. Resolved
endpoint and revision values travel through `hookDetails`, rather than being
captured in the Lambda closure. Retry state is scoped to the ECS execution ID.

Transient HTTP failures retry within a bounded budget. Returning FAILED makes the
Pulumi update fail, including when ECS successfully rolls back. ECS weights are
relative, so a 500/500 split is treated as equal traffic rather than percentages.

## Acceptance test

From `examples/`, with AWS credentials and `AWS_REGION` configured:

```sh
go test -tags=nodejs -run '^TestAccEcsServiceCanaryDeployment$' -timeout 90m
```

The integration test deploys v1, v2, and v3, refreshing before updates. The Lambda owns intermediate traffic assertions. Go checks successful-hook logs, final production and test routing, and clean previews. The test creates billable resources and destroys its stack during cleanup.
