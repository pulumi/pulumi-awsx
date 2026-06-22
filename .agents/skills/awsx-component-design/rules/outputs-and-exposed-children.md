---
title: Expose Outputs And Children Deliberately
tags: outputs, children, registerOutputs, public-contract
status: draft
---

## Rule

Expose outputs users need to compose with other resources. Expose child resource
objects only when users reasonably need the resource object, its ID/ARN/name, or
direct dependency relationships.

Assign public properties before calling `registerOutputs`. New component
constructors should call `registerOutputs`; existing omissions should be fixed
when touching the constructor or output-publishing path.

## Why

Outputs and public child properties become part of the component contract.
Exposing too little blocks composition; exposing implementation helpers makes
future internal changes harder.

## Avoid

```ts
export class Repository extends schema.Repository {
  constructor(name: string, args: schema.RepositoryArgs, opts: pulumi.ComponentResourceOptions) {
    super(name, {}, opts);
    const { lifecyclePolicy, ...repoArgs } = args;

    const repository = new aws.ecr.Repository(name.toLowerCase(), repoArgs, { parent: this });
    const lifecyclePolicyResource = new aws.ecr.LifecyclePolicy(name, {
      repository: repository.name,
      policy: "{}",
    }, { parent: this });

    // Public fields from the generated base are never assigned.
    // registerOutputs is missing.
  }
}
```

## Prefer

```ts
export class Repository extends schema.Repository {
  constructor(name: string, args: schema.RepositoryArgs, opts: pulumi.ComponentResourceOptions) {
    super(name, {}, opts);
    const { lifecyclePolicy, ...repoArgs } = args;

    this.repository = new aws.ecr.Repository(name.toLowerCase(), repoArgs, {
      parent: this,
    });
    this.url = this.repository.repositoryUrl;

    this.registerOutputs({
      repository: this.repository,
      url: this.url,
    });
  }
}
```

Register exposed child resources explicitly:

```ts
this.trail = new aws.cloudtrail.Trail(name, trailArgs, { parent: this });
this.registerOutputs({
  trail: this.trail,
});
```

## AWSX Notes

- Existing generated bases may define the public output shape. Do not create a
  second output contract by hand in implementation files.
- Component-only args must be removed before forwarding args to child
  `@pulumi/aws` resources.
- Helper resources created only to wire the component should usually remain
  private.
- A missing `registerOutputs` is a design issue for new components or changes
  that touch constructor/output-publishing behavior. Existing omissions outside
  the touched path can be handled by a separate cleanup.

## Hand Off When

Use `$awsx-breaking-change-evaluation` if exposing, hiding, or renaming an output
or child resource changes existing public surface.
