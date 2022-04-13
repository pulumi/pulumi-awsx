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
import { FargateService, FargateTaskDefinition } from "./ecs";
import { ConstructComponent, ResourceConstructor } from "./schema-types";

const resources: ResourceConstructor = {
    "awsx:cloudtrail:Trail": (...args) => new Trail(...args),
    "awsx:ecs:FargateService": (...args) => new FargateService(...args),
    "awsx:ecs:FargateTaskDefinition": (...args) =>
        new FargateTaskDefinition(...args),
};

export function construct(
    name: string,
    type: string,
    inputs: pulumi.Inputs,
    options: pulumi.ComponentResourceOptions,
) {
    const genericResources: Record<string, ConstructComponent> = resources;
    const resource = genericResources[type];
    if (resource === undefined) {
        return undefined;
    }
    return resource(name, inputs, options);
}
