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
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import * as os from "os";

/** The checked-in policy for the packaged runtime and compatibility warning. */
export interface NodeRuntimePolicy {
  /** Exact Node.js version embedded in provider executables. */
  packagedNodeVersion: string;
  /** Future Node.js major whose host requirements are checked. */
  warningNodeMajor: number;
  /** Date on which the upstream requirements were reviewed. */
  reviewedAt: string;
  /** Pinned upstream document used to select the minimum versions. */
  source: string;
  /** Whether the requirements came from an unreleased Node.js branch. */
  provisional: boolean;
  /** URL where users can report affected environments. */
  feedbackUrl: string;
  /** Oldest reviewed macOS release. */
  minimumMacOS: string;
  /** Oldest reviewed Windows release. */
  minimumWindows: string;
  /** Oldest reviewed Linux kernel. */
  minimumLinuxKernel: string;
  /** Oldest reviewed release for each known Linux distribution ID. */
  minimumLinuxDistributions: Record<string, string>;
}

// Keep this literal require so pkg includes the policy in its virtual filesystem.
export const nodeRuntimePolicy: NodeRuntimePolicy = require("./node-runtime-policy.json");

/** Host facts used to evaluate compatibility with a future Node.js runtime. */
export interface PlatformFacts {
  /** Node.js platform name, such as `linux`, `darwin`, or `win32`. */
  platform: string;
  /** Node.js architecture name, such as `x64` or `arm64`. */
  architecture: string;
  /** macOS product version, Windows version, or Linux kernel release. */
  release?: string;
  /** Linux `ID` value from os-release, such as `ubuntu` or `alpine`. */
  distribution?: string;
  /** Linux `VERSION_ID` value from os-release. */
  distributionVersion?: string;
}

/** Linux distribution fields read from os-release. */
export interface LinuxDistributionFacts {
  /** Linux `ID` value. */
  distribution?: string;
  /** Linux `VERSION_ID` value. */
  distributionVersion?: string;
}

/** One reason why a provider host might not support a future Node.js runtime. */
export interface CompatibilityRisk {
  /** Stable code used to identify and count this warning. */
  reason: "unknown" | "musl" | "os-version" | "kernel-version" | "distribution-version";
  /** User-facing explanation of the compatibility risk. */
  message: string;
}

const unknownRisk: CompatibilityRisk = {
  reason: "unknown",
  message:
    "AWSX could not determine whether this environment meets the requirements of a future stock Node.js runtime.",
};

/**
 * Parses the literal `ID` and `VERSION_ID` fields from os-release data.
 *
 * For example, `ID=ubuntu\nVERSION_ID="24.04"` identifies Ubuntu 24.04.
 * `ID_LIKE=ubuntu` is ignored because it does not identify compatible library versions.
 */
export function parseOSRelease(text: string): LinuxDistributionFacts {
  const fields: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    // The alternatives accept a quoted value without escapes or one unquoted word.
    // For example, VERSION_ID="24.04" captures 24.04 in group 2, while ID=ubuntu
    // captures ubuntu in group 4. Values with escapes or unmatched quotes are rejected.
    const match = /^(ID|VERSION_ID)=(?:"([^"\\]*)"|'([^'\\]*)'|([^\s"'\\]+))\s*$/.exec(line);
    if (match) {
      fields[match[1]] = match[2] ?? match[3] ?? match[4];
    }
  }
  return { distribution: fields.ID, distributionVersion: fields.VERSION_ID };
}

