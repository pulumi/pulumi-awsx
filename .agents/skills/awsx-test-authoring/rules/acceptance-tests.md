---
title: Use Acceptance Tests For AWS Behavior
tags: acceptance, examples, aws, runtime-validation
status: draft
---

## Rule

Use targeted `examples/**` acceptance tests when the behavior requires a real
Pulumi program, provider-state validation, real AWS validation, or
cross-resource service integration. Expose provider-state behavior through stack
outputs and assert it in `ExtraRuntimeValidation`; when the claim is
AWS-observed behavior, read AWS directly from the test. That AWS read may live
in `ExtraRuntimeValidation` for `integration.ProgramTest` tests or in a direct
`pulumitest` test body.

## Why

Mocks can prove AWSX construction decisions, but they cannot prove AWS accepts a
resource shape, IAM policy, networking layout, or service integration. Live tests
are expensive, so use them only for behavior that needs AWS.

## Avoid

Adding a broad smoke example for a narrow deterministic change:

```go
// Weak for narrow behavior: just runs a full example and checks no error.
integration.ProgramTest(t, &integration.ProgramTestOptions{
    Dir: "ts-vpc",
    RunUpdateTest: false,
})
```

Relying on language smoke tests as AWS-observed proof:

```text
The Go/Python/.NET example stood up, so tag propagation is validated.
```

## Prefer

Output provider-state values and validate them:

```ts
export const subnetTags = subnets.apply(ss =>
  ss.map(s => s.tags),
);
```

```go
ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
    tags := stack.Outputs["subnetTags"].([]interface{})
    require.Equal(t, []interface{}{
        map[string]interface{}{"Environment": "dev", "Name": "app-public-1"},
        map[string]interface{}{"Environment": "dev", "Name": "app-private-1"},
    }, tags)
},
```

For AWS-observed behavior, query AWS in validation instead of only reading stack
outputs. This shape fits `integration.ProgramTest` with `ExtraRuntimeValidation`:

```go
ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
    imageUri := stack.Outputs["imageUri"].(string)
    repoName := stack.Outputs["repositoryName"].(string)

    client := createEcrClient(t)
    images, err := getEcrImageDetails(t, client, repoName, 1)
    require.NoError(t, err)
    require.NotEmpty(t, images.ImageDetails)
    require.Contains(t, imageUri, *images.ImageDetails[0].ImageDigest)
},
```

Direct `pulumitest` tests can query AWS from the Go test body instead:

```go
pt := pulumitest.NewPulumiTest(t, filepath.Join(cwd, "ts-ecr-registry-image"), options...)
upResult := pt.Up(t)

repoName := upResult.Outputs["repositoryName"].Value.(string)
client := createEcrClient(t)
images, err := getEcrImageDetails(t, client, repoName, 1)
require.NoError(t, err)
require.Len(t, images.ImageDetails, 1)
```

Name the lifecycle proof separately from the initial AWS acceptance proof:

```go
// Proves the initial resource shape is accepted and observable in AWS.
upResult := pt.Up(t)

// Proves a second preview is clean.
pt.Preview(t, optpreview.ExpectNoChanges())

// For update or refresh semantics, add an explicit update/refresh path such as
// RunUpdateTest, pt.Up after config changes, Refresh with RunProgram, or a
// provider-upgrade preview, depending on the compatibility claim.
```

## AWSX Notes

- `examples/examples_nodejs_test.go` is the strongest current acceptance surface.
  It includes both `integration.ProgramTest` cases with `ExtraRuntimeValidation`
  and direct `pulumitest` cases with AWS SDK reads, such as ECR image behavior.
  Check for `t.Skip` before citing a specific example as coverage.
- `examples/examples_go_test.go`, `examples/examples_python_test.go`, and
  `examples/examples_dotnet_test.go` are mostly smoke coverage. Use them for
  language packaging/basic program coverage, not as deep behavior proof.
- Many examples disable update coverage with `RunUpdateTest: false`. A passing
  acceptance test may prove only one successful deployment unless it explicitly
  runs no-diff preview, update, refresh, or provider-upgrade checks.
- Local acceptance runs should be targeted and credential-aware. Do not use the
  full examples suite as the default local loop.
- Do not use `examples_legacy/**` as proof for modern `awsx/**` behavior unless
  the change explicitly targets the legacy surface.

## Hand Off When

Use `rules/component-construction-mocks.md` if the behavior can be proved by
recording child resources. Use `$awsx-breaking-change-evaluation` if the
acceptance behavior changes existing stack compatibility.
