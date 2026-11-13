# AWSX Next

Internal source workspace for the next AWSX component architecture, distributed as a TypeScript
[source-based plugin package](https://www.pulumi.com/docs/iac/guides/building-extending/packages/source-based-plugin/).
Components from this workspace are selectively published through the `awsx.experimental` namespace.
See the [experimental component lifecycle](../docs/experimental-components.md) for stability and
graduation rules.

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

## Local consumption

From a Pulumi project, add this package by its local path:

```shell
pulumi package add ../path/to/pulumi-awsx/awsx-next
```

Pulumi loads `index.ts`, discovers its exported `ComponentResource` classes, and generates an SDK
for the consumer's language.

## Container environment

Use one map for values and references to existing secret storage:

```ts
const config = new pulumi.Config();
const task = new TaskDefinition('app', {
  containers: {
    app: {
      image: 'my-image',
      environment: {
        LOG_LEVEL: { value: 'info' },
        API_TOKEN: { value: config.requireSecret('apiToken') },
        SHARED_TOKEN: { ssmParameterArn: parameter.arn },
        DATABASE_PASSWORD: {
          secretsManager: { secretArn: databaseSecret.arn, jsonKey: 'password' },
        },
      },
    },
  },
});
```

Each entry must specify exactly one source. Ordinary values go directly into the task
configuration. Pulumi secret-marked values get AWSX-managed Secrets Manager storage and
an exact version reference. Changing a managed value creates a task-definition revision,
triggering deployment for services using `task.taskDefinitionArn`.

AWSX retains managed secrets, versions and their scoped execution-role policies when
variables are removed, so older task definitions using that role can still retrieve them.
Retained resources leave Pulumi management, require manual cleanup and continue to incur
charges. AWS can garbage-collect old unlabeled versions after its version limit is exceeded.
Retention is not an indefinite rollback archive. User-supplied storage is not modified or
retained, and changes to its value alone do not trigger deployment.

## Documentation

- Component pages live in `docs/<module>/<Component>.md`, such as `docs/experimental/ecs/Service.md`. Input and output descriptions stay in TypeScript JSDoc.
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
