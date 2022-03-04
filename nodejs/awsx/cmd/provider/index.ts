// Copyright 2016-2022, Pulumi Corporation.
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
import { readFileSync } from "fs";
import { Trail } from "../../cloudtrail";
import { trailProviderFactory } from "./trail";

class Provider implements pulumi.provider.Provider {
    // A map of types to provider factories. Calling a factory may return a new instance each
    // time or return the same provider instance.
    private readonly typeToProviderFactoryMap: Record<string, () => pulumi.provider.Provider> = {
        "awsx:cloudtrail:Trail": trailProviderFactory,
    };

    constructor(readonly version: string, readonly schema: string) {
        // Register any resources that can come back as resource references that need to be rehydrated.
        pulumi.runtime.registerResourceModule("eks", "index", {
            version: version,
            construct: (name, type, urn) => {
                switch (type) {
                    case "awsx:cloudtrail:Trail":
                        return new Trail(name, {}, { urn });
                    default:
                        throw new Error(`unknown resource type ${type}`);
                }
            },
        });
    }

    async call(token: string, inputs: pulumi.Inputs): Promise<pulumi.provider.InvokeResult> {
        throw new Error(`unknown method ${token}`);
    }

    construct(name: string,
              type: string,
              inputs: pulumi.Inputs,
              options: pulumi.ComponentResourceOptions): Promise<pulumi.provider.ConstructResult> {
        const provider = this.getProviderForType(type);
        return provider?.construct
            ? provider.construct(name, type, inputs, options)
            : unknownResourceRejectedPromise(type);
    }

    /**
     * Returns a provider for the type or undefined if not found.
     */
    private getProviderForType(type: string): pulumi.provider.Provider | undefined {
        const factory = this.typeToProviderFactoryMap[type];
        return factory ? factory() : undefined;
    }
}

function unknownResourceRejectedPromise<T>(type: string): Promise<T> {
    return Promise.reject(new Error(`unknown resource type ${type}`));
}

/** @internal */
export function main(args: string[]) {
    const schema: string = readFileSync(require.resolve("./schema.json"), { encoding: "utf-8" });
    let version: string = require("../../package.json").version;
    // Node allows for the version to be prefixed by a "v",
    // while semver doesn't. If there is a v, strip it off.
    if (version.startsWith("v")) {
        version = version.slice(1);
    }

    return pulumi.provider.main(new Provider(version, schema), args);
}

main(process.argv.slice(2));
