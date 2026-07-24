# AWSX AI Harness

This is intentionally small. `AGENTS.md` already owns the command list,
generated-file rules, and basic repo map. Do not duplicate those here.

Current harness files:

- `docs/ai-harness/testing.md` - how to choose and write new AWSX tests.
- `.agents/skills/triage-provider-issue/SKILL.md` - APM-managed initial issue
  assessment when ownership or the next evidence artifact is unclear.
- `.agents/skills/stage-pulumi-provider-repro/SKILL.md` - APM-managed durable
  Pulumi repro staging.
- `REVIEW.md` - AWSX-specific review notes.
- `.agents/skills/awsx-issue-planning/SKILL.md` - pre-implementation planning
  for nontrivial AWSX issues where scope, API shape, compatibility, or spec
  needs are not already settled.
- `.agents/skills/awsx-start-issue-planning-session/SKILL.md` - manual-only
  starter for planning an issue in a fresh session and stopping before edits.
- `.agents/skills/awsx-implement-approved-plan/SKILL.md` - manual-only launcher
  for implementing an already reviewed AWSX plan.
- `.agents/skills/awsx-component-design/SKILL.md` - tactical authoring workflow
  for modern `awsx/**` component changes.
- `.agents/skills/awsx-breaking-change-evaluation/SKILL.md` - compatibility
  and schema public-surface review workflow.
- `.agents/skills/awsx-test-authoring/SKILL.md` - test-selection and assertion
  guidance for modern AWSX changes.
- `.agents/skills/awsx-aws-service-validation/SKILL.md` - AWS service fact,
  docs, provider-surface, and regional availability validation.
- `.claude/skills/` - symlinks to most `.agents/skills/` directories for Claude
  Code. Manual-only launcher skills may use small Claude wrappers for
  Claude-specific invocation controls.

Routing:

- Use `AGENTS.md` first for repo map, commands, generated boundaries, and
  required validation.
- Use `REVIEW.md` for the short AWSX-specific review checklist.
- Treat repo-owned `.agents/skills/awsx-*` entries as the source of truth for
  AWSX skill content. Core provider skills are declared in `apm.yml` and
  deployed locally; do not edit the deployed copies.
- Start with `$triage-provider-issue` when ownership or the next evidence
  artifact is unclear. Use `$stage-pulumi-provider-repro` when triage selects a
  durable Pulumi repro.
- Once AWSX ownership is established, use `$awsx-issue-planning` when a
  nontrivial issue still has unsettled scope, API shape, compatibility, or spec
  needs. The planning brief is the first-session deliverable; stop there unless
  the prompt explicitly asks to proceed after planning without a maintainer
  review checkpoint.
- Use `$awsx-start-issue-planning-session` and
  `$awsx-implement-approved-plan` only when explicitly launching those
  workflows. They are manual-only session wrappers, not skills that should
  trigger from ordinary issue or implementation requests.
- Treat prior rollout summaries, memories, or old worktree diffs for the same
  issue as historical attempts, not accepted design guidance.
- Use `$awsx-issue-planning` before implementation when the issue may require a
  public API decision, changed defaults, new child resources, deprecation, a
  checked-in spec, or a choice between a narrow fix and a better component
  shape.
- Use the `.agents/skills/awsx-*` skills for detailed tactical guidance:
  issue planning, component shape, breaking-change evaluation, test authoring,
  and AWS service fact validation.
Add to this harness only when there is concrete AWSX guidance to capture. A new
doc or skill should answer a question that `AGENTS.md`, `DEVELOPMENT.md`, and
the source code do not already answer.

Known remaining gaps:

- component invariant audit for parentage, `registerOutputs`, and region
  propagation;
- where modern component snapshot/replay fixtures should live: section 3;
- final AWSX abstraction admission rules, especially the L2/L2.5/L3 boundary:
  this is intentionally not part of the current tactical skills.
