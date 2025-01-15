.PHONY: renovate
renovate: generate_sdks
	cd awsx && yarn run dedupe-deps
