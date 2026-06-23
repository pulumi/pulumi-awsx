---
name: awsx-issue-planning
description: Pre-implementation planning for nontrivial pulumi-awsx issues and feature requests. Use before editing when an AWSX issue may require API design, changed defaults, new child resources, compatibility-sensitive behavior, a checked-in spec, or a choice between a narrow fix and a better component shape.
---

# AWSX Issue Planning

Use this skill before implementation when an AWSX issue is more than a narrow,
already-scoped code change. The goal is to decide what should be built, whether
AWSX should own the behavior, what artifact is needed, and what proof is needed
before editing.

For nontrivial GitHub issues, the planning brief is the deliverable. Stop after
the brief by default. Do not implement in the same turn unless the user prompt
explicitly says the plan is already approved or explicitly asks to proceed
without a maintainer review checkpoint.

A prompt that says "implement if the planning brief says implementation should
proceed" is not pre-approval. That delegates the go/no-go decision back to the
brief and still counts as self-approval.

This skill is the gate before the tactical skills:

- Use `$awsx-component-design` after selecting a component/API shape.
- Use `$awsx-breaking-change-evaluation` when an option changes public schema,
  child resources, defaults, providers, regions, or upgrade behavior.
- Use `$awsx-test-authoring` after choosing the behavior that needs proof.
- Use `$awsx-aws-service-validation` when AWS service behavior is part of the
  decision.

## When To Use

Use this for:

- GitHub issues where the literal fix may not be the right component design;
- requests that add or deprecate public args, outputs, or child resources;
- changed AWSX-owned defaults or default-created supporting resources;
- cases where users might need resources created inside the same component;
- bugs where existing users may already have a workaround with lower-level
  `@pulumi/aws` resources;
- any request where "smallest fix" and "ideal user experience" are different.

Skip this for:

- mechanical test fixes, lint fixes, docs-only edits, or already-approved plans;
- narrow changes whose API shape and compatibility risk are already settled.

## Planning Workflow

1. Gather enough live context to avoid guessing:
   - issue body, comments, related PRs, and linked examples;
   - current AWSX code, schema source if relevant, and existing tests;
   - installed `@pulumi/aws` resource surface for affected child resources;
   - AWS documentation or API facts when service behavior matters.
   Treat prior rollout summaries, memories, or old worktree diffs for the same
   issue as historical attempts, not accepted design guidance. Re-check the
   issue and repo shape before reusing any prior implementation pattern.
2. Classify the problem:
   - bug in current implementation;
   - missing public API shape;
   - confusing or unusable legacy API;
   - documentation gap or user-error case;
   - out-of-scope abstraction request.
3. Check current usability:
   - Can a user express the correct architecture today in one Pulumi program and
     one update?
   - If yes, is it through AWSX directly or by composing lower-level
     `@pulumi/aws` resources after the component exists?
   - If no, name exactly which values cannot be referenced or configured.
4. Trace the user's end-to-end goal:
   - write the user-visible definition of done in terms of the working AWS
     outcome for the resource cluster in scope, not the issue's literal symptom
     or the user's whole application architecture;
   - list the AWS service requirements for that outcome, using
     `$awsx-aws-service-validation` when the requirements are not already
     certain;
   - measure the current API and each candidate design against the full working
     outcome, including required defaults and override paths;
   - ask "what immediate follow-up issue would users file because this change
     is incomplete?" and include the answer in the candidate comparison.
5. Define the ideal user configuration:
   - show the smallest realistic code shape a user would want to write;
   - include required supporting resources, defaults, and override paths;
   - distinguish AWSX-created resources from user-supplied resources.
6. If public component surface is involved, perform an existing-surface
   extension pass before recommending a new API:
   - ask whether the current public API can satisfy the working outcome through
     clearer defaults, an explicit mode or strategy, additional fields, or
     composition with lower-level resources;
   - check whether existing users are already successfully using the current
     surface and what compatibility promise AWSX would inherit;
   - if proposing a new public surface anyway, explain why extending the current
     surface is insufficient;
   - account for surface lifetime cost: whether old and new surfaces both remain
     supported, how users know which one to use, and what behavior would be
     duplicated across them.
7. Compare candidate designs:
   - do not force designs into fixed buckets; let the issue shape determine the
     candidate set;
   - for each candidate, state completeness against the user-visible outcome,
     existing-user path, new-user path, compatibility risk, implementation size,
     surface lifetime cost when relevant, migration story, immediate follow-up
     issue risk, and proof required;
   - do not select a narrow fix if it only fixes the named symptom while leaving
     the user-visible outcome nonfunctional or forcing an immediate follow-up
     issue.
