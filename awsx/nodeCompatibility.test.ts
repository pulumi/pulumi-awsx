// Copyright 2016-2026, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as pulumi from "@pulumi/pulumi";
import * as childProcess from "child_process";
import * as fs from "fs";
import * as os from "os";
import {
  collectPlatformFacts,
  createCompatibilityWarning,
  evaluatePlatform,
  formatCompatibilityWarning,
  nodeRuntimePolicy,
  parseOSRelease,
  PlatformFacts,
  warnNodeCompatibility,
} from "./nodeCompatibility";

jest.mock("child_process", () => ({ __esModule: true, ...jest.requireActual("child_process") }));
jest.mock("fs", () => {
  const actual = jest.requireActual("fs");
  return { __esModule: true, ...actual, default: actual };
});
jest.mock("os", () => ({ __esModule: true, ...jest.requireActual("os") }));

const linux: PlatformFacts = {
  platform: "linux",
  architecture: "x64",
  release: "6.8.0-60-generic",
  distribution: "ubuntu",
  distributionVersion: "20.04",
};

it("requires the next LTS policy and an available pkg runtime when upgrading Node", () => {
  const major = Number(nodeRuntimePolicy.packagedNodeVersion.split(".")[0]);
  expect(nodeRuntimePolicy.warningNodeMajor).toBe(major + 2);
  expect(major % 2).toBe(0);
  expect(nodeRuntimePolicy.source).toMatch(/\/nodejs\/node\/blob\/[a-f0-9]{40}\/BUILDING.md$/);
  expect(nodeRuntimePolicy.feedbackUrl).toMatch(
    /^https:\/\/github.com\/pulumi\/pulumi-awsx\/issues\//,
  );
  const hashes = require("@yao-pkg/pkg-fetch/lib-es5/expected-shas.json");
  for (const platform of ["linuxstatic", "macos", "win"]) {
    for (const arch of ["x64", "arm64"]) {
      expect(hashes[`node-v${nodeRuntimePolicy.packagedNodeVersion}-${platform}-${arch}`]).toMatch(
        /^[a-f0-9]{64}$/,
      );
    }
  }
});

it("parses only literal distribution identity and version fields", () => {
  expect(parseOSRelease('# comment\nID=ubuntu\nVERSION_ID="20.04"\nID_LIKE=debian\n')).toEqual({
    distribution: "ubuntu",
    distributionVersion: "20.04",
  });
  expect(parseOSRelease("ID='debian'\r\nVERSION_ID=12\r\n")).toEqual({
    distribution: "debian",
    distributionVersion: "12",
  });
  expect(parseOSRelease('ID_LIKE=ubuntu\nVERSION_ID="unterminated\n')).toEqual({
    distribution: undefined,
    distributionVersion: undefined,
  });
});

it.each([
  ["ubuntu", "20.04"],
  ["ubuntu", "24.04"],
  ["debian", "10"],
  ["debian", "12"],
  ["rhel", "8.0"],
])(
  "does not warn at or above the reviewed %s baseline (%s)",
  (distribution, distributionVersion) => {
    expect(evaluatePlatform({ ...linux, distribution, distributionVersion })).toEqual([]);
  },
);

it.each([
  ["ubuntu", "18.04"],
  ["debian", "9"],
  ["rhel", "7.9"],
])("warns below the reviewed %s baseline (%s)", (distribution, distributionVersion) => {
  expect(
    evaluatePlatform({ ...linux, distribution, distributionVersion }).map((r) => r.reason),
  ).toEqual(["distribution-version"]);
});

it.each([
  ["nixos", "24.11"],
  ["arch", undefined],
  ["gentoo", undefined],
  ["opensuse-tumbleweed", "20260918"],
  ["linuxmint", "22"],
  ["amzn", "2023"],
  [undefined, undefined],
  ["ubuntu", "unknown"],
  ["constructor", "24"],
])(
  "warns generically for unknown Linux environments (%s %s)",
  (distribution, distributionVersion) => {
    expect(
      evaluatePlatform({ ...linux, distribution, distributionVersion }).map((r) => r.reason),
    ).toEqual(["unknown"]);
  },
);

it("warns for Alpine without assuming that the packaged static runtime identifies the host libc", () => {
  const risks = evaluatePlatform({ ...linux, distribution: "alpine", distributionVersion: "3.22" });
  expect(risks.map((r) => r.reason)).toEqual(["musl"]);
  expect(formatCompatibilityWarning(risks)).toContain(
    "Musl-only Linux environments, including Alpine, might no longer work.",
  );
});

it.each([
  ["4.17.9", ["kernel-version"]],
  ["4.18.0-80.el8.x86_64", []],
  ["6.1", []],
  [undefined, ["unknown"]],
])("checks the actual kernel separately (%s)", (release, reasons) => {
  expect(evaluatePlatform({ ...linux, release }).map((r) => r.reason)).toEqual(reasons);
});

it("reports multiple known risks in a single warning and does not duplicate unknown reasons", () => {
  expect(
    evaluatePlatform({ ...linux, release: "3.10", distribution: "alpine" }).map((r) => r.reason),
  ).toEqual(["kernel-version", "musl"]);
  expect(
    evaluatePlatform({ ...linux, release: undefined, distribution: undefined }).map(
      (r) => r.reason,
    ),
  ).toEqual(["unknown"]);
});

it.each([
  ["darwin", "13.4.1", ["os-version"]],
  ["darwin", "13.5", []],
  ["darwin", "14.0", []],
  ["win32", "6.3.9600", ["os-version"]],
  ["win32", "10.0.14393", []],
  ["win32", "10.0.26100", []],
  ["darwin", undefined, ["unknown"]],
  ["freebsd", "14.0", ["unknown"]],
])("checks OS versions (%s %s)", (platform, release, reasons) => {
  expect(
    evaluatePlatform({ platform, release, architecture: "arm64" }).map((r) => r.reason),
  ).toEqual(reasons);
});

