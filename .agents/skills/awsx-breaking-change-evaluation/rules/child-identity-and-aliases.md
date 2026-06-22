---
title: Preserve Child Resource Identity
tags: child-resources, names, parents, urns, aliases
status: draft
---

## Rule

Treat child resource logical names, parentage, and type tokens as
compatibility-sensitive. Changing any of them can change URNs and resource
identity.

Prefer aliases or another automatic compatibility mechanism when moving
identity. If user action is the only viable migration path, require an explicit
compatibility decision and document why automatic migration is not possible.

## Why

AWSX components create child resources on behalf of users. Users may never see
the child constructor code, but Pulumi state records each child's URN. Name,
parent, or type changes can cause replacements even when public args are
unchanged.

## Check

- Compare old and new child resource names.
- Compare old and new parent hierarchy.
- Compare old and new type tokens and aliases.
- Verify aliases point at real historical names/types, not the current type as a
  placeholder.
- Use mocks only for the parts they can see: child type, logical name, provider,
  and inputs. Parentage, aliases, and full URN compatibility need upgrade
  preview, exported-state inspection, or another engine-visible proof.
- Treat existing nested hierarchies, such as parts of `awsx/ec2/vpc.ts`, as
  existing compatibility surface until audited.

## Examples

```text
Safe:
- Adding an alias that references a real historical child name or type without
  changing current identity.

Compatibility-sensitive:
- Adding a new child resource for existing programs.
- Reparenting an existing child under the component for consistency.

Breaking:
- Renaming or reparenting an existing child without aliases or another accepted
  migration path.
- Replacing a real legacy alias with a no-op alias to the current type.
```

## Hand Off When

Use `$awsx-component-design` for the desired child ownership shape after the
compatibility path is known. Use `$awsx-test-authoring` for alias or upgrade
preview coverage.
