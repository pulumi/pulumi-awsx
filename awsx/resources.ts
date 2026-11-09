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
import { Trail } from "./cloudtrail";
import * as ec2 from "./ec2";
import { Image, RegistryImage, Repository } from "./ecr";
import * as ecs from "./ecs";
import * as lb from "./lb";
import * as schemaTypes from "./schema-types";
import { TaskDefinition } from "@pulumi/awsx-next/src/ecs/taskDefinition";
import { Service } from "@pulumi/awsx-next/src/ecs/service";

type ExperimentalResourceConstructors = {
  "awsx:experimental/ecs:TaskDefinition": schemaTypes.ConstructComponent<TaskDefinition>;
  "awsx:experimental/ecs:Service": schemaTypes.ConstructComponent<Service>;
};

const resources: schemaTypes.ResourceConstructor & ExperimentalResourceConstructors = {
  "awsx:experimental/ecs:TaskDefinition": (name, args, opts) =>
    new TaskDefinition(name, args, opts, {
      type: "awsx:experimental/ecs:TaskDefinition",
      aliases: [],
    }),
  "awsx:experimental/ecs:Service": (name, args, opts) =>
    new Service(name, args, opts, {
      type: "awsx:experimental/ecs:Service",
      aliases: [],
    }),
  "awsx:cloudtrail:Trail": (...args) => new Trail(...args),
  "awsx:ecs:FargateService": (...args) => new ecs.FargateService(...args),
  "awsx:ecs:EC2Service": (...args) => new ecs.EC2Service(...args),
  "awsx:ecs:EC2TaskDefinition": (...args) => new ecs.EC2TaskDefinition(...args),
  "awsx:ecs:FargateTaskDefinition": (...args) => new ecs.FargateTaskDefinition(...args),
  "awsx:lb:ApplicationLoadBalancer": (...args) => new lb.ApplicationLoadBalancer(...args),
  "awsx:lb:NetworkLoadBalancer": (...args) => new lb.NetworkLoadBalancer(...args),
  "awsx:lb:TargetGroupAttachment": (...args) => new lb.TargetGroupAttachment(...args),
  "awsx:ec2:Vpc": (...args) => new ec2.Vpc(...args),
  "awsx:ec2:DefaultVpc": (...args) => new ec2.DefaultVpc(...args),
  "awsx:ecr:Repository": (...args) => new Repository(...args),
  "awsx:ecr:Image": (...args) => new Image(...args),
  "awsx:ecr:RegistryImage": (...args) => new RegistryImage(...args),
};

export function construct(
  name: string,
  type: string,
  inputs: pulumi.Inputs,
  options: pulumi.ComponentResourceOptions,
) {
  const genericResources: Record<string, schemaTypes.ConstructComponent> = resources;
  const resource = genericResources[type];
  if (resource === undefined) {
    return undefined;
  }
  return resource(name, inputs, options);
}

export const functions: schemaTypes.Functions = {
  "awsx:ec2:getDefaultVpc": () => ec2.getDefaultVpc({}),
};
