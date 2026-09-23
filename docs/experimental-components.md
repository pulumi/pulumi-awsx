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
