---
title: Treat Provider And Region Flow As Behavior
tags: provider, region, invokes, child-inputs
status: draft
---

## Rule

Treat provider and region propagation changes as behavior changes. Passing
`args.region` to a child that previously used provider configuration can change
where resources are created or looked up.

For new behavior, provider and region should flow consistently. For shipped
components, do not retrofit propagation as cleanup without compatibility
evaluation.

## Why

AWSX components often create many AWS resources. Provider and region context
determine account, region, and invoke behavior. A region propagation fix can be
correct and still compatibility-sensitive for existing stacks.

## Check

- Identify every child resource and invoke affected by provider or region
  changes.
- Compare whether each child previously used provider configuration, explicit
  `region`, nested pass-through region, or no region.
- Check existing schema surface for top-level `region` and nested per-child
  region fields.
- If changing behavior, require a focused test that asserts child resource or
  invoke inputs.

## Examples

```text
Safe:
- New component consistently passes component-level region to every child from
  the first release.

Compatibility-sensitive:
- Existing component exposes top-level region but did not pass it to all
  children; adding propagation can change existing previews.
- Changing an invoke to use a different provider or region source.

Breaking:
- Existing stacks move resources to a different region or provider because AWSX
  changed propagation behavior without an accepted compatibility path.
```

## Hand Off When

Use `$awsx-component-design` to define the intended provider/region contract.
Use `$awsx-test-authoring` for mock assertions on child resource and invoke
inputs.
