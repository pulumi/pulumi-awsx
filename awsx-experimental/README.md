# AWSX Experimental

Experimental Pulumi components for AWS, distributed as a TypeScript
[source-based plugin package](https://www.pulumi.com/docs/iac/guides/building-extending/packages/source-based-plugin/).

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
pulumi package add ../path/to/pulumi-awsx/awsx-experimental
```

Pulumi loads `index.ts`, discovers its exported `ComponentResource` classes, and generates an SDK
for the consumer's language.

## Authoring constraints

- Export public components from `index.ts`.
- Use schema-compatible public argument and output types.
- Keep the constructor shape `(name, args, opts?)` so Pulumi can infer the schema.
- Assign public outputs before calling `registerOutputs`.
- Do not bundle the source entry point. Pulumi analyzes its TypeScript declarations.
- Keep the package CommonJS-compatible because the Pulumi Node.js plugin host loads the entry point
  through `require()`.
