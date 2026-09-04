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

import { EC2Service } from "./ec2Service";

const serviceResources: pulumi.runtime.MockResourceArgs[] = [];

beforeAll(() => {
  pulumi.runtime.setMocks({
    newResource(args) {
      if (args.type === "aws:ecs/service:Service") {
        serviceResources.push(args);
      }

      return {
        id: `${args.name}-id`,
        state: args.inputs,
      };
    },
    call(args) {
      return args.inputs;
    },
  });
});

beforeEach(() => {
  serviceResources.length = 0;
});

function ecsServiceInputs() {
  expect(serviceResources).toHaveLength(1);
  return serviceResources[0].inputs;
}

function promiseOf<T>(output: pulumi.Output<T>): Promise<T> {
  return new Promise((resolve) => output.apply(resolve));
}

describe("EC2Service capacity provider configuration", () => {
  const baseArgs = {
    cluster: "cluster-arn",
    taskDefinition: "task-definition-arn",
  };

  it("uses EC2 launch type by default", async () => {
    const service = new EC2Service("default-ec2", baseArgs);
    await promiseOf(service.service.id);

    const inputs = ecsServiceInputs();
    expect(inputs.launchType).toBe("EC2");
    expect(inputs).not.toHaveProperty("capacityProviderStrategies");
  });

  it("omits launch type when service-level capacity provider strategies are provided", async () => {
    const capacityProviderStrategies = [{ capacityProvider: "asg-capacity-provider", weight: 1 }];

    const service = new EC2Service("explicit-ec2-capacity", {
      ...baseArgs,
      capacityProviderStrategies,
    });
    await promiseOf(service.service.id);

    const inputs = ecsServiceInputs();
    expect(inputs).not.toHaveProperty("launchType");
    expect(inputs.capacityProviderStrategies).toEqual(capacityProviderStrategies);
  });

  it("omits launch type and service-level strategies for the cluster default strategy", async () => {
    const service = new EC2Service("cluster-default-ec2-capacity", {
      ...baseArgs,
      useClusterDefaultCapacityProviderStrategy: true,
    });
    await promiseOf(service.service.id);

    const inputs = ecsServiceInputs();
    expect(inputs).not.toHaveProperty("launchType");
    expect(inputs).not.toHaveProperty("capacityProviderStrategies");
  });

  it("rejects both service-level and cluster-default capacity provider strategies", () => {
    expect(
      () =>
        new EC2Service("invalid-ec2-capacity", {
          ...baseArgs,
          capacityProviderStrategies: [{ capacityProvider: "asg-capacity-provider", weight: 1 }],
          useClusterDefaultCapacityProviderStrategy: true,
        }),
    ).toThrow(
      "Only one of `capacityProviderStrategies` or `useClusterDefaultCapacityProviderStrategy` can be provided.",
    );
  });
});
