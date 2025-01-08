#!/usr/bin/env bash

set -euo pipefail

REF=a7f9d39a409c4a59eb87944391a5cd77a86787d7

go run github.com/pulumi/ci-mgmt/provider-ci@${REF} generate --skip-migrations
