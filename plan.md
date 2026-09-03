# Replace `vercel/pkg` with Node.js SEA

## Summary

Replace the archived `vercel/pkg` build with `@yao-pkg/pkg` enhanced SEA mode and embed the exact Node.js 24.20.0 LTS runtime. Change Linux artifacts from fully static Node binaries to official, dynamically linked Node binaries.

This addresses #2130 without creating and maintaining a custom AWSX bundler. Enhanced SEA uses Node.js SEA APIs while `@yao-pkg/pkg` supplies dependency walking, a virtual filesystem, cross-platform packaging, resource injection, and signing support.

## Why SEA

- `vercel/pkg` is archived and the current AWSX executable embeds unsupported Node.js 16.
- SEA uses an official, unmodified Node.js runtime instead of a `pkg-fetch` runtime with several hundred lines of Node patches.
- Stock Node releases can receive runtime and security updates without waiting for patched binaries to be rebuilt.
- AWSX already uses `--no-bytecode` and ships JavaScript source, so SEA does not introduce a source-disclosure regression.
- `@yao-pkg/pkg` enhanced SEA preserves the existing dependency-walking model. A direct esbuild prototype did not start because AWSX dependencies contain dynamic `require.resolve` calls.
- Enhanced SEA avoids duplicating target download, checksum, VFS, asset, worker, native-addon, injection, and signing logic in this repository.
- The implementation remains aligned with the `yao-pkg` plan to use SEA with native `node:vfs` after that API lands in Node.js.

## Linux compatibility decision

Official Node.js 26 Linux binaries are dynamically linked and require glibc 2.28 or newer. Node.js does not publish a fully static Linux binary, and enhanced SEA does not support the `linuxstatic` target.

Use the regular `linux` target because:

- Pulumi documentation requires glibc-based deployment images and says that musl-only images such as Alpine are unsupported because most provider plugins are glibc-linked.
- The glibc 2.28 baseline supports all normally supported Debian, RHEL, and Ubuntu releases as of September 2026:
  - Debian 12 and 13;
  - RHEL 8, 9, and 10;
  - Ubuntu 22.04, 24.04, and 26.04.
- The excluded environments are primarily Alpine, old distributions, and releases available only through paid extended-support programs.
- Retaining `linuxstatic` would require continued use or maintenance of nonstandard Node binaries and would remove much of the supply-chain benefit of SEA.

Document the new minimum as Linux kernel 4.18, glibc 2.28, and `GLIBCXX_3.4.25`.

## Implementation

1. Replace the `pkg` development dependency with a pinned `@yao-pkg/pkg` version.
2. Update the build target from Node.js 16 to the exact Node.js 24.20.0 LTS release.
3. Invoke `pkg` with enhanced SEA mode:
   - add `--sea`;
   - remove standard-mode-only `--no-bytecode`, `--public`, and `--public-packages` flags;
   - map Linux to `linux` instead of `linuxstatic`.
4. Keep the existing six release targets:
   - Linux x64 and ARM64;
   - macOS x64 and ARM64;
   - Windows x64 and ARM64.
5. Retain macOS signing and Windows signing integration. Remove old workarounds only after the generated artifacts prove they are unnecessary.
6. Add release notes for the Node runtime update and Linux baseline change.

## Validation

- Build all six release artifacts through the normal provider build workflow.
- Start every artifact on its native OS and architecture and verify that it prints a valid provider gRPC port.
- Run the provider test suite and one AWSX acceptance test against the packaged executable.
- Test Linux x64 and ARM64 on a glibc 2.28 environment or verify their ELF symbol requirements with `readelf`.
- Verify that the Linux executable is dynamically linked only to the documented baseline libraries.
- Verify macOS signatures and startup on both architectures.
- Verify Windows signatures and startup on both architectures.
- Compare compressed artifact sizes with the current release. Select a supported SEA compression mode if needed.
- Confirm and record the embedded Node.js version from each artifact.

The Node.js 26.8.1 experiment built and started successfully on all six native release platforms, but both Linux architectures failed in Debian 10, Debian 12, and `pulumi/pulumi-base` because those images do not contain `libatomic.so.1`. Node.js 24.20.0 is the selected candidate because an earlier Node.js 24 Linux x64 proof started without that new dependency. The full Node.js 24 matrix remains the final validation gate.

## Risks and fallback

- Node.js 24.20.0 is LTS and is explicitly supported by `@yao-pkg/pkg` targets.
- Node.js SEA and the enhanced SEA implementation remain experimental surfaces, so native startup validation remains mandatory.
- Enhanced SEA can produce larger files. Use supported compression and compare release download sizes.
- If any release target fails, use `@yao-pkg/pkg` standard mode with Node.js 24 as the temporary fallback. Standard mode preserves `linuxstatic`, but it continues to use patched `pkg-fetch` runtimes and does not complete the SEA migration.
