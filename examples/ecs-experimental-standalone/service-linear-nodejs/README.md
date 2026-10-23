# Fargate linear deployment

ECS shifts production traffic in 50 percent increments with one minute between shifts. Test-header requests reach the new revision before production traffic moves. This example has no Lambda hooks.

The self-contained program creates a VPC, public ALB, listener, task definition,
and service. Two attachments route `/api/*` and `/admin/*` to the same container,
with health checks on a separate port. The main program declares its deployment
strategy directly; there is no strategy-selection configuration.

See [setup and other examples](../README.md). This example uses HTTP. For optional
TLS/SNI configuration, see the [basic ALB example](../service-load-balancer-nodejs/).

## Deploying another revision

The initial revision defaults to `v1`. After the first deployment:

```sh
pulumi config set revision v2
pulumi up --refresh
```

Refresh before progressive updates so Pulumi preserves ECS-managed traffic weights.

## Acceptance test

From `examples/`, with AWS credentials and `AWS_REGION` configured:

```sh
go test -tags=nodejs -run '^TestAccEcsServiceLinearDeployment$' -timeout 90m
```

The integration test deploys v1, v2, and v3, refreshing before updates and verifying production and test routing plus clean previews. The test creates billable resources and destroys its stack during cleanup.
