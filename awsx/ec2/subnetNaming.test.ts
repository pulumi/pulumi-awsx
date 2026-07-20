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

import fc from "fast-check";
import { azSuffix, subnetName, subnetNames, validateAzSuffixes } from "./subnetNaming";

// Every shape of availability zone name AWS hands out, grouped by the region that contains them.
// A VPC only ever spans one region, so uniqueness only has to hold within a group.
const azsByRegion: Record<string, string[]> = {
  // Standard commercial regions. us-east-1 is the only one with six AZs.
  "us-east-1": ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d", "us-east-1e", "us-east-1f"],
  "us-east-2": ["us-east-2a", "us-east-2b", "us-east-2c"],
  "us-west-2": ["us-west-2a", "us-west-2b", "us-west-2c", "us-west-2d"],
  "eu-west-1": ["eu-west-1a", "eu-west-1b", "eu-west-1c"],
  "eu-north-1": ["eu-north-1a", "eu-north-1b", "eu-north-1c"],
  "eu-central-2": ["eu-central-2a", "eu-central-2b", "eu-central-2c"],
  "ap-northeast-1": ["ap-northeast-1a", "ap-northeast-1c", "ap-northeast-1d"],
  // Double-digit-free but non-1 region numbers: the suffix must keep the region number.
  "ap-southeast-4": ["ap-southeast-4a", "ap-southeast-4b", "ap-southeast-4c"],
  "ap-southeast-7": ["ap-southeast-7a", "ap-southeast-7b", "ap-southeast-7c"],
  "ca-central-1": ["ca-central-1a", "ca-central-1b", "ca-central-1d"],
  "sa-east-1": ["sa-east-1a", "sa-east-1b", "sa-east-1c"],
  // Two-letter country-style prefixes.
  "il-central-1": ["il-central-1a", "il-central-1b", "il-central-1c"],
  "mx-central-1": ["mx-central-1a", "mx-central-1b", "mx-central-1c"],
  "me-central-1": ["me-central-1a", "me-central-1b", "me-central-1c"],
  "af-south-1": ["af-south-1a", "af-south-1b", "af-south-1c"],
  // GovCloud: an extra region word.
  "us-gov-west-1": ["us-gov-west-1a", "us-gov-west-1b", "us-gov-west-1c"],
  "us-gov-east-1": ["us-gov-east-1a", "us-gov-east-1b", "us-gov-east-1c"],
  // China.
  "cn-north-1": ["cn-north-1a", "cn-north-1b"],
  "cn-northwest-1": ["cn-northwest-1a", "cn-northwest-1b", "cn-northwest-1c"],
  // ISO partitions, including the isob/isoe/isof variants.
  "us-iso-east-1": ["us-iso-east-1a", "us-iso-east-1b", "us-iso-east-1c"],
  "us-iso-west-1": ["us-iso-west-1a", "us-iso-west-1b"],
  "us-isob-east-1": ["us-isob-east-1a", "us-isob-east-1b"],
  "us-isof-south-1": ["us-isof-south-1a", "us-isof-south-1b"],
  "eu-isoe-west-1": ["eu-isoe-west-1a", "eu-isoe-west-1b"],
  // Local Zones sit inside a parent region alongside its standard AZs, and there can be more than
  // one Local Zone group in the same region. These share a "-1a" tail, so a suffix rule that only
  // looked at the tail would collide here.
  "us-west-2 (with local zones)": [
    "us-west-2a",
    "us-west-2b",
    "us-west-2-lax-1a",
    "us-west-2-lax-1b",
    "us-west-2-den-1a",
    "us-west-2-phx-2a",
  ],
  "us-east-1 (with local zones)": [
    "us-east-1a",
    "us-east-1-bos-1a",
    "us-east-1-chi-1a",
    "us-east-1-dfw-2a",
    "us-east-1-atl-1a",
  ],
  // Wavelength Zones end in a digit rather than a letter.
  "us-east-1 (with wavelength)": [
    "us-east-1a",
    "us-east-1-wl1-bos-wlz-1",
    "us-east-1-wl1-nyc-wlz-1",
  ],
  "eu-central-1 (with wavelength)": ["eu-central-1a", "eu-central-1-wl1-ber-wlz-1"],
};

const allAzs = Object.values(azsByRegion).flat();

