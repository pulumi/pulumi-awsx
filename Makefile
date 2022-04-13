PROJECT_NAME := Pulumi Infrastructure Components for AWS

VERSION         := $(shell pulumictl get version)
TESTPARALLELISM := 10

PACK            := awsx
PROVIDER        := pulumi-resource-${PACK}
CODEGEN         := pulumi-gen-${PACK}

WORKING_DIR     := $(shell pwd)

build:: provider build_nodejs build_python build_go build_dotnet

schema::
	cd provider/cmd/$(CODEGEN) && go run . schema $(WORKING_DIR)/$(PACK)

provider:: schema
	rm -rf awsx/bin
	cd awsx && \
		yarn install && \
		yarn gen-types && \
		yarn tsc && \
		cp package.json schema.json yarn.lock ${PROVIDER} ${PROVIDER}.cmd PulumiPlugin.yaml ./bin/ && \
		sed -i.bak -e "s/\$${VERSION}/$(VERSION)/g" ./bin/package.json

dist::
	mkdir dist
	tar --gzip --exclude yarn.lock --exclude pulumi-resource-${PACK}.cmd -cf ./dist/pulumi-resource-${PACK}-v${VERSION}-linux-amd64.tar.gz -C ${PACK}/bin/ .
	# the contents of the linux-arm64, darwin6-arm64 and darwin-amd64 packages are the same
	cp dist/pulumi-resource-${PACK}-v${VERSION}-linux-amd64.tar.gz dist/pulumi-resource-${PACK}-v${VERSION}-darwin-amd64.tar.gz
	cp dist/pulumi-resource-${PACK}-v${VERSION}-linux-amd64.tar.gz dist/pulumi-resource-${PACK}-v${VERSION}-darwin-arm64.tar.gz
	tar --gzip --exclude yarn.lock --exclude pulumi-resource-${PACK} -cf ./dist/pulumi-resource-${PACK}-v${VERSION}-windows-amd64.tar.gz -C ${PACK}/bin/ .


install_provider:: provider
	mkdir -p bin && rm -rf bin/*
	cp -a ${PACK}/bin/. bin
	cd bin && yarn install
	chmod +x bin/${PROVIDER}

build_nodejs:: VERSION := $(shell pulumictl get version --language javascript)
build_nodejs::
	rm -rf awsx-legacy/bin
	rm -rf sdk/nodejs
	cd awsx-legacy && yarn install && yarn tsc
	cd provider/cmd/$(CODEGEN) && go run . nodejs ../../../sdk/nodejs $(WORKING_DIR)/$(PACK)/schema.json $(VERSION)
	cd sdk/nodejs && \
		yarn install && \
		yarn run tsc --version && \
		yarn run tsc && \
		sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json && \
		cp ../../README.md ../../LICENSE bin/

build_python:: PYPI_VERSION := $(shell pulumictl get version --language python)
build_python:: schema
	rm -rf sdk/python
	cd provider/cmd/$(CODEGEN) && go run . python ../../../sdk/python $(WORKING_DIR)/$(PACK)/schema.json $(VERSION)
	cd sdk/python/ && \
		cp ../../README.md . && \
		python3 setup.py clean --all 2>/dev/null && \
		rm -rf ./bin/ ../python.bin/ && cp -R . ../python.bin && mv ../python.bin ./bin && \
		sed -i.bak -e 's/^VERSION = .*/VERSION = "$(PYPI_VERSION)"/g' -e 's/^PLUGIN_VERSION = .*/PLUGIN_VERSION = "$(VERSION)"/g' ./bin/setup.py && \
		rm ./bin/setup.py.bak && \
		cd ./bin && python3 setup.py build sdist

build_go:: VERSION := $(shell pulumictl get version --language generic)
build_go:: schema
	rm -rf sdk/go
	cd provider/cmd/$(CODEGEN) && go run . go ../../../sdk/go $(WORKING_DIR)/$(PACK)/schema.json $(VERSION)

build_dotnet:: DOTNET_VERSION := $(shell pulumictl get version --language dotnet)
build_dotnet:: schema
	rm -rf sdk/dotnet
	cd provider/cmd/$(CODEGEN) && go run . dotnet ../../../sdk/dotnet $(WORKING_DIR)/$(PACK)/schema.json $(VERSION)
	cd sdk/dotnet/ && \
		echo "${DOTNET_VERSION}" >version.txt && \
		dotnet build /p:Version=${DOTNET_VERSION}

istanbul_tests::
	cd nodejs/awsx/tests && \
		yarn && yarn run build && yarn run mocha $$(find bin -name '*.spec.js')

install_nodejs_sdk:: build_nodejs
	cd $(WORKING_DIR)/awsx/bin && yarn install
	yarn link --cwd $(WORKING_DIR)/awsx/bin

install_dotnet_sdk:: build_dotnet
	mkdir -p $(WORKING_DIR)/nuget
	find . -name '*.nupkg' -print -exec cp -p {} ${WORKING_DIR}/nuget \;

install_go_sdk::
	#Intentionally empty for CI / CD templating

install_python_sdk::
	#Intentionall empty for CI / CD templating

lint-legacy:
	cd awsx-legacy && \
		yarn install && \
		yarn lint

lint:
	cd awsx && \
		yarn install && \
		yarn lint

test_nodejs:: install_nodejs_sdk
	cd examples && go test -tags=nodejs -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_python:: install_provider
	cd examples && go test -tags=python -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_dotnet:: install_provider
	cd examples && go test -tags=dotnet -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_go:: install_provider
	cd examples && go test -tags=go -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

specific_test:: install_provider
	cd examples && go test -tags=$(LanguageTags) -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . --run=TestAcc$(TestName) 2>&1 | tee /tmp/gotest.log | gotestfmt

generate_schema:: schema

dev:: lint lint-legacy build_nodejs istanbul_tests

test:: install_nodejs_sdk test_nodejs
