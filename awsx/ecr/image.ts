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
import * as docker from "@pulumi/docker-build";
import * as pulumi from "@pulumi/pulumi";
import * as schema from "../schema-types";
import * as utils from "../utils";
import { getDockerCredentials } from "./auth";

export class Image extends schema.Image {
  constructor(name: string, args: schema.ImageArgs, opts: pulumi.ComponentResourceOptions = {}) {
    super(name, args, opts);
    this.imageUri = pulumi.output(args).apply((args) => computeImageFromAsset(args, this));
  }
}

/** @internal */
export function computeImageFromAsset(
  args: pulumi.Unwrap<schema.ImageArgs>,
  parent: pulumi.Resource,
) {
  const { repositoryUrl, registryId: inputRegistryId, imageTag, ...dockerInputs } = args ?? {};

  pulumi.log.debug(`Building container image at '${JSON.stringify(dockerInputs)}'`, parent);

  const imageName = args.imageName
    ? args.imageName
    : imageTag
    ? imageTag
    : createUniqueImageName(dockerInputs);

  // Note: the tag, if provided, is included in the image name.
  const canonicalImageName = `${repositoryUrl}:${imageName}`;

  // If we haven't, build and push the local build context to the ECR repository.  Then return
  // the unique image name we pushed to.  The name will change if the image changes ensuring
  // the TaskDefinition get's replaced IFF the built image changes.

  const registryCredentials = getDockerCredentials(repositoryUrl, { parent });

  let cacheFrom: docker.types.input.CacheFromArgs[] = [];
  if (dockerInputs.cacheFrom !== undefined) {
    cacheFrom = dockerInputs.cacheFrom.map((c) => {
      return {
        registry: {
          ref: c,
        },
      };
    });
  }
  // Use an inline cache by default.
  if (cacheFrom.length === 0) {
    cacheFrom.push({ registry: { ref: canonicalImageName } });
  }

  let context = ".";
  if (dockerInputs.context !== undefined) {
    context = dockerInputs.context;
  }

  const dockerImageArgs: docker.ImageArgs = {
    tags: [canonicalImageName],
    buildArgs: dockerInputs.args,
    cacheFrom: cacheFrom,
    cacheTo: [{ inline: {} }],
    context: { location: context },
    dockerfile: { location: dockerInputs.dockerfile },
    platforms: dockerInputs.platform ? [dockerInputs.platform as docker.Platform] : [],
    target: dockerInputs.target,
    push: true,
    registries: [registryCredentials],
  };

  const image = new docker.Image(imageName, dockerImageArgs, { parent });

  image.ref.apply((ref) => {
    pulumi.log.debug(`    build complete: ${ref}`, parent);
  });

  return image.ref;
}

function createUniqueImageName(inputs: pulumi.Unwrap<schema.DockerBuildInputs>): string {
  const { context, dockerfile, args } = inputs ?? {};
  // Produce a hash of the build context and use that for the image name.
  let buildSig: string;

  buildSig = context ?? ".";
  if (dockerfile) {
    buildSig += `;dockerfile=${dockerfile}`;
  }
  if (args) {
    for (const arg of Object.keys(args)) {
      buildSig += `;arg[${arg}]=${args[arg]}`;
    }
  }

  buildSig += pulumi.getStack();
  return `${utils.sha1hash(buildSig)}-container`;
}
