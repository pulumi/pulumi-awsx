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

import * as module from ".";

import * as docker from "@pulumi/docker";
import * as utils from "./../utils";

export type ClusterServiceArgs = utils.Overwrite<aws.ecs.ServiceArgs, {
    /**
     * The task definition to create the service from.
     */
    taskDefinition: module.ClusterTaskDefinition;

    /**
     * The number of instances of the task definition to place and keep running. Defaults to 1. Do
     * not specify if using the `DAEMON` scheduling strategy.
     */
    desiredCount?: pulumi.Input<number>;

    /**
     * The launch type on which to run your service. The valid values are `EC2` and `FARGATE`.
     * Defaults to `EC2`.
     */
    launchType?: pulumi.Input<"EC2" | "FARGATE">;

    os?: pulumi.Input<"linux" | "windows">;

    /**
     * Wait for the service to reach a steady state (like [`aws ecs wait
     * services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html))
     * before continuing. Defaults to `true`.
     */
    waitForSteadyState?: pulumi.Input<boolean>;

    /**
     * Optional auto-scaling group for the cluster.  Can be created with
     * [cluster.createAutoScalingGroup]
     */
    autoScalingGroup?: module.ClusterAutoScalingGroup;
}>;

export interface Endpoint {
    hostname: string;
    port: number;
}

/**
 * A mapping from a container name and it's exposed port, to the hostname/port it can be reached at.
 */
export interface Endpoints {
    [containerName: string]: { [port: number]: Endpoint; };
}

export class ClusterService extends aws.ecs.Service {
    public readonly clusterInstance: module.Cluster2;
    public readonly taskDefinitionInstance: module.ClusterTaskDefinition;

    public readonly endpoints: pulumi.Output<Endpoints>;
    public readonly defaultEndpoint: pulumi.Output<Endpoint>;

    public readonly getEndpoint: (containerName?: string, containerPort?: number) => Promise<Endpoint>;

    constructor(name: string, cluster: module.Cluster2,
                args: ClusterServiceArgs,
                opts: pulumi.ResourceOptions = {}) {

        const loadBalancers = createLoadBalancers(args.taskDefinition);

        const serviceArgs: aws.ecs.ServiceArgs = {
            ...args,
            cluster: cluster.arn,
            taskDefinition: args.taskDefinition.arn,
            loadBalancers: loadBalancers,
            desiredCount: pulumi.output(args.desiredCount).apply(c => c === undefined ? 1 : c),
            launchType: pulumi.output(args.launchType).apply(t => t || "EC2"),
            waitForSteadyState: pulumi.output(args.waitForSteadyState).apply(w => w !== undefined ? w : true),
            placementConstraints: pulumi.output(args.os).apply(os => module.placementConstraintsForHost(os)),
        };

        // If the cluster has an autoscaling group, ensure the service depends on it being created.
        // TODO(cyrusn): this isn't necessary if resource creation automatically makes 'deps' for
        // the opts passed in. Investigate.
        if (args.autoScalingGroup) {
            const dependsOn = opts.dependsOn
                ? Array.isArray(opts.dependsOn) ? opts.dependsOn : [opts.dependsOn]
                : [];

            dependsOn.push(args.autoScalingGroup);
            opts.dependsOn = dependsOn;
        }

        super(name, serviceArgs, opts);

        this.clusterInstance = cluster;
        this.taskDefinitionInstance = args.taskDefinition;
    }
}

export function createLoadBalancers(
        taskDefinition: module.ClusterTaskDefinition): aws.ecs.ServiceArgs["loadBalancers"] {
    if (!taskDefinition.loadBalancer) {
        return [];
    }

    const { containerName, container } = module.singleContainerWithLoadBalancerPort(taskDefinition.containers)!;
    const loadBalancerPort = container.loadBalancerPort!;
    const loadBalancer = {
        containerName,
        containerPort: loadBalancerPort.targetPort || loadBalancerPort.port,
        targetGroupArn: taskDefinition.loadBalancer.targetGroup.arn,
    };

    return [loadBalancer];
}


