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
import * as pulumi from '@pulumi/pulumi';
import { InputPropertyErrorDetails } from '@pulumi/pulumi';

export type FargateContainerMemoryAndCpu = {
  cpu?: number;
  memory?: number;
  memoryReservation?: number;
};

export interface FargateTaskMemoryAndCpu {
  /**
   * CPU units allocated to the task.
   */
  cpu: number;

  /**
   * Memory in MiB allocated to the task.
   */
  memory: number;
}

/**
 * Estimates the hourly Fargate cost of a task configuration.
 *
 * @param config The task CPU and memory configuration.
 * @param config.cpu The task CPU units.
 * @param config.memory The task memory in MiB.
 * @returns The estimated hourly cost.
 */
function fargateCost({ cpu, memory }: FargateTaskMemoryAndCpu): number {
  const vcpu = cpu / 1024;
  const memGB = memory / 1024;
  return 0.04048 * vcpu + 0.004445 * memGB;
}

/**
 * Generates an inclusive sequence of numbers.
 *
 * @param low The first value.
 * @param high The last value.
 * @param step The increment between values.
 * @returns The generated number sequence.
 */
function* rangeWithStep(low: number, high: number, step: number): Generator<number> {
  for (let value = low; value <= high; value += step) {
    yield value;
  }
}

/**
 * Creates task configurations for one CPU value.
 *
 * @param cpu The task CPU units.
 * @param memoryValues The supported memory values.
 * @returns The task configurations.
 */
function taskConfigurations(
  cpu: number,
  memoryValues: Iterable<number>,
): FargateTaskMemoryAndCpu[] {
  return Array.from(memoryValues, (memory) => ({ cpu, memory }));
}

// From https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
// Memory values are in MiB and CPU values are in CPU units.
const validFargateTaskConfigurations: FargateTaskMemoryAndCpu[] = [
  ...taskConfigurations(256, [512, 1024, 2048]),
  ...taskConfigurations(512, rangeWithStep(1024, 4096, 1024)),
  ...taskConfigurations(1024, rangeWithStep(2048, 8192, 1024)),
  ...taskConfigurations(2048, rangeWithStep(4096, 16384, 1024)),
  ...taskConfigurations(4096, rangeWithStep(8192, 30720, 1024)),
  ...taskConfigurations(8192, rangeWithStep(16384, 61440, 4096)),
  ...taskConfigurations(16384, rangeWithStep(32768, 122880, 8192)),
  ...taskConfigurations(32768, [61440, 122880, 249856]),
  // oxlint-disable-next-line unicorn/no-array-sort -- The bundled AWSX provider targets Node.js 16.
].sort((left, right) => {
  const costDifference = fargateCost(left) - fargateCost(right);
  return costDifference || left.cpu - right.cpu || left.memory - right.memory;
});

// These exports preserve the existing public contract used by tests and callers.
export const maxVCPU =
  Math.max(...validFargateTaskConfigurations.map((config) => config.cpu)) / 1024;
export const maxMemGB =
  Math.max(...validFargateTaskConfigurations.map((config) => config.memory)) / 1024;

interface RequiredFargateTaskResources {
  cpu: number;
  memory: number;
}

/**
 * Calculates the total resources requested by the containers.
 *
 * @param containers The container resource requirements.
 * @returns The required task resources.
 */
function getRequiredFargateTaskResources(
  containers: FargateContainerMemoryAndCpu[],
): RequiredFargateTaskResources {
  let cpu = 0;
  let memory = 0;

  for (const container of containers) {
    memory += container.memoryReservation ?? container.memory ?? 0;
    cpu += container.cpu ?? 0;
  }

  return { cpu, memory };
}

/**
 * Finds a valid task configuration that satisfies the requested resources.
 *
 * @param required The minimum required resources.
 * @param cpu The optional exact CPU value.
 * @param memory The optional exact memory value.
 * @returns A matching configuration, if one exists.
 */
