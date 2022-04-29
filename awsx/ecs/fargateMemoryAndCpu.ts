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

function* range(low: number, high: number) {
  for (let i = low; i <= high; i++) {
    yield i;
  }
}

function fargateCost({ vcpu, memGB }: { vcpu: number; memGB: number }) {
  return 0.04048 * vcpu + 0.004445 * memGB;
}

function* cpuMemoryConfigs({ vcpu, memGBs }: { vcpu: number; memGBs: Iterable<number> }) {
  for (const memGB of memGBs) {
    yield { vcpu, memGB, cost: fargateCost({ vcpu, memGB }) };
  }
}

/**
 * Gets the list of all supported fargate configs.  We'll compute the amount of memory/vcpu
 * needed by the containers and we'll return the cheapest fargate config that supplies at
 * least that much memory/vcpu.
 */
function fargateConfigsByPriceAscending() {
  // from https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
  // Supported task CPU and memory values for Fargate tasks are as follows.
  const allConfigs = [
    ...cpuMemoryConfigs({ vcpu: 0.25, memGBs: [0.5, 1, 2] }),
    ...cpuMemoryConfigs({ vcpu: 0.5, memGBs: range(1, 4) }),
    ...cpuMemoryConfigs({ vcpu: 1, memGBs: range(2, 8) }),
    ...cpuMemoryConfigs({ vcpu: 2, memGBs: range(4, 16) }),
    ...cpuMemoryConfigs({ vcpu: 4, memGBs: range(8, 30) }),
  ];
  allConfigs.sort((c1, c2) => c1.cost - c2.cost);
  return allConfigs;
}

type FargateContainerMemoryAndCpu = {
  cpu?: number;
  memory?: number;
  memoryReservation?: number;
};

export function calculateFargateMemoryAndCPU(containers: FargateContainerMemoryAndCpu[]) {
  // First, determine how much VCPU/GB that the user is asking for in their containers.
  let { requestedVCPU, requestedGB } = getRequestedVCPUandMemory(containers);

  // Max CPU that can be requested is only 4.  Don't exceed that.  No need to worry about a
  // min as we're finding the first config that provides *at least* this amount.
  requestedVCPU = Math.min(requestedVCPU, 4);

  // Max memory that can be requested is only 30.  Don't exceed that.  No need to worry about
  // a min as we're finding the first config that provides *at least* this amount.
  requestedGB = Math.min(requestedGB, 30);

  // Get all configs that can at least satisfy this pair of cpu/memory needs.
  const config = fargateConfigsByPriceAscending().find(
    (c) => c.vcpu >= requestedVCPU && c.memGB >= requestedGB,
  );

  if (config === undefined) {
    throw new Error(
      `Could not find fargate config that could satisfy: ${requestedVCPU} vCPU and ${requestedGB}GB.`,
    );
  }

  // Want to return docker CPU units, not vCPU values. From AWS:
  //
  // You can determine the number of CPU units that are available per Amazon EC2 instance type by multiplying the
  // number of vCPUs listed for that instance type on the Amazon EC2 Instances detail page by 1,024.
  //
  // We return `memory` in MB units because that appears to be how AWS normalized these internally so this avoids
  // refresh issues.
  return { memory: `${config.memGB * 1024}`, cpu: `${config.vcpu * 1024}` };

  // local functions.
}

function getRequestedVCPUandMemory(containers: FargateContainerMemoryAndCpu[]) {
  // Sum the requested memory and CPU for each container in the task.
  //
  // Memory is in MB, and CPU values are in CPU shares.
  let minTaskMemoryMB = 0;
  let minTaskCPUUnits = 0;
  for (const containerDef of containers) {
    if (containerDef.memoryReservation) {
      minTaskMemoryMB += containerDef.memoryReservation;
    } else if (containerDef.memory) {
      minTaskMemoryMB += containerDef.memory;
    }

    if (containerDef.cpu) {
      minTaskCPUUnits += containerDef.cpu;
    }
  }

  // Convert docker cpu units values into vcpu values.  i.e. 256->.25, 4096->4.
  const requestedVCPU = minTaskCPUUnits / 1024;

  // Convert memory into GB values.  i.e. 2048MB -> 2GB.
  const requestedGB = minTaskMemoryMB / 1024;

  return { requestedVCPU, requestedGB };
}
