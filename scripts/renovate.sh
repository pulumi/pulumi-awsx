#!/usr/bin/env bash

set -euo pipefail

make generate_sdks
yarn --cwd awsx install --frozen-lockfile
yarn --cwd awsx dedupe-deps
