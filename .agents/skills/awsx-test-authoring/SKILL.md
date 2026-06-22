---
name: awsx-test-authoring
description: Tactical AWSX test-authoring guidance for pulumi-awsx. Use when choosing or writing tests for modern awsx/** changes, including Jest mock tests, acceptance tests, provider upgrade tests, schema/SDK proof, and assertions that prove component behavior.
---

# AWSX Test Authoring

Use this skill to choose and write proof for modern AWSX changes.

This skill is for test selection and assertion quality. For component shape
guidance, use `$awsx-component-design`. For compatibility classification, use
`$awsx-breaking-change-evaluation`.

## Rule Index

- `rules/pure-typescript-logic.md`: deterministic helpers, validators,
  allocators, and argument transformations.
- `rules/component-construction-mocks.md`: Pulumi runtime mock tests for child
  resources, args passed to children, providers, region flow, and outputs.
- `rules/schema-and-sdk-proof.md`: schema generation, schema-tools comparison,
  generated SDK diffs, and schemagen gaps.
- `rules/provider-upgrade-tests.md`: recorded provider upgrade preview coverage
  for existing programs and state.
- `rules/acceptance-tests.md`: targeted examples and AWS-observed behavior.
- `rules/assertion-quality.md`: exact assertions, weak smoke tests, and what
  counts as proof.

## How To Use

1. Identify the behavior that needs proof: pure logic, component construction,
   schema/SDK shape, existing-state upgrade, or AWS-observed behavior.
2. Read the matching rule file before adding or accepting a test.
3. Prefer the cheapest test surface that proves the behavior directly.
4. If the change is compatibility-sensitive, pair the test choice with
   `$awsx-breaking-change-evaluation`.
5. Report what the test proves and what it does not prove.

## Stop Early

Stop before settling on a test plan if:

- the proposed test only proves that TypeScript compiles or the program runs;
- component logic is being pushed into an AWS-backed example instead of a Pulumi
  runtime mock test;
- AWS-observed behavior is being asserted only through mocked child resources;
- schema changes are being judged without a generated schema or SDK diff;
- provider-upgrade evidence is being treated as refresh/update proof when it
  only checks preview/no replacements;
- a broad acceptance test is proposed for a narrow deterministic change.
