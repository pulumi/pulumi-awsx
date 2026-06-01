---
title: Derive Stable Child Names From The Component Name
tags: names, children, identity, aliases
status: draft
---

## Rule

Derive child logical names from the component `name`. Use stable suffixes such
as `name`, `${name}-suffix`, or `${name}-${i}`. Do not hardcode child names.

Do not rename existing children as cleanup.

## Why

Child logical names are part of Pulumi resource identity. Hardcoded names collide
across component instances, and released name changes can cause replacement
unless aliases or another compatibility path handles the move.

## Avoid

```ts
this.loadBalancer = new aws.lb.LoadBalancer("load-balancer", lbArgs, {
  parent: this,
});

this.listeners = listeners.map((args) =>
  new aws.lb.Listener("listener", args, { parent: this }),
);
```

## Prefer

```ts
this.loadBalancer = new aws.lb.LoadBalancer(name, lbArgs, {
  parent: this,
});

this.listeners = listeners.map((args, i) =>
  new aws.lb.Listener(`${name}-${i}`, args, { parent: this }),
);
```

If a service requires a transformed physical name, derive that from the
component name too:

```ts
const lowerCaseName = name.toLowerCase();
this.repository = new aws.ecr.Repository(lowerCaseName, repoArgs, {
  parent: this,
});
```

## AWSX Notes

- Existing code may use `name` directly for the primary child and stable suffixes
  for secondary children.
- A child name that looks cosmetically odd may still be compatibility-sensitive
  once released.
- Do not use `awsx-classic/**` naming as the default model for modern `awsx/**`
  code unless the change explicitly preserves legacy compatibility.

## Hand Off When

Use `$awsx-breaking-change-evaluation` if a child name changes or aliases may be
required.
