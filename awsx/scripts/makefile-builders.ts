import { Target, Makefile } from "./makefile";

/** Add `&&` between each */
function shellChain(...commands: string[]): string {
  return commands.join(" && ");
}

function cwd(dir: string, ...commands: string[]): string {
  return shellChain(`cd ${dir}`, ...commands);
}

function goBuild({ binaryName, goDir }: { binaryName: string; goDir: string }): Target {
  return {
    name: `bin/${binaryName}`,
    dependencies: ["$(GO_SRC)"],
    commands: [
      shellChain(
        `cd ${goDir}`,
        `go build -o $(CWD)/bin/${binaryName} $(VERSION_FLAGS) $(CWD)/${goDir}/cmd/${binaryName}`,
      ),
    ],
  };
}

interface GenSchemaArgs {
  schemaDir: string;
  genBinaryName: string;
}

function genSchema({ schemaDir, genBinaryName }: GenSchemaArgs): Target {
  return {
    name: `${schemaDir}/schema.json`,
    dependencies: [`bin/${genBinaryName}`],
    commands: [`bin/${genBinaryName} schema $(CWD)/${schemaDir}`],
  };
}

function yarnInstall({ dir }: { dir: string }): Target {
  return {
    name: `${dir}/node_modules`,
    dependencies: [`${dir}/package.json`, `${dir}/yarn.lock`],
    commands: [`yarn install --cwd ${dir} --no-progress`, `@touch ${dir}/node_modules`],
  };
}

type PkgMapping = {
  plat: string;
  target: string;
  ext?: string;
};

const pkgMappings: PkgMapping[] = [
  { plat: "linux-amd64", target: "node16-linux-x64" },
  { plat: "linux-arm64", target: "node16-linux-arm64" },
  { plat: "darwin-amd64", target: "node16-macos-x64" },
  { plat: "darwin-arm64", target: "node16-macos-arm64" },
  { plat: "windows-amd64", target: "node16-win-x64", ext: ".exe" },
];

export function typescriptProvider(
  providerName: string,
  config?: {
    goDir?: string;
    providerDir?: string;
    schemaDir?: string;
  },
): Makefile {
  const genBinaryName = `pulumi-gen-${providerName}`;
  const goDir = config?.goDir ?? "provider";
  const providerDir = config?.providerDir ?? "provider";
  const providerBinaryName = `pulumi-resource-${providerName}`;
  const schemaDir = config?.schemaDir ?? `${providerDir}/cmd/${providerBinaryName}`;

  const variables = {
    MAKEFLAGS: "--jobs=$(shell nproc) --warn-undefined-variables",
    GOPATH: {
      value: "$(HOME)/go",
      type: "conditional",
    },
    GOBIN: {
      value: "$(GOPATH)/bin",
      type: "conditional",
    },
    CWD: "$(shell pwd)",
    VERSION: "$(shell pulumictl get version)",
    GO_SRC: `$(wildcard ${goDir}/go.*) $(wildcard ${goDir}/pkg/*/*.go) $(wildcard ${goDir}/cmd/${genBinaryName}/*.go)`,
    PROVIDER_SRC: `$(wildcard ${providerDir}/*.*) $(wildcard ${providerDir}/*/*.ts)`,
  } as const;

  const genBin = goBuild({ binaryName: genBinaryName, goDir });
  const schema = genSchema({ schemaDir, genBinaryName });
  const providerNodeModules = yarnInstall({ dir: providerDir });
  const schemaTypes = {
    name: `${providerDir}/schema-types.ts`,
    dependencies: [providerNodeModules, schema],
  };
  const providerJs = {
    name: `${providerDir}/bin`,
    dependencies: [providerNodeModules, "$(PROVIDER_SRC)"],
    commands: [
      cwd(providerDir, `yarn tsc`),
      `cp ${providerDir}/package.json ${providerDir}/schema.json ${providerDir}/bin/`,
      `sed -i.bak -e "s/$\${VERSION}/$(VERSION)/g" ${providerDir}/bin/package.json`,
    ],
  };
  const providerBin = {
    name: `bin/${providerBinaryName}`,
    dependencies: [providerJs, providerNodeModules],
  };
  const pkgOutputDir = (mapping: PkgMapping) => `obj/provider/${mapping.plat}`;
  const pkgOutputBinary = (mapping: PkgMapping) => `${providerBinaryName}${mapping.ext ?? ""}`;
  const pkgOutput = (mapping: PkgMapping) => `${pkgOutputDir(mapping)}/${pkgOutputBinary(mapping)}`;
  const pkgCmd = (mapping: PkgMapping) =>
    `yarn run pkg . --no-bytecode --public-packages "*" --public ${
      mapping.target
    } --output $(CWD)/${pkgOutput(mapping)}`;
  const providerGzipOutput = (mapping: PkgMapping) =>
    `dist/${providerBinaryName}-v$(VERSION)-${mapping.plat}.tar.gz`;
  const providerGzipCommand = (mapping: PkgMapping) =>
    `tar -gzip -cf ${providerGzipOutput(mapping)} README.md LICENCE -C ${pkgOutputDir(mapping)} .`;
  const providerDists = pkgMappings.map((mapping) => ({
    name: providerGzipOutput(mapping),
    dependencies: [pkgOutput(mapping)],
    commands: ["@mkdir -p dist", providerGzipCommand(mapping)],
  }));
  return {
    variables,
    targets: [
      genBin,
      schema,
      providerNodeModules,
      schemaTypes,
      providerJs,
      providerBin,
      ...pkgMappings.map((t) => ({
        name: pkgOutput(t),
        dependencies: [providerJs, providerNodeModules],
        commands: [cwd(providerDir, pkgCmd(t))],
      })),
      ...providerDists,
      // Phonies
      {
        name: "schemagen",
        dependencies: [genBin],
        phony: true,
      },
      {
        name: "schema",
        dependencies: [schema],
        phony: true,
      },
      {
        name: "dist",
        dependencies: providerDists,
        phony: true,
      },
      {
        name: "clean",
        commands: [`rm -rf bin obj ${providerDir}/bin ${providerDir}/node_modules`],
        phony: true,
      },
    ],
  };
}
