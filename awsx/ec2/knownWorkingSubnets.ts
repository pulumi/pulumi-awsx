// Copyright 2016-2023, Pulumi Corporation.
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

import { SubnetSpecInputs } from "../schema-types";

export const knownWorkingSubnets: {
  result: string[];
  subnetSpecs: SubnetSpecInputs[];
  vpcCidr: string;
}[] = [
  {
    result: ["10.0.0.0/21", "10.0.8.0/22"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Isolated",
      },
      {
        cidrMask: 21,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/18"],
    subnetSpecs: [
      {
        cidrMask: 18,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/22"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/27", "10.0.0.32/27", "10.0.128.32/17"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Isolated",
      },
      {
        cidrMask: 27,
        type: "Public",
      },
      {
        cidrMask: 17,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/25", "10.0.0.128/27"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Public",
      },
      {
        cidrMask: 27,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/21", "10.0.64.0/18", "10.0.128.0/22"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Isolated",
      },
      {
        cidrMask: 21,
        type: "Private",
      },
      {
        cidrMask: 18,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/27"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/19"],
    subnetSpecs: [
      {
        cidrMask: 19,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/24", "10.0.1.0/27"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Isolated",
      },
      {
        cidrMask: 24,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/19"],
    subnetSpecs: [
      {
        cidrMask: 19,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/19", "10.0.32.0/25", "10.0.40.0/21"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Isolated",
      },
      {
        cidrMask: 21,
        type: "Isolated",
      },
      {
        cidrMask: 19,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/25", "10.0.64.0/18", "10.0.128.0/20"],
    subnetSpecs: [
      {
        cidrMask: 20,
        type: "Isolated",
      },
      {
        cidrMask: 25,
        type: "Public",
      },
      {
        cidrMask: 18,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/19"],
    subnetSpecs: [
      {
        cidrMask: 19,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/21"],
    subnetSpecs: [
      {
        cidrMask: 21,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/20"],
    subnetSpecs: [
      {
        cidrMask: 20,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/19"],
    subnetSpecs: [
      {
        cidrMask: 19,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/18"],
    subnetSpecs: [
      {
        cidrMask: 18,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/23"],
    subnetSpecs: [
      {
        cidrMask: 23,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/25", "10.0.8.0/21", "10.0.16.0/24", "10.0.24.0/21", "10.0.32.0/25"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Private",
      },
      {
        cidrMask: 21,
        type: "Private",
      },
      {
        cidrMask: 25,
        type: "Isolated",
      },
      {
        cidrMask: 24,
        type: "Public",
      },
      {
        cidrMask: 21,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/25"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/22"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/26"],
    subnetSpecs: [
      {
        cidrMask: 26,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/25"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/26"],
    subnetSpecs: [
      {
        cidrMask: 26,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/26", "10.0.8.0/21", "10.0.16.0/25", "10.0.24.0/21"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Isolated",
      },
      {
        cidrMask: 21,
        type: "Isolated",
      },
      {
        cidrMask: 26,
        type: "Public",
      },
      {
        cidrMask: 21,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/24"],
    subnetSpecs: [
      {
        cidrMask: 24,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/25", "10.0.32.0/19", "10.0.64.0/19", "10.0.96.0/25"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Private",
      },
      {
        cidrMask: 19,
        type: "Private",
      },
      {
        cidrMask: 19,
        type: "Private",
      },
      {
        cidrMask: 25,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/23", "10.0.2.0/25", "10.0.3.0/24"],
    subnetSpecs: [
      {
        cidrMask: 23,
        type: "Public",
      },
      {
        cidrMask: 25,
        type: "Isolated",
      },
      {
        cidrMask: 24,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/20",
  },
  {
    result: ["10.0.0.0/27", "10.0.4.0/22", "10.0.8.0/24"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Private",
      },
      {
        cidrMask: 22,
        type: "Private",
      },
      {
        cidrMask: 24,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/27"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/18", "10.0.64.0/27", "10.0.96.0/19", "10.0.128.0/25"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Public",
      },
      {
        cidrMask: 18,
        type: "Private",
      },
      {
        cidrMask: 19,
        type: "Public",
      },
      {
        cidrMask: 25,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/23"],
    subnetSpecs: [
      {
        cidrMask: 23,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/20",
  },
  {
    result: ["10.0.0.0/20"],
    subnetSpecs: [
      {
        cidrMask: 20,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/17", "10.0.128.0/18"],
    subnetSpecs: [
      {
        cidrMask: 17,
        type: "Public",
      },
      {
        cidrMask: 18,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/17"],
    subnetSpecs: [
      {
        cidrMask: 17,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/22", "10.0.4.0/27"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Public",
      },
      {
        cidrMask: 27,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/26", "10.0.0.64/26"],
    subnetSpecs: [
      {
        cidrMask: 26,
        type: "Private",
      },
      {
        cidrMask: 26,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/20",
  },
  {
    result: ["10.0.0.0/22", "10.0.4.0/23", "10.0.12.0/21"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Public",
      },
      {
        cidrMask: 23,
        type: "Isolated",
      },
      {
        cidrMask: 21,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/21"],
    subnetSpecs: [
      {
        cidrMask: 21,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/24", "10.0.2.0/23", "10.0.4.0/26", "10.0.4.64/27"],
    subnetSpecs: [
      {
        cidrMask: 24,
        type: "Private",
      },
      {
        cidrMask: 27,
        type: "Isolated",
      },
      {
        cidrMask: 26,
        type: "Public",
      },
      {
        cidrMask: 23,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/26"],
    subnetSpecs: [
      {
        cidrMask: 26,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/27"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/21",
  },
  {
    result: ["10.0.0.0/24"],
    subnetSpecs: [
      {
        cidrMask: 24,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/26"],
    subnetSpecs: [
      {
        cidrMask: 26,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/25",
  },
  {
    result: ["10.0.0.0/24", "10.0.1.0/25"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Isolated",
      },
      {
        cidrMask: 24,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/24"],
    subnetSpecs: [
      {
        cidrMask: 24,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/21",
  },
  {
    result: ["10.0.0.0/19"],
    subnetSpecs: [
      {
        cidrMask: 19,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/26", "10.0.0.64/27"],
    subnetSpecs: [
      {
        cidrMask: 26,
        type: "Public",
      },
      {
        cidrMask: 27,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/20"],
    subnetSpecs: [
      {
        cidrMask: 20,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/26", "10.0.2.0/23"],
    subnetSpecs: [
      {
        cidrMask: 26,
        type: "Public",
      },
      {
        cidrMask: 23,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/24", "10.0.1.0/25"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Public",
      },
      {
        cidrMask: 24,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/21"],
    subnetSpecs: [
      {
        cidrMask: 21,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/23"],
    subnetSpecs: [
      {
        cidrMask: 23,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/22",
  },
  {
    result: ["10.0.0.0/24", "10.0.32.0/19"],
    subnetSpecs: [
      {
        cidrMask: 24,
        type: "Isolated",
      },
      {
        cidrMask: 19,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/24"],
    subnetSpecs: [
      {
        cidrMask: 24,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/22",
  },
  {
    result: ["10.0.0.0/24"],
    subnetSpecs: [
      {
        cidrMask: 24,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/21",
  },
  {
    result: ["10.0.0.0/27"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/18"],
    subnetSpecs: [
      {
        cidrMask: 18,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/27", "10.0.0.64/26"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Isolated",
      },
      {
        cidrMask: 26,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/23",
  },
  {
    result: ["10.0.0.0/22"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/20", "10.0.16.0/25"],
    subnetSpecs: [
      {
        cidrMask: 20,
        type: "Public",
      },
      {
        cidrMask: 25,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/19", "10.0.32.0/21", "10.0.48.0/20"],
    subnetSpecs: [
      {
        cidrMask: 19,
        type: "Public",
      },
      {
        cidrMask: 21,
        type: "Isolated",
      },
      {
        cidrMask: 20,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/20"],
    subnetSpecs: [
      {
        cidrMask: 20,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/25", "10.0.0.128/27", "10.0.1.128/24"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Private",
      },
      {
        cidrMask: 27,
        type: "Public",
      },
      {
        cidrMask: 24,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/22"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/24", "10.0.1.0/27"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Isolated",
      },
      {
        cidrMask: 24,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/20",
  },
  {
    result: ["10.0.0.0/19"],
    subnetSpecs: [
      {
        cidrMask: 19,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/26", "10.0.0.64/26"],
    subnetSpecs: [
      {
        cidrMask: 26,
        type: "Isolated",
      },
      {
        cidrMask: 26,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/25",
  },
  {
    result: ["10.0.0.0/22"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/21",
  },
  {
    result: ["10.0.0.0/25", "10.0.32.0/19"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Private",
      },
      {
        cidrMask: 19,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/22", "10.0.4.0/26", "10.0.4.128/25"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Private",
      },
      {
        cidrMask: 26,
        type: "Public",
      },
      {
        cidrMask: 25,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/18"],
    subnetSpecs: [
      {
        cidrMask: 18,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/24", "10.0.1.0/26", "10.0.1.64/26"],
    subnetSpecs: [
      {
        cidrMask: 26,
        type: "Isolated",
      },
      {
        cidrMask: 24,
        type: "Private",
      },
      {
        cidrMask: 26,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/22", "10.0.4.0/22"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Isolated",
      },
      {
        cidrMask: 22,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/24", "10.0.1.0/27"],
    subnetSpecs: [
      {
        cidrMask: 24,
        type: "Private",
      },
      {
        cidrMask: 27,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/26"],
    subnetSpecs: [
      {
        cidrMask: 26,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/25",
  },
  {
    result: ["10.0.0.0/27"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/19", "10.0.32.0/23", "10.0.96.0/18"],
    subnetSpecs: [
      {
        cidrMask: 23,
        type: "Isolated",
      },
      {
        cidrMask: 18,
        type: "Isolated",
      },
      {
        cidrMask: 19,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/22"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/26", "10.0.0.64/26", "10.0.0.128/25"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Isolated",
      },
      {
        cidrMask: 26,
        type: "Private",
      },
      {
        cidrMask: 26,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/21",
  },
  {
    result: ["10.0.0.0/23"],
    subnetSpecs: [
      {
        cidrMask: 23,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/19",
  },
  {
    result: ["10.0.0.0/24", "10.0.1.0/25"],
    subnetSpecs: [
      {
        cidrMask: 24,
        type: "Public",
      },
      {
        cidrMask: 25,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/22",
  },
  {
    result: ["10.0.0.0/26", "10.0.4.0/22", "10.0.32.0/20"],
    subnetSpecs: [
      {
        cidrMask: 26,
        type: "Private",
      },
      {
        cidrMask: 22,
        type: "Private",
      },
      {
        cidrMask: 20,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/20", "10.0.16.0/24"],
    subnetSpecs: [
      {
        cidrMask: 20,
        type: "Private",
      },
      {
        cidrMask: 24,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/25"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/22"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/27"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/21",
  },
  {
    result: ["10.0.0.0/21"],
    subnetSpecs: [
      {
        cidrMask: 21,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/21", "10.0.8.0/26"],
    subnetSpecs: [
      {
        cidrMask: 21,
        type: "Private",
      },
      {
        cidrMask: 26,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/23"],
    subnetSpecs: [
      {
        cidrMask: 23,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/21",
  },
  {
    result: ["10.0.0.0/21"],
    subnetSpecs: [
      {
        cidrMask: 21,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/23"],
    subnetSpecs: [
      {
        cidrMask: 23,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/21"],
    subnetSpecs: [
      {
        cidrMask: 21,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/17",
  },
  {
    result: ["10.0.0.0/25"],
    subnetSpecs: [
      {
        cidrMask: 25,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/20", "10.0.128.0/17", "10.1.0.0/26"],
    subnetSpecs: [
      {
        cidrMask: 20,
        type: "Private",
      },
      {
        cidrMask: 26,
        type: "Isolated",
      },
      {
        cidrMask: 17,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/19", "10.0.32.0/19", "10.0.64.0/27", "10.0.72.0/21"],
    subnetSpecs: [
      {
        cidrMask: 19,
        type: "Private",
      },
      {
        cidrMask: 19,
        type: "Private",
      },
      {
        cidrMask: 27,
        type: "Isolated",
      },
      {
        cidrMask: 21,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/18",
  },
  {
    result: ["10.0.0.0/22", "10.0.4.0/25", "10.0.4.128/25"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Private",
      },
      {
        cidrMask: 25,
        type: "Isolated",
      },
      {
        cidrMask: 25,
        type: "Public",
      },
    ],
    vpcCidr: "10.0.0.0/21",
  },
  {
    result: ["10.0.0.0/22", "10.0.32.0/19"],
    subnetSpecs: [
      {
        cidrMask: 22,
        type: "Isolated",
      },
      {
        cidrMask: 19,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/25", "10.0.1.0/24", "10.0.2.0/27", "10.0.2.128/25"],
    subnetSpecs: [
      {
        cidrMask: 27,
        type: "Public",
      },
      {
        cidrMask: 25,
        type: "Public",
      },
      {
        cidrMask: 25,
        type: "Private",
      },
      {
        cidrMask: 24,
        type: "Private",
      },
    ],
    vpcCidr: "10.0.0.0/16",
  },
  {
    result: ["10.0.0.0/26"],
    subnetSpecs: [
      {
        cidrMask: 26,
        type: "Isolated",
      },
    ],
    vpcCidr: "10.0.0.0/20",
  },
  {
    vpcCidr: "10.1.0.0/18",
    subnetSpecs: [
      {
        type: "Private",
      },
      {
        type: "Public",
      },
      {
        type: "Isolated",
      },
      {
        type: "Isolated",
      },
    ],
    result: ["10.1.0.0/19", "10.1.32.0/20", "10.1.48.0/24", "10.1.49.0/24"],
  },
];