// // getImageName generates an image name from a container definition.  It uses a combination of the container's name and
// // container specification to normalize the names of resulting repositories.  Notably, this leads to better caching in
// // the event that multiple container specifications exist that build the same location on disk.
// function getImageName(container: cloud.Container): string {
//     if (container.image) {
//         // In the event of an image, just use it.
//         return container.image;
//     }
//     else if (container.build) {
//         // Produce a hash of the build context and use that for the image name.
//         let buildSig: string;
//         if (typeof container.build === "string") {
//             buildSig = container.build;
//         }
//         else {
//             buildSig = container.build.context || ".";
//             if (container.build.dockerfile ) {
//                 buildSig += `;dockerfile=${container.build.dockerfile}`;
//             }
//             if (container.build.args) {
//                 for (const arg of Object.keys(container.build.args)) {
//                     buildSig += `;arg[${arg}]=${container.build.args[arg]}`;
//                 }
//             }
//         }
//         return createNameWithStackInfo(`${utils.sha1hash(buildSig)}-container`);
//     }
//     else if (container.function) {
//         // TODO[pulumi/pulumi-cloud#85]: move this to a Pulumi Docker Hub account.
//         return "lukehoban/nodejsrunner";
//     }
//     else {
//         throw new Error("Invalid container definition: `image`, `build`, or `function` must be provided");
//     }
// }

// // repositories contains a cache of already created ECR repositories.
// const repositories = new Map<string, aws.ecr.Repository>();

// // getOrCreateRepository returns the ECR repository for this image, lazily allocating if necessary.
// function getOrCreateRepository(imageName: string): aws.ecr.Repository {
//     let repository: aws.ecr.Repository | undefined = repositories.get(imageName);
//     if (!repository) {
//         repository = new aws.ecr.Repository(imageName.toLowerCase());
//         repositories.set(imageName, repository);

//         // Set a default lifecycle policy such that at most a single untagged image is retained.
//         // We tag all cached build layers as well as the final image, so those images will never expire.
//         const lifecyclePolicyDocument = {
//             rules: [{
//                 rulePriority: 10,
//                 description: "remove untagged images",
//                 selection: {
//                     tagStatus: "untagged",
//                     countType: "imageCountMoreThan",
//                     countNumber: 1,
//                 },
//                 action: {
//                     type: "expire",
//                 },
//             }],
//         };
//         const lifecyclePolicy = new aws.ecr.LifecyclePolicy(imageName.toLowerCase(), {
//             policy: JSON.stringify(lifecyclePolicyDocument),
//             repository: repository.name,
//         });
//     }
//     return repository;
// }

// // buildImageCache remembers the digests for all past built images, keyed by image name.
// const buildImageCache = new Map<string, pulumi.Output<string>>();

// // makeServiceEnvName turns a service name into something suitable for an environment variable.
// function makeServiceEnvName(service: string): string {
//     return service.toUpperCase().replace(/-/g, "_");
// }

// interface ImageOptions {
//     image: string;
//     environment: Record<string, string>;
// }

// // computeImage turns the `image`, `function` or `build` setting on a `cloud.Container` into a valid Docker image
// // name and environment which can be used in an ECS TaskDefinition.
// function computeImage(
//         parent: pulumi.Resource,
//         imageName: string,
//         container: cloud.Container,
//         ports: ExposedPorts | undefined,
//         repository: aws.ecr.Repository | undefined): pulumi.Output<ImageOptions> {

//     // Start with a copy from the container specification.
//     const preEnv: Record<string, pulumi.Input<string>> =
//         Object.assign({}, container.environment || {});

