# Agent Instructions

## What this repo is
Pulumi AWSX provider/component library. Core behavior is implemented in `awsx/` (TypeScript) and `provider/` (Go schema generation). The repo also contains legacy TypeScript components in `awsx-classic/`. Most files in `sdk/` and several workflow files are generated artifacts.

## Start Here
- `Makefile` - canonical local command surface.
- `.ci-mgmt.yaml` - source-of-truth for generated CI workflows and Make targets.
- `provider/pkg/schemagen/` - schema generation logic.
- `provider/cmd/pulumi-resource-awsx/` - provider schema output and embedding.
- `awsx/` - TypeScript provider implementation + Jest tests.
- `awsx-classic/` - legacy TypeScript components and compatibility surface.
- `examples/` - integration/acceptance tests (real AWS resources).
- `CONTRIBUTING.md` and `DEVELOPMENT.md` - contributor docs.

## Command Canon
- Build provider + SDKs + install SDKs: `make build`
- Regenerate schema + SDKs: `make generate`
- Build provider binary: `make provider`
- Build SDKs only: `make build_sdks`
- Install SDKs only: `make install_sdks`
- Lint: `make lint`
- Provider unit tests (fast): `make test_provider`
- Integration tests (AWS-backed): `make test`
- Targeted integration tests: `GOTESTARGS="-run TestName" make test`
- Regenerate workflows/Makefile from ci-mgmt: `make ci-mgmt`

## Generated Boundaries
Never hand-edit generated outputs as the source of truth:
- `sdk/**`
- `provider/cmd/pulumi-resource-awsx/schema.json`
- `provider/cmd/pulumi-resource-awsx/schema-embed.json`
- `.github/workflows/**`
- `Makefile`

Use source files + regeneration commands instead.

## If You Change...
- `awsx/**` -> run `make test_provider`
- `awsx-classic/**` -> run `yarn --cwd awsx-classic lint`
- `provider/pkg/schemagen/**` -> run `make schema && make generate`
- `.ci-mgmt.yaml` -> run `make ci-mgmt`
- `examples/**` -> run targeted tests first, then full `make test` only if needed

## Key Invariants
- Schema generation changes can affect all language SDKs.
- `make test` creates real AWS resources and can incur cost.
- CI/workflow edits should be made via `.ci-mgmt.yaml`, not by hand in generated workflow files.

## Forbidden Actions
- No destructive git (`git reset --hard`, force push, checkout discard) without explicit approval.
- No hand-edits to generated files without corresponding source/regeneration changes.
- Do not claim checks passed unless you ran them.

## Escalate Immediately If
- Unsure whether a touched file is source or generated.
- Public SDK surface changes are introduced by schema edits.
- CI behavior change cannot be expressed cleanly via `.ci-mgmt.yaml`.
