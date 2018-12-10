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

type Diff<T extends string | number | symbol, U extends string | number | symbol> =
  ({ [P in T]: P } & { [P in U]: never } & { [x: string]: never })[T];

// Overwrite allows you to take an existing type, and then overwrite existing properties in it
// with properties of the same name, but with entirely different types.
export type Overwrite<T, U> = Pick<T, Diff<keyof T, keyof U>> & U;

/** @internal */
export type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};

// sha1hash returns a partial SHA1 hash of the input string.
/** @internal */
export function sha1hash(s: string): string {
    const shasum: crypto.Hash = crypto.createHash("sha1");
    shasum.update(s);
    // TODO[pulumi/pulumi#377] Workaround for issue with long names not generating per-deplioyment randomness, leading
    //     to collisions.  For now, limit the size of hashes to ensure we generate shorter/ resource names.
    return shasum.digest("hex").substring(0, 8);
}

/** @internal */
export function combineArrays<T>(
    e1: pulumi.Input<T[] | undefined>,
    e2: pulumi.Input<T[] | undefined>): pulumi.Output<T[]> {

    const result = pulumi.all([e1, e2]).apply(([e1, e2]) => {
        e1 = e1 || [];
        e2 = e2 || [];
        return [...e1, ...e2];
    });

    return <pulumi.Output<T[]>>result;
}

/** @internal */
export function ifUndefined<T>(input: pulumi.Input<T> | undefined, value: pulumi.Input<T>) {
    return pulumi.all([input, value])
                 .apply(([input, value]) => input !== undefined ? input : value);
}

/** @internal */
export type Compatible<T, U> = T extends U ? U extends T ? any : void : void;

/** @internal */
export function checkCompat<T, U>(): Compatible<T, U> {
    return undefined!;
}

/** @internal */
export function mergeTags(tags1: pulumi.Input<aws.Tags> | undefined,
                          tags2: pulumi.Input<aws.Tags> | undefined): pulumi.Output<aws.Tags> {
    return pulumi.all([tags1, tags2]).apply(([tags1, tags2]) => ({
        ...(tags1 || {}),
        ...(tags2 || {}),
    }));
}

/** @internal */
export function normalizeProps(props: any): Record<string, any> {
    const result: Record<string, any> = { };
    for (const key of Object.keys(props)) {
        result[key] = normalize(props[key]);
    }

    return result;
}

function normalize(val: any): any {
    if (val === undefined ||
        val === null ||
        typeof val === "boolean" ||
        typeof val === "number" ||
        typeof val === "string") {

        return val;
    }

    // Don't try to convert an entire component over when it is passed in as a prop.
    // Just include the urn for the resource.
    if (pulumi.ComponentResource.isInstance(val)) {
        return val.urn;
    }

    if (pulumi.Resource.isInstance(val)) {
        return val;
    }

    if (val instanceof Function) {
        return undefined;
    }

    if (Array.isArray(val)) {
        const result = [];
        for (const child of val) {
            result.push(normalize(child));
        }
        return result;
    }

    if (val instanceof Promise) {
        return val.then(normalize);
    }

    if (pulumi.Output.isInstance(val)) {
        return val.apply(normalize);
    }

    return normalizeProps(val);
}
