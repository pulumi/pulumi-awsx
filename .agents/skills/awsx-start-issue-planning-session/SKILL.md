---
name: awsx-start-issue-planning-session
description: Manual-only AWSX issue planning session starter. Use only when explicitly invoked to start a planning-only session for a GitHub issue or feature request, produce a planning brief, and stop before editing.
---

# AWSX Start Issue Planning Session

This is a manual-only launcher skill. Use it only when the user explicitly
invokes it. Its output is a planning brief, not code.

## Inputs

Use the issue, PR, branch, or task details supplied with the invocation. If the
target is missing, ask for it and stop.

## Workflow

1. Use `$awsx-issue-planning` first.
2. Do not edit files, implement code, commit, or create a checked-in spec.
3. Re-check live context as required by `$awsx-issue-planning` instead of
   trusting prior attempts.
4. Treat rollout summaries, memories, old worktree diffs, and abandoned PRs as
   historical attempts, not accepted design guidance.
5. Use supporting AWSX skills only for planning evidence, following
   `$awsx-issue-planning` routing.
6. Produce the planning brief required by `$awsx-issue-planning`.
7. Make the brief easy to carry into the implementation session. Prefer a
   concise, copyable brief in chat. If the user asks for a durable handoff,
   create or update the requested issue/PR comment, checked-in spec, or handoff
   file instead of inventing a location.
8. Stop after the brief.

## Brief Requirements

The brief must meet `$awsx-issue-planning` requirements, especially the
definition-of-done, service-requirements, and immediate-follow-up issue
sections.

Delegated approval is not permission. A prompt like "implement if the brief says
implementation should proceed" still delegates approval back to this same
session; follow `$awsx-issue-planning` and stop after the brief.
