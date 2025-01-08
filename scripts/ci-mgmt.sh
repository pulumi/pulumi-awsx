#!/usr/bin/env bash

set -euo pipefail

REF=t0yv0/new-generic
go run github.com/pulumi/ci-mgmt/provider-ci@${REF} generate --skip-migrations
