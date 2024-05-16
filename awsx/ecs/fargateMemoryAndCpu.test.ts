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

import { calculateFargateMemoryAndCPU, maxMemGB, maxVCPU } from "./fargateMemoryAndCpu";

describe("max vcpu and memory", () => {
  it("max cpu", async () => {
    expect(maxVCPU).toBeGreaterThanOrEqual(16);
  });

  it("max memory", async () => {
    expect(maxMemGB).toBeGreaterThanOrEqual(120);
  });

  it("can request valid exact values", async () => {
    const memCpu = calculateFargateMemoryAndCPU([
      {
        cpu: 8192, // 8 vcpu * 1024
        memory: 20480, // 20 GB * 1024
      },
    ]);
    expect(memCpu.cpu).toEqual("8192");
    expect(memCpu.memory).toEqual("20480");
  });

  it("can request valid approximate values", async () => {
    const memCpu = calculateFargateMemoryAndCPU([
      {
        cpu: 8000, // will be rounded up to 8 vcpu * 1024
        memory: 21000, // will be rounded up to 21 GB = 21,504 MB.
        // TODO,tkappler this doesn't seem correct as Fargate memory for this CPU range can
        // only be requested "Between 16 GB and 4 GB increments" so it should probably be
        // rounded up to 24 GB.
        // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
      },
    ]);
    expect(memCpu.cpu).toEqual("8192");
    expect(memCpu.memory).toEqual("21504");
  });

  it("does not throw error if containers request exactly the maximum resources fargate allows", async () => {
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
  it("throws error if containers request more resources than fargate allows", async () => {
    expect(() => {
      calculateFargateMemoryAndCPU([
        {
          cpu: 16 * 1024,
          memory: 120 * 1024,
        },
        {
          cpu: 16 * 1024,
          memory: 120 * 1024,
        },
      ]);
    }).toThrowError(
      `Requested resources exceed the maximum allowed for Fargate. Requested: 32 vCPU and 240GB. Max: ${maxVCPU} vCPU and ${maxMemGB}GB.`,
    );
  });
  it("throws error if containers request more CPU than fargate allows", async () => {
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
  it("throws error if containers requests more memory than fargate allows", async () => {
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
