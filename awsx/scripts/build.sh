#!/usr/bin/env bash

set -euo pipefail

# Bundle a Pulumi Package Schema and create a stand-alone executable versioned build for a desired platform.

: ${OS?"Environment variable OS must be set to the desired operating system for the build in the GOOS format"}
: ${ARCH?"Environment variable ARCH must be set to the desired architecture for the build in the GOARCH format"}
: ${OUT?"Environment variable OUT must be set to the desired output path for the binary"}
: ${SCHEMA?"Environment variable SCHEMA must point to a file with Pulumi Package Schema to embed in the build"}

NODEOS=""
case "${OS}" in
    "linux")
        NODEOS="linuxstatic"
        ;;
    "darwin")
        NODEOS="macos"
        ;;
    "windows")
        NODEOS="win"
        ;;
    *)
        echo "Unsupported OS: ${OS}"
        exit 1
        ;;
esac

NODEARCH=""
case "${ARCH}" in
    "amd64")
        NODEARCH="x64"
        ;;
    "arm64")
        NODEARCH="arm64"
        ;;
    *)
        echo "Unsupported ARCH: ${ARCH}"
        exit 1
        ;;
esac

NODE_VERSION=$(node -p 'require("./node-runtime-policy.json").packagedNodeVersion')
TARGET="node${NODE_VERSION}-${NODEOS}-${NODEARCH}"
VERSION=$(jq -r .version "${SCHEMA}")

npm ci
npm run check-duplicate-deps
npm run gen-types
npm run tsc
rm -rf bin/node_modules/@pulumi/awsx-experimental
../awsx-experimental/node_modules/.bin/tsc --project ../awsx-experimental/tsconfig.provider.json
cp ${SCHEMA} bin/schema.json
cp package.json bin/package.json
cp node-runtime-policy.json bin/node-runtime-policy.json
npm --prefix bin version "${VERSION}" --no-git-tag-version
npm exec -- pkg . --no-bytecode --public-packages "*" --public --target "${TARGET}" --output "${OUT}"
