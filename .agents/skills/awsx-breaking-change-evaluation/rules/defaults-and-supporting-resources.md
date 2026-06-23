---
title: Evaluate Defaults By Upgrade Behavior
tags: defaults, tags, supporting-resources, preview
status: draft
---

## Rule

Treat changed defaults as compatibility-sensitive when existing users may see a
different preview/update after upgrade.

Adding, removing, or replacing default-created support resources is not
automatically breaking, but it requires explicit compatibility evaluation. Judge
the user-facing behavior, preview/update effect, cost, permissions, output
shape, and whether users can override the behavior.

## Why

Defaults are part of the value of AWSX abstractions, but they become persisted
behavior in real stacks. A default can change resources, tags, IAM permissions,
or service configuration without any user code change.

## Check

- Identify whether the default is AWSX-owned, `@pulumi/aws`-owned, or
  service-owned.
- Owning a default is not itself breaking. Changing the resolved behavior for
  existing inputs is the compatibility-sensitive part.
- Check whether existing programs would get new resources, removed resources,
  changed tags, changed inputs, or changed outputs.
- Be cautious with defaults that can drift outside AWSX, such as version-like
  values or fast-moving best practices.
- If AWSX is only inheriting an upstream default change, verify AWSX is not
  adding extra breakage.

## Examples

```text
Safe:
- Adding a default only for a new optional feature that existing programs do not
  enable.

Compatibility-sensitive:
- Adding a new default-created support resource for existing programs.
- Changing default tags or tag propagation.
- Changing an AWSX-owned calculation so the same existing inputs produce
  different child resource inputs, such as CPU/memory normalization.

Breaking:
- Removing a default-created resource that existing stacks rely on, without an
  accepted compatibility path.
- Changing a default so existing stacks preview replacement or deletion.
```

## Hand Off When

Use `$awsx-component-design` if the default should be redesigned around
user-facing functionality. Use `$awsx-test-authoring` to prove the affected
preview/update path.