8. Recommend a path:
   - choose one candidate design or state where maintainer input is needed;
   - state why the rejected designs are not good enough;
   - name the next tactical skills an implementation session should use.
9. Stop after the brief unless the prompt explicitly pre-approves implementation
   after planning. Do not self-approve by saying the brief is
   implementation-ready and then editing in the same turn.

## Choose The Artifact

Use the smallest artifact that reduces real risk:

- **Chat-only planning brief**: narrow fix, obvious API shape, and low
  compatibility risk.
- **Checked-in spec**: new public args or outputs, changed default-created
  resources, multiple plausible component shapes, compatibility-sensitive child
  resources, or behavior that affects generated SDK/schema surface.
- **Handoff/status doc**: multi-session work with unresolved decisions,
  temporary branch state, or validation that cannot be completed locally.

Do not create `docs/specs/**` by default. Create a checked-in spec only when the
planning brief shows that implementation would otherwise hide a product/API
decision.

Before drafting a checked-in spec for a public-surface change, checkpoint with
the maintainer if multiple plausible surface directions remain. Summarize the
decision pressure first: whether the existing surface can be extended, why a new
surface may still be needed, and what long-term maintenance cost each direction
creates.

For a checked-in spec, prefer a compact Markdown document under `docs/specs/`
with this shape:

```markdown
# <Topic> AWSX Component Design

## Summary
What is changing, who observes it, and why AWSX should own it.

## Current Usability
What users can and cannot express today, including one-update workarounds.

## Desired User Experience
Representative AWSX program shape and which resources AWSX creates or adopts.

## Existing Surface Extension
Whether the current public API can be extended before adding a second surface,
including surface lifetime cost if a new API is still preferred.

## Design
Public args/outputs, child resources, defaults, override paths, and rejected
alternatives.

## Compatibility Risks
Schema/SDK surface, child names/aliases, default resources, provider/region
behavior, and migration.

## Validation
Focused tests/checks for each important invariant, plus what remains unproven.
```

Omit sections only when they truly add no information. Keep durable component
semantics separate from temporary rollout notes if combining them would make the
spec noisy.

## Abstraction Discipline

Favor AWSX ownership when the behavior is a broadly useful resource wrapper or a
bounded component around one logical resource cluster. Be cautious when the
request turns into an application blueprint, multi-service architecture, or a
steady stream of highly specific variations.

Defaults are allowed only when AWSX can intentionally own and preserve them as
compatibility surface. Avoid owning service-version, provider, or AWS-managed
defaults that are likely to drift outside AWSX.

## Planning Brief Format

Produce a concise planning brief:

````markdown
## Planning Brief

Problem:
- <what is broken or missing>

Current usability:
- <usable today? one-shot? workaround? what cannot be expressed?>

User-visible definition of done:
- <working AWS outcome, not just the issue symptom>

Service requirements:
- <AWS requirements for the happy path, including defaults/supporting resources>

Ideal user configuration:
```ts
<short representative AWSX program shape>
```

Candidate designs:
- <candidate design>: <completeness against definition of done, existing-user
  path, new-user path, compatibility, surface lifetime cost if public API is
  involved, next issue users would file, proof>
- <candidate design>: <same checks>

Artifact:
- <chat-only brief, checked-in spec, or handoff/status doc>

Recommendation:
- <selected path or stop for input>

Next proof:
- <focused tests/checks; what remains unproven>
````

Keep the brief short enough for a maintainer to challenge it. The definition of
done should usually be one or two lines, and service requirements should be a
short checklist. Do not hide a product/API decision inside implementation
details.

End the turn after the brief unless the user's prompt explicitly pre-approves
implementation after planning. If the next step is implementation, phrase it as
a recommended follow-up, not permission to edit immediately.

## Stop Before Editing

Stop and ask for maintainer direction if:

- the issue exposes an unusable or misleading public API rather than a local bug;
- the best user experience requires a new public API or deprecating an old one;
- a narrow fix helps one case but leaves the main workflow incomplete;
- the narrow fix creates configured child resources that still do not satisfy
  the user-visible AWS outcome;
- existing users might see new child resources, renamed children, changed
  defaults, replacements, or changed generated SDK surface;
- AWSX would need to own a broad application pattern or a default likely to
  drift with AWS or `@pulumi/aws`;
- the proof would require live AWS behavior and only mock tests are available.
