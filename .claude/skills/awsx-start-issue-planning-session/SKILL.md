---
name: awsx-start-issue-planning-session
description: Manual-only AWSX issue planning session starter. Use only when explicitly invoked to start a planning-only session for a GitHub issue or feature request, produce a planning brief, and stop before editing.
disable-model-invocation: true
user-invocable: true
argument-hint: ISSUE_OR_PR_URL
---

# AWSX Start Issue Planning Session

Read `.agents/skills/awsx-start-issue-planning-session/SKILL.md` now and follow it
exactly. Do not take any other action until you have read it.

The canonical instructions are in `.agents/skills/awsx-start-issue-planning-session/SKILL.md`.

This Claude wrapper exists because Claude's manual-only skill controls live in
`SKILL.md` frontmatter, while the canonical `.agents` skill uses Codex's
`agents/openai.yaml` invocation policy.
