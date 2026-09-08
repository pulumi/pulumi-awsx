#!/usr/bin/env bash

set -euo pipefail

# Renovate runs this script outside GitHub Actions, so its checkout is not
# trusted by mise-action. Trust the checked-in config before Make uses mise.
# See https://github.com/pulumi/ci-mgmt/issues/2413.
mise trust --yes -q

# SDK dependency versions originate in the schema. Regenerate it first so the
# SDK generators do not read stale schema data.
make schema
make generate_sdks
npm --prefix awsx install
npm --prefix awsx run dedupe-deps
