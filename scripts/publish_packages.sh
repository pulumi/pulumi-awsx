#!/bin/bash
# publish.sh builds and publishes a release.
set -o nounset -o errexit -o pipefail
ROOT=$(pwd)

echo "Publishing NPM packages to NPMjs.com:"

# For each package, first create the package.json to publish.  This must be different than the one we use for
# development and testing the SDK, since we use symlinking for those workflows.  Namely, we must promote the SDK
# dependencies from peerDependencies that are resolved via those links, to real installable dependencies.
publish() {
    mkdir -p "${ROOT}/sdk/nodejs/bin/scripts"

    cp "${ROOT}/scripts/install-pulumi-plugin.js" \
       "${ROOT}/sdk/nodejs/bin/scripts"

    node "${ROOT}/scripts/add-plugin-installer-script.js" < \
        "${ROOT}/sdk/nodejs/bin/package.json" > \
        "${ROOT}/sdk/nodejs/bin/package.json.publish"

    pushd ${ROOT}/sdk/nodejs/bin
    mv package.json package.json.dev
    mv package.json.publish package.json

    NPM_TAG="dev"

    ## We need split the GITHUB_REF into the correct parts
    ## so that we can test for NPM Tags
    IFS='/' read -ra my_array <<< "${GITHUB_REF:-}"
    BRANCH_NAME="${my_array[2]}"

    if [[ "${BRANCH_NAME}" == features/* ]]; then
        NPM_TAG=$(echo "${BRANCH_NAME}" | sed -e 's|^features/|feature-|g')
    fi

    if [[ "${BRANCH_NAME}" == feature-* ]]; then
        NPM_TAG=$(echo "${BRANCH_NAME}")
    fi

    # If the package doesn't have a pre-release tag, use the tag of latest instead of
    # dev. NPM uses this tag as the default version to add, so we want it to mean
    # the newest released version.
    PKG_NAME=$(jq -r .name < package.json)
    PKG_VERSION=$(jq -r .version < package.json)
    if [[ "${PKG_VERSION}" != *-dev* ]] && [[ "${PKG_VERSION}" != *-alpha* ]]; then
        NPM_TAG="latest"
    fi

    # we need to set explicit beta and rc tags to ensure that we don't mutate to use the latest tag
    if [[ "${PKG_VERSION}" == *-beta* ]]; then
        NPM_TAG="beta"
    fi

    if [[ "${PKG_VERSION}" == *-rc* ]]; then
        NPM_TAG="rc"
    fi

    # Now, perform the publish. The logic here is a little goofy because npm provides
    # no way to say "if the package already exists, don't fail" but we want these
    # semantics (so, for example, we can restart builds which may have failed after
    # publishing, or so two builds can run concurrently, which is the case for when we
    # tag master right after pushing a new commit and the push and tag travis jobs both
    # get the same version.
    #
    # We exploit the fact that `npm info <package-name>@<package-version>` has no output
    # when the package does not exist.
    if [ "$(npm info ${PKG_NAME}@${PKG_VERSION})" == "" ]; then
        if ! npm publish -tag "${NPM_TAG}"; then
	    # if we get here, we have a TOCTOU issue, so check again
	    # to see if it published. If it didn't bail out.
	    if [ "$(npm info ${PKG_NAME}@${PKG_VERSION})" == "" ]; then
		echo "NPM publishing failed, aborting"
		exit 1
	    fi

	fi
    fi
    npm info 2>/dev/null

    # And finally restore the original package.json.
    mv package.json package.json.publish
    mv package.json.dev package.json
    popd

    echo "Publishing Pip package to pypi as ${PYPI_USERNAME}:"
    twine upload \
        -u "${PYPI_USERNAME}" -p "${PYPI_PASSWORD}" \
        "${ROOT}/sdk/python/bin/dist/*" \
        --skip-existing \
        --verbose

    # Start DotNet Publish
    find "${ROOT}/sdk/dotnet/bin/Debug/" -name 'Pulumi.*.nupkg' \
        -exec dotnet nuget push -k "${NUGET_PUBLISH_KEY}" -s https://api.nuget.org/v3/index.json {} ';'
}

publish
