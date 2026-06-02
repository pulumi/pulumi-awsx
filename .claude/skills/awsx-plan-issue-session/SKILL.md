---
name: awsx-plan-issue-session
description: Manual-only AWSX issue planning session launcher. Use only when explicitly invoked to produce a planning brief for a GitHub issue or feature request, then stop before editing.
disable-model-invocation: true
user-invocable: true
argument-hint: ISSUE_OR_PR_URL
---

# AWSX Plan Issue Session

Use the canonical instructions in:

`.agents/skills/awsx-plan-issue-session/SKILL.md`

This Claude wrapper exists because Claude's manual-only skill controls live in
`SKILL.md` frontmatter, while the canonical `.agents` skill uses Codex's
`agents/openai.yaml` invocation policy.