//     // Now add entries for service discovery amongst containers exposing endpoints.
//     if (ports) {
//         for (const service of Object.keys(ports)) {
//             let firstPort = true;
//             const serviceEnv = makeServiceEnvName(service);
//             for (const port of Object.keys(ports[service])) {
//                 const info = ports[service][parseInt(port, 10)];
//                 const hostname = info.host.dnsName;
//                 const hostport = info.hostPort.toString();
//                 const hostproto = info.hostProtocol;
//                 // Populate Kubernetes and Docker links compatible environment variables.  These take the form:
//                 //
//                 //     Kubernetes:
//                 //         {SVCNAME}_SERVICE_HOST=10.0.0.11 (or DNS name)
//                 //         {SVCNAME}_SERVICE_PORT=6379
//                 //     Docker links:
//                 //         {SVCNAME}_PORT=tcp://10.0.0.11:6379 (or DNS address)
//                 //         {SVCNAME}_PORT_6379_TCP=tcp://10.0.0.11:6379 (or DNS address)
//                 //         {SVCNAME}_PORT_6379_TCP_PROTO=tcp
//                 //         {SVCNAME}_PORT_6379_TCP_PORT=6379
//                 //         {SVCNAME}_PORT_6379_TCP_ADDR=10.0.0.11 (or DNS name)
//                 //
//                 // See https://kubernetes.io/docs/concepts/services-networking/service/#discovering-services and
//                 // https://docs.docker.com/engine/userguide/networking/default_network/dockerlinks/ for more info.
//                 if (firstPort) {
//                     preEnv[`${serviceEnv}_SERVICE_HOST`] = hostname;
//                     preEnv[`${serviceEnv}_SERVICE_PORT`] = hostport;
//                 }
//                 firstPort = false;

//                 const fullHost = hostname.apply(h => `${hostproto}://${h}:${hostport}`);
//                 preEnv[`${serviceEnv}_PORT`] = fullHost;
//                 preEnv[`${serviceEnv}_PORT_${port}_TCP`] = fullHost;
//                 preEnv[`${serviceEnv}_PORT_${port}_TCP_PROTO`]= hostproto;
//                 preEnv[`${serviceEnv}_PORT_${port}_TCP_PORT`] = hostport;
//                 preEnv[`${serviceEnv}_PORT_${port}_TCP_ADDR`] = hostname;
//             }
//         }
//     }

//     if (container.build) {
//         if (!repository) {
//             throw new Error("Expected a container repository for build image");
//         }

//         return computeImageFromBuild(parent, preEnv, container.build, imageName, repository);
//     }
//     else if (container.image) {
//         return computeImageFromImage(preEnv, imageName);
//     }
//     else if (container.function) {
//         return computeImageFromFunction(container.function, preEnv, imageName);
//     }
//     else {
//         throw new Error("Invalid container definition: `image`, `build`, or `function` must be provided");
//     }
// }

// function computeImageFromBuild(
//         parent: pulumi.Resource,
//         preEnv: Record<string, pulumi.Input<string>>,
//         build: string | cloud.ContainerBuild,
//         imageName: string,
//         repository: aws.ecr.Repository): pulumi.Output<ImageOptions> {

//     // This is a container to build; produce a name, either user-specified or auto-computed.
//     pulumi.log.debug(`Building container image at '${build}'`, repository);
//     const { repositoryUrl, registryId } = repository;

//     return pulumi.all([repositoryUrl, registryId])
//                  .apply(([repositoryUrl, registryId]) =>
//                      computeImageFromBuildWorker(preEnv, build, imageName, repositoryUrl, registryId, parent));
// }

// function computeImageFromBuildWorker(
//         preEnv: Record<string, pulumi.Input<string>>,
//         build: string | cloud.ContainerBuild,
//         imageName: string,
//         repositoryUrl: string,
//         registryId: string,
//         logResource: pulumi.Resource): pulumi.Output<ImageOptions> {

