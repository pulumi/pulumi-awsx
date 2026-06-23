---
title: Prove Schema And SDK Shape
tags: schema, sdk, schemagen, generated, schema-tools
status: draft
---

## Rule

For changes under `provider/pkg/schemagen/**` or any change that affects public
schema shape, validate with regenerated schema, schema comparison, and generated
SDK diff inspection. Do not treat TypeScript compilation as schema proof.

## Why

AWSX public component surface is schema-backed. A small generator change can
rename tokens, alter requiredness, change nested types, or affect every
generated SDK without breaking TypeScript implementation compilation.

## Avoid

Accepting source-only evidence for a schema change:

```text
The TypeScript provider tests pass, so the schema change is safe.
```

Hand-editing generated files to make a diff or test pass:

```text
Edited sdk/nodejs/repository.ts directly.
```

## Prefer

Use the schema source and generated outputs as evidence:

```text
- Regenerated schema from source.
- Compared old/new schema with schema-tools.
- Inspected generated SDK diffs for token, args, output, requiredness, and type
  changes.
- Confirmed generated files were not hand-edited as the source of truth.
```

## AWSX Notes

- The repo currently has no focused unit tests under `provider/pkg/schemagen/**`.
  Until that changes, schema evidence is regeneration plus schema/SDK diff
  review. Treat this as review evidence, not an executable regression net; add a
  focused schemagen test when the generator bug is narrow and repeatable.
- Use `$awsx-breaking-change-evaluation` for the `schema-tools` command shape
  and category interpretation.
- Schema diffs are necessary but not sufficient: still check component behavior
  if constructor logic changed.

## Hand Off When

Use `$awsx-breaking-change-evaluation` when schema comparison finds public
surface changes. Use `rules/component-construction-mocks.md` when schema changes
also require constructor behavior proof.
