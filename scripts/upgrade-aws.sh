#!/usr/bin/env bash
#
# Usage:
#
# ./scripts/upgrade-aws.sh 6.38.0

set -euo pipefail

VER="$1"

echo "V=$VER"

(cd awsx && yarn add "@pulumi/aws@$VER")

make build_sdks
