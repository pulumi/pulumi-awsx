---
title: Use Remote Proxies For Transformable Nested Components
tags: remote-components, transforms, construct, provider
status: draft
---

## Rule

When a remote AWSX component must consume values changed by an engine
`transform` on a nested component, register the nested component as remote and
consume its returned outputs.

Keep remote registration separate from provider-side construction:

- The parent uses a remote proxy.
- The provider handles the remote `Construct` request with a local
  implementation.
- The local implementation validates the transformed inputs and returns them
  through `registerOutputs`.
- The parent waits for the returned output before it constructs dependent child
  resources.

## Why

A transform changes the inputs sent through the Pulumi engine. It does not
change the arguments held by a local TypeScript object.

This does not work:

```ts
const container = new ContainerDefinition(name, args, { parent: this });

// This reads the original local arguments. An engine transform cannot change
// this value.
const definition = container.definition;
```

The engine can observe and transform the component registration, but the parent
continues to use its original local object.

A remote boundary returns the transformed value to the parent:

```text
parent implementation
  -> remote nested component registration
  -> engine transform
  -> provider-side local implementation
  -> transformed output
  -> parent dependent resource
```

## Prefer

Let the nested component support explicit proxy and implementation modes:

```ts
interface ContainerDefinitionData {
  definition: ContainerDefinitionArgs;
}

export class ContainerDefinition extends pulumi.ComponentResource<ContainerDefinitionData> {
  public readonly definition!: pulumi.Output<ContainerDefinitionArgs>;

  constructor(
    name: string,
    args: ContainerDefinitionArgs,
    opts: pulumi.ComponentResourceOptions = {},
    identity: ComponentIdentity = containerDefinitionStandaloneIdentity,
    remote = false,
  ) {
    validateContainerDefinition(args);

    super(
      identity.type,
      name,
      remote
        ? {
            ...args,
            definition: undefined,
          }
        : args,
      pulumi.mergeOptions(opts, {
        aliases: identity.aliases,
      }),
      remote,
    );

    if (!remote) {
      this.definition = pulumi.output(args);
      this.registerOutputs({
        definition: this.definition,
      });
    }
  }
}
```

The parent must request remote registration and consume the returned output:

```ts
const container = new ContainerDefinition(
  `${name}-${containerName}`,
  definition,
  { parent: this },
  containerIdentity,
  true,
);

return container.definition;
```

The provider resource map must construct the implementation locally:

```ts
"awsx:experimental/ecs:ContainerDefinition": (name, args, opts) =>
  new ContainerDefinition(
    name,
    args,
    opts,
    containerDefinitionAwsxIdentity,
    false,
  ),
```

## Prevent Recursive Construct Calls

Do not make provider-side construction remote.

This causes recursion:

```text
remote registration
  -> provider Construct
  -> remote registration
  -> provider Construct
  -> ...
```

The call site that handles the provider's `Construct` request must pass
`remote = false`.

Use explicit internal parameters when the same implementation supports more
than one package identity:

```ts
constructor(
  name: string,
  args: FargateTaskDefinitionV2Args,
  opts: pulumi.ComponentResourceOptions = {},
  identity = fargateTaskDefinitionStandaloneIdentity,
  containerIdentity = containerDefinitionStandaloneIdentity,
)
```

The integrated AWSX provider must pass both AWSX identities:

```ts
new FargateTaskDefinitionV2(
  name,
  args,
  opts,
  fargateTaskDefinitionAwsxIdentity,
  containerDefinitionAwsxIdentity,
);
```

Do not change shared defaults to the integrated AWSX identities. Source-based
standalone packages need their own tokens.

## Transform Semantics

Use engine `transforms` for children of remote components. Client-side
`transformations` do not observe resources created inside a remote component
provider.

A transformable nested component must return the transformed property through
`registerOutputs`. The parent must use that output. It must not use the original
arguments after registration.

## Validation

Validate both proxy inputs and provider implementation inputs when practical:

- Proxy validation gives early errors for values created by the parent.
- Implementation validation checks values changed by an engine transform.

Do not rely only on proxy validation. A transform can introduce an invalid
value after proxy validation has completed.

## Test Requirements

Use a Pulumi integration test to prove this behavior:

1. Register the parent as a remote component.
2. Add an engine transform for the nested component token.
3. Change one nested input.
4. Assert that the dependent child resource receives the transformed value.

For a task definition, inspect the final `containerDefinitions` JSON. An
assertion that the transform callback ran is insufficient.

Use runtime mocks for local validation, default values, and exact child input
tests. Mock handlers for remote nested components must return the transformed
inputs through the component output field.

## Avoid

- Reading the original local arguments after remote registration.
- Using `transformations` as proof for remote children.
- Making the implementation side remote.
- Depending on implicit identity defaults when one implementation serves two
  package tokens.
- Returning a nested component without calling `registerOutputs`.
- Testing only that the nested component was registered.
