// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Ecr
{
    public static class BuildAndPushImage
    {
        /// <summary>
        /// Build and push a docker image to ECR
        /// </summary>
        public static Task<BuildAndPushImageResult> InvokeAsync(BuildAndPushImageArgs args, InvokeOptions? options = null)
            => Pulumi.Deployment.Instance.InvokeAsync<BuildAndPushImageResult>("awsx:ecr:buildAndPushImage", args ?? new BuildAndPushImageArgs(), options.WithDefaults());

        /// <summary>
        /// Build and push a docker image to ECR
        /// </summary>
        public static Output<BuildAndPushImageResult> Invoke(BuildAndPushImageInvokeArgs args, InvokeOptions? options = null)
            => Pulumi.Deployment.Instance.Invoke<BuildAndPushImageResult>("awsx:ecr:buildAndPushImage", args ?? new BuildAndPushImageInvokeArgs(), options.WithDefaults());
    }


    public sealed class BuildAndPushImageArgs : Pulumi.InvokeArgs
    {
        /// <summary>
        /// Arguments for building the docker image.
        /// </summary>
        [Input("docker")]
        public Inputs.DockerBuild? Docker { get; set; }

        /// <summary>
        /// The Amazon Web Services account ID associated with the registry that contains the repository. If you do not specify a registry, the default registry is assumed.
        /// </summary>
        [Input("registryId")]
        public string? RegistryId { get; set; }

        [Input("repositoryName", required: true)]
        public string RepositoryName { get; set; } = null!;

        public BuildAndPushImageArgs()
        {
        }
    }

    public sealed class BuildAndPushImageInvokeArgs : Pulumi.InvokeArgs
    {
        /// <summary>
        /// Arguments for building the docker image.
        /// </summary>
        [Input("docker")]
        public Input<Inputs.DockerBuildArgs>? Docker { get; set; }

        /// <summary>
        /// The Amazon Web Services account ID associated with the registry that contains the repository. If you do not specify a registry, the default registry is assumed.
        /// </summary>
        [Input("registryId")]
        public Input<string>? RegistryId { get; set; }

        [Input("repositoryName", required: true)]
        public Input<string> RepositoryName { get; set; } = null!;

        public BuildAndPushImageInvokeArgs()
        {
        }
    }


    [OutputType]
    public sealed class BuildAndPushImageResult
    {
        /// <summary>
        /// Unique identifier of the pushed image
        /// </summary>
        public readonly string? Image;

        [OutputConstructor]
        private BuildAndPushImageResult(string? image)
        {
            Image = image;
        }
    }
}
