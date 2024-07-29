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

// Functions in module do not attempt any semantic processing and are simply helping the VPC resource translate
// information between similar but distinct Input/Output forms. There might be an opportunity to use output tricks to
// simplify these.

import * as pulumi from "@pulumi/pulumi";
import * as schema from "../schema-types";

export function toResolvedSubnetSpecOutputs(s: schema.SubnetSpecInputs[]): schema.ResolvedSubnetSpecOutputs[] {
  return s.map(convSubnetSpecInputsToResolvedSubnetSpecOutputs);
}

function convSubnetSpecInputsToResolvedSubnetSpecOutputs(s: schema.SubnetSpecInputs): schema.ResolvedSubnetSpecOutputs {
  return {
    name: s.name ? pulumi.output(s.name) : undefined,
    cidrBlocks: s.cidrBlocks ? pulumi.output(s.cidrBlocks) : undefined,
    cidrMask: s.cidrMask ? pulumi.output(s.cidrMask) : undefined,
    size: s.size ? pulumi.output(s.size) : undefined,
    type: pulumi.output(s.type),
  };
}
