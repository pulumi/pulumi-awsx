build_provider_cmd = make PROVIDER_BIN=$(1) .make/provider

PROVIDER_BIN  := bin/${PROVIDER}
PROVIDER_OS   := $(shell go env GOOS)
PROVIDER_ARCH := $(shell go env GOARCH)

PKG_ARGS := --no-bytecode --public-packages "*" --public
AWSX_SRC := $(wildcard awsx/*.*) $(wildcard awsx/*/*.ts)

.PHONY: .make/provider
.make/provider: .make/provider/${PROVIDER_OS}-${PROVIDER_ARCH}

.make/provider/linux-amd64: TARGET := node16-linuxstatic-x64
.make/provider/linux-arm64: TARGET := node16-linuxstatic-arm64
.make/provider/darwin-amd64: TARGET := node16-macos-x64
.make/provider/darwin-arm64: TARGET := node16-macos-arm64
.make/provider/windows-amd64: TARGET := node16-win-x64
.make/provider/%: .make/awsx_bin .make/gen_types
	cd awsx && yarn run pkg . ${PKG_ARGS} --target "${TARGET}" --output "${PROVIDER_BIN}"
	mkdir -p .make/provider
	@touch $@

.make/gen_types: .make/awsx_node_modules .make/schema
	cd awsx && yarn gen-types
	@touch $@

.make/awsx_bin: .make/awsx_node_modules .make/gen_types ${AWSX_SRC}
	@cd awsx && \
		yarn tsc && \
		cp package.json ./bin/ && \
		cp ../provider/cmd/pulumi-resource-awsx/schema-embed.json ./bin/schema.json && \
		sed -i.bak -e "s/\$${VERSION}/$(VERSION_GENERIC)/g" ./bin/package.json
	@touch $@

.make/awsx_node_modules: awsx/package.json awsx/yarn.lock
	yarn install --cwd awsx --no-progress
	@touch $@
