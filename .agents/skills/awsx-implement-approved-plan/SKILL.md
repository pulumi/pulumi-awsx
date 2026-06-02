---
name: awsx-implement-approved-plan
description: Manual-only AWSX implementation session launcher. Use only when explicitly invoked to implement an already reviewed AWSX planning brief or approved plan.
---

# AWSX Implement Approved Plan

This is a manual-only launcher skill. Use it only when the user explicitly
invokes it with an approved plan or reviewed planning brief.

## Inputs

Use the approved plan supplied with the invocation, or a file/PR/comment the
user identifies as the approved plan. If the approved plan is missing, ask for
it and stop.

## Workflow

1. Read the approved plan and the current checkout state.
2. Do not reopen the design unless live evidence contradicts the approved plan.
3. If the approved plan cannot satisfy the user-visible AWS outcome, stop and
   report the blocker instead of substituting a narrower fix.
4. Use the tactical AWSX skills as needed:
   - `$awsx-component-design` for component/API details;
   - `$awsx-breaking-change-evaluation` for compatibility-sensitive behavior;
   - `$awsx-test-authoring` for focused proof;
   - `$awsx-aws-service-validation` for new AWS service facts.
5. Implement the smallest change that satisfies the approved user-visible
   outcome.
6. Do not run full `make test` locally. Run focused validation only, following
   `AGENTS.md` and `$awsx-test-authoring`.
7. Report what changed, what validation ran, and what remains unproven.

## Stop Conditions

Stop instead of coding if:

- the approved plan is ambiguous or missing;
- current code, provider surface, or AWS docs contradict the plan;
- the implementation would need a broader API/product decision than the plan
  approved;
- satisfying the plan requires generated file edits without changing the source
  of truth first;
- only live AWS behavior could prove the central claim and the user has not
  approved that validation path.
