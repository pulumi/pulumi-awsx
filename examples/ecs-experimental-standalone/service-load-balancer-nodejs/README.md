# Fargate service with a caller-owned ALB

Two service attachments forward `/api/*` and `/admin/*` to the same container on
port 3000. ALB health checks use port 3001. Unmatched frontend requests receive
the listener's fixed 404 response.

The program explicitly creates the caller-owned listener, frontend security-group
rules, and optional TLS/SNI configuration. Comments mark the ownership boundary.
Task-side ingress remains managed by the service; this example does not change
its current inline-rule design.

## Acceptance test

From `examples/`, with AWS credentials and `AWS_REGION` configured:

```sh
go test -tags=nodejs -run '^TestAccEcsServiceWithLoadBalancer$' -timeout 30m
```

The harness generates the local experimental SDK, deploys the program, checks
both forwarding paths and the unmatched response over HTTP, and runs a no-change
preview. Its cleanup destroys the stack. It creates billable AWS resources.

The default automated case uses HTTP. It does not prove progressive deployments,
TLS/SNI rotation, or IPv6 connectivity.

## Optional HTTPS configuration

For a manual HTTPS deployment, supply `certificateArn` for an existing ACM
certificate in the deployment region and `hostname` for a name covered by it.
Configure that hostname's DNS to the ALB separately. Optional
`additionalCertificates` is a map of stable names to additional certificate ARNs;
the caller owns their lifecycle.

The frontend IPv6 rule demonstrates permission ownership only. End-to-end IPv6
also requires configuring the ALB and VPC/subnets for dual-stack networking.
