#!/usr/bin/env bash

set -euo pipefail

make generate_sdks
npm --prefix awsx install
npm --prefix awsx run dedupe-deps
