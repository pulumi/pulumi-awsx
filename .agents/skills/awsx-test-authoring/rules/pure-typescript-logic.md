---
title: Test Pure Logic With Jest
tags: jest, pure-logic, validators, allocators, transforms
status: draft
---

## Rule

Use focused Jest tests for deterministic TypeScript helpers, argument
validators, subnet allocators, and input transformations. Assert exact outputs
or exact errors.

## Why

Pure AWSX logic should be cheap to test and should not need Pulumi runtime mocks
or live AWS resources. These tests are the fastest way to prove normalization,
allocation, and validation behavior.

## Avoid

Using an example program or AWS-backed test to prove deterministic logic:

```ts
// Weak: only proves a program happened to run.
new awsx.ec2.Vpc("vpc", { cidrBlock: "10.0.0.0/16" });
```

Swallowing expected failures so a case is not actually asserted:

```ts
try {
  convertLegacySubnets(input);
} catch (err) {
  if (!String(err).includes("Subnets are too large for VPC")) {
    throw err;
  }
}
```

## Prefer

Table-driven exact outputs:

```ts
test.each([
  {
    input: { cidrBlock: "10.0.0.0/16", subnetCidrs: ["10.0.0.0/24"] },
    expected: [{ cidrBlock: "10.0.0.0/24" }],
  },
])("allocates expected subnets", ({ input, expected }) => {
  expect(distributeSubnets(input)).toEqual(expected);
});
```

Exact validation failures:

```ts
expect(() => normalizeTaskDefinitionContainers({})).toThrow(
  "Exactly one of [container] or [containers] must be provided",
);
```

## AWSX Notes

- Existing good anchors: `awsx/ec2/vpc.test.ts`,
  `awsx/ec2/subnetDistributorLegacy.test.ts`,
  `awsx/ec2/subnetDistributorNew.test.ts`,
  `awsx/ecs/fargateMemoryAndCpu.test.ts`, and `awsx/utils.test.ts`.
- Prefer table tests for allocators and validators with many input shapes.
- If a helper accepts `pulumi.Input<T>` or returns `pulumi.Output<T>`, it may
  need a component mock test instead of a pure logic test.
- For Input/Output-sensitive behavior, include edge cases that match the change:
  raw values versus Outputs, `undefined` versus empty collections, secrets,
  preview unknowns, async outputs, and mixed raw/output values.

## Hand Off When

Use `rules/component-construction-mocks.md` when the behavior depends on Pulumi
resource registration, child inputs, output unwrapping, providers, or parents.