// AWS tag values permit letters, numbers, spaces and + - = . _ : / @, up to 256 characters. Pulumi
// resource names are far more permissive, so the tag is the binding constraint. We hold ourselves to
// a stricter rule than AWS does: the generated names must stay DNS-ish and human-readable.
const validName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("azSuffix", () => {
  it("keeps the region number and zone letter for standard AZs", () => {
    expect(azSuffix("us-east-1a")).toBe("1a");
    expect(azSuffix("us-east-1f")).toBe("1f");
    expect(azSuffix("eu-west-3c")).toBe("3c");
  });

  it("keeps the region number for regions numbered other than 1", () => {
    expect(azSuffix("us-west-2a")).toBe("2a");
    expect(azSuffix("us-west-2d")).toBe("2d");
    expect(azSuffix("ap-southeast-4c")).toBe("4c");
    expect(azSuffix("ap-southeast-7b")).toBe("7b");
  });

  it("strips the longer region prefixes of the GovCloud, China and ISO partitions", () => {
    expect(azSuffix("us-gov-west-1a")).toBe("1a");
    expect(azSuffix("us-gov-east-1c")).toBe("1c");
    expect(azSuffix("cn-northwest-1b")).toBe("1b");
    expect(azSuffix("us-iso-east-1a")).toBe("1a");
    expect(azSuffix("us-isob-east-1b")).toBe("1b");
    expect(azSuffix("us-isof-south-1a")).toBe("1a");
    expect(azSuffix("eu-isoe-west-1a")).toBe("1a");
  });

  it("keeps enough of a Local Zone name to stay unique within its parent region", () => {
    // The "-1a" tail is shared by every Local Zone group, so the city has to survive.
    expect(azSuffix("us-west-2-lax-1a")).toBe("2-lax-1a");
    expect(azSuffix("us-west-2-den-1a")).toBe("2-den-1a");
    expect(azSuffix("us-east-1-bos-1a")).toBe("1-bos-1a");
  });

  it("handles Wavelength Zones, which end in a digit rather than a letter", () => {
    expect(azSuffix("us-east-1-wl1-bos-wlz-1")).toBe("1-wl1-bos-wlz-1");
    expect(azSuffix("eu-central-1-wl1-ber-wlz-1")).toBe("1-wl1-ber-wlz-1");
  });

  it("falls back to the full AZ name when it cannot be parsed", () => {
    expect(azSuffix("nonsense")).toBe("nonsense");
    expect(azSuffix("us-east-1")).toBe("1"); // a region, not an AZ, but still parses
    expect(azSuffix("localzone")).toBe("localzone");
  });

  it("produces a valid, non-empty name fragment for every known AZ", () => {
    for (const az of allAzs) {
      const suffix = azSuffix(az);
      expect(suffix).not.toBe("");
      expect(suffix).toMatch(validName);
    }
  });

  it("is unique within every region, so no two subnets of a type can collide", () => {
    for (const [region, azs] of Object.entries(azsByRegion)) {
      const suffixes = azs.map(azSuffix);
      expect(new Set(suffixes).size).toBe(azs.length);
      // Guard the guard: the corpus itself must not contain duplicate AZs.
      expect(new Set(azs).size).toBe(azs.length);
      expect(region).toBeTruthy();
    }
  });
});

