---
description: Automated PR review for trusted internal authors.
timeout-minutes: 15
strict: true
on:
  pull_request:
    types: [opened]
imports:
  - ../agents/code-review.md
permissions:
  contents: read
  pull-requests: read
  id-token: write
engine:
  id: claude
  env:
    ANTHROPIC_API_KEY: ${{ steps.esc-secrets.outputs.ANTHROPIC_API_KEY }}
steps:
  - env:
      ESC_ACTION_ENVIRONMENT: github-secrets/${{ github.repository_owner }}-${{ github.event.repository.name }}
      ESC_ACTION_EXPORT_ENVIRONMENT_VARIABLES: "false"
      ESC_ACTION_OIDC_AUTH: "true"
      ESC_ACTION_OIDC_ORGANIZATION: pulumi
      ESC_ACTION_OIDC_REQUESTED_TOKEN_TYPE: urn:pulumi:token-type:access_token:organization
    id: esc-secrets
    name: Fetch secrets from ESC
    uses: pulumi/esc-action@9eb774255b1a4afb7855678ae8d4a77359da0d9b
tools:
  github:
    lockdown: true
    toolsets: [pull_requests, repos]
safe-outputs:
  create-pull-request-review-comment:
    max: 12
    side: "RIGHT"
    target: "${{ github.event.pull_request.number }}"
    target-repo: "${{ github.repository }}"
  submit-pull-request-review:
    max: 1
    target: "${{ github.event.pull_request.number }}"
  noop:
    max: 1
  messages:
    footer: "> Reviewed by [{workflow_name}]({run_url})"
    run-started: "Started automated PR review for #${{ github.event.pull_request.number }}."
    run-success: "Finished automated PR review for #${{ github.event.pull_request.number }}."
    run-failure: "Automated PR review failed for #${{ github.event.pull_request.number }} ({status})."
---

# AWSX Trusted PR Reviewer

Review pull request #${{ github.event.pull_request.number }} in `${{ github.repository }}`.
This workflow imports `../agents/code-review.md` for the baseline review rubric.

## Trust Model

This workflow is `pull_request` triggered and uses gh-aw default fork filtering (same-repository PRs only unless `forks` is explicitly configured).
`tools.github.lockdown: true` is enabled.
If required PR context cannot be read in this trust model, call `noop` with a brief reason and stop.

## Workflow-Specific Rules

- Use the PR number from the event context (`${{ github.event.pull_request.number }}`) as the authoritative target.
- Ignore discovery steps intended for runs without PR context.
- Use `create-pull-request-review-comment` for actionable inline findings on changed lines.
- Submit exactly one final review with `submit-pull-request-review`:
  - `REQUEST_CHANGES` for blocking issues.
  - `COMMENT` for non-blocking observations.
  - `APPROVE` when no actionable issues remain.
- If there is nothing to do because trust/context checks fail, call `noop`.

Constraints:
- Post no more than 12 inline comments.
- Do not post free-form issue comments outside review safe outputs.
