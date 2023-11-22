// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Apigatewayv2.Inputs
{

    public sealed class HttpRouteArgs : global::Pulumi.ResourceArgs
    {
        /// <summary>
        /// The key of the target authorizer for the route specified in the `authorizers` property. This is used to automatically calculate the `authorizerId` property of the route.
        /// </summary>
        [Input("authorizer")]
        public Input<string>? Authorizer { get; set; }

        /// <summary>
        /// The key of the target integration for the route specified in the `integrations` property. This is used to automatically calculate the `target` property of the route. One of `integration` or `target` must be specified.
        /// </summary>
        [Input("integration")]
        public Input<string>? Integration { get; set; }

        public HttpRouteArgs()
        {
        }
        public static new HttpRouteArgs Empty => new HttpRouteArgs();
    }
}
