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

import * as ecs from ".";
import * as utils from "../utils";

export abstract class Image implements ecs.ContainerImageProvider {
    public abstract image(name: string, parent: pulumi.Resource): pulumi.Input<string>;
    public abstract environment(name: string, parent: pulumi.Resource): pulumi.Input<ecs.KeyValuePair[]>;

    /**
     * Creates an [Image] given a path to a folder in which a Docker build should be run.
     *
     * Either a [name] or [repository] needs to be provided where the built image will be pushed
     * to.  If [repository] is provided, it will be used as-is.  Otherwise, a new one will be
     * created on-demand, using the [name] value.
     */
    public static fromPath(name: string, path: pulumi.Input<string>): Image;
    public static fromPath(repository: aws.ecr.Repository, path: pulumi.Input<string>): Image;
    public static fromPath(nameOrRepository: string | aws.ecr.Repository, path: pulumi.Input<string>): Image {
        if (path === undefined) {
            throw new Error("'build' was undefined");
        }

        return new AssetImage(nameOrRepository, path);
    }

    /**
     * Creates an [Image] using the detailed build instructions provided in [build].
     *
     * Either a [name] or [repository] needs to be provided where the built image will be pushed
     * to.  If [repository] is provided, it will be used as-is.  Otherwise, a new one will be
     * created on-demand, using the [name] value.
     */
    public static fromDockerBuild(name: string, build: pulumi.Input<docker.DockerBuild>): Image;
    public static fromDockerBuild(repository: aws.ecr.Repository, build: pulumi.Input<docker.DockerBuild>): Image;
    public static fromDockerBuild(nameOrRepository: string | aws.ecr.Repository, build: pulumi.Input<docker.DockerBuild>): Image {
        if (build === undefined) {
            throw new Error("'path' was undefined");
        }

        return new AssetImage(nameOrRepository, build);
    }

    /**
     * Creates an [Image] given function code to use as the implementation of the container.
     */
    public static fromFunction(func: () => void): Image {
        return new FunctionImage(func);
    }
}

class FunctionImage extends Image {
    constructor(private readonly func: () => void) {
        super();
    }

    public image(name: string, parent: pulumi.Resource): pulumi.Input<string> {
        // TODO[pulumi/pulumi-cloud#85]: move this to a Pulumi Docker Hub account.
        return "lukehoban/nodejsrunner";
    }

    public environment(name: string, parent: pulumi.Resource): pulumi.Input<ecs.KeyValuePair[]> {
        const serialized = pulumi.runtime.serializeFunctionAsync(this.func);
        return serialized.then(value => [{
            name: "PULUMI_SRC",
            value: value,
        }]);
    }
}

class AssetImage extends Image {
    private readonly nameOrRepository: string | aws.ecr.Repository;
    private readonly pathOrBuild: pulumi.Output<string | docker.DockerBuild>;

    // Computed and cached on demand.
    private imageResult: pulumi.Output<string> | undefined;

    constructor(nameOrRepository: string | aws.ecr.Repository, pathOrBuild: pulumi.Input<string | docker.DockerBuild>) {
        super();

        this.nameOrRepository = nameOrRepository;
        this.pathOrBuild = pulumi.output(pathOrBuild);
    }

    public environment(name: string, parent: pulumi.Resource): pulumi.Input<ecs.KeyValuePair[]> {
        return [];
    }

    public image(name: string, parent: pulumi.Resource): pulumi.Input<string> {
        if (!this.imageResult) {
            const repository = typeof this.nameOrRepository === "string"
                ? AssetImage.createRepository(this.nameOrRepository, { parent })
                : this.nameOrRepository;

            const { repositoryUrl, registryId } = repository;

            this.imageResult = pulumi.all([this.pathOrBuild, repositoryUrl, registryId])
                                     .apply(([pathOrBuild, repositoryUrl, registryId]) =>
                computeImageFromAsset(pathOrBuild, repositoryUrl, registryId, parent));
        }

        return this.imageResult;
    }

    // getOrCreateRepository returns the ECR repository for this image, lazily allocating if necessary.
    private static createRepository(name: string, opts: pulumi.ComponentResourceOptions) {
        const repository = new aws.ecr.Repository(name.toLowerCase(), {}, opts);

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

        const lifecyclePolicy = new aws.ecr.LifecyclePolicy(name.toLowerCase(), {
            policy: JSON.stringify(lifecyclePolicyDocument),
            repository: repository.name,
        }, opts);

        return repository;
    }
}

function getImageName(pathOrBuild: string | pulumi.Unwrap<docker.DockerBuild>) {
    // Produce a hash of the build context and use that for the image name.
    let buildSig: string;
    if (typeof pathOrBuild === "string") {
        buildSig = pathOrBuild;
    }
    else {
        buildSig = pathOrBuild.context || ".";
        if (pathOrBuild.dockerfile ) {
            buildSig += `;dockerfile=${pathOrBuild.dockerfile}`;
        }
        if (pathOrBuild.args) {
            for (const arg of Object.keys(pathOrBuild.args)) {
                buildSig += `;arg[${arg}]=${pathOrBuild.args[arg]}`;
            }
        }
    }

    buildSig += pulumi.getStack();
    return `${utils.sha1hash(buildSig)}-container`;
}

/** @internal */
export function computeImageFromAsset(
        pathOrBuild: string | pulumi.Unwrap<docker.DockerBuild>,
        repositoryUrl: string,
        registryId: string,
        parent: pulumi.Resource) {

    pulumi.log.debug(`Building container image at '${JSON.stringify(pathOrBuild)}'`, parent);

    const imageName = getImageName(pathOrBuild);

    // If we haven't, build and push the local build context to the ECR repository.  Then return
    // the unique image name we pushed to.  The name will change if the image changes ensuring
    // the TaskDefinition get's replaced IFF the built image changes.

    const uniqueImageName = docker.buildAndPushImage(
            imageName, pathOrBuild, repositoryUrl, parent, async () => {
        // Construct Docker registry auth data by getting the short-lived authorizationToken from ECR, and
        // extracting the username/password pair after base64-decoding the token.
        //
        // See: http://docs.aws.amazon.com/cli/latest/reference/ecr/get-authorization-token.html
        if (!registryId) {
            throw new Error("Expected registry ID to be defined during push");
        }
        const credentials = await aws.ecr.getCredentials({ registryId: registryId }, <any>{ parent, async: true });
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

    uniqueImageName.apply(d =>
        pulumi.log.debug(`    build complete: ${imageName} (${d})`, parent));

    return uniqueImageName;
}