it("warns on an unknown architecture", () => {
  expect(evaluatePlatform({ ...linux, architecture: "riscv64" }).map((r) => r.reason)).toEqual([
    "unknown",
  ]);
});

it("includes a stable reason, feedback link, and suppression command", () => {
  expect(formatCompatibilityWarning(evaluatePlatform({ ...linux, distribution: "nixos" }))).toBe(
    "[awsx:node-compatibility:unknown] A future AWSX major version may use a dynamically linked stock Node.js runtime. " +
      "AWSX could not determine whether this environment meets the requirements of a future stock Node.js runtime. " +
      `To provide feedback see ${nodeRuntimePolicy.feedbackUrl}. ` +
      "To suppress this warning, run `pulumi config set awsx:suppressNodeCompatibilityWarning true`.",
  );
});

describe("platform probes", () => {
  const platform = process.platform;
  afterEach(() => {
    Object.defineProperty(process, "platform", { value: platform });
    jest.restoreAllMocks();
  });

  it("uses the macOS product version with a bounded command", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    const probe = jest.spyOn(childProcess, "execFileSync").mockReturnValue("13.5\n");
    expect(collectPlatformFacts().release).toBe("13.5");
    expect(probe).toHaveBeenCalledWith("/usr/bin/sw_vers", ["-productVersion"], {
      encoding: "utf8",
      timeout: 1000,
      maxBuffer: 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  });

  it("treats an unavailable macOS probe as unknown", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    jest.spyOn(childProcess, "execFileSync").mockImplementation(() => {
      throw new Error("timeout");
    });
    expect(evaluatePlatform(collectPlatformFacts()).map((r) => r.reason)).toEqual(["unknown"]);
  });

  it("uses the os-release fallback and the host kernel", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    jest.spyOn(os, "release").mockReturnValue("6.8.0");
    const read = jest.spyOn(fs, "readFileSync").mockImplementation((file) => {
      if (file === "/etc/os-release") {
        throw new Error("ENOENT");
      }
      return 'ID=debian\nVERSION_ID="12"\n';
    });
    expect(collectPlatformFacts()).toEqual({
      platform: "linux",
      architecture: process.arch,
      release: "6.8.0",
      distribution: "debian",
      distributionVersion: "12",
    });
    expect(read.mock.calls).toEqual([
      ["/etc/os-release", "utf8"],
      ["/usr/lib/os-release", "utf8"],
    ]);
  });

  it("warns generically when os-release cannot be read", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    jest.spyOn(os, "release").mockReturnValue("6.8.0");
    jest.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("EACCES");
    });
    expect(evaluatePlatform(collectPlatformFacts()).map((r) => r.reason)).toEqual(["unknown"]);
  });
});

describe("warning delivery", () => {
  function setup(suppressed = false) {
    const dependencies = {
      suppressed: jest.fn(() => suppressed),
      collect: jest.fn(() => ({ ...linux, distribution: "alpine" })),
      warn: jest.fn(async (_message: string) => undefined),
    };
    return { ...dependencies, check: createCompatibilityWarning(dependencies) };
  }

  it("suppresses both known and unknown warnings without probing", async () => {
    const warning = setup(true);
    await warning.check();
    warning.collect.mockReturnValue({ ...linux, distribution: "nixos" });
    await warning.check();
    expect(warning.collect).not.toHaveBeenCalled();
    expect(warning.warn).not.toHaveBeenCalled();
  });

  it("warns once even when requests arrive concurrently", async () => {
    const warning = setup();
    await Promise.all([warning.check(), warning.check(), warning.check()]);
    expect(warning.collect).toHaveBeenCalledTimes(1);
    expect(warning.warn).toHaveBeenCalledTimes(1);
    expect(warning.warn).toHaveBeenCalledWith(
      formatCompatibilityWarning(evaluatePlatform(warning.collect.mock.results[0].value)),
    );
  });

  it("does not warn on a reviewed environment", async () => {
    const warning = setup();
    warning.collect.mockReturnValue(linux as typeof linux & { distribution: string });
    await warning.check();
    expect(warning.warn).not.toHaveBeenCalled();
  });

  it("does not consume the warning when a request suppresses it", async () => {
    const warning = setup(true);
    await warning.check();
    warning.suppressed.mockReturnValue(false);
    await warning.check();
    expect(warning.warn).toHaveBeenCalledTimes(1);
  });

  it("converts unexpected probe failures into an unknown warning", async () => {
    const warning = setup();
    warning.collect.mockImplementation(() => {
      throw new Error("probe failed");
    });
    await warning.check();
    expect(warning.warn).toHaveBeenCalledWith(
      expect.stringContaining("[awsx:node-compatibility:unknown]"),
    );
  });

  it("does not fail construction when the diagnostic logger fails", async () => {
    const warning = setup();
    warning.warn.mockRejectedValue(new Error("logger unavailable"));
    await expect(warning.check()).resolves.toBeUndefined();
  });

  it("reads the suppression setting from Pulumi stack configuration", async () => {
    pulumi.runtime.setAllConfig({ "awsx:suppressNodeCompatibilityWarning": "true" });
    const logger = jest.spyOn(pulumi.log, "warn").mockResolvedValue();
    try {
      await warnNodeCompatibility();
      expect(logger).not.toHaveBeenCalled();
    } finally {
      pulumi.runtime.setAllConfig({});
      logger.mockRestore();
    }
  });
});
