PROJECT_NAME := Pulumi Infrastructure Components for AWS

VERSION         := $(shell pulumictl get version)
TESTPARALLELISM := 10

PACK            := awsx
PROVIDER        := pulumi-resource-${PACK}
CODEGEN         := pulumi-gen-${PACK}

WORKING_DIR     := $(shell pwd)

GOPATH 		 ?= ${HOME}/go
GOBIN  		 ?= ${GOPATH}/bin
LanguageTags ?= "all"

build:: provider build_nodejs build_python build_go build_dotnet

build_sdks: schema build_nodejs build_python build_go build_dotnet

schema::
	cd schemagen/cmd/$(CODEGEN) && go run . schema $(WORKING_DIR)/$(PACK)

ensure_provider::
	cd awsx && \
		yarn install && \
		yarn gen-types

provider:: schema ensure_provider
	rm -rf awsx/bin
	cd awsx && \
		yarn tsc && \
		yarn test && \
		cp package.json schema.json yarn.lock ${PROVIDER} ${PROVIDER}.cmd ./bin/ && \
		sed -i.bak -e "s/\$${VERSION}/$(VERSION)/g" ./bin/package.json
	rm -rf bin
	cp -r awsx/bin bin
	cd bin && \
		yarn install --production

dist:: provider
	mkdir -p dist
	cd bin && \
		npx --yes -- pkg . --compress GZip --target node16 --output ../dist/${PROVIDER}

install_provider:: dist
	rm -f ${GOBIN}/${PROVIDER}
	cp dist/${PROVIDER} ${GOBIN}/${PROVIDER}

dist_all:: provider
	mkdir -p dist/pulumi-resource-${PACK}-v${VERSION}-linux-amd64 
	mkdir -p dist/pulumi-resource-${PACK}-v${VERSION}-linux-arm64 
	mkdir -p dist/pulumi-resource-${PACK}-v${VERSION}-darwin-amd64 
	mkdir -p dist/pulumi-resource-${PACK}-v${VERSION}-darwin-arm64 
	mkdir -p dist/pulumi-resource-${PACK}-v${VERSION}-windows-amd64
	yarn --cwd awsx run pkg ../bin --compress GZip --target node16-macos-x64,node16-macos-arm64,node16-linux-x64,node16-linux-arm64,node16-win-x64 --output ../dist/out
	cp -f dist/out-linux-x64 dist/pulumi-resource-${PACK}-v${VERSION}-linux-amd64/${PROVIDER}
	cp -f dist/out-linux-arm64 dist/pulumi-resource-${PACK}-v${VERSION}-linux-arm64/${PROVIDER}
	cp -f dist/out-macos-x64 dist/pulumi-resource-${PACK}-v${VERSION}-darwin-amd64/${PROVIDER}
	cp -f dist/out-macos-arm64 dist/pulumi-resource-${PACK}-v${VERSION}-darwin-arm64/${PROVIDER}
	cp -f dist/out-win-x64.exe dist/pulumi-resource-${PACK}-v${VERSION}-windows-amd64/${PROVIDER}.exe
	tar --gzip -cf ./dist/pulumi-resource-${PACK}-v${VERSION}-linux-amd64.tar.gz README.md LICENSE -C dist/pulumi-resource-${PACK}-v${VERSION}-linux-amd64/ .
	tar --gzip -cf ./dist/pulumi-resource-${PACK}-v${VERSION}-linux-arm64.tar.gz README.md LICENSE -C dist/pulumi-resource-${PACK}-v${VERSION}-linux-arm64/ .
	tar --gzip -cf ./dist/pulumi-resource-${PACK}-v${VERSION}-darwin-amd64.tar.gz README.md LICENSE -C dist/pulumi-resource-${PACK}-v${VERSION}-darwin-amd64/ .
	tar --gzip -cf ./dist/pulumi-resource-${PACK}-v${VERSION}-darwin-arm64.tar.gz README.md LICENSE -C dist/pulumi-resource-${PACK}-v${VERSION}-darwin-arm64/ .
	tar --gzip -cf ./dist/pulumi-resource-${PACK}-v${VERSION}-windows-amd64.tar.gz README.md LICENSE -C dist/pulumi-resource-${PACK}-v${VERSION}-windows-amd64/ .

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

lint:
	cd awsx && \
		yarn install && \
		yarn format && \
		yarn lint

test_provider:: ensure_provider
	cd awsx && yarn test

test_nodejs:: install_nodejs_sdk
	cd examples && go test -tags=nodejs -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_python:: install_provider
	cd examples && go test -tags=python -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_dotnet:: install_provider
	cd examples && go test -tags=dotnet -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_go:: install_provider
	cd examples && go test -tags=go -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

specific_test:: 
	cd examples && go test -tags=$(LanguageTags) -v -json -count=1 -cover -timeout 3h . --run=TestAcc$(TestName) 2>&1 | tee /tmp/gotest.log

generate_schema:: schema

dev:: lint lint-classic build_nodejs istanbul_tests

test:: test_nodejs test_provider
