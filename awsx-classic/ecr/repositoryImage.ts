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

import * as pulumi from "@pulumi/pulumi";

import * as ecs from "../ecs";
import { Repository } from "./repository";

/**
 * A simple pair of a [Repository] and a built docker image that was pushed to it.  This can
 * be passed in as the `image: repoImage` value to an `ecs.Container`.
 */
export class RepositoryImage implements ecs.ContainerImageProvider {
    public readonly repository: Repository;
    public readonly imageValue: pulumi.Input<string>;

    constructor(repository: Repository, image: pulumi.Input<string>) {
        this.repository = repository;
        this.imageValue = image;
    }

    public image = () => this.imageValue;
    public environment = () => [];
}
