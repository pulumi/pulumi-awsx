# Writing AWSX Tests

This is not a command reference. Use `AGENTS.md` for commands.

## Pure TypeScript Logic

Use Jest tests next to the code when the behavior is a deterministic helper,
argument validator, subnet allocator, or input transformation.

Existing examples:

- `awsx/ec2/vpc.test.ts`
- `awsx/ec2/subnetDistributorLegacy.test.ts`

Good tests assert exact outputs or exact errors. Prefer table tests or property
tests when the behavior is an allocator or validator with many input shapes.

## Pulumi Component Construction

Use Pulumi runtime mocks when the behavior is which child resources a component
creates or what inputs it passes to them. Do not use AWS for this.

This is the right level for component logic: conditionals on creating resources,
conditionally setting properties, argument normalization, and the output shape
the component should produce.

Pattern to reuse:

- call `runtime.setMocks`;
- record `newResource` and `call` arguments;
- instantiate the component;
- unwrap `pulumi.Output` values;
- assert resource types, names, tags, provider region, or invoke inputs.

`awsx/ec2/vpc.test.ts` has examples under `describe("child resource api")`.

## Schema Or SDK Shape

Changes under `provider/pkg/schemagen/**` affect generated schema and SDKs. The
repo does not currently have focused unit tests for schemagen. For now, validate
these changes by regenerating and inspecting the schema/SDK diff.

When possible, run a schema-level comparison with `schema-tools compare` instead
of reasoning about each generated SDK language by hand.

Do not hand-edit generated schema or SDK files to make a test pass.

## Provider Upgrade Coverage

Use the provider upgrade harness when the risk is compatibility of existing
programs or state across provider versions. The harness lives in:

- `provider/provider_test.go`
- `provider/provider_nodejs_test.go`

Do not use this as the default test for ordinary component logic. Use it when
the question is "does an existing program preview cleanly against the local
provider?" Inspect the preview for the compatibility risk under review:
replacements, creates, deletes, and changed inputs can all matter. Do not cite
skipped upgrade cases as evidence.

## Acceptance Tests

Add or update an example under `examples/**` when the behavior requires a real
Pulumi program. If the important assertion is provider-state behavior, expose it
through stack outputs and validate it in `ExtraRuntimeValidation`. If the
important assertion is AWS-observed behavior, read AWS directly from
`ExtraRuntimeValidation` or from a direct `pulumitest` test body.

Use this path for resource-shape validity: cases where the question is whether
AWS actually accepts the configured resources or whether cross-resource
integration works. IAM permissions and service integrations are typical
examples.

For AWS-observed behavior, prefer proving the behavior once with a targeted live
test. Use recorded provider-upgrade fixtures only when the risk is upgrade
preview compatibility for existing programs or state. Do not cite general
snapshot/replay coverage unless a concrete fixture exists for the behavior under
review. Broad examples are smoke tests; they should not be the default
validation path for a narrow agent change.

Name the lifecycle claim being proved. A first successful `up` proves AWS
accepted the shape once; no-diff preview, update, refresh, and provider-upgrade
compatibility each need their own explicit path, such as
`optpreview.ExpectNoChanges()`, `RunUpdateTest`, `Refresh` with `RunProgram`, or
the provider upgrade harness.

Local acceptance runs should be targeted. Do not run the full `make test` suite
locally. Run a specific acceptance test only when AWS credentials and
`AWS_REGION` are available.

Do not use `examples_legacy/**` as proof for modern `awsx/**` behavior unless
the change explicitly targets the legacy surface.
