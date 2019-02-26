PROJECT_NAME := Pulumi Infrastructure Components for AWS
SUB_PROJECTS := nodejs/awsx
include build/common.mk

.PHONY: publish_packages
publish_packages:
	$(call STEP_MESSAGE)
	./scripts/publish_packages.sh

.PHONY: check_clean_worktree
check_clean_worktree:
	$$(go env GOPATH)/src/github.com/pulumi/scripts/ci/check-worktree-is-clean.sh

# The travis_* targets are entrypoints for CI.
.PHONY: travis_cron travis_push travis_pull_request travis_api
travis_cron: all
travis_push: only_build check_clean_worktree only_test publish_packages
travis_pull_request: only_build check_clean_worktree only_test_fast
travis_api: all
