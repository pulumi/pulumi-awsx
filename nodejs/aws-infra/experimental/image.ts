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

import * as utils from "../utils";

export type ImageEnvironment = Record<string, pulumi.Input<string>>;

export interface IImageOptions {
    image: pulumi.Input<string>;
    environment: pulumi.Input<ImageEnvironment>;
}

export interface IImageOptionsProvider {
    getImageOptions(name: string, parent: pulumi.Resource): IImageOptions;
}

export abstract class ImageOptionsProvider implements IImageOptionsProvider {
    public abstract getImageOptions(name: string, parent: pulumi.Resource): IImageOptions;

    /**
     * Creates a [ContainerImage] given a path to a folder in which a Docker build should be run.
     */
    public static fromPath(path: string): IImageOptionsProvider {
        return new AssetImageOptionsProvider(path);
    }

    /**
     *Creates a [ContainerImage] using the detailed build instructions provided in [build].
     */

    public static fromDockerBuild(build: docker.DockerBuild): IImageOptionsProvider {
        return new AssetImageOptionsProvider(build);
    }

    /**
     * Creates a [ContainerImage] given function code to use as the implementation of the container.
     */
    public static fromFunction(func: () => void): IImageOptionsProvider {
        return new FunctionImageOptionsProvider(func);
    }
}

class FunctionImageOptionsProvider extends ImageOptionsProvider {
    constructor(private readonly func: () => void) {
        super();
    }

    public getImageOptions(): IImageOptions {
        const environment: ImageEnvironment = {};

        // TODO[pulumi/pulumi-cloud#85]: Put this in a real Pulumi-owned Docker image.
        // TODO[pulumi/pulumi-cloud#86]: Pass the full local zipped folder through to the container (via S3?)
        environment.PULUMI_SRC = pulumi.runtime.serializeFunctionAsync(this.func);

        // TODO[pulumi/pulumi-cloud#85]: move this to a Pulumi Docker Hub account.
        return { image: "lukehoban/nodejsrunner", environment };
    }
}

class AssetImageOptionsProvider extends ImageOptionsProvider {
    // repositories contains a cache of already created ECR repositories.
    private static readonly repositories = new Map<string, aws.ecr.Repository>();

    // buildImageCache remembers the digests for all past built images, keyed by image name.
    private static buildImageCache = new Map<string, pulumi.Output<string>>();

    constructor(private readonly pathOrBuild: string | docker.DockerBuild) {
        super();
    }

    public getImageOptions(name: string, parent: pulumi.Resource): IImageOptions {
        const imageName = this.getImageName(name);
        const repository = this.getOrCreateRepository(imageName, { parent });

        // This is a container to build; produce a name, either user-specified or auto-computed.
        pulumi.log.debug(`Building container image at '${JSON.stringify(this.pathOrBuild)}'`, repository);
        const { repositoryUrl, registryId } = repository;

        const image = pulumi.all([repositoryUrl, registryId]).apply(([repositoryUrl, registryId]) =>
            this.computeImageFromAsset(imageName, repositoryUrl, registryId, parent));

        return { image, environment: { } };
    }

    private getImageName(name: string) {
        // Produce a hash of the build context and use that for the image name.
        let buildSig: string;
        if (typeof this.pathOrBuild === "string") {
            buildSig = this.pathOrBuild;
        }
        else {
            buildSig = this.pathOrBuild.context || ".";
            if (this.pathOrBuild.dockerfile ) {
                buildSig += `;dockerfile=${this.pathOrBuild.dockerfile}`;
            }
            if (this.pathOrBuild.args) {
                for (const arg of Object.keys(this.pathOrBuild.args)) {
                    buildSig += `;arg[${arg}]=${this.pathOrBuild.args[arg]}`;
                }
            }
        }

        return `${utils.sha1hash(buildSig)}-container-${name}`;
    }

    // getOrCreateRepository returns the ECR repository for this image, lazily allocating if necessary.
    private getOrCreateRepository(imageName: string, opts: pulumi.ResourceOptions): aws.ecr.Repository {
        let repository: aws.ecr.Repository | undefined = AssetImageOptionsProvider.repositories.get(imageName);
        if (!repository) {
            repository = new aws.ecr.Repository(imageName.toLowerCase(), {}, opts);
            AssetImageOptionsProvider.repositories.set(imageName, repository);

            // Set a default lifecycle policy such that at most a single untagged image is retained.
            // We tag all cached build layers as well as the final image, so those images will never expire.
            const lifecyclePolicyDocument = {
                rules: [{
                    rulePriority: 10,
                    description: "remove untagged images",
                    selection: {
                        tagStatus: "untagged",
                        countType: "imageCountMoreThan",
                        countNumber: 1,
                    },
                    action: {
                        type: "expire",
                    },
                }],
            };
            const lifecyclePolicy = new aws.ecr.LifecyclePolicy(imageName.toLowerCase(), {
                policy: JSON.stringify(lifecyclePolicyDocument),
                repository: repository.name,
            }, opts);
        }

        return repository;
    }

    private computeImageFromAsset(
            imageName: string,
            repositoryUrl: string,
            registryId: string,
            logResource: pulumi.Resource) {

        // See if we've already built this.
        let uniqueImageName = AssetImageOptionsProvider.buildImageCache.get(imageName);
        if (uniqueImageName) {
            uniqueImageName.apply(d =>
                pulumi.log.debug(`    already built: ${imageName} (${d})`, logResource));
        }
        else {
            // If we haven't, build and push the local build context to the ECR repository.  Then return
            // the unique image name we pushed to.  The name will change if the image changes ensuring
            // the TaskDefinition get's replaced IFF the built image changes.
            uniqueImageName = docker.buildAndPushImage(
                    imageName, this.pathOrBuild, repositoryUrl, logResource, async () => {
                // Construct Docker registry auth data by getting the short-lived authorizationToken from ECR, and
                // extracting the username/password pair after base64-decoding the token.
                //
                // See: http://docs.aws.amazon.com/cli/latest/reference/ecr/get-authorization-token.html
                if (!registryId) {
                    throw new Error("Expected registry ID to be defined during push");
                }
                const credentials = await aws.ecr.getCredentials({ registryId: registryId });
                const decodedCredentials = Buffer.from(credentials.authorizationToken, "base64").toString();
                const [username, password] = decodedCredentials.split(":");
                if (!password || !username) {
                    throw new Error("Invalid credentials");
                }
                return {
                    registry: credentials.proxyEndpoint,
                    username: username,
                    password: password,
                };
            });

            AssetImageOptionsProvider.buildImageCache.set(imageName, uniqueImageName);

            uniqueImageName.apply(d =>
                pulumi.log.debug(`    build complete: ${imageName} (${d})`, logResource));
        }

        return uniqueImageName;
    }
}

