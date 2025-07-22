// Copyright 2016-2025, Pulumi Corporation.
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

pulumi.runtime.setMocks(
  {
    newResource: function (args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
      return {
        id: args.inputs.name + "_id",
        state: args.inputs,
      };
    },
    call: function (
      args: pulumi.runtime.MockCallArgs,
    ): pulumi.runtime.MockCallResult | Promise<pulumi.runtime.MockCallResult> {
      return {
        userName: "AWS",
        password: "password",
        proxyEndpoint: `https://${args.inputs.registryId}.dkr.ecr.us-west-2.amazonaws.com`,
      };
    },
  },
  "project",
  "stack",
  false, // Sets the flag `dryRun`, which indicates if pulumi is running in preview mode.
);

describe("getDockerCredentials", () => {
  let auth: typeof import("./auth");

  beforeAll(async function () {
    auth = await import("./auth");
  });

  it("should return Docker credentials when valid repositoryUrl is provided", async () => {
    const args = { repositoryUrl: "https://123456789012.dkr.ecr.us-west-2.amazonaws.com" };
    const opts = {};

    const result = await promisify(auth.getDockerCredentials(args, opts));

    expect(result).toEqual({
      address: "https://123456789012.dkr.ecr.us-west-2.amazonaws.com",
      username: "AWS",
      password: "password",
    });
  });

  it("should use registryId if provided", async () => {
    const args = {
      repositoryUrl: "123456789012.dkr.ecr.us-west-2.amazonaws.com",
      registryId: "987654321098",
    };
    const opts = {};

    const result = await promisify(auth.getDockerCredentials(args, opts));

    expect(result).toEqual({
      address: `https://${args.registryId}.dkr.ecr.us-west-2.amazonaws.com`,
      username: "AWS",
      password: "password",
    });
  });

  it("should throw an error if the repositoryUrl is not a valid URL", async () => {
    const args = { repositoryUrl: "foo:bar" };
    const opts = {};

    expect(() => {
      auth.getDockerCredentials(args, opts);
    }).toThrow("Repository URL is not a valid URL.");
  });
});

function promisify<T>(output: pulumi.Output<T> | undefined): Promise<T> {
  expect(output).toBeDefined();
  return new Promise((resolve) => output!.apply(resolve));
}
