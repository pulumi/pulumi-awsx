#!/usr/bin/env bash

set -euo pipefail

make generate_sdks
yarn --cwd awsx dedupe-deps
