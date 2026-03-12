---
description: Run PR re-review on explicit maintainer slash command.
timeout-minutes: 15
strict: true
on:
  slash_command:
    name: review-again
    events: [pull_request_comment, pull_request_review_comment]
imports:
  - shared/review.md
  - shared/plugins/code-review/code-review.md
permissions:
  contents: read
  pull-requests: read
  id-token: write
source: pulumi-labs/gh-aw-internal/.github/workflows/gh-aw-pr-rereview.md@fcc1c7863be902c1ec6165ec1ac9b029a98043a3
---

# Internal PR Re-Review (Slash Command)
