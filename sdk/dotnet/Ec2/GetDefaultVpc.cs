// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Ec2
{
    [Obsolete(@"Waiting for https://github.com/pulumi/pulumi/issues/7583. Use the DefaultVpc resource until resolved.")]
    public static class GetDefaultVpc
    {
        /// <summary>
        /// [NOT YET IMPLEMENTED] Get the Default VPC for a region.
        /// </summary>
        public static Task<GetDefaultVpcResult> InvokeAsync(GetDefaultVpcArgs? args = null, InvokeOptions? options = null)
            => global::Pulumi.Deployment.Instance.InvokeAsync<GetDefaultVpcResult>("awsx:ec2:getDefaultVpc", args ?? new GetDefaultVpcArgs(), options.WithDefaults());

        /// <summary>
        /// [NOT YET IMPLEMENTED] Get the Default VPC for a region.
        /// </summary>
        public static Output<GetDefaultVpcResult> Invoke(InvokeOptions? options = null)
            => global::Pulumi.Deployment.Instance.Invoke<GetDefaultVpcResult>("awsx:ec2:getDefaultVpc", InvokeArgs.Empty, options.WithDefaults());

        /// <summary>
        /// [NOT YET IMPLEMENTED] Get the Default VPC for a region.
        /// </summary>
        public static Output<GetDefaultVpcResult> Invoke(InvokeOutputOptions options)
            => global::Pulumi.Deployment.Instance.Invoke<GetDefaultVpcResult>("awsx:ec2:getDefaultVpc", InvokeArgs.Empty, options.WithDefaults());
    }


    public sealed class GetDefaultVpcArgs : global::Pulumi.InvokeArgs
    {
        public GetDefaultVpcArgs()
        {
        }
        public static new GetDefaultVpcArgs Empty => new GetDefaultVpcArgs();
    }


    [OutputType]
    public sealed class GetDefaultVpcResult
    {
        public readonly ImmutableArray<string> PrivateSubnetIds;
        public readonly ImmutableArray<string> PublicSubnetIds;
        /// <summary>
        /// The VPC ID for the default VPC
        /// </summary>
        public readonly string VpcId;

        [OutputConstructor]
        private GetDefaultVpcResult(
            ImmutableArray<string> privateSubnetIds,

            ImmutableArray<string> publicSubnetIds,

            string vpcId)
        {
            PrivateSubnetIds = privateSubnetIds;
            PublicSubnetIds = publicSubnetIds;
            VpcId = vpcId;
        }
    }
}
