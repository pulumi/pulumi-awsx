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

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { LogGroupId } from "../cloudwatch/logGroup";
import * as schema from "../schema-types";
import * as utils from "../utils";

/** @internal */
export function normalizeTaskDefinitionContainers(
  args: schema.FargateTaskDefinitionArgs | schema.EC2TaskDefinitionArgs,
): pulumi.Output<Record<string, schema.TaskDefinitionContainerDefinitionInputs>> {
  const { container, containers } = args;
  if (containers !== undefined && container === undefined) {
    // Wrapping in Output is not necessary here but it is in the following case, so we do it here,
    // too, to simplify the return type.
    return pulumi.output(containers);
  } else if (container !== undefined && containers === undefined) {
    return pulumi.output(container.name).apply((n) => {
      const name = n ?? "container";
      const rec: Record<string, schema.TaskDefinitionContainerDefinitionInputs> = {
        [name]: container,
      };
      return rec;
    });
  } else {
    throw new Error("Exactly one of [container] or [containers] must be provided");
  }
}

/** @internal */
export function computeContainerDefinitions(
  parent: pulumi.Resource,
  containers: pulumi.Output<Record<string, schema.TaskDefinitionContainerDefinitionInputs>>,
  logGroupId: pulumi.Input<LogGroupId> | undefined,
): pulumi.Output<schema.TaskDefinitionContainerDefinitionInputs[]> {
  const computed = containers.apply((c) => {
    return pulumi.all(
      Object.entries(c).map(([containerName, container]) =>
        computeContainerDefinition(parent, containerName, container, logGroupId),
      ),
    );
  });
  return computed;
}

function computeContainerDefinition(
  parent: pulumi.Resource,
  containerName: string,
  container: schema.TaskDefinitionContainerDefinitionInputs,
  logGroupId: pulumi.Input<LogGroupId> | undefined,
): pulumi.Output<schema.TaskDefinitionContainerDefinitionInputs> {
  const resolvedMappings = container.portMappings
    ? pulumi.output(container.portMappings).apply((portMappings) =>
        portMappings?.map((mappingInput) => {
          return pulumi
            .output(mappingInput.targetGroup?.port)
            .apply((tgPort): schema.TaskDefinitionPortMappingInputs => {
              return getMappingInputs(mappingInput, tgPort);
            });
        }),
      )
    : undefined;

  return pulumi
    .all([container, resolvedMappings, logGroupId])
    .apply(([container, portMappings, logGroupId]) => {
      const containerDefinition = {
        ...container,
        portMappings,
        name: containerName,
      };
      if (containerDefinition.logConfiguration === undefined && logGroupId !== undefined) {
        containerDefinition.logConfiguration = {
          logDriver: "awslogs",
          options: {
            "awslogs-group": logGroupId.logGroupName,
            "awslogs-region": logGroupId.logGroupRegion,
            "awslogs-stream-prefix": containerName,
          },
        };
      }
      return containerDefinition;
    });
}

export function getMappingInputs(
  mappingInput: { containerPort?: number; hostPort?: number; protocol?: string },
  tgPort: number | undefined,
): schema.TaskDefinitionPortMappingInputs {
  return {
    containerPort: mappingInput.containerPort ?? mappingInput.hostPort ?? tgPort,
    hostPort: mappingInput.hostPort ?? tgPort ?? mappingInput.containerPort,
    protocol: mappingInput.protocol,
  };
}

/** @internal */
export function computeLoadBalancers(
  containers: pulumi.Output<Record<string, schema.TaskDefinitionContainerDefinitionInputs>>,
): pulumi.Output<aws.types.output.ecs.ServiceLoadBalancer[]> {
  const mappedContainers = containers.apply((conts) => {
    return Object.entries(conts).map(([containerName, containerDefinition]) => {
      const portMappings:
        | pulumi.Input<pulumi.Input<schema.TaskDefinitionPortMappingInputs>[]>
        | undefined = containerDefinition.portMappings;
      if (portMappings === undefined) {
        return pulumi.output([]);
      }
      const mappedMappings = pulumi.output(portMappings).apply((mappings) => {
        return mappings.map((m) => {
          const targetGroup = m.targetGroup;
          return {
            containerName,
            tgArn: targetGroup?.arn,
            tgPort: targetGroup?.port,
          };
        });
      });
      return mappedMappings;
    });
  });
  return mappedContainers.apply((mapped) => {
    return pulumi.all(mapped).apply((containerGroups) =>
      utils.collect(containerGroups, (cg) => {
        if (cg === undefined) {
          return [];
        }
        return utils.choose(
          cg,
          ({
            containerName,
            tgArn,
            tgPort,
          }): aws.types.output.ecs.ServiceLoadBalancer | undefined => {
            if (tgArn === undefined || tgPort === undefined) {
              return undefined;
            }
            return {
              containerName,
              containerPort: tgPort,
              targetGroupArn: tgArn,
            };
          },
        );
      }),
    );
  });
}
