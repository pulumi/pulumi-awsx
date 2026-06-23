---
name: awsx-component-design
description: Tactical AWSX component-shape guidance for modern pulumi-awsx components. Use when a change is already in scope and Codex needs to design or review args, outputs, child resource ownership, child exposure, naming, provider/options/region propagation, defaults, registerOutputs behavior, or other AWSX component contract details.
---

# AWSX Component Design

Use this skill after the change is already considered in scope for AWSX. Do not
use it to decide whether AWSX should add a new abstraction.

This skill is an index of focused component-shape rules. Load only the rule files
that match the work in front of you.

For implementation command flow, generated-file boundaries, and source
locations, use `AGENTS.md`. For tests, use `$awsx-test-authoring`. For
compatibility review, use `$awsx-breaking-change-evaluation`. For AWS service
facts, use `$awsx-aws-service-validation`.

## Rule Index

- `rules/args-component-contract.md`: public args, schema-safe shapes,
  intentional component semantics, `Input<T>`-friendly values, callbacks, flat
  structures, and duplicate knobs.
- `rules/outputs-and-exposed-children.md`: public outputs, exposed child
  resources, private helper resources, and `registerOutputs`.
- `rules/conditional-children.md`: optional child resources, skip/create/adopt
  controls, and conditional outputs.
- `rules/child-resource-ownership.md`: child parents, helper parent parameters,
  nested resources, and ordering.
- `rules/child-resource-names.md`: stable child logical names and rename risk.
- `rules/provider-options-region.md`: provider inheritance, option composition,
  aliases, top-level `region`, and regional child resources.
- `rules/defaults-owned-by-awsx.md`: sensible defaults, override paths,
  provider/service defaults, and default-created supporting resources.

## How To Use

1. Identify which part of the component contract is changing.
2. Read the matching rule file before designing or reviewing the code.
3. Validate the proposed shape against nearby AWSX components, the installed
   `@pulumi/aws` resource surface, and AWS docs when the design depends on
   service behavior. Use `$awsx-aws-service-validation` when the service fact is
   not already proven.
4. Follow the rule examples unless the local component has a documented
   compatibility exception.
5. If a rule points to compatibility risk, switch to
   `$awsx-breaking-change-evaluation` before settling the design.
6. If a rule needs proof, switch to `$awsx-test-authoring` for the test shape.

## Stop Early

Stop before editing or finalizing the design if:

- the component shape needs a new public arg that is not schema-friendly;
- the same behavior would be configurable in more than one place;
- a child resource would be renamed, reparented, or newly exposed;
- an existing component lacks `registerOutputs` and the right output contract is
  unclear;
- provider or region propagation conflicts with existing nested schema fields;
- the design depends on an AWS service fact that is not verified from the
  installed Pulumi AWS surface or AWS documentation.
