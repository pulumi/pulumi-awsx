---
title: Use Upgrade Tests For Existing State
tags: provider-upgrade, state, preview, replacements, compatibility
status: draft
---

## Rule

Use the provider upgrade harness when the question is whether an existing AWSX
program or recorded state previews cleanly against the local provider. Do not use
it as the default proof for ordinary component logic.

## Why

Compatibility risks often appear only when old state is evaluated with a new
provider: child resource names, aliases, providers, defaults, and schema shape
can cause creates, deletes, or replacements even when new programs compile.

## Avoid

Using a provider upgrade test to prove a narrow constructor branch:

```text
Changed tag normalization; added only a provider upgrade preview.
```

Overstating what the current harness proves:

```text
The upgrade test passed, so refresh and update behavior are fully compatible.
```

## Prefer

Use upgrade tests for compatibility-sensitive state questions:

```text
Changed child logical names, parentage, aliases, or default-created children.
Add or update a provider upgrade case and inspect preview for replacements,
creates, deletes, and changed inputs.
```

Use upgrade or exported-state proof for identity that mocks cannot see:

```text
Changed child parentage or aliases.
Mock tests can still prove child type/name/input shape, but they do not prove
URN compatibility. Add an upgrade case, exported-state check, or another
engine-visible fixture that shows the old child identity is preserved or
migrated intentionally.
```

Pair the upgrade test with cheaper direct proof when needed:

```text
- Mock test proves the constructor now passes tags to the child resource.
- Provider upgrade preview is inspected for replacements, creates, deletes, or
  changed inputs. If the current helper is not enough, extend it or add a
  focused assertion for the specific claim.
```

## AWSX Notes

- Local harness files: `provider/provider_test.go` and
  `provider/provider_nodejs_test.go`.
- Existing recorded scenarios live under
  `provider/testdata/recorded/TestProviderUpgrade/**`.
- The current helper is intentionally narrow: it calls provider-upgrade preview
  and asserts no replacements. That is not full refresh/update/state round-trip
  proof, and it may not catch every create, delete, or changed-input risk unless
  the preview result is inspected deliberately. If a change needs executable
  assertions for creates, deletes, or changed inputs, extend the harness or add a
  focused assertion instead of relying on the helper alone.
- Check skipped cases before citing coverage. In the current suite, grep
  `t.Skip` in `provider/provider_nodejs_test.go`; skipped cases are not
  evidence.

## Hand Off When

Use `$awsx-breaking-change-evaluation` to decide whether existing-state proof is
required. Use `rules/component-construction-mocks.md` for the direct constructor
assertions that should accompany upgrade evidence.
