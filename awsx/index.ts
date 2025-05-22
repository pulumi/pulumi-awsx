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
import { Repository } from "./ecr";
import { construct, functions } from "./resources";
import { resourceToConstructResult } from "./utils";

class Provider implements pulumi.provider.Provider {
  constructor(readonly version: string, readonly schema: string) {
    // Register any resources that can come back as resource references that need to be rehydrated.
    pulumi.runtime.registerResourceModule("awsx", "ecr", {
      version: this.version,
      construct: (name, type, urn) => {
        switch (type) {
          case "awsx:ecr:Repository":
            return new Repository(name, <any>undefined, { urn });
          default:
            throw new Error(`unknown resource type ${type}`);
        }
      },
    });
  }

  async construct(
    name: string,
    type: string,
    inputs: pulumi.Inputs,
    options: pulumi.ComponentResourceOptions,
  ) {
    const resource = construct(name, type, inputs, options);
    if (resource === undefined) {
      throw new Error(`unknown resource type ${type}`);
    }
    return resourceToConstructResult(resource);
  }

  async call(token: string, inputs: pulumi.Inputs): Promise<pulumi.provider.InvokeResult> {
    const untypedFunctions: Record<string, (inputs: any) => Promise<any>> = functions;
    const handler = untypedFunctions[token];
    if (!handler) {
      throw new Error(`unknown method ${token}`);
    }
    const outputs = await handler(inputs);
    return { outputs };
  }

  async invoke(token: string, inputs: any): Promise<pulumi.provider.InvokeResult> {
    const untypedFunctions: Record<string, (inputs: any) => Promise<any>> = functions;
    const handler = untypedFunctions[token];
    if (!handler) {
      throw new Error(`unknown method ${token}`);
    }
    const outputs = await handler(inputs);
    return { outputs };
  }
}

function main(args: string[]) {
  const schema: string = readFileSync(require.resolve("./schema.json"), {
    encoding: "utf-8",
  });
  let version: string = require("./package.json").version;
  if (version === "${VERSION}" && require("inspector")?.url() !== undefined) {
    // We're running in debug mode so just use a valid placeholder version.
    version = "0.0.0";
  }
  // Node allows for the version to be prefixed by a "v",
  // while semver doesn't. If there is a v, strip it off.
  if (version.startsWith("v")) {
    version = version.slice(1);
  }
  const provider = new Provider(version, schema);
  return pulumi.provider.main(provider, args);
}

main(process.argv.slice(2));
