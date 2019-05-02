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
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

import { computeImageFromAsset } from "../ecs";
import { LifecyclePolicy, LifecyclePolicyArgs } from "./lifecyclePolicy";
import { RepositoryImage } from "./repositoryImage";

/**
 * A [Repository] represents an [aws.ecr.Repository] along with an associated [LifecyclePolicy]
 * controlling how images are retained in the repo.
 *
 * Docker images can be built and pushed to the repo using the [buildAndPushImage] method.  This
 * will call into the `@pulumi/docker/buildAndPushImage` function using this repo as the appropriate
 * destination registry.
 */
export class Repository extends pulumi.ComponentResource {
    public readonly repository: aws.ecr.Repository;
    public readonly lifecyclePolicy: aws.ecr.LifecyclePolicy | undefined;

    constructor(name: string, args: RepositoryArgs = {}, opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:ecr:Repository", name, undefined, opts);

        const parentOpts = { parent: this };

        const lowerCaseName = name.toLowerCase();

        this.repository = args.repository || new aws.ecr.Repository(lowerCaseName, args, parentOpts);
        this.lifecyclePolicy = new LifecyclePolicy(lowerCaseName, this.repository, args.lifeCyclePolicyArgs, parentOpts);

        this.registerOutputs();
    }

    /**
     * Builds the docker container specified by [pathOrBuild] and pushes it to this repository.
     * The result is the unique ID pointing to that pushed image in this repo.  This unique ID
     * can be passed as the value to `image: repo.buildAndPushImage(...)` in an `ecs.Container`.
     */
    public buildAndPushImage(pathOrBuild: pulumi.Input<string | docker.DockerBuild>) {
        const { repositoryUrl, registryId } = this.repository;

        return pulumi.all([pathOrBuild, repositoryUrl, registryId])
                     .apply(([pathOrBuild, repositoryUrl, registryId]) =>
                        computeImageFromAsset(pathOrBuild, repositoryUrl, registryId, this));
    }
}

/**
 * Creates a new [Repository] (optionally configured using [args]), builds the docker container
 * specified by [pathOrBuild] and then pushes the built image to the repository.  The result
 * contains both the Repository created as well as the unique ID referencing the built image in that
 * repo.  This result type can be passed in as `image: ecr.buildAndPushImage(...)` for an
 * `ecs.Container`
 */
export function buildAndPushImage(
    name: string, pathOrBuild: pulumi.Input<string | docker.DockerBuild>, args?: RepositoryArgs, opts?: pulumi.ComponentResourceOptions) {

    const repo = new Repository(name, args, opts);
    const image = repo.buildAndPushImage(pathOrBuild);
    return new RepositoryImage(repo, image);
}

export interface RepositoryArgs {
    /**
     * Underlying repository.  If not provided, a new one will be created on your behalf.
     */
    repository?: aws.ecr.Repository;

    /**
     * A mapping of tags to assign to the resource.
     */
    tags?: pulumi.Input<Record<string, any>>;

    /**
     * The arguments controlling the [LifecyclePolicy] for this [Repository].  If `undefined`, a default one will be
     * created using `LifecyclePolicy.getDefaultLifecyclePolicyArgs`.
     */
    lifeCyclePolicyArgs?: LifecyclePolicyArgs;
}
