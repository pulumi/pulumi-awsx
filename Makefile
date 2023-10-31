MAKEFLAGS 		:= --jobs=$(shell nproc) --warn-undefined-variables
PROJECT_NAME 	:= Pulumi Infrastructure Components for AWS

VERSION         := $(shell pulumictl get version)
TESTPARALLELISM := 10

PACK            := awsx
PROVIDER        := pulumi-resource-${PACK}
CODEGEN         := pulumi-gen-${PACK}
GZIP_PREFIX		:= pulumi-resource-${PACK}-v${VERSION}
BIN				:= ${PROVIDER}

JAVA_GEN 		 := pulumi-java-gen
JAVA_GEN_VERSION := v0.9.7

AWSX_SRC 		:= $(wildcard awsx/*.*) $(wildcard awsx/*/*.ts)
AWSX_CLASSIC_SRC:= $(wildcard awsx-classic/*.*) $(wildcard awsx-classic/*/*.ts)
CODEGEN_SRC 	:= $(wildcard schemagen/go.*) $(wildcard schemagen/pkg/*/*.go) $(wildcard schemagen/pkg/cmd/${CODEGEN}/*.go)

WORKING_DIR     := $(shell pwd)

GOPATH 		 	?= ${HOME}/go
GOBIN  		 	?= ${GOPATH}/bin
LanguageTags 	?= "all"
LOCAL_PLAT		?= ""

PKG_ARGS 		:= --no-bytecode --public-packages "*" --public

# Pre-requisites: ensure these folders exist
_ := $(shell mkdir -p .make bin dist)

all:: lint lint_classic provider build_sdks test_provider

bin/${CODEGEN}: ${CODEGEN_SRC}
	cd schemagen && go build -o $(WORKING_DIR)/bin/${CODEGEN} $(WORKING_DIR)/schemagen/cmd/$(CODEGEN)

.make/schema: bin/${CODEGEN}
	cd schemagen/cmd/$(CODEGEN) && go run . schema $(WORKING_DIR)/$(PACK)
	@touch $@

.make/awsx_node_modules: awsx/package.json awsx/yarn.lock
	yarn install --cwd awsx --no-progress
	@touch $@

.make/gen_types: .make/awsx_node_modules .make/schema
	cd awsx && yarn gen-types
	@touch $@

.make/awsx_bin: .make/awsx_node_modules .make/gen_types ${AWSX_SRC}
	@cd awsx && \
		yarn tsc && \
		cp package.json schema.json ./bin/ && \
		sed -i.bak -e "s/\$${VERSION}/$(VERSION)/g" ./bin/package.json
	@touch $@

# Re-use the local platform if provided (e.g. `make provider LOCAL_PLAT=linux-amd64`)
ifneq ($(LOCAL_PLAT),"")
bin/${PROVIDER}:: bin/provider/$(LOCAL_PLAT)/${PROVIDER}
	cp bin/provider/$(LOCAL_PLAT)/${PROVIDER} bin/${PROVIDER}
else
bin/${PROVIDER}: .make/awsx_bin .make/awsx_node_modules .make/gen_types
	cd awsx && yarn run pkg . ${PKG_ARGS} --target node16 --output $(WORKING_DIR)/bin/${PROVIDER}
endif

bin/provider/linux-amd64/${PROVIDER}:: TARGET := node16-linuxstatic-x64
bin/provider/linux-arm64/${PROVIDER}:: TARGET := node16-linuxstatic-arm64
bin/provider/darwin-amd64/${PROVIDER}:: TARGET := node16-macos-x64
bin/provider/darwin-arm64/${PROVIDER}:: TARGET := node16-macos-arm64
bin/provider/windows-amd64/${PROVIDER}.exe:: TARGET := node16-win-x64
bin/provider/%:: .make/awsx_bin  .make/gen_types
	test ${TARGET}
	cd awsx && \
		yarn run pkg . ${PKG_ARGS} --target ${TARGET} --output ${WORKING_DIR}/$@

dist/${GZIP_PREFIX}-linux-amd64.tar.gz:: bin/provider/linux-amd64/${PROVIDER}
dist/${GZIP_PREFIX}-linux-arm64.tar.gz:: bin/provider/linux-arm64/${PROVIDER}
dist/${GZIP_PREFIX}-darwin-amd64.tar.gz:: bin/provider/darwin-amd64/${PROVIDER}
dist/${GZIP_PREFIX}-darwin-arm64.tar.gz:: bin/provider/darwin-arm64/${PROVIDER}
dist/${GZIP_PREFIX}-windows-amd64.tar.gz:: bin/provider/windows-amd64/${PROVIDER}.exe

dist/${GZIP_PREFIX}-%.tar.gz::
	@mkdir -p dist
	@# $< is the last dependency (the binary path from above)
	tar --gzip -cf $@ README.md LICENSE -C $$(dirname $<) .

.make/build_nodejs: VERSION := $(shell pulumictl get version --language javascript)
.make/build_nodejs: bin/${CODEGEN} .make/schema ${AWSX_CLASSIC_SRC}
	rm -rf sdk/nodejs
	bin/${CODEGEN} nodejs sdk/nodejs awsx/schema.json $(VERSION)
	cd sdk/nodejs && \
		yarn install --no-progress && \
		yarn run tsc --version && \
		yarn run tsc && \
		sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json && \
		cp ../../README.md ../../LICENSE bin/
	@touch $@

.make/build_java: VERSION := $(shell pulumictl get version --language javascript)
.make/build_java: bin/pulumi-java-gen .make/schema ${AWSX_CLASSIC_SRC}
	rm -rf sdk/java
	$(WORKING_DIR)/bin/$(JAVA_GEN) generate --schema awsx/schema.json --out sdk/java --build gradle-nexus
	cd sdk/java && \
		gradle --console=plain build
	@touch $@

bin/pulumi-java-gen::
	$(shell pulumictl download-binary -n pulumi-language-java -v $(JAVA_GEN_VERSION) -r pulumi/pulumi-java)

.make/build_python: PYPI_VERSION := $(shell pulumictl get version --language python)
.make/build_python: bin/${CODEGEN} .make/schema README.md
	rm -rf sdk/python
	bin/${CODEGEN} python sdk/python awsx/schema.json $(VERSION)
	cd sdk/python/ && \
		cp ../../README.md . && \
		python3 setup.py clean --all 2>/dev/null && \
		rm -rf ./bin/ ../python.bin/ && cp -R . ../python.bin && mv ../python.bin ./bin && \
		sed -i.bak -e 's/^VERSION = .*/VERSION = "$(PYPI_VERSION)"/g' -e 's/^PLUGIN_VERSION = .*/PLUGIN_VERSION = "$(VERSION)"/g' ./bin/setup.py && \
		rm ./bin/setup.py.bak && \
		cd ./bin && python3 setup.py build sdist
	@touch $@

sdk/go:: VERSION := $(shell pulumictl get version --language generic)
sdk/go:: AWS_VERSION := $(shell node -e 'console.log(require("./awsx/package.json").dependencies["@pulumi/aws"])')
sdk/go:: bin/${CODEGEN} .make/schema
	rm -rf sdk/go
	bin/${CODEGEN} go sdk/go awsx/schema.json $(VERSION)
	cd sdk && \
		go get github.com/pulumi/pulumi-aws/sdk/v6@v$(AWS_VERSION) && \
		go mod tidy && \
		go test -v ./... -check.vv

sdk/dotnet/bin:: DOTNET_VERSION := $(shell pulumictl get version --language dotnet)
sdk/dotnet/bin:: bin/${CODEGEN} .make/schema
	rm -rf sdk/dotnet
	bin/${CODEGEN} dotnet sdk/dotnet awsx/schema.json $(VERSION)
	cd sdk/dotnet/ && \
		echo "${DOTNET_VERSION}" >version.txt && \
		dotnet build /p:Version=${DOTNET_VERSION}

# Phony targets

build_nodejs: .make/build_nodejs
build_python: .make/build_python
build_go:: sdk/go
build_dotnet:: sdk/dotnet/bin
build_java: .make/build_java

install_provider: bin/${PROVIDER}
	rm -f ${GOBIN}/${PROVIDER}
	cp bin/${PROVIDER} ${GOBIN}/${PROVIDER}

install_nodejs_sdk: .make/build_nodejs
	yarn link --cwd $(WORKING_DIR)/sdk/nodejs/bin

install_python_sdk: .make/build_python
	#Intentionall empty for CI / CD templating

install_go_sdk:: sdk/go
	#Intentionally empty for CI / CD templating

install_dotnet_sdk:: sdk/dotnet/bin
	mkdir -p $(WORKING_DIR)/nuget
	find sdk/dotnet/bin -name '*.nupkg' -print -exec cp -p {} ${WORKING_DIR}/nuget \;
	@if ! dotnet nuget list source | grep ${WORKING_DIR}; then \
		dotnet nuget add source ${WORKING_DIR}/nuget --name ${WORKING_DIR} \
	; fi\

lint_classic:
	cd awsx-classic && \
		yarn install --no-progress && \
		yarn lint

lint:: .make/awsx_node_modules
	cd awsx && \
		yarn format && yarn lint

test_provider:: PATH := $(WORKING_DIR)/bin:$(PATH)
test_provider:: .make/awsx_node_modules .make/gen_types bin/${PROVIDER} bin/gotestfmt
	cd awsx && yarn test
	@export PATH
	cd provider && go test -tags=yaml -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

istanbul_tests::
	cd awsx-classic/tests && \
		yarn && yarn run build && yarn run mocha $$(find bin -name '*.spec.js')

test_nodejs:: PATH := $(WORKING_DIR)/bin:$(PATH)
test_nodejs:: bin/${PROVIDER} install_nodejs_sdk bin/gotestfmt
	@export PATH
	cd provider && go test -tags=nodejs -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt
	cd examples && go test -tags=nodejs -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_python:: PATH := $(WORKING_DIR)/bin:$(PATH)
test_python:: bin/${PROVIDER} bin/gotestfmt
	@export PATH
	cd provider && go test -tags=python -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt
	cd examples && go test -tags=python -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_java:: PATH := $(WORKING_DIR)/bin:$(PATH)
test_java:: bin/${PROVIDER} bin/gotestfmt
	@export PATH
	cd provider && go test -tags=java -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt
	cd examples && go test -tags=java -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_go:: PATH := $(WORKING_DIR)/bin:$(PATH)
test_go:: bin/${PROVIDER} bin/gotestfmt
	@export PATH
	cd provider && go test -tags=go -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt
	cd examples && go test -tags=go -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_dotnet:: PATH := $(WORKING_DIR)/bin:$(PATH)
test_dotnet:: bin/${PROVIDER} install_dotnet_sdk bin/gotestfmt
	@export PATH
	cd provider && go test -tags=dotnet -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt
	cd examples && go test -tags=dotnet -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test:: PATH := $(WORKING_DIR)/bin:$(PATH)
test:: bin/gotestfmt
	@export PATH
	@if [ -z "${Test}" ]; then \
		cd examples && go test -tags=$(LanguageTags) -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt; \
	else \
		cd examples && go test -tags=$(LanguageTags) -v -json -count=1 -cover -timeout 3h . --run=${Test} 2>&1 | tee /tmp/gotest.log; \
	fi

schemagen:: bin/${CODEGEN}
schema: .make/schema
provider: bin/${PROVIDER}
dist:: dist/${GZIP_PREFIX}-linux-amd64.tar.gz
dist:: dist/${GZIP_PREFIX}-linux-arm64.tar.gz
dist:: dist/${GZIP_PREFIX}-darwin-amd64.tar.gz
dist:: dist/${GZIP_PREFIX}-darwin-arm64.tar.gz
dist:: dist/${GZIP_PREFIX}-windows-amd64.tar.gz

clean:
	rm -rf bin dist .make awsx/bin awsx/node_modules

build_sdks: build_nodejs build_python build_go build_dotnet build_java

build:: provider test_provider build_sdks

dev:: lint test_provider build_nodejs

bin/gotestfmt:
	@mkdir -p bin
	@GOBIN="${PWD}/bin" go install github.com/gotesttools/gotestfmt/v2/cmd/gotestfmt@v2.5.0

.PHONY: clean provider install_% dist sdk/go
