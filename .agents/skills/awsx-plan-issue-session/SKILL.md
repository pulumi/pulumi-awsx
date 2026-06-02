---
name: awsx-plan-issue-session
description: Manual-only AWSX issue planning session launcher. Use only when explicitly invoked to produce a planning brief for a GitHub issue or feature request, then stop before editing.
---

# AWSX Plan Issue Session

This is a manual-only launcher skill. Use it only when the user explicitly
invokes it. Its output is a planning brief, not code.

## Inputs

Use the issue, PR, branch, or task details supplied with the invocation. If the
target is missing, ask for it and stop.

## Workflow

1. Use `$awsx-issue-planning` first.
2. Do not edit files, implement code, commit, or create a checked-in spec.
3. Re-check live context instead of trusting prior attempts:
   - issue body, comments, related PRs, and linked examples;
   - current AWSX code, schema source when relevant, and existing tests;
   - installed `@pulumi/aws` surface for affected child resources;
   - AWS service facts using `$awsx-aws-service-validation` when needed.
4. Treat rollout summaries, memories, old worktree diffs, and abandoned PRs as
   historical attempts, not accepted design guidance.
5. Use supporting skills only for planning evidence:
   - `$awsx-component-design` for API/component shape;
   - `$awsx-breaking-change-evaluation` for compatibility-sensitive options;
   - `$awsx-test-authoring` for proof strategy;
   - `$awsx-aws-service-validation` for feature-level AWS requirements.
6. Produce the planning brief required by `$awsx-issue-planning`.
7. Stop after the brief.

## Required Brief Emphasis

The brief must define the user-visible AWS outcome, enumerate the AWS happy-path
requirements for the resource cluster in scope, evaluate whether the current
AWSX API can express the full working configuration, and identify the immediate
follow-up issue users would file if a narrow fix ships incomplete.

If the initial prompt says to implement only if the brief says implementation
should proceed, treat that as no implementation permission. That delegates
approval back to the same session and still counts as self-approval.

If implementation looks appropriate, phrase it as a recommended follow-up for a
separate implementation session. Do not edit in this session.
