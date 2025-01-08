build_provider_cmd = cd provider && go build $(PULUMI_PROVIDER_BUILD_PARALLELISM) -o $(WORKING_DIR)/bin/$(PROVIDER) -ldflags "$(LDFLAGS)" $(PROJECT)/$(PROVIDER_PATH)/cmd/$(PROVIDER)
