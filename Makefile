PROJECT_NAME 	:= Pulumi Infrastructure Components for AWS

VERSION         := $(shell pulumictl get version)
TESTPARALLELISM := 10

PACK            := awsx
PROVIDER        := pulumi-resource-${PACK}
CODEGEN         := pulumi-gen-${PACK}
GZIP_PREFIX		:= pulumi-resource-${PACK}-v${VERSION}
BIN				:= ${PROVIDER}

AWSX_SRC 		:= $(wildcard awsx/*.*) $(wildcard awsx/*/*.ts)
CODEGEN_SRC 	:= $(wildcard schemagen/go.*) $(wildcard schemagen/pkg/*/*.go) $(wildcard schemagen/pkg/cmd/${CODEGEN}/*.go)

WORKING_DIR     := $(shell pwd)

GOPATH 		 	?= ${HOME}/go
GOBIN  		 	?= ${GOPATH}/bin
LanguageTags 	?= "all"

PKG_ARGS 		:= --no-bytecode --public-packages "*" --public

build:: provider build_nodejs build_python build_go build_dotnet

build_sdks: schema build_nodejs build_python build_go build_dotnet

obj/${CODEGEN}: ${CODEGEN_SRC}
	cd schemagen && go build -o $(WORKING_DIR)/obj/${CODEGEN} $(VERSION_FLAGS) $(WORKING_DIR)/schemagen/cmd/$(CODEGEN)

awsx/schema.json: obj/${CODEGEN}
	cd schemagen/cmd/$(CODEGEN) && go run . schema $(WORKING_DIR)/$(PACK)

awsx/node_modules: awsx/package.json awsx/yarn.lock
	yarn install --cwd awsx
	@touch awsx/node_modules

awsx/schema-types.ts: awsx/node_modules awsx/schema.json
	cd awsx && yarn gen-types

awsx/bin: awsx/node_modules ${AWSX_SRC}
	@cd awsx && \
		yarn tsc && \
		cp package.json schema.json ./bin/ && \
		sed -i.bak -e "s/\$${VERSION}/$(VERSION)/g" ./bin/package.json

obj/${PROVIDER}: awsx/bin
	cd awsx && yarn run pkg . ${PKG_ARGS} --target node16 --output ../obj/${PROVIDER}

install_provider: obj/${PROVIDER}
	rm -f ${GOBIN}/${PROVIDER}
	cp obj/${PROVIDER} ${GOBIN}/${PROVIDER}

obj/provider/linux-amd64/${PROVIDER}:: TARGET := node16-linux-x64
obj/provider/linux-arm64/${PROVIDER}:: TARGET := node16-linux-arm64
obj/provider/darwin-amd64/${PROVIDER}:: TARGET := node16-macos-x64
obj/provider/darwin-arm64/${PROVIDER}:: TARGET := node16-macos-arm64
obj/provider/windows-amd64/${PROVIDER}.exe:: TARGET := node16-win-x64
obj/provider/%:: awsx/bin awsx/node_modules
	test ${TARGET}
	cd awsx && \
		yarn run pkg . ${PKG_ARGS} --target ${TARGET} --output ${WORKING_DIR}/$@

dist/${GZIP_PREFIX}-linux-amd64.tar.gz:: obj/provider/linux-amd64/${PROVIDER}
dist/${GZIP_PREFIX}-linux-arm64.tar.gz:: obj/provider/linux-arm64/${PROVIDER}
dist/${GZIP_PREFIX}-darwin-amd64.tar.gz:: obj/provider/darwin-amd64/${PROVIDER}
dist/${GZIP_PREFIX}-darwin-arm64.tar.gz:: obj/provider/darwin-arm64/${PROVIDER}
dist/${GZIP_PREFIX}-windows-amd64.tar.gz:: obj/provider/windows-amd64/${PROVIDER}.exe

dist/${GZIP_PREFIX}-%.tar.gz:: 
	@mkdir -p dist
	@# $< is the last dependency (the binary path from above)
	tar --gzip -cf $@ README.md LICENSE -C $$(dirname $<) .

build_nodejs:: VERSION := $(shell pulumictl get version --language javascript)
build_nodejs::
	rm -rf sdk/nodejs
	cd schemagen/cmd/$(CODEGEN) && go run . nodejs ../../../sdk/nodejs $(WORKING_DIR)/$(PACK)/schema.json $(VERSION)
	cd sdk/nodejs && \
		yarn install && \
		yarn run tsc --version && \
		yarn run tsc && \
		sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json && \
		cp ../../README.md ../../LICENSE bin/

build_python:: PYPI_VERSION := $(shell pulumictl get version --language python)
build_python:: schema
	rm -rf sdk/python
	cd schemagen/cmd/$(CODEGEN) && go run . python ../../../sdk/python $(WORKING_DIR)/$(PACK)/schema.json $(VERSION)
	cd sdk/python/ && \
		cp ../../README.md . && \
		python3 setup.py clean --all 2>/dev/null && \
		rm -rf ./bin/ ../python.bin/ && cp -R . ../python.bin && mv ../python.bin ./bin && \
		sed -i.bak -e 's/^VERSION = .*/VERSION = "$(PYPI_VERSION)"/g' -e 's/^PLUGIN_VERSION = .*/PLUGIN_VERSION = "$(VERSION)"/g' ./bin/setup.py && \
		rm ./bin/setup.py.bak && \
		cd ./bin && python3 setup.py build sdist

build_go:: VERSION := $(shell pulumictl get version --language generic)
build_go:: AWS_VERSION := $(shell node -e 'console.log(require("./awsx/package.json").dependencies["@pulumi/aws"])')
build_go:: schema
	rm -rf sdk/go
	cd schemagen/cmd/$(CODEGEN) && go run . go ../../../sdk/go $(WORKING_DIR)/$(PACK)/schema.json $(VERSION)
	cd sdk && \
		go get github.com/pulumi/pulumi-aws/sdk/v5@v$(AWS_VERSION) && \
		go mod tidy && \
		go test -v ./... -check.vv

build_dotnet:: DOTNET_VERSION := $(shell pulumictl get version --language dotnet)
build_dotnet:: schema
	rm -rf sdk/dotnet
	cd schemagen/cmd/$(CODEGEN) && go run . dotnet ../../../sdk/dotnet $(WORKING_DIR)/$(PACK)/schema.json $(VERSION)
	cd sdk/dotnet/ && \
		echo "${DOTNET_VERSION}" >version.txt && \
		dotnet build /p:Version=${DOTNET_VERSION}

istanbul_tests::
	cd awsx-classic/tests && \
		yarn && yarn run build && yarn run mocha $$(find bin -name '*.spec.js')

install_nodejs_sdk:: build_nodejs
	yarn link --cwd $(WORKING_DIR)/sdk/nodejs/bin

install_dotnet_sdk:: build_dotnet
	mkdir -p $(WORKING_DIR)/nuget
	find . -name '*.nupkg' -print -exec cp -p {} ${WORKING_DIR}/nuget \;

install_go_sdk::
	#Intentionally empty for CI / CD templating

install_python_sdk::
	#Intentionall empty for CI / CD templating

lint-classic:
	cd awsx-classic && \
		yarn install && \
		yarn lint

lint:: awsx/node_modules
	cd awsx && \
		yarn format && yarn lint

test_provider:: awsx/node_modules
	cd awsx && yarn test

test_nodejs:: install_provider install_nodejs_sdk
	cd examples && go test -tags=nodejs -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_python:: install_provider
	cd examples && go test -tags=python -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_dotnet:: install_provider
	cd examples && go test -tags=dotnet -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_go:: install_provider
	cd examples && go test -tags=go -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

specific_test:: 
	cd examples && go test -tags=$(LanguageTags) -v -json -count=1 -cover -timeout 3h . --run=TestAcc$(TestName) 2>&1 | tee /tmp/gotest.log

schemagen:: obj/${CODEGEN}
provider: awsx/bin lint test_provider
schema: awsx/schema.json
dist:: dist/${GZIP_PREFIX}-linux-amd64.tar.gz
dist:: dist/${GZIP_PREFIX}-linux-arm64.tar.gz
dist:: dist/${GZIP_PREFIX}-darwin-amd64.tar.gz
dist:: dist/${GZIP_PREFIX}-darwin-arm64.tar.gz
dist:: dist/${GZIP_PREFIX}-windows-amd64.tar.gz

clean:
	rm -rf dist obj awsx/bin awsx/node_modules

dev:: lint lint-classic build_nodejs istanbul_tests

test:: test_provider
	cd examples && go test -tags=all -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

.PHONY: clean provider install_provider pkg dist
