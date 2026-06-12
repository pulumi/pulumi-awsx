---
title: Parent New Children To The Component
tags: children, parentage, ownership, dependsOn
status: draft
---

## Rule

Parent new child resources to the component with `{ parent: this }` unless the
local component already has an intentional, compatibility-sensitive child
hierarchy. Do not nest a child under another child just to express ordering; use
`dependsOn` when ordering is the reason.

## Why

Parenting controls Pulumi hierarchy and provider/options inheritance. Accidental
nesting changes the resource tree and can become compatibility-sensitive once
released.

## Avoid

```ts
const securityGroup = new aws.ec2.SecurityGroup(`${name}-sg`, securityGroupArgs);

const listener = new aws.lb.Listener(`${name}-listener`, listenerArgs, {
  // Do not use parentage as an ordering substitute.
  parent: loadBalancer,
});
```

Also avoid helpers that silently drop parent context:

```ts
function defaultBucket(name: string) {
  return new aws.s3.Bucket(name);
}
```

## Prefer

```ts
const securityGroup = new aws.ec2.SecurityGroup(`${name}-sg`, securityGroupArgs, {
  parent: this,
});

const listener = new aws.lb.Listener(`${name}-listener`, listenerArgs, {
  parent: this,
  dependsOn: [this.loadBalancer],
});
```

Pass parent/options through helper functions:

```ts
function defaultBucket(
  name: string,
  args: aws.s3.BucketArgs,
  opts: pulumi.ResourceOptions,
) {
  return new aws.s3.Bucket(name, args, opts);
}

const bucket = defaultBucket(name, {}, { parent: this });
```

## AWSX Notes

- `awsx/ec2/vpc.ts` has existing nested parents such as subnets under the VPC and
  routes under route tables. When editing inside that component, follow the local
  hierarchy unless the change is explicitly about reparenting.
- Existing nested hierarchies need audit before changing or extending in a
  different style.
- If preserving a hierarchy requires aliases or migration behavior, that is not
  a component-design-only decision.

## Hand Off When

Use `$awsx-breaking-change-evaluation` before changing parentage for any existing
child resource.
