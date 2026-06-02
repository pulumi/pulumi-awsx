# AWSX AI Harness

This is intentionally small. `AGENTS.md` already owns the command list,
generated-file rules, and basic repo map. Do not duplicate those here.

Current harness files:

- `docs/ai-harness/awsx-harness-workbook.md` - staging workbook for unresolved
  harness questions. Do not treat open questions there as durable guidance.
- `docs/ai-harness/testing.md` - how to choose and write new AWSX tests.
- `REVIEW.md` - AWSX-specific review notes.
- `.agents/skills/awsx-issue-planning/SKILL.md` - pre-implementation planning
  for nontrivial AWSX issues where scope, API shape, compatibility, or spec
  needs are not already settled.
- `.agents/skills/awsx-component-design/SKILL.md` - tactical authoring workflow
  for modern `awsx/**` component changes.
- `.agents/skills/awsx-breaking-change-evaluation/SKILL.md` - compatibility
  and schema public-surface review workflow.
- `.agents/skills/awsx-test-authoring/SKILL.md` - test-selection and assertion
  guidance for modern AWSX changes.
- `.agents/skills/awsx-aws-service-validation/SKILL.md` - AWS service fact,
  docs, provider-surface, and regional availability validation.
- `.claude/skills/` - symlinks to the `.agents/skills/` directories for Claude
  Code. Do not duplicate skill contents there.

Routing:

- Use `AGENTS.md` first for repo map, commands, generated boundaries, and
  required validation.
- Use `REVIEW.md` for the short AWSX-specific review checklist.
- Treat `.agents/skills/` as the source of truth for skill content; keep
  `.claude/skills/` as symlinks only.
- Use `$awsx-issue-planning` first for GitHub issue implementation unless the
  prompt explicitly says the plan/API shape is already approved. For nontrivial
  issues, the planning brief is the first-session deliverable; stop there unless
  the prompt explicitly asks to proceed after planning without a maintainer
  review checkpoint.
- Treat prior rollout summaries, memories, or old worktree diffs for the same
  issue as historical attempts, not accepted design guidance.
- Use `$awsx-issue-planning` before implementation when the issue may require a
  public API decision, changed defaults, new child resources, deprecation, a
  checked-in spec, or a choice between a narrow fix and a better component
  shape.
- Use the `.agents/skills/awsx-*` skills for detailed tactical guidance:
  issue planning, component shape, breaking-change evaluation, test authoring,
  and AWS service fact validation.
- Use the workbook only for unresolved questions; do not cite it as final
  guidance.

Add to this harness only when there is concrete AWSX guidance to capture. A new
doc or skill should answer a question that `AGENTS.md`, `DEVELOPMENT.md`, and
the source code do not already answer.

Known remaining gaps are tracked in `docs/ai-harness/awsx-harness-workbook.md`:

- component invariant audit for parentage, `registerOutputs`, and region
  propagation: section 2;
- where modern component snapshot/replay fixtures should live: section 3;
- final AWSX abstraction admission rules, especially the L2/L2.5/L3 boundary:
  section 5;
