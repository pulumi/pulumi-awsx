---
title: Separate Code-Level And Behavior-Level Breaks
tags: code-break, behavior-break, preview, update
status: draft
---

## Rule

Classify both code-level breaks and behavior-level breaks.

- Code-level break: an existing user must edit their program after upgrading.
- Behavior-level break: existing code still compiles, but preview/update changes
  deployed resources, inputs, outputs, replacements, creates, or deletes.

Do not treat compile success as compatibility evidence.

## Why

AWSX can break users without changing the TypeScript API. Component constructors
create child resources and set defaults; changing that behavior can alter an
existing stack's next preview.

## Check

- For existing programs with no code changes: confirm whether generated SDK
  source still compiles and whether preview is stable.
- For existing stacks: inspect replacements, creates, deletes, changed inputs,
  changed outputs, and child resource identity.
- For new programs: confirm the new behavior is intentional and does not rely on
  a compatibility-only legacy path.
- Ask what an existing program sees on the next preview after upgrade.
- Compare child resource types, names, parents, inputs, outputs, and defaulted
  values.
- For stateful changes, prefer provider-upgrade preview coverage or a recorded
  preview fixture over a compile-only check.
- If the behavior difference is intentional, require an explicit compatibility
  decision and release note/migration note where appropriate.

## Examples

```text
Safe:
- Refactoring implementation helpers with identical child resources, inputs,
  outputs, and preview behavior.

Compatibility-sensitive:
- Changing normalization logic that may alter a child input for existing args.
- Adding a support resource for existing programs as part of a default behavior.

Breaking:
- Existing programs compile but preview replaces or deletes existing child
  resources without an accepted migration path.
- Existing programs must rename an arg or output.
```

## Hand Off When

Use `$awsx-test-authoring` to choose the cheapest proof that honestly exercises
the preview/update behavior.
