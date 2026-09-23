#!/usr/bin/env bash

set -euo pipefail

# SDK dependency versions originate in the schema. Regenerate it first so the
# SDK generators do not read stale schema data.
make schema
make generate_sdks
npm --prefix awsx install
npm --prefix awsx run dedupe-deps
