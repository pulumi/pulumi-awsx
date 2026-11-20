# AWSX Next

## Source-based package exports

This directory implements a Pulumi source-based plugin, not a consumer-facing
Node.js library. Users consume the normal AWSX SDKs generated from the merged schema.

- `index.ts` must export each public component class as a runtime value. Use
  explicit named class exports, not `export *` barrels. A type-only export cannot
  make a component discoverable at runtime.
- Constructor `args` interfaces, nested input/output interfaces, and enums used
  by those properties do not need entrypoint exports. Schema inference follows
  their TypeScript types recursively, including inherited interface properties.
  Keep ordinary module exports/imports wherever implementation files need them.
- Exporting an otherwise unreferenced interface, enum, or helper from `index.ts`
  does not make it a standalone schema API. Only types reachable from component
  inputs and outputs become schema types. Do not expose internal helpers merely
  to make them available to generated SDK users.
- Do not report missing entrypoint re-exports of args, interfaces, or enums as
  SDK defects. Check the generated schema and its `$ref` links first.

Validate with `pulumi package get-schema ./awsx-next` from the repository root.
`npm --prefix awsx-next run test:plugin` is a schema-inference smoke check. For
export changes, compare the actual schemas, including descriptions, enum members,
required fields, and references.

## Provider integration constraints

- `TaskDefinition` and `Service` publish as `awsx:ecs:TaskDefinition` and
  `awsx:ecs:Service`. Preserve their standalone source-plugin identities when
  changing provider registration.
- Keep AWS, AWS Native, and Pulumi dependencies aligned with `awsx/package.json`.
- Public args and outputs are stable SDK surface. Regenerate the combined schema
  and language SDKs after changing them.
- Keep internal caches outside component instance properties, such as in a
  `WeakMap`, so schema inference does not publish implementation state as outputs.

## Documentation

After editing component docs under `docs/`, run `make generate` from the repository
root and commit the updated schema and SDK descriptions. `make schema` alone leaves
the SDK documentation stale and fails CI's regeneration check.

## Component authoring

- Use schema-compatible public argument and output types, with constructor parameters `name`, `args`, and optional `opts` so Pulumi can infer the schema.
- Assign public outputs before calling `registerOutputs`.
- Do not bundle the source entry point. Pulumi analyzes its TypeScript declarations.
- Keep the package CommonJS-compatible. The Pulumi Node.js plugin host loads the entry point through `require()`.

The public entrypoint exports `TaskDefinition`, `Service`, and `WebFunction`.
Task definitions use AWS Native's structured container inputs internally. Keep
AWSX user-facing container types independent and do not add a parallel raw ECS
API model or a container component solely for transforms. The task's Native
resource is the low-level transform boundary.

The referenced `DeploymentFailureAction` enum is included without an entrypoint
re-export. The internal `DeploymentStrategy` enum is not a component input or
output and is not required in the schema.
