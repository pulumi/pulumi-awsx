# Test Bun standalone packaging

## Summary

Test Bun 1.4.0 as a replacement for the archived `vercel/pkg` build. This is an alternative experiment to the enhanced Node.js SEA candidate, not a merge-ready runtime decision.

Bun embeds its own JavaScriptCore-based runtime. This can produce smaller executables and provides Linux musl targets, but it changes the provider runtime from Node.js and therefore needs stronger compatibility evidence.

## Implementation

1. Pin the Bun packaging tool to 1.4.0.
2. Compile `awsx/bin/index.js` with `bun build --compile`.
3. Keep the six existing release targets.
4. Use Bun's musl targets for Linux x64 and ARM64.
5. Disable automatic `.env` and `bunfig.toml` loading for deterministic provider behavior.
6. Sign macOS artifacts with Bun's recommended JIT entitlements.

## Validation

The temporary PR workflow will:

- cross-build all six release artifacts;
- start every artifact on its native OS and architecture;
- verify macOS signatures and inspect Windows signatures;
- test Linux artifacts in Debian 10, Debian 12, `pulumi/pulumi-base`, and Alpine;
- inspect ELF dependencies and required glibc symbols;
- report executable size and startup time.

The existing provider tests and AWS-backed PR acceptance tests must also pass. The acceptance tests are necessary because Bun implements Node APIs rather than running stock Node.js.

A local macOS ARM64 prototype compiled successfully and started five times, printing valid provider gRPC ports. It was approximately 83 MiB raw and 29.0 MB with gzip. The initial cross-compiled artifact had an invalid signature, so explicit signing is part of this candidate and must pass native CI validation.

## Decision rule

Do not select Bun only because it produces a smaller artifact. Select it only if all six native startup checks, Linux compatibility checks, provider tests, and acceptance tests pass without dependency patches or runtime workarounds that AWSX would need to maintain.
