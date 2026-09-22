# Experimental component lifecycle

AWSX develops new component implementations in the internal `awsx-next` workspace. The workspace
name identifies the implementation under development. It is not a public stability level or a
separate AWSX product.

Components become public through the `awsx.experimental` namespace. Components can graduate
independently after their APIs and behavior have been validated.

## Stages

### Internal development

The component is available only from the repository source. It has no compatibility promise and is
not part of the generated AWSX SDKs.

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

## Graduation criteria

Before a component becomes stable:

- its target use cases are implemented and documented;
- its public API and security behavior have been reviewed;
- schema generation and all generated SDKs have been validated;
- unit tests cover component construction, inputs, outputs, and validation behavior;
- upgrade behavior and resource identity have an explicit compatibility assessment;
- examples show the supported user workflow;
- it has completed a documented feedback period; and
- no unresolved high severity defects block release.
