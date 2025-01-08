#!/usr/bin/env bash

set -euo pipefail

REF=$(cd ~/code/ci-mgmt && git rev-parse HEAD)
go run github.com/pulumi/ci-mgmt/provider-ci@${REF} generate --skip-migrations
