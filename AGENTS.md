# Agent Instructions

## What this repo is
Pulumi AWSX provider/component library. Core behavior is implemented in `awsx/` (TypeScript) and `provider/` (Go schema generation). The repo also contains legacy TypeScript components in `awsx-classic/`. Most files in `sdk/` and several workflow files are generated artifacts.

## Start Here
- `Makefile` - canonical local command surface.
- `.ci-mgmt.yaml` - source-of-truth for generated CI workflows and Make targets.
- `docs/ai-harness/README.md` - current AI harness state and known gaps.
- `docs/ai-harness/awsx-harness-workbook.md` - staging workbook for unresolved
  harness questions; open questions there are not durable guidance.
- `docs/ai-harness/testing.md` - guidance for writing new AWSX tests.
- `REVIEW.md` - AWSX-specific review notes that are not generic PR-review advice.
- `.agents/skills/awsx-issue-planning/SKILL.md` - pre-implementation planning
  for nontrivial issues where scope, API shape, compatibility, or spec needs
  are unsettled.
- `.agents/skills/awsx-component-design/SKILL.md` - tactical authoring workflow
  for modern `awsx/**` component changes.
- `.agents/skills/awsx-breaking-change-evaluation/SKILL.md` - compatibility
  and schema public-surface review workflow.
- `.agents/skills/awsx-test-authoring/SKILL.md` - test-selection and assertion
  guidance for modern AWSX changes.
- `.agents/skills/awsx-aws-service-validation/SKILL.md` - AWS service fact,
  docs, provider-surface, and regional availability validation.
- `.claude/skills/` - symlinks to the repo-local `.agents/skills/` entries so
  Claude Code sees the same skill sources.
- `provider/pkg/schemagen/` - schema generation logic.
- `provider/cmd/pulumi-resource-awsx/` - provider schema output and embedding.
- `awsx/` - TypeScript provider implementation + Jest tests.
- `awsx-classic/` - legacy TypeScript components and compatibility surface.
- `examples/` - integration/acceptance tests (real AWS resources).
- `CONTRIBUTING.md` and `DEVELOPMENT.md` - contributor docs.

## AI Harness
- Keep harness docs small and AWSX-specific. Do not add placeholder docs or generic "remember to test" guidance.
- Add harness material only when it captures a real repo pattern, repeated mistake, or concrete review rule.
- If a session reveals missing guidance, update the smallest existing harness file first.

Use the focused harness entry points this way:
- `AGENTS.md` owns repo map, commands, generated boundaries, and path-triggered validation.
- `REVIEW.md` owns the short AWSX-specific review checklist.
- `.agents/skills/` is the skill source of truth; keep `.claude/skills/`
  symlinks pointed at those same directories instead of duplicating skill
  content.
- For GitHub issue implementation, use `.agents/skills/awsx-issue-planning/SKILL.md`
  first unless the prompt explicitly says the plan/API shape is already
  approved. For nontrivial issues, produce the planning brief and stop by
  default; do not let the same session self-approve implementation unless the
  prompt explicitly asks to proceed after planning without a maintainer review
  checkpoint.
- Treat prior rollout summaries, memories, or old worktree diffs for the same
  issue as historical attempts, not accepted design guidance.
- `.agents/skills/awsx-issue-planning/SKILL.md` applies before editing when a
  nontrivial issue needs scope, API-shape, current-usability, compatibility,
  proof-strategy, or checked-in-spec decisions.
- `.agents/skills/awsx-component-design/SKILL.md` applies when designing or reviewing modern `awsx/**` component shape: args, outputs, child resources, names, providers, regions, defaults, and `registerOutputs`.
- `.agents/skills/awsx-breaking-change-evaluation/SKILL.md` applies when a change may affect existing users: schema or generated SDK surface, child identity, aliases, defaults, provider/region behavior, or upgrade previews.
- `.agents/skills/awsx-test-authoring/SKILL.md` applies when choosing or writing proof: Jest mocks, schema/SDK checks, provider-upgrade tests, targeted acceptance tests, and assertion quality.
- `.agents/skills/awsx-aws-service-validation/SKILL.md` applies when a change depends on AWS service behavior, API or CloudFormation constraints, regional availability, or disagreement between AWS docs and `@pulumi/aws`.
- `docs/ai-harness/testing.md` is the human-readable overview for AWSX test choices; prefer the test-authoring skill for tactical rule-by-rule guidance.
- `docs/ai-harness/awsx-harness-workbook.md` is staging only. Do not treat open questions or candidate rules there as durable guidance.

## Command Canon
- Build provider + SDKs + install SDKs: `make build`
- Regenerate schema + SDKs: `make generate`
- Build provider binary: `make provider`
- Build SDKs only: `make build_sdks`
- Install SDKs only: `make install_sdks`
- Lint: `make lint`
- AWSX TypeScript/Jest tests (fast): `make test_provider`
- Full integration suite (AWS-backed, CI-only locally): `make test`
- Targeted integration tests: `GOTESTARGS="-run TestName" make test`
- Regenerate workflows/Makefile from ci-mgmt: `make ci-mgmt`

## Generated Boundaries
Never hand-edit generated outputs as the source of truth:
- `sdk/**`
- `provider/cmd/pulumi-resource-awsx/schema.json`
- `provider/cmd/pulumi-resource-awsx/schema-embed.json`
- ci-mgmt-generated workflow YAML and gh-aw `.lock.yml` files under `.github/workflows/`
- `.github/aw/actions-lock.json`
- `Makefile`

Use source files + regeneration commands instead.
Some workflow source files also live under `.github/workflows/`. Edit those source files only when they are the source of truth, then regenerate/validate the generated outputs.

## If You Change...
- `awsx/**` -> run `make test_provider`
- `awsx-classic/**` -> run `yarn --cwd awsx-classic lint`
- `provider/pkg/schemagen/**` -> run `make schema && make generate`
- `.ci-mgmt.yaml` -> run `make ci-mgmt`
- `examples/**` -> run targeted acceptance tests locally; do not run the full `make test` suite locally
- `docs/ai-harness/**` or `REVIEW.md` -> keep the guidance specific to AWSX and remove duplicated command lists

## Key Invariants
- Schema generation changes can affect all language SDKs.
- `make test` creates real AWS resources and can incur cost.
- CI/workflow edits should be made via `.ci-mgmt.yaml`, not by hand in generated workflow files.

## Forbidden Actions
- No destructive git (`git reset --hard`, force push, checkout discard) without explicit approval.
- No hand-edits to generated files without corresponding source/regeneration changes.
- Do not claim checks passed unless you ran them.

## Escalate Immediately If
- Unsure whether a touched file is source or generated.
- Public SDK surface changes are introduced by schema edits.
- CI behavior change cannot be expressed cleanly via `.ci-mgmt.yaml`.
