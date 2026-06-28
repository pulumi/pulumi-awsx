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

import * as runtime from "@pulumi/pulumi/runtime";
import * as pulumi from "@pulumi/pulumi";
import * as pulumiAws from "@pulumi/aws";
import { Repository } from "./repository";

function unwrap<T>(x: pulumi.Output<T> | T): Promise<T> {
  return new Promise((resolve) => (pulumi.Output.isInstance(x) ? x.apply(resolve) : resolve(x)));
}

describe("Repository region passthrough", () => {
  let newResources: any[] = [];

  beforeAll(async () => {
    await runtime.setMocks({
      call(args) {
        throw new Error(`Mock call not implemented: ${args.token}`);
      },
      newResource(args) {
        newResources.push(args);
        return {
          id: `mocked::${args.type}::${args.name}-id`,
          state: args.inputs,
        };
      },
    });
  });

  beforeEach(() => {
    newResources = [];
  });

  function findCreatedResource(type: string, name: string): any {
    const resource = newResources.find((r) => r.type === type && r.name === name);
    expect(resource).toBeDefined();
    return resource;
  }

  it("threads the top-level region through to the lifecycle policy", async () => {
    const repo = new Repository("Region-Repo", { region: pulumiAws.Region.USWest2 }, {});

    await unwrap(repo.repository.id);
    await unwrap(repo.lifecyclePolicy!.id);

    const repository = findCreatedResource("aws:ecr/repository:Repository", "region-repo");
    const lifecyclePolicy = findCreatedResource(
      "aws:ecr/lifecyclePolicy:LifecyclePolicy",
      "region-repo",
    );
    expect(repository.inputs.region).toBe(pulumiAws.Region.USWest2);
    expect(lifecyclePolicy.inputs.region).toBe(pulumiAws.Region.USWest2);
  });

  it("threads region through the auto-generated default lifecycle policy", async () => {
    // No explicit lifecyclePolicy.rules: the component synthesizes the default
    // "remove untagged images" rule. Region should still propagate.
    const repo = new Repository(
      "Default-Policy-Repo",
      { region: pulumiAws.Region.EUCentral1, lifecyclePolicy: {} },
      {},
    );

    await unwrap(repo.lifecyclePolicy!.id);

    const lifecyclePolicy = findCreatedResource(
      "aws:ecr/lifecyclePolicy:LifecyclePolicy",
      "default-policy-repo",
    );
    expect(lifecyclePolicy.inputs.region).toBe(pulumiAws.Region.EUCentral1);
    expect(lifecyclePolicy.inputs.policy).toBeDefined();
  });

  it("creates no lifecycle policy when skip is set", async () => {
    const repo = new Repository(
      "Skip-Repo",
      { region: pulumiAws.Region.USWest2, lifecyclePolicy: { skip: true } },
      {},
    );

    await unwrap(repo.repository.id);

    expect(repo.lifecyclePolicy).toBeUndefined();
    expect(newResources.some((r) => r.type === "aws:ecr/lifecyclePolicy:LifecyclePolicy")).toBe(
      false,
    );
  });

  it("does not add a region key to the lifecycle policy when region is omitted", async () => {
    const repo = new Repository("No-Region-Repo", {}, {});

    await unwrap(repo.lifecyclePolicy!.id);

    const lifecyclePolicy = findCreatedResource(
      "aws:ecr/lifecyclePolicy:LifecyclePolicy",
      "no-region-repo",
    );
    expect("region" in lifecyclePolicy.inputs).toBe(false);
  });
});
