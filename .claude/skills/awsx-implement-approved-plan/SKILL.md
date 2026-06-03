---
name: awsx-implement-approved-plan
description: Manual-only AWSX implementation session launcher. Use only when explicitly invoked to implement an already reviewed AWSX planning brief or approved plan.
disable-model-invocation: true
user-invocable: true
argument-hint: ISSUE_OR_PR_URL APPROVED_PLAN
---

# AWSX Implement Approved Plan

Read `.agents/skills/awsx-implement-approved-plan/SKILL.md` now and follow it
exactly. Do not take any other action until you have read it.

The canonical instructions are in `.agents/skills/awsx-implement-approved-plan/SKILL.md`.

This Claude wrapper exists because Claude's manual-only skill controls live in
`SKILL.md` frontmatter, while the canonical `.agents` skill uses Codex's
`agents/openai.yaml` invocation policy.