//     // See if we've already built this.
//     let uniqueImageName = buildImageCache.get(imageName);
//     if (uniqueImageName) {
//         uniqueImageName.apply(d =>
//             pulumi.log.debug(`    already built: ${imageName} (${d})`, logResource));
//     }
//     else {
//         // If we haven't, build and push the local build context to the ECR repository.  Then return
//         // the unique image name we pushed to.  The name will change if the image changes ensuring
//         // the TaskDefinition get's replaced IFF the built image changes.
//         uniqueImageName = docker.buildAndPushImage(imageName, build, repositoryUrl, logResource, async () => {
//             // Construct Docker registry auth data by getting the short-lived authorizationToken from ECR, and
//             // extracting the username/password pair after base64-decoding the token.
//             //
//             // See: http://docs.aws.amazon.com/cli/latest/reference/ecr/get-authorization-token.html
//             if (!registryId) {
//                 throw new Error("Expected registry ID to be defined during push");
//             }
//             const credentials = await aws.ecr.getCredentials({ registryId: registryId });
//             const decodedCredentials = Buffer.from(credentials.authorizationToken, "base64").toString();
//             const [username, password] = decodedCredentials.split(":");
//             if (!password || !username) {
//                 throw new Error("Invalid credentials");
//             }
//             return {
//                 registry: credentials.proxyEndpoint,
//                 username: username,
//                 password: password,
//             };
//         });

//         buildImageCache.set(imageName, uniqueImageName);

//         uniqueImageName.apply(d =>
//             pulumi.log.debug(`    build complete: ${imageName} (${d})`, logResource));
//     }

//     return createImageOptions(uniqueImageName, preEnv);
// }

// function computeImageFromImage(
//         preEnv: Record<string, pulumi.Input<string>>,
//         imageName: string): pulumi.Output<ImageOptions> {

//     return createImageOptions(imageName, preEnv);
// }

// function computeImageFromFunction(
//         func: () => void,
//         preEnv: Record<string, pulumi.Input<string>>,
//         imageName: string): pulumi.Output<ImageOptions> {

//     // TODO[pulumi/pulumi-cloud#85]: Put this in a real Pulumi-owned Docker image.
//     // TODO[pulumi/pulumi-cloud#86]: Pass the full local zipped folder through to the container (via S3?)
//     preEnv.PULUMI_SRC = pulumi.runtime.serializeFunctionAsync(func);
//     return createImageOptions(imageName, preEnv);
// }

// function createImageOptions(
//     image: pulumi.Input<string>,
//     environment: Record<string, pulumi.Input<string>>): pulumi.Output<ImageOptions> {

//     return pulumi.output({ image, environment });
// }

// // computeContainerDefinitions builds a ContainerDefinition for a provided Containers and LogGroup.
// function computeContainerDefinitions(
//         parent: pulumi.Resource,
//         containers: cloud.Containers,
//         ports: ExposedPorts | undefined,
//         logGroup: aws.cloudwatch.LogGroup): pulumi.Output<aws.ecs.ContainerDefinition[]> {

//     const containerDefinitions: pulumi.Output<aws.ecs.ContainerDefinition>[] =
//         Object.keys(containers).map(containerName => {
//             const container = containers[containerName];
//             const imageName = getImageName(container);
//             if (!imageName) {
//                 throw new Error("[getImageName] should have always produced an image name.");
//             }

//             let repository: aws.ecr.Repository | undefined;
//             if (container.build) {
//                 // Create the repository.  Note that we must do this in the current turn, before we hit any awaits.
//                 // The reason is subtle; however, if we do not, we end up with a circular reference between the
//                 // TaskDefinition that depends on this repository and the repository waiting for the TaskDefinition,
//                 // simply because permitting a turn in between lets the TaskDefinition's registration race ahead of us.
//                 repository = getOrCreateRepository(imageName);
//             }

