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

import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import * as schema from "../schema-types";
import { getDockerCredentials } from "./auth";

export class RegistryImage extends schema.RegistryImage {
  constructor(
    name: string,
    args: schema.RegistryImageArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(name, args, opts);

    const creds = pulumi
      .output(args.repositoryUrl)
      .apply((url) => getDockerCredentials({ registryUrl: url }, { parent: this }));
    const provider = new docker.Provider(name, {
      registryAuth: [creds],
    });

    // tag the source image in the form of <repositoryUrl>:<tag>
    // we explicitly look up the source image in order to trigger a push whenever the source image changes
    const sourceImage = docker.getRemoteImageOutput(
      { name: args.sourceImage },
      { parent: this, provider },
    );
    const tagName = args.tag
      ? pulumi.output(args.tag)
      : pulumi.output(args.sourceImage).apply((image) => parseImageTag(image));
    const tag = new docker.Tag(
      name,
      {
        sourceImage: sourceImage.id,
        targetImage: pulumi.interpolate`${args.repositoryUrl}:${tagName}`,
      },
      { parent: this, provider },
    );

    this.image = new docker.RegistryImage(
      name,
      {
        ...args,
        name: tag.targetImage,
        triggers: {
          ...args.triggers,
          // trigger a push whenever the source image changes
          "@pulumi/awsx/internal/sourceImage": sourceImage.id,
        },
      },
      { parent: this, provider },
    );
  }
}

export function parseImageTag(str: string): string {
  // Check if the string is a sha256 digest (starts with "sha256:" followed by 64 hex characters)
  if (/^sha256:[a-f0-9]{64}$/i.test(str)) {
    return "latest";
  }

  const parts = str.split(":");
  if (parts.length < 2) {
    // if there is no tag, use the latest tag
    return "latest";
  }

  // the tag is the last part of the image, tags are not allowed to contain colons so we can just take the last part
  return parts[parts.length - 1];
}
