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

import * as mod from ".";

import { MakeInputs, Overwrite, sha1hash } from "../utils";
import { ClusterLoadBalancerPort } from "./clusterLoadBalancer";

export type ContainerEnvironment = Record<string, pulumi.Input<string>>;

/**
 * CacheFrom may be used to specify build stages to use for the Docker build cache. The final image is always
 * implicitly included.
 */
export interface CacheFrom {
    /**
     * An optional list of build stages to use for caching. Each build stage in this list will be built explicitly and
     * pushed to the target repository. A given stage's image will be tagged as "[stage-name]".
     */
    stages?: string[];
}

/**
 * ContainerBuild may be used to specify detailed instructions about how to build a container.
 */
export interface ContainerBuild {
    /**
     * context is a path to a directory to use for the Docker build context, usually the directory in which the
     * Dockerfile resides (although dockerfile may be used to choose a custom location independent of this choice).
     * If not specified, the context defaults to the current working directory; if a relative path is used, it
     * is relative to the current working directory that Pulumi is evaluating.
     */
    context?: string;
    /**
     * dockerfile may be used to override the default Dockerfile name and/or location.  By default, it is assumed
     * to be a file named Dockerfile in the root of the build context.
     */
    dockerfile?: string;
    /**
     * An optional map of named build-time argument variables to set during the Docker build.  This flag allows you
     * to pass built-time variables that can be accessed like environment variables inside the `RUN` instruction.
     */
    args?: {
        [key: string]: string;
    };
    /**
     * An optional CacheFrom object with information about the build stages to use for the Docker build cache.
     * This parameter maps to the --cache-from argument to the Docker CLI. If this parameter is `true`, only the final
     * image will be pulled and passed to --cache-from; if it is a CacheFrom object, the stages named therein will
     * also be pulled and passed to --cache-from.
     */
    cacheFrom?: boolean | CacheFrom;
}

export type ContainerDefinition = Overwrite<MakeInputs<aws.ecs.ContainerDefinition>, {
    /**
     * The image to use for the container.  If `image` is specified, but not `build`, the image will
     * be pulled from the Docker Hub.  If `image` *and* `build` are specified, the `image` controls
     * the resulting image tag for the build image that gets pushed.
     */
    image?: pulumi.Input<string>;

    /**
     * Either a path to a folder in which a Docker build should be run to construct the image for this
     * Container, or a ContainerBuild object with more detailed build instructions.  If `image` is also specified, the
     * built container will be tagged with that name, but otherwise will get an auto-generated image name.
     */
    build?: string | ContainerBuild;

    /**
     * The function code to use as the implementation of the contaner.  If `function` is specified,
     * neither `image` nor `build` are legal.
     */
    function?: () => void;

    /**
     * Not provided.  Use [loadBalancerPort] instead.
     */
    portMappings?: never;

    /**
     * The port information to create a load balancer for.  At most one container in a service
     * can have this set.  Should not be set for containers intended for TaskDeinitions that will
     * just be run, and will not be part of an aws.ecs.Service.
     */
    loadBalancerPort?: mod.ClusterLoadBalancerPort;

    environment?: ContainerEnvironment;
}>;

export type WrappedEndpoints = Record<string, Record<number, pulumi.Output<aws.apigateway.x.Endpoint>>>;

export function computeContainerDefinition(
    name: string,
    cluster: mod.Cluster,
    containerName: string,
    container: ContainerDefinition,
    exposedPortOpt: mod.ExposedPort | undefined,
    logGroup: aws.cloudwatch.LogGroup,
    opts: pulumi.ResourceOptions): pulumi.Output<aws.ecs.ContainerDefinition> {

    const imageOptions = computeImage(name, cluster, container, exposedPortOpt, opts);
    const portMappings = getPortMappings(container.loadBalancerPort);

    return pulumi.all([imageOptions, container, logGroup.id])
                 .apply(([imageOptions, container, logGroupId]) => {
        const keyValuePairs: { name: string, value: string }[] = [];
        for (const key of Object.keys(imageOptions.environment)) {
            keyValuePairs.push({ name: key, value: imageOptions.environment[key] });
        }

        const containerDefinition = {
            ...container,
            name: containerName,
            image: imageOptions.image,
            portMappings: portMappings,
            environment: keyValuePairs,
            // todo(cyrusn): mount points.
            // mountPoints: (container.volumes || []).map(v => ({
            //     containerPath: v.containerPath,
            //     sourceVolume: (v.sourceVolume as Volume).getVolumeName(),
            // })),
            logConfiguration: container.logConfiguration || {
                logDriver: "awslogs",
                options: {
                    "awslogs-group": logGroupId,
                    "awslogs-region": aws.config.requireRegion(),
                    "awslogs-stream-prefix": containerName,
                },
            },
        };

        return containerDefinition;
    });
}

