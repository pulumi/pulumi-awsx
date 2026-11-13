# Experimental component lifecycle

AWSX develops new component implementations in the internal `awsx-next` workspace.

Components become public through the `awsx.experimental` namespace. Components can graduate
independently after their APIs and behavior have been validated.

## Stages

### Internal development

The component is available only from the repository source. It has no compatibility promise and is
not part of the generated AWSX SDKs. It can be used via `pulumi package add`.

### Experimental

The component is generated under `awsx.experimental.<service>`. It is available for evaluation and
feedback. Its API, resource type, defaults, and child resource behavior can change before
stabilization. Release notes must identify breaking changes.

### Developer preview

The component remains under `awsx.experimental.<service>`. Its API is expected to remain stable.
Breaking changes require an explicit maintainer decision and a documented migration path.

### Stable

The component moves to `awsx.<service>`. Normal AWSX compatibility requirements apply. If an
existing stable component already has the preferred name, the new component keeps a version suffix
when it graduates.

## Provider integration

The AWSX provider exposes the components implemented in `awsx-next` under
`awsx:experimental/ecs`. Generated SDKs expose `TaskDefinition` and `Service`
in the experimental ECS module. Existing stable AWSX components are unchanged.

`awsx-next/index.ts` remains the source-based plugin entrypoint. Schema generation
infers its public components and reachable types, then remaps their tokens into
the AWSX experimental ECS module. Provider registration in `awsx/resources.ts`
uses the same identities while preserving the standalone plugin identities.

The provider installs and compiles `awsx-next` into its packaged module tree.
Keep the provider's AWS, AWS Native, and Pulumi dependencies aligned with that
workspace. Regenerate the schema and language SDKs after changing its public API.

Both components inherit AWS and AWS Native providers from their parent. Configure
both providers for the same account and region. Task definitions use AWS Native's
structured ECS container inputs. Engine-side `transforms` can target the Native
task resource, there is no separate remote container component.
