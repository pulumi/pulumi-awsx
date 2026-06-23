---
title: Treat Schema Changes As Public-Surface Risk
tags: schema, sdk, public-surface, generated
status: draft
---

## Rule

Treat changes under `provider/pkg/schemagen/**` as public-surface risk until a
schema-level comparison and generated SDK diff prove the impact.

Input/output renames, removed resources/functions/types/properties, type
changes, optional-to-required changes, enum or allowed-value changes, token
remaps, and provider token/module path changes are breaking unless an explicit
compatibility mechanism covers them.

## Why

AWSX components are schema-backed. A small schema edit can change every generated
SDK, YAML usage, docs, or provider token shape even when TypeScript
implementation code still compiles.

## Check

- Inspect the schema generator source diff, not only generated files.
- Prefer `schema-tools compare` when a before/after schema is available.
- Inspect generated SDK diffs for renamed tokens, removed inputs/outputs, type
  changes, requiredness changes, and changed defaults.
- Confirm generated files were produced from source changes; do not accept
  manual edits in generated outputs as the source of truth.

## Using schema-tools

Run through `mise` so the repo-pinned version is used even if the shell has an
older `schema-tools` earlier in `PATH`:

```shell
mise x -- schema-tools version
mise x -- schema-tools compare --help
```

The `schema-tools` version pinned in `mise.toml` supports commit/tag
comparisons, local schema files, JSON output, and summary-only output.

For AWSX, prefer local schema-file comparison. Direct ref/tag comparison asks
for `provider/cmd/pulumi-resource-awsx/bridge-metadata.json`, which existing
AWSX refs do not provide.

Default PR/local-change path: compare the current branch against the verified
target ref after generating the new schema.

```shell
base_ref=origin/master

git fetch origin master
git show "$base_ref":provider/cmd/pulumi-resource-awsx/schema.json \
  > /tmp/awsx-schema-old.json

mise x -- schema-tools compare -p awsx \
  --old-path /tmp/awsx-schema-old.json \
  --new-path provider/cmd/pulumi-resource-awsx/schema.json \
  -m -1 \
  --json > /tmp/awsx-schema-diff.json
```

Historical release comparison path: use full version tags when reviewing a
published release boundary, writing release notes, or reconstructing an older
upgrade. For normal PR review, use the base-ref recipe above.

```shell
git show v2.21.0:provider/cmd/pulumi-resource-awsx/schema.json \
  > /tmp/awsx-schema-v2.21.0.json

git show v2.22.0:provider/cmd/pulumi-resource-awsx/schema.json \
  > /tmp/awsx-schema-v2.22.0.json

mise x -- schema-tools compare -p awsx \
  --old-path /tmp/awsx-schema-v2.21.0.json \
  --new-path /tmp/awsx-schema-v2.22.0.json \
  -m -1 \
  --json > /tmp/awsx-schema-diff.json
```

Use the exact old and new refs relevant to the review. For a PR, prefer the
merge base or target branch as the old schema source and the PR branch/head
generated schema as the new schema source.

`-p awsx` is still required when using `--old-path` and `--new-path`.

Use summary mode for a quick category count:

```shell
mise x -- schema-tools compare -p awsx \
  --old-path /tmp/awsx-schema-old.json \
  --new-path provider/cmd/pulumi-resource-awsx/schema.json \
  --summary

mise x -- schema-tools compare -p awsx \
  --old-path /tmp/awsx-schema-old.json \
  --new-path provider/cmd/pulumi-resource-awsx/schema.json \
  --json --summary
```

Smoke-test the pinned CLI before relying on the recipes in a review. Comparing
the same schema file to itself should return an empty summary:

```shell
mise x -- schema-tools compare -p awsx \
  --old-path provider/cmd/pulumi-resource-awsx/schema.json \
  --new-path provider/cmd/pulumi-resource-awsx/schema.json \
  -m -1 \
  --json --summary
```

Useful JSON queries:

```shell
# Summary of breaking-change categories.
jq '.summary' /tmp/awsx-schema-diff.json

# Changes for a specific resource.
jq '.grouped.resources["awsx:ecr:Repository"]' /tmp/awsx-schema-diff.json

# All displayed changes of a specific kind. Use `-m -1` when creating the JSON
# file if this must mean all changes.
jq '[.changes[] | select(.kind == "missing-input")]' /tmp/awsx-schema-diff.json

# All breaking changes matching a token pattern.
jq '[.changes[] | select(.breaking and (.token | test("ecr")))]' \
  /tmp/awsx-schema-diff.json

# List all affected tokens from the saved JSON.
jq '[.changes[] | .token] | unique' /tmp/awsx-schema-diff.json
```

## Interpret schema-tools findings

Read output as a blocking diagnostic, not as the final compatibility answer.
JSON change entries include `scope`, `token`, `location`, `path`, `kind`,
`severity`, `breaking`, and `message`.

Use the `breaking` field as the schema-tools breaking signal. Do not treat
`severity` as the breaking signal: a `warn` entry can still have
`breaking: true`. `summary[].category` is a grouped count of findings, not a
separate severity model.

Current `kind` values:

- `missing-input`: an existing input disappeared. Treat as breaking unless it
  is covered by a rename, alias, or other explicit compatibility path.
- `missing-output`: an existing output disappeared. Usually a source-level SDK
  break for code, tests, mocks, or consumers that read the output.
- `missing-property`: a nested type property disappeared. Check whether the
  type is used for inputs, outputs, or both; input usage is usually more severe.
- `missing-resource`, `missing-function`, `missing-type`: a token disappeared.
  Check whether this is an actual removal, a token remap, or generated module
  path/name drift.
- `type-changed`: an input, output, or nested property changed shape. Inspect
  the old and new types. Scalar/object versus array changes are source-level
  SDK breaks even if the underlying AWS behavior is similar.
- `optional-to-required`: existing callers may now need to pass a value or
  construct a required nested field. Input-side cases are high risk.
- `required-to-optional`: usually lower risk for callers, but still inspect
  generated SDK diffs because language types may change.
- `signature-changed`: function inputs or return shape changed. Treat as a
  source-level SDK break until generated SDK diffs prove otherwise.
- `token-remapped`: a resource or function moved to a different token. Check
  import paths, generated SDK names, state compatibility, and aliases.
- `new-resource`, `new-function`: additive schema findings. Not breaking by
  themselves, but still review generated SDK placement and any behavior that
  caused the new token to appear.

`No breaking changes found` means schema-tools found no schema-level breaking
category. It does not prove behavior compatibility, child resource identity
compatibility, default compatibility, or generated SDK cleanliness.

## Examples

```text
Safe:
- Adding a new optional input with no changed default behavior, after schema and
  generated SDK diffs show no existing surface changed.

Compatibility-sensitive:
- Adding a new resource or output; usually additive, but still needs generated
  surface review and tests.

Breaking:
- Renaming an input, output, token, module path, enum value, or resource.
- Changing an existing optional input to required.
- Changing the type of an existing input or output.
```

## Hand Off When

Use `$awsx-test-authoring` if schema behavior needs a regression test. Use
`$awsx-component-design` if the schema shape itself needs redesign.
