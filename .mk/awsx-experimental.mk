AWSX_EXPERIMENTAL_SCHEMA_SOURCES := \
	$(shell find awsx-experimental/src -type f -name '*.ts') \
	awsx-experimental/index.ts \
	awsx-experimental/package.json \
	awsx-experimental/PulumiPlugin.yaml \
	awsx-experimental/tsconfig.json

bin/$(CODEGEN): $(wildcard provider/pkg/schemagen/*.go)
.make/schema: $(AWSX_EXPERIMENTAL_SCHEMA_SOURCES)

# SDK generators overwrite current files but do not remove files for schema tokens that were deleted.
# Clean only the generated experimental modules before regeneration so stale APIs are not compiled or published.
PRE_GEN_SDK_DOTNET := rm -rf sdk/dotnet/Experimental
PRE_GEN_SDK_GO := rm -rf sdk/go/awsx/experimental
PRE_GEN_SDK_JAVA := rm -rf sdk/java/src/main/java/com/pulumi/awsx/experimental_cloudwatch sdk/java/src/main/java/com/pulumi/awsx/experimental_ecs sdk/java/build
PRE_GEN_SDK_NODEJS := rm -rf sdk/nodejs/experimental sdk/nodejs/types/enums/experimental sdk/nodejs/bin/experimental sdk/nodejs/bin/types/enums/experimental
PRE_GEN_SDK_PYTHON := rm -rf sdk/python/pulumi_awsx/experimental sdk/python/bin/pulumi_awsx/experimental
generate_sdks: schema
.make/generate_nodejs .make/generate_python .make/generate_dotnet .make/generate_go .make/generate_java: .make/schema
bin/$(PROVIDER): $(AWSX_EXPERIMENTAL_SCHEMA_SOURCES) awsx-experimental/tsconfig.provider.json awsx/scripts/build.sh
