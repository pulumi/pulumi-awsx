# Fargate service with a caller-owned ALB

Two service attachments forward `/api/*` and `/admin/*` to the same container on
port 3000. ALB health checks use port 3001. Unmatched frontend requests receive
the listener's fixed 404 response.

The program explicitly creates the caller-owned listener, frontend security-group
rules, and optional TLS/SNI configuration. Comments mark the ownership boundary.
Task-side ingress remains managed by the service through standalone rules.

## Acceptance test

From `examples/`, with AWS credentials and `AWS_REGION` configured:

```sh
go test -tags=nodejs -run '^TestAccEcsServiceWithLoadBalancer$' -timeout 30m
```

The harness generates the local experimental SDK, deploys the program, checks
both forwarding paths and the unmatched response over HTTP, and runs a no-change
preview. Its cleanup destroys the stack. It creates billable AWS resources.

The default automated case uses HTTP and rolling updates. It does not prove
TLS/SNI rotation or IPv6 connectivity.

## Progressive deployment lifecycle tests

The same program also accepts `deploymentStrategy` with `rolling`, `blueGreen`,
`canary`, or `linear`, plus a `revision` label such as `v1`. Each revision changes
the task definition and the HTTP response body. Leaving both settings unset
preserves the rolling baseline's original responses.

From `examples/`, run a single strategy first:

```sh
go test -tags=nodejs -run '^TestAccEcsServiceProgressiveDeployments/blueGreen$' -timeout 60m
```

Run all three strategies with:

```sh
go test -tags=nodejs -run '^TestAccEcsServiceProgressiveDeployments$' -timeout 120m
```

The cases run in parallel, each with its own stack, ALB, Fargate service, and
`taskDefinitionFamily` to avoid concurrent registrations in the same ECS family:

- Deploy `v1`, verify HTTP responses, and check a no-change preview.
- Deploy `v2` and verify production and test requests reach the new revision.
  During the canary observation period, verify that test-header requests reach
  `v2` while ordinary requests still reach both `v1` and `v2`.
- Canary and linear also deploy `v3` after a refresh, then check another
  no-change preview. This proves subsequent deployments still route correctly.

The assertions check externally observable routing and Pulumi lifecycle behavior.
They do not inspect ECS configuration, deployment status, listener rules, or
target-group weights. Resource configuration is covered by unit tests.

Canary uses 50 percent initial traffic, and linear uses 50 percent increments.
Both wait one minute between shifts. Final bake time is zero. Test routes are
limited to `/api/*` requests with `X-Deployment-Test: true`.

Progressive-to-rolling transitions are not covered while the
[traffic-shift role cleanup issue](https://github.com/pulumi/pulumi-awsx/issues/2209)
is outstanding.

These are live AWS tests, not offline proofs. HTTP assertions verify eventual
routing, not uninterrupted availability throughout an update.
Lifecycle hooks are deliberately outside this example. The tests require AWS
credentials and `AWS_REGION`, create billable resources, and destroy their
stacks during cleanup.

## Optional HTTPS configuration

For a manual HTTPS deployment, supply `certificateArn` for an existing ACM
certificate in the deployment region and `hostname` for a name covered by it.
Configure that hostname's DNS to the ALB separately. Optional
`additionalCertificates` is a map of stable names to additional certificate ARNs;
the caller owns their lifecycle.

The frontend IPv6 rule demonstrates permission ownership only. End-to-end IPv6
also requires configuring the ALB and VPC/subnets for dual-stack networking.
