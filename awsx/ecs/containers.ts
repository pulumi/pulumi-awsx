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
export function computeContainerDefinitions(
  parent: pulumi.Resource,
  containers: Record<string, schema.TaskDefinitionContainerDefinitionInputs>,
  logGroupId: pulumi.Input<LogGroupId> | undefined,
): pulumi.Output<schema.TaskDefinitionContainerDefinitionInputs[]> {
  const result: pulumi.Output<schema.TaskDefinitionContainerDefinitionInputs>[] = [];

  for (const containerName of Object.keys(containers)) {
    const container = containers[containerName];

    result.push(computeContainerDefinition(parent, containerName, container, logGroupId));
  }

  return pulumi.all(result);
}

function computeContainerDefinition(
  parent: pulumi.Resource,
  containerName: string,
  container: schema.TaskDefinitionContainerDefinitionInputs,
  logGroupId: pulumi.Input<LogGroupId> | undefined,
): pulumi.Output<schema.TaskDefinitionContainerDefinitionInputs> {
  const resolvedMappings = container.portMappings
    ? pulumi.output(container.portMappings).apply((portMappings) =>
        portMappings.map((mappingInput) => {
          return pulumi
            .output(mappingInput.targetGroup?.port)
            .apply((tgPort): schema.TaskDefinitionPortMappingInputs => {
              return {
                containerPort: mappingInput.containerPort ?? tgPort ?? mappingInput.hostPort,
                hostPort: mappingInput.hostPort ?? tgPort ?? mappingInput.containerPort,
                protocol: mappingInput.protocol,
              };
            });
        }),
      )
    : undefined;
  const region = utils.getRegion(parent);
  return pulumi
    .all([container, resolvedMappings, region, logGroupId])
    .apply(([container, portMappings, region, logGroupId]) => {
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

/** @internal */
export function computeLoadBalancers(
  containers: Record<string, schema.TaskDefinitionContainerDefinitionInputs>,
): pulumi.Output<aws.types.output.ecs.ServiceLoadBalancer[]> {
  const mappedContainers = Object.entries(containers).map(
    ([containerName, containerDefinition]) => {
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
    },
  );
  return pulumi.all(mappedContainers).apply((containerGroups) =>
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
}
