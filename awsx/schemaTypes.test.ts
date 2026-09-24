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
import { DependencyResource } from "@pulumi/pulumi/resource";
import * as runtime from "@pulumi/pulumi/runtime";
import * as schema from "./schema-types";

class TestTrail extends schema.Trail {
  constructor(opts: pulumi.ComponentResourceOptions) {
    super("test", { enableLogging: true }, opts);
  }
}

describe("generated provider component types", () => {
  const resources: pulumi.runtime.MockResourceArgs[] = [];

  beforeAll(async () => {
    await runtime.setMocks({
      call(args) {
        return args.inputs;
      },
      newResource(args) {
        resources.push(args);
        return {
          id: `${args.name}-id`,
          state: args.inputs,
        };
      },
    });
  });

  it("does not serialize provider resource options as component inputs", async () => {
    const parent = new DependencyResource(
      "urn:pulumi:stack::project::awsx:test:Parent::parent",
    );
    const trail = new TestTrail({ parent });

    const urn = new Promise<string>((resolve) => trail.urn.apply(resolve));
    await expect(urn).resolves.toContain("awsx:cloudtrail:Trail::test");
    expect(resources.find((resource) => resource.type === "awsx:cloudtrail:Trail")?.inputs).toEqual(
      { enableLogging: true },
    );
  });

  it("preserves outputs initialized by ComponentResource", () => {
    jest.isolateModules(() => {
      jest.doMock("@pulumi/pulumi", () => ({
        ComponentResource: class {
          constructor(_type: string, _name: string, props: pulumi.Inputs) {
            Object.assign(this, props);
          }
        },
      }));

      const emittedSchema: typeof schema = require("./bin/schema-types.js");
      class EmittedImage extends emittedSchema.Image {}

      const image = new EmittedImage(
        "restored-image",
        { imageUri: "example.invalid/restored@sha256:abc" },
        {},
      );
      expect(image.imageUri).toBe("example.invalid/restored@sha256:abc");
    });
    jest.dontMock("@pulumi/pulumi");
  });
});
