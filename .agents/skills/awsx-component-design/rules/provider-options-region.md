---
title: Preserve Provider, Options, And Region Flow
tags: providers, options, region, aliases
status: draft
---

## Rule

Let providers and other resource options flow through component parentage unless
a child needs a different provider explicitly. Preserve caller options when
adding component aliases or default options.

For new component behavior, when a component has `args.region`, pass it to every
child resource that accepts region. For existing shipped components, treat new
region propagation as a compatibility-sensitive behavior change unless the
change is already scoped to fix region behavior.

## Why

AWSX components create several child resources on the user's behalf. Provider and
region propagation must behave as part of the component contract, not as an
accidental property of one child.

## Avoid

```ts
super(name, {}, {
  aliases: [{ type: "awsx:lb:ApplicationLoadBalancer" }],
});

this.loadBalancer = new aws.lb.LoadBalancer(name, lbArgs, {
  parent: this,
});

this.listener = new aws.lb.Listener(`${name}-0`, listenerArgs, {
  parent: this,
});
```

This drops caller `opts` and does not show how a top-level region reaches
regional children. The alias is also a no-op because it names the current type
instead of a real legacy type.

## Prefer

```ts
super(
  name,
  {},
  pulumi.mergeOptions(opts, {
    aliases: [
      {
        type: "awsx:x:elasticloadbalancingv2:ApplicationLoadBalancer",
      },
    ],
  }),
);

const lbArgs: aws.lb.LoadBalancerArgs = {
  ...restArgs,
  region: args.region,
};

this.loadBalancer = new aws.lb.LoadBalancer(name, lbArgs, {
  parent: this,
});

this.listener = new aws.lb.Listener(`${name}-0`, {
  ...listenerArgs,
  region: args.region,
  loadBalancerArn: this.loadBalancer.arn,
}, {
  parent: this,
});
```

## AWSX Notes

- Prefer `pulumi.mergeOptions` for new option composition so caller options are
  preserved.
- Alias examples must point at real historical names or types, such as the
  legacy `awsx:x:*` aliases used by modern AWSX components. Do not add an alias
  to the current type as a placeholder.
- `awsx/ecr/registryImage.ts` is a narrow case where Docker resources use an
  explicit provider. Do not generalize that pattern to ordinary AWS children.
- Existing nested pass-through objects may already have their own `region`.
  Avoid expanding that pattern; preserve existing behavior unless compatibility
  review settles a different path.
- Some existing components expose `region` in schema but do not yet pass it to
  every child. Do not retrofit that behavior as cleanup inside an unrelated
  component-shape change.
- This rule is not a policy for when to add a lookup. It only applies once the
  component already needs a child resource or invoke.

## Hand Off When

Use `$awsx-breaking-change-evaluation` if provider or region propagation changes
existing preview/update behavior.
