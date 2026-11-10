# Provider-specific generation dependencies. The root Makefile includes .mk/*.mk.
AWSX_COMPONENT_DOCS := $(shell find awsx-next/docs -type f \( -name '*.md' -o -name '*.yaml' \))
AWSX_LANDING_DOCS := $(shell find docs/source -type f -name '*.md')
AWSX_DOCGEN_SOURCES := $(shell find provider/pkg/docgen provider/cmd/pulumi-gen-awsx -type f -name '*.go')

bin/$(CODEGEN): $(AWSX_DOCGEN_SOURCES)

.make/schema .make/generate_nodejs .make/generate_python .make/generate_dotnet .make/generate_go .make/generate_java: $(AWSX_COMPONENT_DOCS) $(AWSX_LANDING_DOCS) .mk/docs.mk

