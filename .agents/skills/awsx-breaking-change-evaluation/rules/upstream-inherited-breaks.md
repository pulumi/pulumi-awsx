---
title: Separate Upstream Breakage From AWSX Breakage
tags: upstream, aws-provider, inherited, attribution
status: draft
---

## Rule

If a behavior change is inherited from `@pulumi/aws`, AWS, or another upstream
dependency, identify that boundary explicitly. AWSX may accept upstream
breakage, but should not add extra AWSX breakage on top without a separate
decision.

## Why

AWSX wraps and composes lower-level provider behavior. Users still experience the
upgrade through AWSX, but attribution matters for whether AWSX should add a
compatibility shim, document the inherited change, or fix AWSX-owned behavior.

## Check

- Identify whether the changed behavior comes from AWSX code, generated schema,
  `@pulumi/aws`, AWS service behavior, or another dependency.
- Compare local AWSX integration points against the upstream change.
- Verify AWSX is not changing child names, parentage, defaults, schema surface,
  or provider/region behavior in addition to the upstream change.
- If the upstream change requires user action, decide whether AWSX can shield it
  or must document it.

## Examples

```text
Safe:
- AWSX passes through a new upstream optional input without changing existing
  defaults or child identity.

Compatibility-sensitive:
- Upstream changes a default and AWSX also has an AWSX-owned default layered on
  the same field.

Breaking:
- AWSX changes its schema or child behavior while claiming the break is only
  inherited from upstream.
```

## Hand Off When

Use issue triage or provider investigation workflows when attribution is unclear.
Use `$awsx-test-authoring` when a discriminator test is needed.
