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
import { cloudtrailProvider } from "./cmd/provider/cloudtrail";
import { ecsProvider } from "./cmd/provider/ecs";
import { ProviderModule } from "./cmd/provider/providerModule";
import { resourceToConstructResult } from "./utils";

const modules: Record<string, ProviderModule> = {
    cloudtrail: cloudtrailProvider,
    ecs: ecsProvider,
};

const packageName = "awsx";

class Provider implements pulumi.provider.Provider {
    constructor(readonly version: string, readonly schema: string) {}
    async construct(
        name: string,
        type: string,
        inputs: pulumi.Inputs,
        options: pulumi.ComponentResourceOptions,
    ) {
        const [pkg, moduleName] = type.split(":");
        const module = modules[moduleName];
        if (pkg !== packageName || module === undefined) {
            throw new Error(`unknown resource type ${type}`);
        }
        const resource = module.construct(name, type, inputs, options);
        if (resource === undefined) {
            throw new Error(`unknown resource type ${type}`);
        }
        return resourceToConstructResult(resource);
    }
}

function main(args: string[]) {
    const schema: string = readFileSync(require.resolve("./schema.json"), {
        encoding: "utf-8",
    });
    let version: string = require("./package.json").version;
    // Node allows for the version to be prefixed by a "v",
    // while semver doesn't. If there is a v, strip it off.
    if (version.startsWith("v")) {
        version = version.slice(1);
    }
    const provider = new Provider(version, schema);
    return pulumi.provider.main(provider, args);
}

main(process.argv.slice(2));
