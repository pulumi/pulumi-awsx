PROJECT_NAME := Pulumi Infrastructure Components for AWS

VERSION         := $(shell pulumictl get version)
TESTPARALLELISM := 10

WORKING_DIR     := $(shell pwd)

build_nodejs:: VERSION := $(shell pulumictl get version --language javascript)
build_nodejs::
	cd nodejs/awsx && \
		yarn install && \
		yarn run install-peers -f && \
		yarn run tsc && \
		tsc --version && \
		sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json && \
		cp ../../README.md ../../LICENSE bin/

istanbul_tests::
	cd nodejs/awsx/tests && \
		yarn && yarn run build && yarn run mocha $$(find bin -name '*.spec.js')

test_nodejs::
	cd nodejs/awsx && go test -v -count=1 -cover -timeout 2h -parallel ${TESTPARALLELISM} .

install_nodejs_sdk::
	cd $(WORKING_DIR)/nodejs/awsx/bin && yarn install
	yarn link --cwd $(WORKING_DIR)/nodejs/awsx/bin

lint:
	yarn global add tslint typescript
	cd nodejs/awsx && \
		yarn install && \
		yarn run install-peers -f && \
		tslint -c ../tslint.json -p tsconfig.json

dev:: lint build_nodejs istanbul_tests

test:: install_nodejs_sdk test_nodejs
