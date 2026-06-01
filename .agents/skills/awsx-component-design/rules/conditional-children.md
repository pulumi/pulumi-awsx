---
title: Make Optional Child Resources Explicit
tags: conditional-children, skip, create-adopt, outputs
status: draft
---

## Rule

When a component conditionally creates child resources, make the user-facing
functionality clear. Conditional creation is normal for an abstraction; the
component API should explain the behavior users are enabling, disabling, or
adopting without requiring them to understand every internal child resource.

## Why

Conditional children are often how AWSX implements functionality. Users need to
understand the functional choice they are making and which public outputs may be
undefined, but the API should not expose internals just because the
implementation uses a child resource.

## Avoid

```ts
// Does bucketName mean "create a bucket with this name" or "use an existing bucket"?
const bucket = args.bucketName
  ? new aws.s3.Bucket(args.bucketName, {}, { parent: this })
  : new aws.s3.Bucket(name, {}, { parent: this });
```

## Prefer

Use explicit component-level choices when the user can create or adopt a
supporting resource:

```ts
const { bucket, bucketId } = requiredBucket(name, args.s3Bucket, {}, {
  parent: this,
});
```

Use skip-style controls for optional children:

```ts
if (!lifecyclePolicy?.skip) {
  this.lifecyclePolicy = new aws.ecr.LifecyclePolicy(name, {
    repository: this.repository.name,
    policy: buildLifecyclePolicy(lifecyclePolicy),
  }, {
    parent: this,
  });
}
```

Expose conditional outputs honestly:

```ts
this.lifecyclePolicy = lifecyclePolicy?.skip ? undefined : new aws.ecr.LifecyclePolicy(
  name,
  lifecyclePolicyArgs,
  { parent: this },
);

this.registerOutputs({
  lifecyclePolicy: this.lifecyclePolicy,
});
```

## AWSX Notes

- Existing helper patterns such as `requiredBucket`, `optionalLogGroup`, and
  skip-style child args are useful examples to inspect before inventing a new
  conditional-child shape.
- A conditional child that used to be unconditional, or the reverse, can be
  compatibility-sensitive. Evaluate the user-visible behavior, preview/update
  effect, cost, permissions, and output shape.
- Conditional outputs should match the generated schema output contract.

## Hand Off When

Use `$awsx-breaking-change-evaluation` if conditional creation changes existing
user-visible behavior, output presence, cost, permissions, or preview/update
results. Use `$awsx-test-authoring` to prove the created/skipped/adopted
branches.
