#!/usr/bin/env bash

set -euo pipefail

(cd ~/code/ci-mgmt/provider-ci && go build)

~/code/ci-mgmt/provider-ci/provider-ci generate --skip-migrations
