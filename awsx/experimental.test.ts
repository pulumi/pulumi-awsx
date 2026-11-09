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
import { construct } from "./resources";
import { TaskDefinition } from "@pulumi/awsx-next/src/ecs/taskDefinition";
import { Service } from "@pulumi/awsx-next/src/ecs/service";

const resources: pulumi.runtime.MockResourceArgs[] = [];
const region = "us-west-2";
const accountId = "123456789012";

function unwrap<T>(output: pulumi.Output<T>): Promise<T> {
  return new Promise((resolve) => output.apply(resolve));
}

beforeAll(async () => {
  await pulumi.runtime.setMocks({
    newResource(args) {
      resources.push(args);
      const state = { ...args.inputs, name: args.name };
      if (args.type === "aws-native:ecs:TaskDefinition") {
        state.taskDefinitionArn = `arn:aws:ecs:${region}:${accountId}:task-definition/${args.name}:1`;
      } else if (args.type === "aws:ecs/service:Service") {
        state.arn = `arn:aws:ecs:${region}:${accountId}:service/cluster/${args.name}`;
      } else if (args.type === "aws:iam/role:Role") {
        state.arn = `arn:aws:iam::${accountId}:role/${args.name}`;
      }
      return { id: `${args.name}-id`, state };
    },
    call(args) {
      switch (args.token) {
        case "aws:index/getCallerIdentity:getCallerIdentity":
        case "aws-native:index:getAccountId":
          return { accountId };
        case "aws:index/getRegion:getRegion":
          return { region, name: region };
        case "aws-native:index:getRegion":
          return { region };
        case "aws:ecs/getTaskDefinition:getTaskDefinition":
          return {
            arn: args.inputs.taskDefinition,
            requiresCompatibilities: ["FARGATE"],
            networkMode: "awsvpc",
          };
        case "aws:ec2/getSubnet:getSubnet":
          return { ...args.inputs, vpcId: "vpc-test" };
        default:
          return args.inputs;
      }
    },
  });
});

test("provider registration composes the current task and service with AWSX identities", async () => {
  const task = construct(
    "integrated-task",
    "awsx:experimental/ecs:TaskDefinition",
    { containers: { app: { image: "nginx", logging: { disabled: true } } } },
    {},
  );
  expect(task).toBeInstanceOf(TaskDefinition);
  const definition = task as TaskDefinition;
  const taskArn = await unwrap(definition.taskDefinitionArn);
  expect(await unwrap(definition.urn)).toContain("::awsx:experimental/ecs:TaskDefinition::");
  const nativeTask = resources.find(
    (resource) => resource.type === "aws-native:ecs:TaskDefinition",
  );
  expect(nativeTask?.inputs.containerDefinitions).toEqual([
    expect.objectContaining({ name: "app", image: "nginx" }),
  ]);

  const service = construct(
    "integrated-service",
    "awsx:experimental/ecs:Service",
    {
      clusterArn: `arn:aws:ecs:${region}:${accountId}:cluster/test`,
      taskDefinitionArn: definition.taskDefinitionArn,
      vpcSubnetIds: ["subnet-test"],
      capacity: { fargate: {} },
      waitForSteadyState: false,
    },
    {},
  );
  expect(service).toBeInstanceOf(Service);
  const registeredService = service as Service;
  await unwrap(registeredService.serviceArn);
  expect(await unwrap(registeredService.urn)).toContain("::awsx:experimental/ecs:Service::");
  expect(
    resources.find((resource) => resource.type === "aws:ecs/service:Service")?.inputs,
  ).toMatchObject({
    taskDefinition: taskArn,
    waitForSteadyState: false,
    networkConfiguration: { subnets: ["subnet-test"] },
  });
  expect(resources.some((resource) => resource.type.startsWith("awsx-next:"))).toBe(false);
  expect(
    construct("obsolete", "awsx:experimental/ecs:FargateTaskDefinitionV2", {}, {}),
  ).toBeUndefined();
  expect(
    construct("obsolete", "awsx:experimental/ecs:ContainerDefinition", {}, {}),
  ).toBeUndefined();
});
