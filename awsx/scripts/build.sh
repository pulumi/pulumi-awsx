#!/usr/bin/env bash

set -euo pipefail

# Bundle a Pulumi Package Schema and create a stand-alone executable versioned build for a desired platform.

: ${OS?"Environment variable OS must be set to the desired operating system for the build in the GOOS format"}
: ${ARCH?"Environment variable ARCH must be set to the desired architecture for the build in the GOARCH format"}
: ${OUT?"Environment variable OUT must be set to the desired output path for the binary"}
: ${SCHEMA?"Environment variable SCHEMA must point to a file with Pulumi Package Schema to embed in the build"}

BUNOS=""
BUNLIBC=""
case "${OS}" in
    "linux")
        BUNOS="linux"
        BUNLIBC="-musl"
        ;;
    "darwin")
        BUNOS="darwin"
        ;;
    "windows")
        BUNOS="windows"
        ;;
    *)
        echo "Unsupported OS: ${OS}"
        exit 1
        ;;
esac

BUNARCH=""
case "${ARCH}" in
    "amd64")
        BUNARCH="x64"
        ;;
    "arm64")
        BUNARCH="arm64"
        ;;
    *)
        echo "Unsupported ARCH: ${ARCH}"
        exit 1
        ;;
esac

TARGET="bun-${BUNOS}-${BUNARCH}${BUNLIBC}"
VERSION=$(jq -r .version "${SCHEMA}")

yarn install --no-progress --frozen-lockfile
yarn check-duplicate-deps
yarn gen-types
yarn tsc
cp "${SCHEMA}" bin/schema.json
cp package.json bin/package.json
yarn --cwd bin version --new-version "${VERSION}" --no-git-tag-version
yarn run bun build ./bin/index.js \
    --compile \
    --target "${TARGET}" \
    --outfile "${OUT}" \
    --no-compile-autoload-dotenv \
    --no-compile-autoload-bunfig

if [[ "${OS}" == "darwin" ]]; then
    if command -v codesign >/dev/null 2>&1; then
        codesign --force --sign - --entitlements scripts/bun-entitlements.plist "${OUT}"
    elif command -v ldid >/dev/null 2>&1; then
        ldid -Sscripts/bun-entitlements.plist "${OUT}"
    else
        echo "codesign or ldid is required to sign a macOS executable" >&2
        exit 1
    fi
fi
