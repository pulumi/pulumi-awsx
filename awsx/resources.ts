import * as pulumi from "@pulumi/pulumi";
import { Trail } from "./cloudtrail";
import { FargateService, FargateTaskDefinition } from "./ecs";

import { ResourceConstructor, ConstructComponent } from "./schema-types";

const resources: ResourceConstructor = {
    "awsx:cloudtrail:Trail": (...args) => new Trail(...args),
    "awsx:ecsx:FargateService": (...args) => new FargateService(...args),
    "awsx:ecsx:FargateTaskDefinition": (...args) =>
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
