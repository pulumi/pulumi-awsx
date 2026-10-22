# Fargate service with a caller-owned ALB

Two attachments forward `/api/*` and `/admin/*` to one container on port 3000.
Health checks use port 3001. Unmatched requests receive the listener's fixed 404
response. The service uses the default rolling deployment strategy.

The program owns the frontend security group, listener, and optional TLS/SNI
configuration. The service owns target groups, forwarding rules, and task-side
ingress. Its forwarding rules use AWS Native, with account and region validation.

See [setup and other service examples](../README.md). This program has no rollout
switches or Lambda code. Separate programs demonstrate [blue/green](../service-blue-green-nodejs/),
[canary validation](../service-canary-nodejs/), [linear](../service-linear-nodejs/),
and [rolling lifecycle hooks](../service-rolling-lifecycle-hook-nodejs/).

## Optional HTTPS

Set `certificateArn` to an existing ACM certificate in the deployment region and
`hostname` to a name covered by it. Configure that hostname's DNS to the ALB
separately. `additionalCertificates` optionally maps stable names to SNI certificate
ARNs. The caller owns their lifecycle.

The IPv6 security-group rule illustrates frontend permission ownership. Actual
IPv6 routing also requires a dual-stack ALB, VPC, and subnet configuration.

## Acceptance test

From `examples/`, with AWS credentials and `AWS_REGION` configured:

```sh
go test -tags=nodejs -run '^TestAccEcsServiceWithLoadBalancer$' -timeout 30m
```

The test checks both forwarding paths, the listener's unmatched response, and a
clean preview. It uses HTTP and does not exercise optional TLS or IPv6. It creates
billable resources and destroys its stack during cleanup.

A separate negative test configures AWS Native in a different region and checks
that preview reports the provider mismatch. It does not deploy infrastructure:

```sh
go test -tags=nodejs -run '^TestAccEcsServiceRejectsMismatchedProviderRegion$' -timeout 10m
```
