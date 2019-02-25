PROJECT_NAME := Pulumi AWS Infrastructure
NODE_MODULE_NAME := @pulumi/awsx
include ../../build/common.mk

VERSION := $(shell ../../scripts/get-version)

export PATH := $(shell yarn bin 2>/dev/null):$(PATH)

TESTPARALLELISM := 10

build::
	yarn install
	tsc
	sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json
	cp ../../README.md ../../LICENSE bin/
	$(MAKE) docs

docs::
# 	node_modules/.bin/typedoc --json \
# 		bin/docs.json --mode modules --includeDeclarations --excludeExternals --excludeNotExported

lint::
	tslint -c ../tslint.json -p tsconfig.json

test_fast::
	$(GO_TEST_FAST) .

test_all::
	$(GO_TEST) .