/** Collects provider host facts without failing when an optional probe is unavailable. */
export function collectPlatformFacts(): PlatformFacts {
  const facts: PlatformFacts = { platform: process.platform, architecture: process.arch };
  if (facts.platform === "darwin") {
    // os.release() is the Darwin kernel version, not the macOS product version.
    try {
      facts.release = execFileSync("/usr/bin/sw_vers", ["-productVersion"], {
        encoding: "utf8",
        timeout: 1000,
        maxBuffer: 1024,
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      // An unavailable probe is an unknown environment, not an operation failure.
    }
  } else {
    facts.release = os.release();
  }
  if (facts.platform === "linux") {
    for (const file of ["/etc/os-release", "/usr/lib/os-release"]) {
      try {
        Object.assign(facts, parseOSRelease(readFileSync(file, "utf8")));
        break;
      } catch {
        // os-release specifies /usr/lib/os-release as the fallback.
      }
    }
  }
  return facts;
}

/**
 * Compares dotted numeric versions and ignores a kernel suffix.
 *
 * Returns a negative number when `actual` is older, zero when both versions are
 * equal, a positive number when `actual` is newer, and `undefined` when the
 * actual version cannot be parsed. For example, `6.8.0-60-generic` equals `6.8`.
 */
function compareVersions(actual: string | undefined, minimum: string): number | undefined {
  const match = actual && /^(\d+(?:\.\d+)*)(?:[-+].*)?$/.exec(actual);
  if (!match) {
    return undefined;
  }
  const left = match[1].split(".").map(Number);
  const right = minimum.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

/** Evaluates host facts against the checked-in future runtime policy. */
export function evaluatePlatform(facts: PlatformFacts): CompatibilityRisk[] {
  if (!["x64", "arm64"].includes(facts.architecture)) {
    return [unknownRisk];
  }
  if (facts.platform === "darwin" || facts.platform === "win32") {
    const minimum =
      facts.platform === "darwin"
        ? nodeRuntimePolicy.minimumMacOS
        : nodeRuntimePolicy.minimumWindows;
    const comparison = compareVersions(facts.release, minimum);
    if (comparison === undefined) {
      return [unknownRisk];
    }
    return comparison < 0
      ? [
          {
            reason: "os-version",
            message: `This operating system is below the Node.js ${
              nodeRuntimePolicy.warningNodeMajor
            } baseline (${facts.platform === "darwin" ? "macOS" : "Windows"} ${minimum}).`,
          },
        ]
      : [];
  }
  if (facts.platform !== "linux") {
    return [unknownRisk];
  }

  const risks = new Set<CompatibilityRisk>();
  const kernel = compareVersions(facts.release, nodeRuntimePolicy.minimumLinuxKernel);
  if (kernel === undefined) {
    risks.add(unknownRisk);
  } else if (kernel < 0) {
    risks.add({
      reason: "kernel-version",
      message: `This Linux kernel is below the Node.js ${nodeRuntimePolicy.warningNodeMajor} support baseline (${nodeRuntimePolicy.minimumLinuxKernel}). Older kernels may still work.`,
    });
  }
  if (facts.distribution === "alpine") {
    risks.add({
      reason: "musl",
      message:
        "Alpine was detected. Musl-only Linux environments, including Alpine, might no longer work.",
    });
  } else {
    let minimum: string | undefined;
    if (
      facts.distribution &&
      Object.keys(nodeRuntimePolicy.minimumLinuxDistributions).includes(facts.distribution)
    ) {
      minimum = nodeRuntimePolicy.minimumLinuxDistributions[facts.distribution];
    }
    const comparison = minimum ? compareVersions(facts.distributionVersion, minimum) : undefined;
    if (comparison === undefined) {
      risks.add(unknownRisk);
    } else if (comparison < 0) {
      risks.add({
        reason: "distribution-version",
        message: `This Linux distribution is below the reviewed Node.js ${nodeRuntimePolicy.warningNodeMajor} library baseline (${facts.distribution} ${minimum}). Its system libraries may be too old.`,
      });
    }
  }
  return [...risks];
}

/** Formats compatibility risks as one actionable Pulumi warning. */
export function formatCompatibilityWarning(risks: CompatibilityRisk[]): string {
  return (
    `[awsx:node-compatibility:${risks.map((risk) => risk.reason).join(",")}] ` +
    "A future AWSX major version may use a dynamically linked stock Node.js runtime. " +
    risks.map((risk) => risk.message).join(" ") +
    ` To provide feedback see ${nodeRuntimePolicy.feedbackUrl}.` +
    " To suppress this warning, run `pulumi config set awsx:suppressNodeCompatibilityWarning true`."
  );
}

/** Injectable operations used to deliver the process-wide warning. */
export interface WarningDependencies {
  /** Returns true when stack configuration suppresses compatibility warnings. */
  suppressed: () => boolean;
  /** Collects facts about the provider host. */
  collect: () => PlatformFacts;
  /** Sends one warning to the Pulumi engine. */
  warn: (message: string) => Promise<void>;
}

/** Creates a check that emits at most one compatibility warning per provider process. */
export function createCompatibilityWarning(dependencies: WarningDependencies): () => Promise<void> {
  let checked = false;
  return async () => {
    if (dependencies.suppressed() || checked) {
      return;
    }
    // Set before awaiting the logger so concurrent Construct/Call requests cannot duplicate it.
    checked = true;
    let risks: CompatibilityRisk[];
    try {
      risks = evaluatePlatform(dependencies.collect());
    } catch {
      risks = [unknownRisk];
    }
    if (risks.length > 0) {
      try {
        await dependencies.warn(formatCompatibilityWarning(risks));
      } catch {
        // A diagnostic must not fail resource construction if logging is unavailable.
      }
    }
  };
}

export const warnNodeCompatibility = createCompatibilityWarning({
  suppressed: () => new pulumi.Config("awsx").get("suppressNodeCompatibilityWarning") === "true",
  collect: collectPlatformFacts,
  warn: (message) => pulumi.log.warn(message),
});
