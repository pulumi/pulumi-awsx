# AWSX Next

Internal TypeScript implementation workspace for AWSX components. It also supports Pulumi's
[source-based plugin workflow](https://www.pulumi.com/docs/iac/guides/building-extending/packages/source-based-plugin/)
for isolated development.
`TaskDefinition` and `Service` are published as stable components in `awsx.ecs`.
Users install the normal [AWSX SDKs](../README.md#installing), not this workspace.

## AWSX provider integration

Pulumi infers a schema from the component classes exported by `index.ts` and their
reachable argument and output types. `provider/pkg/schemagen/next.go` remaps the
standalone tokens into `awsx:ecs` and merges them with the existing AWSX schema.
The combined schema generates all language SDKs.

`awsx/resources.ts` dispatches construction requests to these implementations with
AWSX identities. Standalone source-plugin usage retains its separate identities.
`awsx/scripts/build.sh` installs both workspaces and compiles this one into
`awsx/bin/node_modules/@pulumi/awsx-next` before packaging the provider executable.
The implementation runs inside the provider, not in the user's Node.js process.

The [task examples](../examples/ecs-task-definition) and the separate
`examples/ecs-service-*` programs consume the normal locally built AWSX SDKs.
Execution-permission coverage lives in
[`examples/ecs-task-definition-permissions`](../examples/ecs-task-definition-permissions).

## Development

The repository pins the development runtime with `mise`. Install dependencies and run all checks:

```shell
npm install
npm run check
```

Useful focused commands:

```shell
npm run format
npm run lint
npm run typecheck
npm test
npm run test:plugin
```

Type checking uses native TypeScript 7. TypeScript 6 remains available for compiler API consumers,
including Pulumi schema inference. Tests use Jest 30 with Babel, as in `awsx/`.

`test:plugin` asks the Pulumi CLI to load the TypeScript entry point and validates the inferred
package schema. It requires `pulumi` on `PATH`.

## Standalone development

For isolated source-plugin development, add this package to a separate Pulumi
project by its local path. Repository integration tests use the normal AWSX SDKs
instead.

```shell
pulumi package add ../path/to/pulumi-awsx/awsx-next
```

Pulumi loads `index.ts`, discovers its exported `ComponentResource` classes, and generates an SDK
for the consumer's language.

## Documentation

- Component pages live in `docs/<module>/<Component>.md`, such as `docs/ecs/Service.md`. Input and output descriptions stay in TypeScript JSDoc.
- Registry overview and installation pages live in the repository's `docs/source/` directory.
- Use `yaml pulumi-example` fences for complete programs. The build generates the other language variants. Ordinary code fences stay unchanged.
- To hide shared setup, use `yaml pulumi-example fixture=Service.fixture.yaml`. The adjacent fixture supplies `name`, `runtime: yaml`, and supporting `resources`; the inline block contains only the resources to display.

From the repository root, preview with a local [pulumi-registry](https://github.com/pulumi/registry) checkout whose tools and frontend assets are installed:

```shell
REGISTRY_DIR=/path/to/pulumi-registry mise run docs:preview
```

Open http://localhost:1313/registry/packages/awsx/. Edits rebuild automatically. Stop with Ctrl-C.
Use `mise run docs:build` with the same `REGISTRY_DIR` to rebuild without serving.
`make schema` regenerates the checked-in schema and landing pages for publication.