//             const imageOptions = computeImage(parent, imageName, container, ports, repository);
//             const portMappings = (container.ports || []).map(p => ({
//                 containerPort: p.targetPort || p.port,
//                 // From https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html:
//                 // > For task definitions that use the awsvpc network mode, you should only specify the containerPort.
//                 // > The hostPort can be left blank or it must be the same value as the containerPort.
//                 //
//                 // However, if left blank, it will be automatically populated by AWS, potentially leading to dirty
//                 // diffs even when no changes have been made. Since we are currently always using `awsvpc` mode, we
//                 // go ahead and populate it with the same value as `containerPort`.
//                 //
//                 // See https://github.com/terraform-providers/terraform-provider-aws/issues/3401.
//                 hostPort: p.targetPort || p.port,
//             }));

//             return pulumi.all([imageOptions, container, logGroup.id])
//                          .apply(([imageOptions, container, logGroupId]) => {
//                 const keyValuePairs: { name: string, value: string }[] = [];
//                 for (const key of Object.keys(imageOptions.environment)) {
//                     keyValuePairs.push({ name: key, value: imageOptions.environment[key] });
//                 }

//                 const containerDefinition: aws.ecs.ContainerDefinition = {
//                     name: containerName,
//                     image: imageOptions.image,
//                     command: container.command,
//                     cpu: container.cpu,
//                     memory: container.memory,
//                     memoryReservation: container.memoryReservation,
//                     portMappings: portMappings,
//                     environment: keyValuePairs,
//                     mountPoints: (container.volumes || []).map(v => ({
//                         containerPath: v.containerPath,
//                         sourceVolume: (v.sourceVolume as Volume).getVolumeName(),
//                     })),
//                     logConfiguration: {
//                         logDriver: "awslogs",
//                         options: {
//                             "awslogs-group": logGroupId,
//                             "awslogs-region": aws.config.requireRegion(),
//                             "awslogs-stream-prefix": containerName,
//                         },
//                     },
//                     dockerLabels: container.dockerLabels,
//                 };
//                 return containerDefinition;
//             });
//         });

//     return pulumi.all(containerDefinitions);
// }

// // The ECS Task assume role policy for Task Roles
// const taskRolePolicy = {
//     "Version": "2012-10-17",
//     "Statement": [
//         {
//             "Action": "sts:AssumeRole",
//             "Principal": {
//                 "Service": "ecs-tasks.amazonaws.com",
//             },
//             "Effect": "Allow",
//             "Sid": "",
//         },
//     ],
// };

// interface ExposedPorts {
//     [name: string]: {
//         [port: string]: ExposedPort;
//     };
// }

// interface ExposedPort {
//     host: aws.elasticloadbalancingv2.LoadBalancer;
//     hostPort: number;
//     hostProtocol: cloud.ContainerProtocol;
// }

// // The AWS-specific Endpoint interface includes additional AWS implementation details for the exposed Endpoint.
// export interface Endpoint extends cloud.Endpoint {
//     loadBalancer: aws.elasticloadbalancingv2.LoadBalancer;
// }

// export type Endpoints = { [containerName: string]: { [port: number]: Endpoint } };

// export class Service extends pulumi.ComponentResource {
//     public readonly name: string;
//     public readonly containers: cloud.Containers;
//     public readonly replicas: number;
//     public readonly cluster: CloudCluster;
 //    public readonly resource: aws.ecs.Service;

//     public readonly endpoints: pulumi.Output<Endpoints>;
//     public readonly defaultEndpoint: pulumi.Output<Endpoint>;

//     public readonly getEndpoint: (containerName?: string, containerPort?: number) => Promise<Endpoint>;

//     // Expose the task role we create to clients (who will cast through <any>)
//     // so they can attach their own policies.
//     // TODO[pulumi/pulumi-cloud#145]: Find a better way to expose this functionality.
//     public static getTaskRole(): aws.iam.Role {
//         return getTaskRole();
//     }

