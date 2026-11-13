AWSX_NEXT_SCHEMA_SOURCES := \
	$(shell find awsx-next/src -type f -name '*.ts') \
	awsx-next/index.ts \
	awsx-next/package.json \
	awsx-next/package-lock.json \
	awsx-next/PulumiPlugin.yaml \
	awsx-next/tsconfig.json

bin/$(CODEGEN): $(wildcard provider/pkg/schemagen/*.go) \
	provider/cmd/pulumi-gen-awsx/main.go \
	$(shell find provider/cmd/pulumi-gen-awsx/overlays -type f)
# Schema inference may refresh package-lock.json while installing its own dependencies.
# Installation must complete first, but its stamp is not a schema input.
.make/schema: $(AWSX_NEXT_SCHEMA_SOURCES) | .make/awsx_next_install

test_provider: .make/awsx_next_install
.make/awsx_next_install: awsx-next/package.json awsx-next/package-lock.json
	npm --prefix awsx-next ci
	@mkdir -p .make
	@touch $@

# SDK generators overwrite files but do not remove modules for deleted schema tokens.
# Clean only the generated experimental surface before regenerating it.
PRE_GEN_SDK_DOTNET := rm -rf sdk/dotnet/Experimental
PRE_GEN_SDK_GO := rm -rf sdk/go/awsx/experimental
PRE_GEN_SDK_JAVA := rm -rf sdk/java/src/main/java/com/pulumi/awsx/experimental_ecs sdk/java/build
PRE_GEN_SDK_NODEJS := rm -rf sdk/nodejs/experimental sdk/nodejs/types/enums/experimental sdk/nodejs/bin/experimental sdk/nodejs/bin/types/enums/experimental
PRE_GEN_SDK_PYTHON := rm -rf sdk/python/pulumi_awsx/experimental sdk/python/bin/pulumi_awsx/experimental

generate_sdks: schema
.make/generate_nodejs .make/generate_python .make/generate_dotnet .make/generate_go .make/generate_java: .make/schema
bin/$(PROVIDER): $(AWSX_NEXT_SCHEMA_SOURCES) awsx-next/tsconfig.provider.json awsx/scripts/build.sh
