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

import * as pulumi from '@pulumi/pulumi';
import { FargateTaskDefinitionV2 } from '../../../src/ecs';
import {
  PortMappingAppProtocol,
  PortMappingProtocol,
} from '../../../src/ecs/fargate/containerDefinition';
import { renderPortMappings } from '../../../src/ecs/fargate/taskDefinition';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

const resources: pulumi.runtime.MockResourceArgs[] = [];

beforeAll(async () => {
  await pulumi.runtime.setMocks({
    newResource(args) {
      resources.push(args);
      return {
        id: `${args.name}_id`,
        state: {
          ...args.inputs,
          arn: `arn:aws:mock:::${args.name}`,
          name: args.inputs.name ?? args.name,
        },
      };
    },
    call(args) {
      return args.inputs;
    },
  });
});

beforeEach(() => {
  resources.length = 0;
});

/**
 * Resolves a Pulumi output for test assertions.
 *
 * @param value The output to resolve.
 * @returns The resolved output value.
 */
function unwrap<T>(value: pulumi.Output<T>): Promise<T> {
  return new Promise((resolve) => value.apply(resolve));
}

/**
 * Finds a recorded ECS task definition resource.
 *
 * @param name The Pulumi resource name.
 * @returns The recorded resource, if it exists.
 */
function taskDefinitionResource(name: string): pulumi.runtime.MockResourceArgs | undefined {
  return resources.find(
    (resource) =>
      resource.type === 'aws:ecs/taskDefinition:TaskDefinition' && resource.name === name,
  );
}

describe('Fargate container rendering', () => {
  test('renders port mapping protocols', () => {
    expect(
      renderPortMappings([
        {
          containerPort: 8080,
          protocol: PortMappingProtocol.UDP,
          appProtocol: PortMappingAppProtocol.GRPC,
        },
      ]),
    ).toEqual([
      {
        containerPort: 8080,
        protocol: 'udp',
        appProtocol: 'grpc',
      },
    ]);
  });
});

describe('FargateTaskDefinitionV2', () => {
  test('uses map keys as container names and derives task resources', async () => {
    const task = new FargateTaskDefinitionV2('derived', {
      containers: {
        app: {
          image: 'nginx',
          cpu: 300,
          memory: 700,
        },
        sidecar: {
          image: 'busybox',
          cpu: 100,
          memoryReservation: 100,
        },
      },
    });

    await unwrap(task.taskDefinitionArn);

    const resource = taskDefinitionResource('derived-taskdef');
    expect(resource).toBeDefined();
    expect(resource!.inputs.cpu).toBe('512');
    expect(resource!.inputs.memory).toBe('1024');

    const containers = JSON.parse(resource!.inputs.containerDefinitions);
    expect(containers.map((container: { name: string }) => container.name)).toEqual([
      'app',
      'sidecar',
    ]);
    expect(containers.map((container: { image: string }) => container.image)).toEqual([
      'nginx',
      'busybox',
    ]);
  });

  test.each([20, 201, 0, 21.5])('rejects invalid ephemeral storage %s', (ephemeralStorage) => {
    expect(
      () =>
        new FargateTaskDefinitionV2('invalid-storage', {
          ephemeralStorage,
          containers: { app: { image: 'nginx' } },
        }),
    ).toThrow('ephemeralStorage must be an integer between 21 and 200');
  });

  test.each([21, 200])('accepts ephemeral storage boundary %s', async (ephemeralStorage) => {
    const task = new FargateTaskDefinitionV2(`storage-${ephemeralStorage}`, {
      ephemeralStorage,
      containers: { app: { image: 'nginx' } },
    });

    await unwrap(task.taskDefinitionArn);
    expect(
      taskDefinitionResource(`storage-${ephemeralStorage}-taskdef`)!.inputs.ephemeralStorage,
    ).toEqual({
      sizeInGib: ephemeralStorage,
    });
  });

  test('preserves an explicit valid task configuration', async () => {
    const task = new FargateTaskDefinitionV2('explicit', {
      cpu: 2048,
      memory: 8192,
      containers: {
        app: {
          image: 'nginx',
          cpu: 256,
          memory: 512,
        },
      },
    });

    await unwrap(task.taskDefinitionArn);

    const resource = taskDefinitionResource('explicit-taskdef');
    expect(resource).toBeDefined();
    expect(resource!.inputs.cpu).toBe('2048');
    expect(resource!.inputs.memory).toBe('8192');
  });
});
