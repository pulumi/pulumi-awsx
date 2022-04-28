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
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import * as schema from "../schema-types";
import * as utils from "../utils";

export class Image extends schema.Image {
    constructor(
        name: string,
        args: schema.ImageArgs,
        opts: pulumi.ComponentResourceOptions = {},
    ) {
        super(name, args, opts);
        const { repositoryUrl, ...dockerArgs } = args;
        this.imageUri = pulumi
            .output(args)
            .apply((args) => computeImageFromAsset(args, this));
    }
}

type DockerInputs = Omit<
    pulumi.Unwrap<schema.Repository_buildAndPushImageInputs>,
    "__self__"
>;

/** @internal */
export function computeImageFromAsset(
    args: pulumi.Unwrap<schema.ImageArgs>,
    parent: pulumi.Resource,
) {
    const { repositoryUrl, ...dockerInputs } = args ?? {};
    const url = new URL("https://" + repositoryUrl); // Add protocol to help it parse
    const registryId = url.hostname.split(".")[0];

    pulumi.log.debug(
        `Building container image at '${JSON.stringify(dockerInputs)}'`,
        parent,
    );

    const imageName = getImageName(dockerInputs);

    // If we haven't, build and push the local build context to the ECR repository.  Then return
    // the unique image name we pushed to.  The name will change if the image changes ensuring
    // the TaskDefinition get's replaced IFF the built image changes.

    const dockerBuild: docker.DockerBuild = {
        args: dockerInputs.args,
        cacheFrom: dockerInputs.cacheFrom
            ? { stages: dockerInputs.cacheFrom }
            : undefined,
        context: dockerInputs.path,
        dockerfile: dockerInputs.dockerfile,
        env: dockerInputs.env,
        extraOptions: dockerInputs.extraOptions,
        target: dockerInputs.target,
    };

    pulumi.log.info("dockerBuild: " + JSON.stringify(dockerBuild));

    const uniqueImageName = docker.buildAndPushImage(
        imageName,
        dockerBuild,
        repositoryUrl,
        parent,
        () => {
            // Construct Docker registry auth data by getting the short-lived authorizationToken from ECR, and
            // extracting the username/password pair after base64-decoding the token.
            //
            // See: http://docs.aws.amazon.com/cli/latest/reference/ecr/get-authorization-token.html
            if (!registryId) {
                throw new Error(
                    "Expected registry ID to be defined during push",
                );
            }

            const credentials = aws.ecr.getCredentialsOutput(
                { registryId: registryId },
                { parent, async: true },
            );
            return credentials.authorizationToken.apply(
                (authorizationToken) => {
                    const decodedCredentials = Buffer.from(
                        authorizationToken,
                        "base64",
                    ).toString();
                    const [username, password] = decodedCredentials.split(":");
                    if (!password || !username) {
                        throw new Error("Invalid credentials");
                    }
                    return {
                        registry: credentials.proxyEndpoint,
                        username: username,
                        password: password,
                    };
                },
            );
        },
    );

    uniqueImageName.apply((d: any) =>
        pulumi.log.debug(`    build complete: ${imageName} (${d})`, parent),
    );

    return uniqueImageName;
}

function getImageName(inputs: pulumi.Unwrap<schema.DockerBuildInputs>) {
    const { path, dockerfile, args } = inputs ?? {};
    // Produce a hash of the build context and use that for the image name.
    let buildSig: string;

    buildSig = path ?? ".";
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