describe("subnetName", () => {
  it("suffixes with the 1-based AZ index under Legacy naming", () => {
    expect(subnetName("vpc", { type: "Public" }, 1, "us-east-1a", "Legacy")).toBe("vpc-public-1");
    expect(subnetName("vpc", { type: "Private" }, 3, "us-east-1c", "Legacy")).toBe("vpc-private-3");
  });

  it("suffixes with the AZ under AvailabilityZone naming", () => {
    expect(subnetName("vpc", { type: "Public" }, 1, "us-east-1a", "AvailabilityZone")).toBe(
      "vpc-public-1a",
    );
    expect(subnetName("vpc", { type: "Private" }, 3, "us-east-1c", "AvailabilityZone")).toBe(
      "vpc-private-1c",
    );
  });

  it("ignores the AZ index entirely under AvailabilityZone naming", () => {
    // The index is what makes Legacy names shift when the AZ list changes; the whole point of the
    // AZ suffix is that it does not depend on ordering.
    const first = subnetName("vpc", { type: "Public" }, 1, "us-west-2b", "AvailabilityZone");
    const second = subnetName("vpc", { type: "Public" }, 2, "us-west-2b", "AvailabilityZone");
    expect(first).toBe(second);
    expect(first).toBe("vpc-public-2b");
  });

  it("honours a custom subnet spec name under both strategies", () => {
    expect(subnetName("vpc", { type: "Public", name: "dmz" }, 2, "us-west-2b", "Legacy")).toBe(
      "vpc-dmz-2",
    );
    expect(
      subnetName("vpc", { type: "Public", name: "dmz" }, 2, "us-west-2b", "AvailabilityZone"),
    ).toBe("vpc-dmz-2b");
  });

  it("produces valid, unique names for every AZ in every region", () => {
    for (const azs of Object.values(azsByRegion)) {
      for (const type of ["Public", "Private", "Isolated"] as const) {
        const names = azs.map((az, i) =>
          subnetName("my-vpc", { type }, i + 1, az, "AvailabilityZone"),
        );
        for (const name of names) {
          expect(name).toMatch(validName);
          expect(name.length).toBeLessThanOrEqual(255);
        }
        expect(new Set(names).size).toBe(azs.length);
      }
    }
  });

  it("produces names that are valid for any plausible AZ name", () =>
    fc.assert(
      fc.property(
        // A grammar covering the AZ name shapes AWS uses: 2-letter prefix, one or more region
        // words, a region number, and a zone tail that may be a letter or a Local/Wavelength suffix.
        fc.tuple(
          fc.stringMatching(/^[a-z]{2}$/),
          fc.array(fc.stringMatching(/^[a-z]{2,10}$/), { minLength: 1, maxLength: 3 }),
          fc.integer({ min: 1, max: 9 }),
          fc.stringMatching(/^[a-z]$|^-[a-z]{3}-[1-9][a-z]$|^-wl[1-9]-[a-z]{3}-wlz-[1-9]$/),
        ),
        ([prefix, words, num, tail]) => {
          const az = `${prefix}-${words.join("-")}-${num}${tail}`;
          const name = subnetName("vpc", { type: "Public" }, 1, az, "AvailabilityZone");
          expect(name).toMatch(validName);
          expect(name.startsWith("vpc-public-")).toBe(true);
          // The suffix must never be empty - that would leave a trailing hyphen.
          expect(name).not.toMatch(/-$/);
        },
      ),
    ));
});

describe("subnetNames", () => {
  it("returns the legacy name unchanged alongside the AZ name", () => {
    expect(subnetNames("vpc", { type: "Public" }, 2, "us-west-2b", "AvailabilityZone")).toEqual({
      nameTag: "vpc-public-2b",
      resourceName: "vpc-public-2",
    });
  });

  it("returns identical names under Legacy naming, which is what suppresses the aliases", () => {
    const names = subnetNames("vpc", { type: "Public" }, 2, "us-west-2b", "Legacy");
    expect(names.nameTag).toBe(names.resourceName);
    expect(names.nameTag).toBe("vpc-public-2");
  });

  it("keeps the legacy name index-based for every AZ, regardless of the AZ's own shape", () => {
    const azs = azsByRegion["us-west-2 (with local zones)"];
    const legacy = azs.map(
      (az, i) => subnetNames("vpc", { type: "Public" }, i + 1, az, "AvailabilityZone").resourceName,
    );
    expect(legacy).toEqual([
      "vpc-public-1",
      "vpc-public-2",
      "vpc-public-3",
      "vpc-public-4",
      "vpc-public-5",
      "vpc-public-6",
    ]);
  });
});

describe("validateAzSuffixes", () => {
  it("accepts every real region's AZ list", () => {
    for (const azs of Object.values(azsByRegion)) {
      expect(() => validateAzSuffixes(azs)).not.toThrow();
    }
  });

  it("accepts a region's standard AZs mixed with its Local and Wavelength Zones", () => {
    expect(() =>
      validateAzSuffixes([
        "us-east-1a",
        "us-east-1b",
        "us-east-1-bos-1a",
        "us-east-1-chi-1a",
        "us-east-1-wl1-bos-wlz-1",
      ]),
    ).not.toThrow();
  });

  it("rejects AZ names whose suffixes collide", () => {
    // Real AZs in one region cannot collide, because they all share the region prefix that gets
    // stripped. This guards hand-written availabilityZoneNames that fall back to the full name.
    expect(() => validateAzSuffixes(["us-east-1a", "1a"])).toThrow(/both reduce to "1a"/);
  });

  it("rejects a duplicated AZ name", () => {
    expect(() => validateAzSuffixes(["us-east-1a", "us-east-1a"])).toThrow(/distinct suffixes/);
  });
});
