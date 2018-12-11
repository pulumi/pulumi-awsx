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
export function normalizeProps(val: any): any {
    return normalize("", val, new Set());
}

function normalize(path: string, val: any, set: Set<any>): any {
    if (val === undefined ||
        val === null ||
        typeof val === "boolean" ||
        typeof val === "number" ||
        typeof val === "string") {

        return val;
    }

    if (set.has(val)) {
        return undefined;
    }

    set.add(val);
    // console.log("Serializing: " + path);

    if (pulumi.CustomResource.isInstance(val)) {
        return val;
    }

    // Component resources often contain cycles of resources due to logical-child resources pointing
    // at parent resources, and parent resources holding and exposing children through lists. As
    // such, we don't include component resources at all so that there are no such cycles and so
    // that we don't end up deadlocking on a child that is already waiting on us.
    if (pulumi.ComponentResource.isInstance(val)) {
        // console.log("skipping component: " + path);
        return val.urn;
    }

    if (val instanceof Function) {
        return undefined;
    }

    if (Array.isArray(val)) {
        const result = [];
        let index = 0;
        for (const child of val) {
            result.push(normalize(path + "[" + index++ + "]", child, set));
        }
        return result;
    }

    // if (val instanceof Promise || pulumi.Output.isInstance(val)) {
    //     return val;
    // }

    if (val instanceof Promise) {
        return val.then(v => normalize(path + ".then", v, set));
    }

    if (pulumi.Output.isInstance(val)) {
        return val.apply(v => normalize(path + ".apply", v, set));
    }


    const result: Record<string, any> = { };
    for (const key of Object.keys(val)) {
        result[key] = normalize(path + "." + key, val[key], set);
    }

    return result;
}
