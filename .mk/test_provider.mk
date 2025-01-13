test_provider: yarn_tests

yarn_tests:
	cd awsx && yarn test
.PHONY: yarn_tests

# istanbul_tests:
# 	cd awsx-classic/tests && \
# 		yarn && yarn run build && yarn run mocha $$(find bin -name '*.spec.js')
# .PHONY: istanbul_tests
