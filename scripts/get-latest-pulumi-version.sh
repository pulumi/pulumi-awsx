#!/bin/bash
set -euo pipefail

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

pushd "$TEMP_DIR" > /dev/null
go mod init github.com/pulumi/version-extractor &> /dev/null
go get -u github.com/pulumi/pulumi/pkg/v3 &> /dev/null
go list -f "{{.Version}}" -m github.com/pulumi/pulumi/pkg/v3
popd > /dev/null
