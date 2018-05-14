PROJECT_NAME := Pulumi AWS Infrastructure
NODE_MODULE_NAME := @pulumi/aws-infra
include ../../build/common.mk

VERSION := $(shell ../../scripts/get-version)

export PATH := $(shell yarn bin 2>/dev/null):$(PATH)

TESTPARALLELISM := 10

build::
	yarn install
	#yarn link @pulumi/pulumi @pulumi/aws
	tsc
	sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json
	cp ../../README.md ../../LICENSE bin/

lint::
	tslint -c ../tslint.json -p tsconfig.json

test_all::
	PATH=$(PULUMI_BIN):$(PATH) go test -v -cover -timeout 2h -parallel ${TESTPARALLELISM} .
