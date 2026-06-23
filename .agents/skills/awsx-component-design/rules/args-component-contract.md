---
title: Design Args As The Component Contract
tags: args, schema, inputs, cross-language, component-semantics
status: draft
---

## Rule

Use generated `schema.<Component>Args` shapes for modern `awsx/**` components.
Design public args as the component entrypoint: schema-friendly, composable from
Pulumi values, and named around the AWS service capability the user is
configuring.

Do not default to raw pass-through bags from child `@pulumi/aws` resources. Add
pass-through surface only when AWSX intentionally exposes an escape hatch or must
preserve existing schema surface.

## Why

AWSX components are schema-backed and consumed from generated SDKs. A public arg
should be more than a leak of a child resource API: it should match the mental
model a user has when configuring the component.

AWSX components are also used for composition. If args only accept plain values,
callers must use `.apply()` just to connect resources. If args contain callbacks
or TypeScript-only constructs, generated SDKs cannot represent them. Deep
artificial nesting makes generated SDKs harder to discover and use.

## Avoid

Hand-authored public shapes only TypeScript can consume:

```ts
export interface RepositoryArgs {
  lifecyclePolicy?: {
    transform?: (policy: aws.ecr.LifecyclePolicyArgs) => aws.ecr.LifecyclePolicyArgs;
  };
}

export class Repository extends schema.Repository {
  constructor(name: string, args: RepositoryArgs, opts: pulumi.ComponentResourceOptions) {
    super(name, {}, opts);
  }
}
```

Raw child-resource bags as the main component API:

```ts
export interface RepositoryArgs {
  repositoryArgs?: aws.ecr.RepositoryArgs;
  lifecyclePolicyArgs?: aws.ecr.LifecyclePolicyArgs;
}
```

Plain values that force callers to unwrap Outputs:

```ts
interface ServiceArgs {
  vpcId: string;
  port: number;
}
```

Artificial nesting that only mirrors implementation structure:

```ts
interface TaskArgs {
  runtime: {
    compute: {
      cpu: pulumi.Input<number>;
      memory: pulumi.Input<number>;
    };
  };
}
```

Duplicate knobs for one decision:

```ts
new Example("x", {
  region: "us-west-2",
  listener: { region: "us-east-1" },
  targetGroup: { region: "us-east-2" },
});
```

## Prefer

Intentional component semantics:

```ts
new Repository("app", {
  lifecyclePolicy: {
    rules: [{
      tagStatus: "untagged",
      maximumNumberOfImages: 1,
    }],
  },
});
```

Schema-backed implementation types:

```ts
export class Repository extends schema.Repository {
  constructor(name: string, args: schema.RepositoryArgs, opts: pulumi.ComponentResourceOptions) {
    super(name, {}, opts);
    const { lifecyclePolicy, ...repoArgs } = args;
    // Existing schema surface may include pass-through fields; preserve it
    // intentionally rather than adding new raw pass-through bags by default.
    this.repository = new aws.ecr.Repository(name.toLowerCase(), repoArgs, { parent: this });
    this.registerOutputs({
      repository: this.repository,
    });
  }
}
```

Args that can compose with resource outputs:

```ts
export interface ServiceArgs {
  vpcId: pulumi.Input<string>;
  port: pulumi.Input<number>;
}
```

Configuration instead of callbacks:

```ts
export interface RepositoryArgs {
  namePrefix?: pulumi.Input<string>;
  nameSuffix?: pulumi.Input<string>;
}
```

Flat common controls:

```ts
export interface TaskArgs {
  cpu?: pulumi.Input<number>;
  memory?: pulumi.Input<number>;
}
```

One component-level control for region-aware components:

```ts
new Example("x", {
  region: "us-west-2",
  listener: { port: 443 },
});
```

An explicit mode or strategy when an existing public shape can represent the
concept, but AWSX needs an opt-in way to apply owned defaults or generated child
resource wiring:

```ts
new Example("x", {
  existingSpecs: [{ name: "main" }],
  existingSpecStrategy: "Auto",
});
```

## AWSX Notes

- Apply this rule at the schema design layer, then consume the generated
  `schema.<Component>Args` type in implementation code.
- Before adding a new arg shape, inspect similar AWSX components and the
  underlying `@pulumi/aws` resource args. Prefer AWSX semantics over raw
  pass-through bags, but do not invent a shape that conflicts with the provider
  surface without a documented reason.
- Use the schema generator as the public-surface source of truth; do not invent a
  parallel TypeScript-only public interface in `awsx/**`.
- Prefer AWS service terminology over invented names when it helps users map the
  component to AWS docs and errors.
- Existing schema may already expose pass-through fields. Preserve existing
  behavior unless compatibility review settles a different path.
- Before adding a second public API for a concept, ask whether the current
  surface can be extended safely. A mode or strategy field can be a good
  candidate when the old shape is valid but lacks AWSX-owned resolution
  behavior. Do not use this as a default preference; compare it against other
  designs and the long-term cost of supporting both surfaces.
- Do not add a blanket "no unions" rule here. AWSX schema-backed components can
  support union-shaped public surface when the schema supports it.
- Nesting can be appropriate for real child concepts such as `listener`,
  `defaultTargetGroup`, `natGateways`, or `lifecyclePolicy`. Avoid nesting that
  only mirrors implementation structure.

## Hand Off When

Use `$awsx-breaking-change-evaluation` if changing arg shape affects generated
SDKs or existing programs. Use `$awsx-test-authoring` when Output/Input
composition needs a regression test.
