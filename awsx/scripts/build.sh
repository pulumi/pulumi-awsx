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

TARGET="node16-${NODEOS}-${NODEARCH}"
VERSION=$(jq -r .version "${SCHEMA}")

yarn install --no-progress --frozen-lockfile
yarn check-duplicate-deps
yarn gen-types
yarn tsc
cp ${SCHEMA} bin/schema.json
cp package.json bin/package.json
yarn --cwd bin version --new-version "${VERSION}" --no-git-tag-version
yarn run pkg . --no-bytecode --public-packages "*" --public --target "${TARGET}" --output "${OUT}"
