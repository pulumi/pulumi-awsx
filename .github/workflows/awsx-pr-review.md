---
description: Automated PR review for trusted internal contributors.
timeout-minutes: 15
strict: true
permissions:
  contents: read
  pull-requests: read
  id-token: write
on:
  pull_request:
    types: [opened]
  workflow_dispatch:
    inputs:
      pr_number:
        description: "Pull request number to review"
        required: true
        type: string
imports:
  - shared/review.md
  - shared/plugins/code-review/code-review.md
source: pulumi-labs/gh-aw-internal/.github/workflows/gh-aw-pr-review.md@11378a6b3ecf9de40ec73f53e078964ec567f5f0
---

# Internal Trusted PR Reviewer
