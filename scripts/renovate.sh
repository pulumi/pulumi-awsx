#!/usr/bin/env bash

set -euo pipefail

# Keep the checked-in schema in sync when schema-generation inputs change.
# SDK generators derive their schemas directly from the same Go source.
make schema
make generate_sdks
npm --prefix awsx install
npm --prefix awsx run dedupe-deps
