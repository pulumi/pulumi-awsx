---
name: awsx-aws-service-validation
description: Validate AWS service facts for pulumi-awsx changes. Use when an AWSX design, implementation, test, or review depends on AWS API behavior, CloudFormation resource support, service constraints, regional availability, documented best practices, or disagreement between AWS docs and the installed @pulumi/aws surface.
---

# AWSX AWS Service Validation

Use this skill when an AWSX change depends on an AWS service fact. This skill is
for evidence gathering, not for deciding whether AWSX should add a new
abstraction.

For component shape, use `$awsx-component-design`. For compatibility risk, use
`$awsx-breaking-change-evaluation`. For proof strategy, use
`$awsx-test-authoring`.

## Source Order

Use the narrowest authoritative source that can prove the claim:

1. Installed `@pulumi/aws` schema, SDK types, generated docs, and provider
   behavior for what AWSX can currently express through Pulumi.
2. AWS documentation MCP tools or official AWS documentation for service
   behavior, API constraints, CloudFormation support, regional availability,
   examples, and best practices.
3. Existing AWSX behavior and compatibility surface as context to reconcile with
   the sources above, not as proof of an AWS service fact.
4. Live AWS acceptance evidence when docs/schema are insufficient, ambiguous, or
   contradicted by observed behavior.

AWS docs describe what the service can do. The installed `@pulumi/aws` surface
defines what AWSX can express without provider changes or escape hatches. Do not
let AWS docs override AWSX compatibility constraints or the currently installed
provider surface.

Do not use model memory as the source for AWS service behavior. Do not use
Terraform AWS provider docs as the default source for AWSX guidance; use them
only as a last-resort hint that must be verified against Pulumi or AWS sources.

## Local Provider Surface

Use local, installed Pulumi sources before reasoning from memory:

```shell
# Use the same AWS provider version this checkout builds against.
aws_version=$(node -p 'require("./awsx/package.json").dependencies["@pulumi/aws"]')

# Discover resources and functions in an AWS module.
pulumi package info "aws@${aws_version}" --module s3

# Inspect one resource's inputs and outputs.
pulumi package info "aws@${aws_version}" --module s3 --resource Bucket

# Inspect one invoke/function shape.
pulumi package info "aws@${aws_version}" --module ecr --function getAuthorizationToken

# Inspect TypeScript definitions when implementation code imports @pulumi/aws.
rg -n "interface BucketArgs|class Bucket" awsx/node_modules/@pulumi/aws/s3/bucket.d.ts
```

Also inspect the AWSX schema and generated implementation types when the claim
crosses the AWSX public surface:

```shell
rg -n "awsx:ecr:Repository|RepositoryArgs" provider/cmd/pulumi-resource-awsx/schema.json awsx/schema-types.ts
```

## AWS Documentation Sources

Choose the AWS source that matches the claim:

- AWS API reference: request/response shape, service-side validation, and API
  behavior.
- CloudFormation resource docs: CloudFormation property support and update
  behavior.
- AWS user guide or developer guide: service concepts, recommended patterns, and
  valid cross-resource configurations.
- AWS regional availability data: Region-specific service, API, or
  CloudFormation resource support.

## Using AWS MCP

If the AWS Documentation MCP server or similarly named AWS documentation MCP
tools are available, prefer them over broad web search for AWS service facts:

- Search AWS docs for the service, resource, property, API, or error.
- Read the authoritative documentation page before relying on a snippet.
- Record the source used in the final answer, PR note, or review comment.

When working in an environment with MCP introspection, check the available MCP
servers/tools first. Useful AWS tool names may look like
`aws_documentation___search_documentation`,
`aws_documentation___read_documentation`,
`aws_documentation___read_sections`, or
`aws_documentation___recommend`; exact names depend on the configured client.

If AWS documentation MCP tools are unavailable, use official AWS documentation
and the local installed `@pulumi/aws` surface instead. Do not block the task
solely because the MCP server is not configured.

## Check

- Identify the exact AWS claim: property exists, value is valid, API behavior,
  required relationship, regional availability, IAM or service integration, or
  recommended pattern.
- Compare the AWS claim with the installed `@pulumi/aws` resource args, invoke
  args, return types, and generated docs when relevant.
- If AWS docs and `@pulumi/aws` disagree, classify the disagreement:
  documentation drift, provider lag, AWSX schema limitation, or genuine design
  choice.
- Act on the disagreement:
  - Documentation drift: prefer the installed provider surface for AWSX code and
    cite the AWS documentation uncertainty.
  - Provider lag: do not expose the feature through AWSX unless the provider
    supports it, the change also upgrades `@pulumi/aws`, or a maintainer accepts
    an explicit escape hatch.
  - AWSX schema limitation: hand off to `$awsx-component-design` and
    `$awsx-breaking-change-evaluation` before changing schema shape.
  - Design choice: document why AWSX intentionally differs from the raw provider
    or AWS service surface.
- If the claim affects existing users, hand off to
  `$awsx-breaking-change-evaluation`.
- If the claim can only be proven by AWS accepting or observing the behavior,
  hand off to `$awsx-test-authoring` for targeted acceptance proof.

## Examples

```text
Safe source-backed design:
- AWS docs say the API property is supported.
- Installed @pulumi/aws exposes the matching resource argument.
- Existing AWSX component shape can pass the value without changing existing
  behavior.

Needs escalation:
- AWS docs show a service feature, but installed @pulumi/aws does not expose it.
- AWS docs and provider schema use different names or shapes.
- The feature is region-limited and AWSX would need to encode region behavior.
- The correct behavior depends on AWS accepting a cross-resource integration.

Not enough evidence:
- "This is how ECS usually works" with no AWS docs, provider surface, local
  pattern, or live proof.
```

## Hand Off When

Use `$awsx-component-design` after the AWS fact is known and the question becomes
how to expose it in AWSX. Use `$awsx-breaking-change-evaluation` when the fact
changes existing behavior or public surface. Use `$awsx-test-authoring` when the
fact requires mock, schema, provider-upgrade, or live AWS proof.