//     constructor(name: string, args: ServiceArguments, opts?: pulumi.ResourceOptions) {
//         const cluster = getCluster();
//         if (!cluster) {
//             throw new Error("Cannot create 'Service'.  Missing cluster config 'cloud-aws:ecsClusterARN'" +
//                 " or 'cloud-aws:ecsAutoCluster' or 'cloud-aws:useFargate'");
//         }

//         let containers: cloud.Containers;
//         if (args.image || args.build || args.function) {
//             if (args.containers) {
//                 throw new Error(
//                     "Exactly one of image, build, function, or containers must be used, not multiple");
//             }
//             containers = { "default": args };
//         } else if (args.containers) {
//             containers = args.containers;
//         } else {
//             throw new Error(
//                 "Missing one of image, build, function, or containers, specifying this service's containers");
//         }

//         const replicas = args.replicas === undefined ? 1 : args.replicas;
//         const ports: ExposedPorts = {};

//         super("cloud:service:Service", name, {
//             containers: containers,
//             replicas: replicas,
//         }, opts);

//         this.name = name;
//         this.cluster = cluster;

//         // Get the network to create the Service within.
//         const network = getOrCreateNetwork();

//         // Create load balancer listeners/targets for each exposed port.
//         const loadBalancers = [];

//         let firstContainerName: string | undefined;
//         let firstContainerPort: number | undefined;

//         for (const containerName of Object.keys(containers)) {
//             const container = containers[containerName];
//             if (firstContainerName === undefined) {
//                 firstContainerName = containerName;
//                 if (container.ports && container.ports.length > 0) {
//                     firstContainerPort = container.ports[0].port;
//                 }
//             }

//             ports[containerName] = {};
//             if (container.ports) {
//                 for (const portMapping of container.ports) {
//                     if (loadBalancers.length > 0) {
//                         throw new Error("Only one port can currently be exposed per Service.");
//                     }
//                     const info = createLoadBalancer(this, cluster, name, containerName, portMapping, network);
//                     ports[containerName][portMapping.port] = {
//                         host: info.loadBalancer,
//                         hostPort: portMapping.port,
//                         hostProtocol: info.protocol,
//                     };
//                     loadBalancers.push({
//                         containerName: containerName,
//                         containerPort: portMapping.targetPort || portMapping.port,
//                         targetGroupArn: info.targetGroup.arn,
//                     });
//                 }
//             }
//         }

//         // Create the task definition, parented to this component.
//         const taskDefinition = createTaskDefinition(this, name, containers, ports);

//         // If the cluster has an autoscaling group, ensure the service depends on it being created.
//         const serviceDependsOn = [];
//         if (cluster.autoScalingGroupStack) {
//             serviceDependsOn.push(cluster.autoScalingGroupStack);
//         }

//         // Create the service.
//         const securityGroups = cluster.securityGroupId ? [ cluster.securityGroupId ] : [];
//         this.ecsService = new aws.ecs.Service(name, {
//             desiredCount: replicas,
//             taskDefinition: taskDefinition.task.arn,
//             cluster: cluster.ecsClusterARN,
//             loadBalancers: loadBalancers,
//             placementConstraints: placementConstraintsForHost(args.host),
//             waitForSteadyState: args.waitForSteadyState === undefined ? true : args.waitForSteadyState,
//             healthCheckGracePeriodSeconds: args.healthCheckGracePeriodSeconds,
//             launchType: config.useFargate ? "FARGATE" : "EC2",
//             networkConfiguration: {
//                 assignPublicIp: config.useFargate && !network.usePrivateSubnets,
//                 securityGroups: securityGroups,
//                 subnets: network.subnetIds,
//             },
//         }, { parent: this, dependsOn: serviceDependsOn });

//         const localEndpoints = getEndpoints(ports);
//         this.endpoints = localEndpoints;

//         this.defaultEndpoint = firstContainerName === undefined || firstContainerPort === undefined
//             ? pulumi.output(<Endpoint>undefined!)
//             : this.endpoints.apply(
//                 ep => getEndpointHelper(ep, /*containerName:*/ undefined, /*containerPort:*/ undefined));

