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

  const registryCredentials = getDockerCredentials(
    { repositoryUrl: repositoryUrl, registryId: inputRegistryId },
    { parent },
  );

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

  // Return the image reference without the tag. This is necessary for backwards compatibility with earlier versions of the awsx provider
  // that used pulumi-docker and in order to allow passing this output to Lambda functions (they expect an image URI without a tag).
  return image.ref.apply(removeTagFromRef);
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

/**
 * Removes the tag from the image reference.
 * @param ref The image reference to remove the tag from.
 * @returns The image reference without the tag.
 */
export function removeTagFromRef(ref: string): string {
  // Match pattern: everything up to the tag, the tag itself, and the digest
  // The image ref looks like this: ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/REPOSITORY_NAME:TAG_NAME@sha256:1234567890123456789012345678901234567890123456789012345678901234
  // Neither repository name nor tag name can contain a colon, so we can safely split on the colon and take the first part.
  const pattern = /^(.*):([^@]+)(@sha256:.+)$/;

  // If the pattern is found, return the image without the tag. I.e. only the image name and digest.
  return ref.replace(pattern, "$1$3");
}
