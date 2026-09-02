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

import {
  calculateFargateMemoryAndCPU,
  maxMemGB,
  maxVCPU,
  resolveFargateTaskMemoryAndCpu,
} from '../../../src/ecs/fargate/memoryAndCpu';
import { describe, expect, test } from 'vitest';

/**
 * Verifies that an action fails with the expected input-property reason.
 *
 * @param action The action expected to fail.
 * @param reason The expected validation reason.
 */
function expectInputPropertyReason(action: () => unknown, reason: string): void {
  try {
    action();
    throw new Error('Expected action to throw');
  } catch (error) {
    expect(error).toMatchObject({
      errors: expect.arrayContaining([expect.objectContaining({ reason })]),
    });
  }
}

describe('resolveFargateTaskMemoryAndCpu', () => {
  test.each([
    {
      name: 'derives both values',
      containers: [{ cpu: 300, memory: 700 }],
      cpu: undefined,
      memory: undefined,
      expected: { cpu: 512, memory: 1024 },
    },
    {
      name: 'derives memory for explicit CPU',
      containers: [{ memory: 3000 }],
      cpu: 1024,
      memory: undefined,
      expected: { cpu: 1024, memory: 3072 },
    },
    {
      name: 'derives CPU for explicit memory',
      containers: [{ cpu: 700 }],
      cpu: undefined,
      memory: 4096,
      expected: { cpu: 1024, memory: 4096 },
    },
    {
      name: 'preserves an explicit valid configuration',
      containers: [{ cpu: 256, memory: 512 }],
      cpu: 2048,
      memory: 8192,
      expected: { cpu: 2048, memory: 8192 },
    },
    {
      name: 'uses 8 GiB memory increments for 16 vCPU',
      containers: [{ cpu: 16000, memory: 33000 }],
      cpu: undefined,
      memory: undefined,
      expected: { cpu: 16384, memory: 40960 },
    },
    {
      name: 'supports 32 vCPU configurations',
      containers: [{ cpu: 17000, memory: 62000 }],
      cpu: undefined,
      memory: undefined,
      expected: { cpu: 32768, memory: 122880 },
    },
  ])('$name', ({ containers, cpu, memory, expected }) => {
    expect(resolveFargateTaskMemoryAndCpu(containers, cpu, memory)).toEqual(expected);
  });

  test('rejects an unsupported CPU value', () => {
    expectInputPropertyReason(
      () => resolveFargateTaskMemoryAndCpu([], 300, 512),
      'Unsupported Fargate task CPU value: 300.',
    );
  });

  test('rejects an invalid CPU and memory combination', () => {
    expect(() => resolveFargateTaskMemoryAndCpu([], 256, 4096)).toThrow(
      'The requested Fargate task configuration (256 CPU units and 4096 MiB memory) is not valid.',
    );
  });

  test('rejects task resources below the container requirements', () => {
    expectInputPropertyReason(
      () => resolveFargateTaskMemoryAndCpu([{ cpu: 600 }], 512),
      'Fargate task CPU 512 is less than the 600 CPU units requested by its containers.',
    );
    expectInputPropertyReason(
      () => resolveFargateTaskMemoryAndCpu([{ memoryReservation: 700 }], 512, 512),
      'Fargate task memory 512 MiB is less than the 700 MiB requested by its containers.',
    );
  });

  test('rejects container requirements above the Fargate maximum', () => {
    expect(() => resolveFargateTaskMemoryAndCpu([{ cpu: 33000, memory: 250000 }])).toThrow(
      'No Fargate task configuration can satisfy the 33000 CPU units and 250000 MiB requested by its containers.',
    );
  });
});

describe('max vcpu and memory', () => {
  test('max cpu', async () => {
    expect(maxVCPU).toBeGreaterThanOrEqual(32);
  });

  test('max memory', async () => {
    expect(maxMemGB).toBeGreaterThanOrEqual(244);
  });

  test('can request valid exact values', async () => {
    const memCpu = calculateFargateMemoryAndCPU([
      {
        cpu: 8192, // 8 vcpu * 1024
        memory: 20480, // 20 GB * 1024
      },
    ]);
    expect(memCpu.cpu).toEqual('8192');
    expect(memCpu.memory).toEqual('20480');
  });

  test('can request valid approximate values', async () => {
    const memCpu = calculateFargateMemoryAndCPU([
      {
        cpu: 8000, // will be rounded up to 8 vcpu * 1024
        memory: 21000, // will be rounded up to 24 GB because 8 vCPU uses 4 GB increments
      },
    ]);
    expect(memCpu.cpu).toEqual('8192');
    expect(memCpu.memory).toEqual('24576');
  });

  test('does not throw error if containers request exactly the maximum resources fargate allows', async () => {
    expect(() => {
      calculateFargateMemoryAndCPU([
        {
          cpu: (maxVCPU * 1024) / 2,
          memory: (maxMemGB * 1024) / 2,
        },
        {
          cpu: (maxVCPU * 1024) / 2,
          memory: (maxMemGB * 1024) / 2,
        },
      ]);
    }).not.toThrowError();
  });
  test('throws error if containers request more resources than fargate allows', async () => {
    expect(() => {
      calculateFargateMemoryAndCPU([
        {
          cpu: 17 * 1024,
          memory: 123 * 1024,
        },
        {
          cpu: 17 * 1024,
          memory: 123 * 1024,
        },
      ]);
    }).toThrowError(
      `Requested resources exceed the maximum allowed for Fargate. Requested: 34 vCPU and 246GB. Max: ${maxVCPU} vCPU and ${maxMemGB}GB.`,
    );
  });
  test('throws error if containers request more CPU than fargate allows', async () => {
    expect(() => {
      calculateFargateMemoryAndCPU([
        {
          cpu: (maxVCPU + 1) * 1024,
          memory: maxMemGB * 1024,
        },
      ]);
    }).toThrowError(
      `Requested resources exceed the maximum allowed for Fargate. Requested: ${
        maxVCPU + 1
      } vCPU and ${maxMemGB}GB. Max: ${maxVCPU} vCPU and ${maxMemGB}GB.`,
    );
  });
  test('throws error if containers requests more memory than fargate allows', async () => {
    expect(() => {
      calculateFargateMemoryAndCPU([
        {
          cpu: maxVCPU * 1024,
          memory: (maxMemGB + 1) * 1024,
        },
      ]);
    }).toThrowError(
      `Requested resources exceed the maximum allowed for Fargate. Requested: ${maxVCPU} vCPU and ${
        maxMemGB + 1
      }GB. Max: ${maxVCPU} vCPU and ${maxMemGB}GB.`,
    );
  });
});
