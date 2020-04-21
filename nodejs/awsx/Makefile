PROJECT_NAME := Pulumi AWS Infrastructure
NODE_MODULE_NAME := @pulumi/awsx
include ../../build/common.mk

VERSION := $(shell ../../scripts/get-version)

export PATH := $(shell yarn bin 2>/dev/null):$(PATH)

TESTPARALLELISM := 10

build::
	yarn install
	yarn run install-peers -f
	tsc --version
	tsc
	sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json
	cp ../../README.md ../../LICENSE bin/
	$(MAKE) docs

docs::
# 	node_modules/.bin/typedoc --json \
# 		bin/docs.json --mode modules --includeDeclarations --excludeExternals --excludeNotExported

lint::
	tslint -c ../tslint.json -p tsconfig.json

istanbul_tests::
	cd tests && yarn && yarn run build
	cd tests && yarn run mocha $$(find bin -name '*.spec.js')

test_fast:: istanbul_tests
	$(GO_TEST_FAST) .

test_all:: istanbul_tests
	$(GO_TEST) .
