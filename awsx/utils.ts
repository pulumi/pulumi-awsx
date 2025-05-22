// Copyright 2016-2018, Pulumi Corporation.
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

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as crypto from "crypto";

type Diff<T extends string | number | symbol, U extends string | number | symbol> = ({
  [P in T]: P;
} & { [P in U]: never } & { [x: string]: never })[T];

// Overwrite allows you to take an existing type, and then overwrite existing properties in it
// with properties of the same name, but with entirely different types.
export type Overwrite<T, U> = Pick<T, Diff<keyof T, keyof U>> & U;

// sha1hash returns a partial SHA1 hash of the input string.
/** @internal */
export function sha1hash(s: string): string {
  const shasum: crypto.Hash = crypto.createHash("sha1");
  shasum.update(s);
  // TODO[pulumi/pulumi#377] Workaround for issue with long names not generating per-deplioyment randomness, leading
  //     to collisions.  For now, limit the size of hashes to ensure we generate shorter/ resource names.
  return shasum.digest("hex").substring(0, 8);
}

type WithoutUndefined<T> = T extends undefined ? never : T;

export function countDefined(source: ReadonlyArray<unknown>): number {
  return source.reduce<number>((c, x) => (x !== undefined && x !== null ? c + 1 : c), 0);
}

/** @internal */
export function ifUndefined<T>(
  input: pulumi.Input<T> | undefined,
  value: pulumi.Input<T>,
): pulumi.Output<WithoutUndefined<T>> {
  return <any>(
    pulumi.all([input, value]).apply(([input, value]) => (input !== undefined ? input : value))
  );
}

/** @internal */
export function resourceToConstructResult<T extends pulumi.ComponentResource>(
  resource: T,
): pulumi.provider.ConstructResult {
  const state = Object.fromEntries(
    Object.entries(resource).filter(
      ([key, value]) =>
        key !== "urn" &&
        !key.startsWith("get") &&
        !key.startsWith("_") &&
        typeof value !== "function" &&
        value !== undefined,
    ),
  );
  return {
    urn: resource.urn,
    state,
  };
}

/** @internal */
export function getRegionFromOpts(opts: pulumi.CustomResourceOptions): pulumi.Output<aws.Region> {
  if (opts.parent) {
    return getRegion(opts.parent);
  }

  return getRegionFromProvider(opts.provider);
}

/** @internal */
export function getRegion(res: pulumi.Resource): pulumi.Output<aws.Region> {
  // uses the provider from the parent resource to fetch the region
  return aws.getRegionOutput({}, { parent: res }).apply((region) => region.name as aws.Region);
}

function getRegionFromProvider(
  provider: pulumi.ProviderResource | undefined,
): pulumi.Output<aws.Region> {
  return aws.getRegionOutput({}, { provider }).apply((region) => region.name as aws.Region);
}

/**
 * Applies the given function to each element of the array and returns a new array comprised of the results for each element where the function returns a value.
 * @param source The input collection.
 * @param chooser A function to transform items from the input collection to a new value to be included, or undefined to be excluded.
 * @example
 * choose(
 *  [1, 2, 3],
 *  x => (x % 2 === 1 ? x * 2 : undefined)
 * ) // [2, 6]
 * @internal
 */
export function choose<T, U>(
  source: ReadonlyArray<T>,
  chooser: (item: T, index: number) => U | undefined,
): U[] {
  const target = [];
  let index = 0;
  for (const item of source) {
    const chosen = chooser(item, index);
    if (chosen !== undefined) {
      target.push(chosen);
    }
    index++;
  }
  return target;
}

/**
 * Applies the given function to each element of the source array and concatenates all the results.
 * @param source The input collection.
 * @param mapping A function to transform elements of the input collection into collections that are concatenated.
 * @example
 * collect([1, 2], x => [x, x]) // [1, 1, 2, 2]
 * @internal
 */
export function collect<T, U>(
  source: ReadonlyArray<T>,
  mapping: (item: T, index: number) => Iterable<U>,
): U[] {
  const target = [];
  let index = 0;
  for (const item of source) {
    const children = mapping(item, index);
    for (const child of children) {
      target.push(child);
    }
    index++;
  }
  return target;
}

export interface Arn {
  resourceType?: string;
  resourceId: string;
  partition: string;
  service: string;
  region: string;
  accountId: string;
}

export function parseArn(arn: string): Arn {
  const parts = arn.split(":");
  const [arnPrefix, partition, service, region, accountId, resourceIdOrType, optionalResourceId] =
    parts;
  if (arnPrefix !== "arn") {
    throw new Error(`Invalid ARN: must start with "arn:"`);
  }
  if (parts.length !== 6 && parts.length !== 7) {
    throw new Error(`Invalid ARN: must be between 6 or 7 parts"`);
  }
  const simpleProps = {
    partition,
    service,
    region,
    accountId,
  };
  if (optionalResourceId !== undefined) {
    return {
      ...simpleProps,
      resourceType: resourceIdOrType,
      resourceId: optionalResourceId,
    };
  }
  const slashIndex = resourceIdOrType.indexOf("/");
  if (slashIndex > -1) {
    return {
      ...simpleProps,
      resourceType: resourceIdOrType.substring(0, slashIndex),
      resourceId: resourceIdOrType.substring(slashIndex + 1),
    };
  }
  return { ...simpleProps, resourceId: resourceIdOrType };
}
