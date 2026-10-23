# Fargate blue/green deployment

ECS first sends test-header requests to the new revision, then switches production traffic. This example has no Lambda hooks and uses a zero-minute final bake time.

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
go test -tags=nodejs -run '^TestAccEcsServiceBlueGreenDeployment$' -timeout 90m
```

The integration test deploys v1 and v2, verifies production and test routing, and checks clean previews. The test creates billable resources and destroys its stack during cleanup.
