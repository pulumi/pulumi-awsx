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

## Authoring constraints

- Export public components from `index.ts`.
- Use schema-compatible public argument and output types.
- Keep the constructor shape `(name, args, opts?)` so Pulumi can infer the schema.
- Assign public outputs before calling `registerOutputs`.
- Do not bundle the source entry point. Pulumi analyzes its TypeScript declarations.
- Keep the package CommonJS-compatible because the Pulumi Node.js plugin host loads the entry point
  through `require()`.