//         this.getEndpoint = async (containerName, containerPort) => {
//             const endpoints = localEndpoints.get();
//             return getEndpointHelper(endpoints, containerName, containerPort);
//         };
//     }
// }

// function getEndpointHelper(
//     endpoints: Endpoints, containerName: string | undefined, containerPort: number | undefined): Endpoint {

//     containerName = containerName || Object.keys(endpoints)[0];
//     if (!containerName)  {
//         throw new Error(`No containers available in this service`);
//     }

//     const containerPorts = endpoints[containerName] || {};
//     containerPort = containerPort || +Object.keys(containerPorts)[0];
//     if (!containerPort) {
//         throw new Error(`No ports available in service container ${containerName}`);
//     }

//     const endpoint = containerPorts[containerPort];
//     if (!endpoint) {
//         throw new Error(`No exposed port for ${containerName} port ${containerPort}`);
//     }

//     return endpoint;
// }

// function getEndpoints(ports: ExposedPorts): pulumi.Output<Endpoints> {
//     return pulumi.all(utils.apply(ports, portToExposedPort => {
//         const inner: pulumi.Output<{ [port: string]: Endpoint }> =
//             pulumi.all(utils.apply(portToExposedPort, exposedPort =>
//                 exposedPort.host.dnsName.apply(d => ({
//                     port: exposedPort.hostPort, loadBalancer: exposedPort.host, hostname: d,
//                 }))));

//         return inner;
//     }));
// }

// const volumeNames = new Set<string>();

// export interface Volume extends cloud.Volume {
//     getVolumeName(): any;
//     getHostPath(): any;
// }

// // _Note_: In the current EFS-backed model, a Volume is purely virtual - it
// // doesn't actually manage any underlying resource.  It is used just to provide
// // a handle to a folder on the EFS share which can be mounted by container(s).
// // On platforms like ACI, we may be able to actually provision a unique File
// // Share per Volume to keep these independently manageable.  For now, on AWS
// // though, we rely on this File Share having been set up as part of the ECS
// // Cluster outside of @pulumi/cloud, and assume that that data has a lifetime
// // longer than any individual deployment.
// export class SharedVolume extends pulumi.ComponentResource implements Volume, cloud.SharedVolume {
//     public readonly kind: cloud.VolumeKind;
//     public readonly name: string;

//     constructor(name: string, opts?: pulumi.ResourceOptions) {
//         if (volumeNames.has(name)) {
//             throw new Error("Must provide a unique volume name");
//         }
//         super("cloud:volume:Volume", name, {}, opts);
//         this.kind = "SharedVolume";
//         this.name = name;
//         volumeNames.add(name);
//     }

//     getVolumeName() {
//         // Ensure this is unique to avoid conflicts both in EFS and in the
//         // TaskDefinition we pass to ECS.
//         return utils.sha1hash(`${pulumi.getProject()}:${pulumi.getStack()}:${this.kind}:${this.name}`);
//     }

//     getHostPath() {
//         const cluster = getCluster();
//         if (!cluster || !cluster.efsMountPath) {
//             throw new Error(
//                 "Cannot use 'Volume'.  Configured cluster does not support EFS.",
//             );
//         }
//         // Include the unique `getVolumeName` in the EFS host path to ensure this doesn't
//         // clash with other deployments.
//         return `${cluster.efsMountPath}/${this.name}_${this.getVolumeName()}`;
//     }
// }

// export class HostPathVolume implements cloud.HostPathVolume {
//     public readonly kind: cloud.VolumeKind;
//     public readonly path: string;

//     constructor(path: string) {
//         this.kind = "HostPathVolume";
//         this.path = path;
//     }

//     getVolumeName() {
//         return utils.sha1hash(`${this.kind}:${this.path}`);
//     }

//     getHostPath() {
//         return this.path;
//     }
// }