function findFargateTaskConfiguration(
  required: RequiredFargateTaskResources,
  cpu?: number,
  memory?: number,
): FargateTaskMemoryAndCpu | undefined {
  return validFargateTaskConfigurations.find(
    (candidate) =>
      (cpu === undefined || candidate.cpu === cpu) &&
      (memory === undefined || candidate.memory === memory) &&
      candidate.cpu >= required.cpu &&
      candidate.memory >= required.memory,
  );
}

/**
 * Resolve and validate the task-level CPU and memory for a Fargate task.
 *
 * Explicit values are preserved. Missing values are selected from the valid Fargate configurations
 * so that the task can satisfy all container-level reservations.
 *
 * @param containers The containers whose resource requirements must be satisfied.
 * @param cpu The optional explicit number of CPU units for the task.
 * @param memory The optional explicit amount of task memory in MiB.
 * @returns A valid task-level CPU and memory configuration.
 */
export function resolveFargateTaskMemoryAndCpu(
  containers: FargateContainerMemoryAndCpu[],
  cpu?: number,
  memory?: number,
): FargateTaskMemoryAndCpu {
  const required = getRequiredFargateTaskResources(containers);
  const errors: InputPropertyErrorDetails[] = [];

  if (cpu !== undefined && !validFargateTaskConfigurations.some((c) => c.cpu === cpu)) {
    errors.push({
      propertyPath: 'cpu',
      reason: `Unsupported Fargate task CPU value: ${cpu}.`,
    });
  }
  if (memory !== undefined && !validFargateTaskConfigurations.some((c) => c.memory === memory)) {
    errors.push({
      propertyPath: 'memory',
      reason: `Unsupported Fargate task memory value: ${memory} MiB.`,
    });
  }
  if (cpu !== undefined && cpu < required.cpu) {
    errors.push({
      propertyPath: 'cpu',
      reason: `Fargate task CPU ${cpu} is less than the ${required.cpu} CPU units requested by its containers.`,
    });
  }
  if (memory !== undefined && memory < required.memory) {
    errors.push({
      propertyPath: 'memory',
      reason: `Fargate task memory ${memory} MiB is less than the ${required.memory} MiB requested by its containers.`,
    });
  }

  if (errors.length > 0) {
    throw new pulumi.InputPropertiesError({
      errors,
      message: 'Invalid cpu and memory configuration',
    });
  }

  const configuration = findFargateTaskConfiguration(required, cpu, memory);
  if (configuration) {
    return configuration;
  }

  const requested = [
    cpu === undefined ? undefined : `${cpu} CPU units`,
    memory === undefined ? undefined : `${memory} MiB memory`,
  ]
    .filter((value): value is string => value !== undefined)
    .join(' and ');
  if (requested) {
    throw new Error(`The requested Fargate task configuration (${requested}) is not valid.`);
  }
  throw new Error(
    `No Fargate task configuration can satisfy the ${required.cpu} CPU units and ${required.memory} MiB requested by its containers.`,
  );
}

/**
 * Calculate the smallest valid Fargate configuration for the containers.
 *
 * This function preserves the existing string output contract. New callers that need explicit task
 * resource validation should use `resolveFargateTaskMemoryAndCpu`.
 *
 * @param containers The containers whose resource requirements must be satisfied.
 * @returns The smallest valid task CPU and memory as ECS-compatible strings.
 */
export function calculateFargateMemoryAndCPU(containers: FargateContainerMemoryAndCpu[]): {
  cpu: string;
  memory: string;
} {
  const required = getRequiredFargateTaskResources(containers);
  const requestedVCPU = required.cpu / 1024;
  const requestedGB = required.memory / 1024;

  if (requestedVCPU > maxVCPU || requestedGB > maxMemGB) {
    throw new Error(
      `Requested resources exceed the maximum allowed for Fargate. Requested: ${requestedVCPU} vCPU and ${requestedGB}GB. Max: ${maxVCPU} vCPU and ${maxMemGB}GB.`,
    );
  }

  const configuration = findFargateTaskConfiguration(required);
  if (!configuration) {
    throw new Error(
      `Could not find fargate config that could satisfy: ${requestedVCPU} vCPU and ${requestedGB}GB.`,
    );
  }

  return {
    cpu: `${configuration.cpu}`,
    memory: `${configuration.memory}`,
  };
}
