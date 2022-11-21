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

import { EC2TaskDefinition } from "./ec2TaskDefinition";

function promiseOf<T>(output: pulumi.Output<T>): Promise<T> {
  return new Promise((resolve) => output.apply(resolve));
}

describe("validateNetworkMode", () => {
  beforeAll(() => {
    // Put Pulumi in unit-test mode, mocking all calls to cloud-provider APIs.
    pulumi.runtime.setMocks({
      // Mock calls to create new resources and return a canned response.
      newResource: (args: pulumi.runtime.MockResourceArgs): { id: string; state: any } => {
        // Here, we're returning a same-shaped object for all resource types.
        // We could, however, use the arguments passed into this function to
        // customize the mocked-out properties of a particular resource.
        // See the unit-testing docs for details:
        // https://www.pulumi.com/docs/guides/testing/unit
        return {
          id: `${args.name}-id`,
          state: args.inputs,
        };
      },

      // Mock function calls and return whatever input properties were provided.
      call: (args: pulumi.runtime.MockCallArgs) => {
        return args.inputs;
      },
    });
  });

  it("the default network mode should be awsvpc", async () => {
    const taskDefinition = new EC2TaskDefinition("default", {
      container: {},
    });
    const networkMode = await promiseOf(taskDefinition.taskDefinition.networkMode);
    expect(networkMode).toBe("awsvpc");
  });
  it("when network mode is set, use it", async () => {
    const taskDefinition = new EC2TaskDefinition("default", {
      container: {},
      networkMode: "bridge",
    });
    const networkMode = await promiseOf(taskDefinition.taskDefinition.networkMode);
    expect(networkMode).toBe("bridge");
  });
});
