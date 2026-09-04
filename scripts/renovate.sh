#!/usr/bin/env bash

set -euo pipefail

make generate_sdks
npm --prefix awsx install
