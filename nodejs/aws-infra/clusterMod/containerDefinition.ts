// Copyright 2016-2018, Pulumi Corporation.
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
import { RunError } from "@pulumi/pulumi/errors";
import { getAvailabilityZone } from "./aws";
import { ClusterNetworkArgs } from "./cluster";

import * as utils from "../utils";

export type ContainerDefinition = utils.Overwrite<aws.ecs.ContainerDefinition, {
    /** Not provided.  Use [imageDefinition] instead. */
    image?: never;

    imageDefinition: ImageDefinition;
}>;

// export class ContainerDefinition extends pulumi.ComponentResource {

// }