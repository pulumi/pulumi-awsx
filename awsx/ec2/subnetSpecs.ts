// Copyright 2016-2024, Pulumi Corporation.
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

import { SubnetTypeInputs } from "../schema-types";

export interface SubnetSpec {
  cidrBlock: string;
  type: SubnetTypeInputs;
  azName: string;
  subnetName: string;
  assignIpv6AddressOnCreation?: boolean;
  tags?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;
}

// Like SubnetSpec, but cidrBlock may not be fully known yet. This type supports scenarios where the cidrBlock is
// allocated by IPAM and is only known after the underlying VPC provisions.
export type SubnetSpecPartial = Omit<SubnetSpec, "cidrBlock"> & { cidrBlock: pulumi.Input<string> };

// Runs check(specs) immediately if all specs are fully known, otherwise defers validation into the apply layer and
// makes sure that validation is resolved before cidrBlock fields resolve.
export function validatePartialSubnetSpecs(
  specs: SubnetSpecPartial[],
  check: (specs: SubnetSpec[]) => void,
): SubnetSpecPartial[] {
  const promptSpecs = detectPromptSubnetSpecs(specs);
  if (promptSpecs) {
    check(promptSpecs);
    return specs;
  }

  const checked: pulumi.Output<SubnetSpec[]> = pulumi.output(specs).apply((xs) => {
    check(xs);
    return xs;
  });
  return specs.map((s, index) => ({ ...s, cidrBlock: checked.apply((cs) => cs[index].cidrBlock) }));
}

function detectPromptSubnetSpecs(specs: SubnetSpecPartial[]): SubnetSpec[] | undefined {
  if (specs.every((s) => typeof s.cidrBlock === "string")) {
    return specs.map((s) => {
      const cidrBlock: string = typeof s.cidrBlock === "string" ? s.cidrBlock : "";
      return { ...s, cidrBlock };
    });
  } else {
    return undefined;
  }
}
