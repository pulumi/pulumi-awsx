---
title: Make Assertions Prove Behavior
tags: assertions, proof, smoke, snapshots, coverage
status: draft
---

## Rule

Write assertions that prove the behavior under review, not just that a program
compiled, constructed, or ran. State the remaining gap when a test is only smoke
coverage. Before adding an assertion, name the current contract it protects and
one plausible bug it would catch.

## Why

AWSX has several valid test surfaces. The common failure mode is choosing the
right surface but making an assertion too weak to catch the regression: no exact
child input checks, no output unwrapping, no AWS-observed validation, or no
generated SDK inspection.

## Avoid

Tautological assertions derive the expected result from the same code or mock
that produced the actual result. Assertions that copy fixed constructor inputs
or forbid an abandoned implementation are not necessarily tautologies, but they
are low-value unless they protect a current contract. Do not assert that a
component avoids a particular resource or implementation merely because an
unreleased draft used it.

For example, test that a supplied Lambda execution role ARN with an IAM path
resolves to its bare role name and that a cross-account ARN is rejected. Do not
count IAM child resources just to confirm a single unconditional constructor
call runs once. An explicit guarantee does not, by itself, justify a test.
Test a resource count when it is a meaningful result of logic under test, such
as deduplication, input-driven allocation, or interacting branches that could
register the same resource twice.

Smoke-only assertions for behavior changes:

```ts
new awsx.ec2.Vpc("vpc", args);
expect(true).toBe(true);
```

Broad partial matching when exact shape matters:

```ts
expect(subnets).toEqual(expect.arrayContaining([
  expect.objectContaining({ tags: { Environment: "dev" } }),
]));
```

Golden or recorded-fixture-only proof for a semantic behavior:

```text
Updated the recorded fixture; no assertion names the behavior that changed.
```

## Prefer

Assert exact results where they prove a decision or transformation. For example,
when subnet allocation derives the number and tags of child subnets from inputs:

```ts
const subnets = resources.filter(r => r.type === "aws:ec2/subnet:Subnet");
expect(subnets).toHaveLength(3);
expect(subnets.map(s => s.inputs.tags)).toEqual([
  { Environment: "dev", Name: "app-public-1" },
  { Environment: "dev", Name: "app-public-2" },
  { Environment: "dev", Name: "app-private-1" },
]);
```

Name the proof limit:

```text
This mock test proves AWSX passes the expected tags to child subnets. It does
not prove AWS accepts the resulting network layout.
```

## AWSX Notes

- Existing modern Jest tests are mostly explicit and snapshot-light. There are
  no Jest `.snap` files in the current audit.
- Provider upgrade fixtures are useful golden evidence for preview
  compatibility, but they do not replace direct assertions for new constructor
  behavior.
- Examples without `ExtraRuntimeValidation` are usually smoke tests, but direct
  `pulumitest` cases can still prove AWS-observed behavior when they read AWS
  directly and assert exact results.

## Hand Off When

Use the more specific rule file for the test surface in question. Use
`$awsx-breaking-change-evaluation` if the assertion reveals changed behavior for
existing users.