function getPortMappings(loadBalancerPort: ClusterLoadBalancerPort | undefined) {
    if (loadBalancerPort === undefined) {
        return [];
    }

    const port = loadBalancerPort.targetPort || loadBalancerPort.port;
    return [{
        containerPort: port,
        // From https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html:
        // > For task definitions that use the awsvpc network mode, you should only specify the containerPort.
        // > The hostPort can be left blank or it must be the same value as the containerPort.
        //
        // However, if left blank, it will be automatically populated by AWS, potentially leading to dirty
        // diffs even when no changes have been made. Since we are currently always using `awsvpc` mode, we
        // go ahead and populate it with the same value as `containerPort`.
        //
        // See https://github.com/terraform-providers/terraform-provider-aws/issues/3401.
        hostPort: port,
    }];
}

function computeImage(name: string,
                      cluster: mod.Cluster,
                      container: ContainerDefinition,
                      exposedPortOpt: mod.ExposedPort | undefined,
                      opts: pulumi.ResourceOptions) {

    // Start with a copy from the container specification.
    const preEnv: ContainerEnvironment =
        Object.assign({}, container.environment || {});

        // Now add entries for service discovery amongst containers exposing endpoints.
    if (exposedPortOpt) {
        const loadBalancer = exposedPortOpt.loadBalancer;
        const hostname = loadBalancer.instance.dnsName;
        const hostproto = exposedPortOpt.loadBalancerPort.protocol || "tcp";
        const hostport = exposedPortOpt.loadBalancerPort.port.toString();
        const port = hostport;

        const serviceEnv = makeServiceEnvName(exposedPortOpt.containerName);
        // Populate Kubernetes and Docker links compatible environment variables.  These take the form:
        //
        //     Kubernetes:
        //         {SVCNAME}_SERVICE_HOST=10.0.0.11 (or DNS name)
        //         {SVCNAME}_SERVICE_PORT=6379
        //     Docker links:
        //         {SVCNAME}_PORT=tcp://10.0.0.11:6379 (or DNS address)
        //         {SVCNAME}_PORT_6379_TCP=tcp://10.0.0.11:6379 (or DNS address)
        //         {SVCNAME}_PORT_6379_TCP_PROTO=tcp
        //         {SVCNAME}_PORT_6379_TCP_PORT=6379
        //         {SVCNAME}_PORT_6379_TCP_ADDR=10.0.0.11 (or DNS name)
        //
        // See https://kubernetes.io/docs/concepts/services-networking/service/#discovering-services and
        // https://docs.docker.com/engine/userguide/networking/default_network/dockerlinks/ for more info.
        preEnv[`${serviceEnv}_SERVICE_HOST`] = hostname;
        preEnv[`${serviceEnv}_SERVICE_PORT`] = hostport;

        const fullHost = hostname.apply(h => `${hostproto}://${h}:${hostport}`);
        preEnv[`${serviceEnv}_PORT`] = fullHost;
        preEnv[`${serviceEnv}_PORT_${port}_TCP`] = fullHost;
        preEnv[`${serviceEnv}_PORT_${port}_TCP_PROTO`]= hostproto;
        preEnv[`${serviceEnv}_PORT_${port}_TCP_PORT`] = hostport;
        preEnv[`${serviceEnv}_PORT_${port}_TCP_ADDR`] = hostname;
    }

    if (container.build) {
        return computeImageFromBuild(name, cluster, preEnv, container.build, opts);
    }
    else if (container.image) {
        return createImageOptions(container.image, preEnv);
    }
    else if (container.function) {
        return computeImageFromFunction(container.function, preEnv);
    }
    else {
        throw new Error("Invalid container definition: `image`, `build`, or `function` must be provided");
    }
}

