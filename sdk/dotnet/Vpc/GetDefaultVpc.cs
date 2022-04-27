// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Vpc
{
    public static class GetDefaultVpc
    {
        /// <summary>
        /// Get the Default VPC for a region
        /// </summary>
        public static Task<GetDefaultVpcResult> InvokeAsync(GetDefaultVpcArgs? args = null, InvokeOptions? options = null)
            => Pulumi.Deployment.Instance.InvokeAsync<GetDefaultVpcResult>("awsx:vpc:getDefaultVpc", args ?? new GetDefaultVpcArgs(), options.WithDefaults());
    }


    public sealed class GetDefaultVpcArgs : Pulumi.InvokeArgs
    {
        public GetDefaultVpcArgs()
        {
        }
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
