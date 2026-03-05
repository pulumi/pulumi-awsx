---
on:
  slash_command:
    events:
    - pull_request_comment
    - pull_request_review_comment
    name: review-again
permissions:
  contents: read
  id-token: write
  pull-requests: read
imports:
- pulumi-labs/gh-aw-internal/.github/snippets/code-review.md@main
safe-outputs:
  create-pull-request-review-comment:
    max: 12
    side: RIGHT
    target: ${{ github.event.pull_request.number || github.event.issue.number }}
    target-repo: ${{ github.repository }}
  messages:
    footer: "> Reviewed by [{workflow_name}]({run_url})"
    run-failure: Slash-command PR re-review failed ({status}).
    run-started: Started slash-command PR re-review.
    run-success: Finished slash-command PR re-review.
  noop:
    max: 1
  submit-pull-request-review:
    max: 1
    target: ${{ github.event.pull_request.number || github.event.issue.number }}
steps:
- env:
    ESC_ACTION_ENVIRONMENT: imports/github-secrets
    ESC_ACTION_EXPORT_ENVIRONMENT_VARIABLES: "false"
    ESC_ACTION_OIDC_AUTH: "true"
    ESC_ACTION_OIDC_ORGANIZATION: pulumi
    ESC_ACTION_OIDC_REQUESTED_TOKEN_TYPE: urn:pulumi:token-type:access_token:organization
  id: esc-secrets
  name: Fetch secrets from ESC
  uses: pulumi/esc-action@9eb774255b1a4afb7855678ae8d4a77359da0d9b
- env:
    ANTHROPIC_API_KEY_FROM_ESC: ${{ steps.esc-secrets.outputs.ANTHROPIC_API_KEY }}
  name: Validate ESC secret output
  run: |
    test -n "$ANTHROPIC_API_KEY_FROM_ESC" || {
      echo "ESC did not return ANTHROPIC_API_KEY";
      exit 1;
    }
description: Run PR re-review on explicit maintainer slash command.
engine:
  env:
    ANTHROPIC_API_KEY: ${{ steps.esc-secrets.outputs.ANTHROPIC_API_KEY || '__GH_AW_ACTIVATION_PLACEHOLDER__' }}
  id: claude
source: pulumi-labs/gh-aw-internal/.github/workflows/gh-aw-pr-rereview.md@ae997a8103ec0b750d04141c3cdd4c31102b7f41
strict: true
timeout-minutes: 15
tools:
  github:
    lockdown: false
    toolsets:
    - pull_requests
    - repos
---
# Internal PR Re-Review (Slash Command)

This workflow runs when a maintainer posts `/review-again` as the first token in a PR comment or review comment.

Review context text: `${{ needs.activation.outputs.text }}`

This workflow imports `pulumi-labs/gh-aw-internal/.github/snippets/code-review.md@main` for the baseline review rubric.

## Trust Model

- This workflow is slash-command triggered and restricted to PR comment/review-comment events.
- `tools.github.lockdown: false` is set to avoid requiring a custom GitHub MCP token.
- If the command was not issued in PR context, call `noop` and stop.

## Workflow-Specific Rules

- Determine the target PR number from the command event context.
- Use that PR number for all review operations in this run.
- Use `create-pull-request-review-comment` for actionable inline findings on changed lines.
- Submit exactly one final review with `submit-pull-request-review`:
  - `REQUEST_CHANGES` for blocking issues.
  - `COMMENT` for non-blocking observations.
  - `APPROVE` when no actionable issues remain.
- If required PR context is missing, call `noop`.

Constraints:
- Post no more than 12 inline comments.
- Do not post free-form issue comments outside review safe outputs.