// makeServiceEnvName turns a service name into something suitable for an environment variable.
function makeServiceEnvName(service: string): string {
    return service.toUpperCase().replace(/-/g, "_");
}

function createImageOptions(image: pulumi.Input<string>, environment: ContainerEnvironment) {
    return pulumi.output({ image, environment });
}

function computeImageFromFunction(
        func: () => void,
        preEnv: Record<string, pulumi.Input<string>>) {

    // TODO[pulumi/pulumi-cloud#85]: Put this in a real Pulumi-owned Docker image.
    // TODO[pulumi/pulumi-cloud#86]: Pass the full local zipped folder through to the container (via S3?)
    preEnv.PULUMI_SRC = pulumi.runtime.serializeFunctionAsync(func);

    // TODO[pulumi/pulumi-cloud#85]: move this to a Pulumi Docker Hub account.
    return createImageOptions("lukehoban/nodejsrunner", preEnv);
}



function computeImageFromBuild(
        name: string,
        parent: pulumi.Resource,
        preEnv: Record<string, pulumi.Input<string>>,
        build: string | ContainerBuild,
        opts: pulumi.ResourceOptions) {

    const imageName = getBuildImageName(name, build);
    const repository = getOrCreateRepository(imageName, opts);

    // This is a container to build; produce a name, either user-specified or auto-computed.
    pulumi.log.debug(`Building container image at '${build}'`, repository);
    const { repositoryUrl, registryId } = repository;

    return pulumi.all([repositoryUrl, registryId]).apply(([repositoryUrl, registryId]) =>
        computeImageFromBuildWorker(preEnv, build, imageName, repositoryUrl, registryId, parent));
}

// buildImageCache remembers the digests for all past built images, keyed by image name.
const buildImageCache = new Map<string, pulumi.Output<string>>();

function computeImageFromBuildWorker(
        preEnv: Record<string, pulumi.Input<string>>,
        build: string | ContainerBuild,
        imageName: string,
        repositoryUrl: string,
        registryId: string,
        logResource: pulumi.Resource) {

    // See if we've already built this.
    let uniqueImageName = buildImageCache.get(imageName);
    if (uniqueImageName) {
        uniqueImageName.apply(d =>
            pulumi.log.debug(`    already built: ${imageName} (${d})`, logResource));
    }
    else {
        // If we haven't, build and push the local build context to the ECR repository.  Then return
        // the unique image name we pushed to.  The name will change if the image changes ensuring
        // the TaskDefinition get's replaced IFF the built image changes.
        uniqueImageName = docker.buildAndPushImage(imageName, build, repositoryUrl, logResource, async () => {
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

        buildImageCache.set(imageName, uniqueImageName);

        uniqueImageName.apply(d =>
            pulumi.log.debug(`    build complete: ${imageName} (${d})`, logResource));
    }

    return createImageOptions(uniqueImageName, preEnv);
}

function getBuildImageName(name: string, build: string | ContainerBuild) {
    // Produce a hash of the build context and use that for the image name.
    let buildSig: string;
    if (typeof build === "string") {
        buildSig = build;
    }
    else {
        buildSig = build.context || ".";
        if (build.dockerfile ) {
            buildSig += `;dockerfile=${build.dockerfile}`;
        }
        if (build.args) {
            for (const arg of Object.keys(build.args)) {
                buildSig += `;arg[${arg}]=${build.args[arg]}`;
            }
        }
    }

    return `${sha1hash(buildSig)}-container-${name}`;
}

// repositories contains a cache of already created ECR repositories.
const repositories = new Map<string, aws.ecr.Repository>();

// getOrCreateRepository returns the ECR repository for this image, lazily allocating if necessary.
function getOrCreateRepository(imageName: string, opts: pulumi.ResourceOptions): aws.ecr.Repository {
    let repository: aws.ecr.Repository | undefined = repositories.get(imageName);
    if (!repository) {
        repository = new aws.ecr.Repository(imageName.toLowerCase(), {}, opts);
        repositories.set(imageName, repository);

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
