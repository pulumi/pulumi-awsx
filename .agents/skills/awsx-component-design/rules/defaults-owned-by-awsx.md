---
title: Provide Sensible Defaults With Clear Overrides
tags: defaults, overrides, compatibility
status: draft
---

## Rule

Prefer sensible defaults when AWSX can provide or calculate useful behavior
without blocking full customization. Defaults should reduce boilerplate while
leaving an explicit override path.

Defaults are part of the abstraction. Prefer stable, value-adding defaults that
AWSX can preserve as compatibility surface.

Be cautious with defaults that can drift outside AWSX, such as service-owned
defaults, provider behavior, version-like values, or fast-moving best practices.

## Why

Defaults are a major part of the value of an AWSX abstraction. They let users get
started without understanding every child resource detail. They are also
user-visible behavior, so unstable or unclear defaults can become compatibility
risks.

## Avoid

```ts
// Pins a service-owned version-like value without making that choice explicit.
const serviceArgs = {
  ...args,
  platformVersion: "1.4.0",
};
```

## Prefer

Default component-owned behavior when AWSX can preserve the contract:

```ts
const requiredMemoryAndCPU = containerDefinitions
  .apply((defs) => calculateFargateMemoryAndCPU(defs));

if (mutableArgs.cpu === undefined) {
  mutableArgs.cpu = requiredMemoryAndCPU.cpu;
}
if (mutableArgs.memory === undefined) {
  mutableArgs.memory = requiredMemoryAndCPU.memory;
}
```

Omit or pass through service-owned/version-like values unless AWSX deliberately
owns that default:

```ts
const serviceArgs: aws.ecs.ServiceArgs = {
  ...args,
  platformVersion: args.platformVersion,
};
```

## AWSX Notes

- Stable convenience defaults can be valid AWSX behavior when they are deliberate
  and covered as part of the component contract.
- Defaults can be calculated from other component inputs when that better
  matches the component's semantics, as in Fargate CPU/memory derivation from
  container definitions.
- Defaults may create supporting resources when that is how AWSX implements the
  user-facing functionality. Do not expose skip/create/adopt controls solely
  because an implementation detail exists.
- When existing args can already express the concept but legacy behavior is too
  pass-through to apply useful AWSX-owned defaults, consider an explicit mode or
  strategy before creating a second long-lived API. This is a candidate design,
  not a hard rule; compare it against compatibility risk and user clarity.
- When AWSX does not add semantics, passing through to `@pulumi/aws` or AWS
  service defaults can be the right behavior.
- Version-like defaults and fast-moving best-practice defaults need extra care;
  do not add them casually.
- Changing an existing default is compatibility-sensitive even when TypeScript
  still compiles.

## Hand Off When

Use `$awsx-breaking-change-evaluation` if adding, removing, or changing a default
can affect an existing user's next preview or update.
