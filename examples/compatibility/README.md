# Node.js SDK compatibility programs

These Pulumi programs use the normal `integration.ProgramTest` harness with the built and linked `@pulumi/awsx` SDK.

- `node-typescript-3.8` checks the documented minimum TypeScript compiler and compatible Node declarations.
- `node-typescript-7` uses TypeScript 7 for type checking and TypeScript 6 for Pulumi program execution.
- `bun` runs the package with Pulumi's Bun runtime.

The Bun program exercises modern package loading and classic code that does not use function serialization. It does not claim support for classic callback APIs or dynamic providers; Pulumi's Bun runtime does not support those features.

The Node programs run their type checks through the package `build` script. The checks compile valid modern and classic AWSX usage and require invalid arguments to produce `TS2322`. Compiler fixtures are versioned by major version so that a new fixture can be added for each supported major.

Build and link the SDK before running the compatibility matrix through the normal integration-test target:

```sh
make build_nodejs install_nodejs_sdk
GOTESTARGS="-run '^TestNodeJSCompatibility$' -count=1" \
    make test TESTTAGS=nodejs
```

The Node.js integration test uses Mise to run the programs with Node 22, 24, and 26 and Bun 1.3. The Bun test registers the built SDK in an isolated temporary link directory.
