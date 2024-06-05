#!/bin/bash
set -euo pipefail

PULUMI_DEPS=("github.com/pulumi/pulumi/pkg/v3" "github.com/pulumi/pulumi/sdk/v3")
DEPENDENCY_VERSION=""
MODULE_DIRS="$(git ls-files '**go.mod' | xargs dirname)"
MODULE_EXCLUDES=("github.com/pulumi/pulumi-awsx/examples-legacy")

function upgrade_deps() {
    local module=$1

    for dep in "${PULUMI_DEPS[@]}"; do
        go get "$dep@$DEPENDENCY_VERSION"
    done

    go mod tidy
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -v|--version)
            DEPENDENCY_VERSION="$2"
            shift
            ;;
        --help)
            printf "Usage: bump-pulumi-deps.sh [--version <version>]
\t--version <version>  The version of the Pulumi dependencies to upgrade to. Defaults to the latest version.\n"
            exit 0
            ;;
        *)
            echo "Invalid argument: $key"
            exit 1
            ;;
    esac
    shift
done

# Check if PULUMI_VERSION environment variable is set
if [[ -n "${PULUMI_VERSION:-}" ]]; then
    DEPENDENCY_VERSION="${PULUMI_VERSION}"
fi

# Check if DEPENDENCY_VERSION is set
if [[ -z "${DEPENDENCY_VERSION}" ]]; then
    echo "No version specified. Either set the PULUMI_VERSION environment variable or use the --version flag."
    exit 1
fi

for dir in $MODULE_DIRS; do
    pushd "$dir" > /dev/null
    module="$(go list -m)"

    if [[ " ${MODULE_EXCLUDES[@]} " =~ " $module " ]]; then
        echo "Module is excluded: $module"
    else
        echo "Upgrading Pulumi dependencies to $DEPENDENCY_VERSION in $module"
        upgrade_deps "$module"
    fi
    printf "\n"

    popd > /dev/null
done
