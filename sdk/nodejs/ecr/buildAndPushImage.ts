// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import { input as inputs, output as outputs } from "../types";
import * as utilities from "../utilities";

/**
 * Build and push a docker image to ECR
 */
export function buildAndPushImage(args: BuildAndPushImageArgs, opts?: pulumi.InvokeOptions): Promise<BuildAndPushImageResult> {
    if (!opts) {
        opts = {}
    }

    opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
    return pulumi.runtime.invoke("awsx:ecr:buildAndPushImage", {
        "docker": args.docker,
        "registryId": args.registryId,
        "repositoryName": args.repositoryName,
    }, opts);
}

/**
 * Arguments for building and publishing a docker image to ECR
 */
export interface BuildAndPushImageArgs {
    /**
     * Arguments for building the docker image.
     */
    docker?: inputs.ecr.DockerBuild;
    /**
     * The Amazon Web Services account ID associated with the registry that contains the repository. If you do not specify a registry, the default registry is assumed.
     */
    registryId?: string;
    repositoryName: string;
}

/**
 * Outputs from the pushed docker image
 */
export interface BuildAndPushImageResult {
    /**
     * Unique identifier of the pushed image
     */
    readonly image?: string;
}

export function buildAndPushImageOutput(args: BuildAndPushImageOutputArgs, opts?: pulumi.InvokeOptions): pulumi.Output<BuildAndPushImageResult> {
    return pulumi.output(args).apply(a => buildAndPushImage(a, opts))
}

/**
 * Arguments for building and publishing a docker image to ECR
 */
export interface BuildAndPushImageOutputArgs {
    /**
     * Arguments for building the docker image.
     */
    docker?: pulumi.Input<inputs.ecr.DockerBuildArgs>;
    /**
     * The Amazon Web Services account ID associated with the registry that contains the repository. If you do not specify a registry, the default registry is assumed.
     */
    registryId?: pulumi.Input<string>;
    repositoryName: pulumi.Input<string>;
}
