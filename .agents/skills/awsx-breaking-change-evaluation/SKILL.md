---
name: awsx-breaking-change-evaluation
description: Tactical AWSX breaking-change evaluation guidance for pulumi-awsx. Use when assessing schema changes, generated SDK surface changes, child resource identity changes, aliases, changed defaults, provider or region behavior changes, and upgrade impact for existing users.
---

# AWSX Breaking Change Evaluation

Use this skill to evaluate whether an AWSX change is compatibility-sensitive or
breaking for existing users.

This skill is for risk classification and required evidence. For component shape
guidance, use `$awsx-component-design`. For proof strategy, use
`$awsx-test-authoring`.

## Rule Index

- `rules/public-schema-surface.md`: schema and generated SDK public-surface
  changes.
- `rules/code-vs-behavior-breaks.md`: code-level breaks versus preview/update
  behavior changes.
- `rules/child-identity-and-aliases.md`: child logical names, parentage, URNs,
  aliases, and migration paths.
- `rules/defaults-and-supporting-resources.md`: defaults, default-created
  resources, tags, and supporting-resource changes.
- `rules/provider-region-behavior.md`: provider and region propagation changes.
- `rules/upstream-inherited-breaks.md`: changes inherited from `@pulumi/aws` or
  AWS behavior versus AWSX-added breakage.

## How To Use

1. Identify the user-visible surface touched by the change: schema, generated
   SDKs, child resource identity, defaults, providers/regions, or preview/update
   behavior.
2. Read the matching rule file.
3. Classify the change as clearly safe, compatibility-sensitive, or breaking.
4. If compatibility-sensitive, require evidence: schema comparison, generated
   diff, mock test, provider-upgrade preview, targeted acceptance test, or an
   explicit maintainer decision.
5. Check the upgrade scenarios that match the change: existing user code still
   compiles, existing stack preview is stable, child resource identity remains
   compatible, and new programs get the intended behavior.
6. Report the classification and evidence. Do not smooth uncertainty into a
   confident answer.

## Stop Early

Stop before approving compatibility if:

- existing user code might need to change;
- existing stacks might preview replacements, creates, deletes, or changed
  inputs after upgrade;
- child names, parentage, aliases, provider tokens, module paths, defaults, or
  output presence changed;
- the only evidence is that TypeScript compiles;
- the change is inherited from upstream but AWSX may be adding extra behavior on
  top.
