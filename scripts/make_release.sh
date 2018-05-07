#!/bin/bash
# make_release.sh will create a build package ready for publishing.
set -e

ROOT=$(dirname $0)/..
PUBDIR=$(mktemp -du)
GITVER=$(git rev-parse HEAD)
PUBFILE=$(dirname ${PUBDIR})/${GITVER}.tgz
VERSION=$($ROOT/scripts/get-version)

# Figure out which branch we're on. Prefer $TRAVIS_BRANCH, if set, since
# Travis leaves us at detached HEAD and `git rev-parse` just returns "HEAD".
BRANCH=${TRAVIS_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}
declare -a PUBTARGETS=(${GITVER} ${VERSION} ${BRANCH})

# usage: copy_package <path-to-module> <module-name>
copy_package() {
    local module_root=${PUBDIR}/node_modules/$2

    mkdir -p "${module_root}"
    cp -R "$1" "${module_root}/"
    if [ -e "${module_root}/node_modules" ]; then
        rm -rf "${module_root}/node_modules"
    fi
}

# Copy the three packages
copy_package "${ROOT}/aws-infra/bin/." "@pulumi/aws-infra"

# Tar up the file and then print it out for use by the caller or script.
tar -czf ${PUBFILE} -C ${PUBDIR} .
echo ${PUBFILE} ${PUBTARGETS[@]}
