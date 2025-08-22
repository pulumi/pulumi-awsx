#!/usr/bin/env bash
#
# Usage:
#
# ./scripts/upgrade-aws.sh 6.38.0

set -euo pipefail

VER="$1"

echo "V=$VER"

# Strips the v from the version to get the correct npm version.
(cd awsx && yarn upgrade @pulumi/aws@${VER#v})

# Deduplicate the dependencies.
(cd awsx && yarn run dedupe-deps)

# Ensure that we don't have any duplicate dependencies.
(cd awsx && yarn run check-duplicate-deps)

# Upgrade our SDK go dependency.
(cd sdk && go get -u github.com/pulumi/pulumi-aws/sdk/v7)

# Rebuild provider internals such as awsx/schema-types.ts
# We need to run this before rebuilding the SDKs or they may be missing types
make provider

# Rebulid the SDKs, which will also rebuild the schema and all other files.
make build_sdks
