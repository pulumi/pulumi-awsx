// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Apigatewayv2.Inputs
{

    /// <summary>
    /// Manages an Amazon API Gateway Version 2 authorizer.
    /// More information can be found in the [Amazon API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html).
    /// 
    /// {{% examples %}}
    /// ## Example Usage
    /// {{% example %}}
    /// ### Basic WebSocket API
    /// 
    /// ```typescript
    /// import * as pulumi from "@pulumi/pulumi";
    /// import * as aws from "@pulumi/aws";
    /// 
    /// const example = new aws.apigatewayv2.Authorizer("example", {
    ///     apiId: aws_apigatewayv2_api.example.id,
    ///     authorizerType: "REQUEST",
    ///     authorizerUri: aws_lambda_function.example.invoke_arn,
    ///     identitySources: ["route.request.header.Auth"],
    /// });
    /// ```
    /// ```python
    /// import pulumi
    /// import pulumi_aws as aws
    /// 
    /// example = aws.apigatewayv2.Authorizer("example",
    ///     api_id=aws_apigatewayv2_api["example"]["id"],
    ///     authorizer_type="REQUEST",
    ///     authorizer_uri=aws_lambda_function["example"]["invoke_arn"],
    ///     identity_sources=["route.request.header.Auth"])
    /// ```
    /// ```csharp
    /// using System.Collections.Generic;
    /// using System.Linq;
    /// using Pulumi;
    /// using Aws = Pulumi.Aws;
    /// 
    /// return await Deployment.RunAsync(() =&gt; 
    /// {
    ///     var example = new Aws.ApiGatewayV2.Authorizer("example", new()
    ///     {
    ///         ApiId = aws_apigatewayv2_api.Example.Id,
    ///         AuthorizerType = "REQUEST",
    ///         AuthorizerUri = aws_lambda_function.Example.Invoke_arn,
    ///         IdentitySources = new[]
    ///         {
    ///             "route.request.header.Auth",
    ///         },
    ///     });
    /// 
    /// });
    /// ```
    /// ```go
    /// package main
    /// 
    /// import (
    /// 	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/apigatewayv2"
    /// 	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
    /// )
    /// 
    /// func main() {
    /// 	pulumi.Run(func(ctx *pulumi.Context) error {
    /// 		_, err := apigatewayv2.NewAuthorizer(ctx, "example", &amp;apigatewayv2.AuthorizerArgs{
    /// 			ApiId:          pulumi.Any(aws_apigatewayv2_api.Example.Id),
    /// 			AuthorizerType: pulumi.String("REQUEST"),
    /// 			AuthorizerUri:  pulumi.Any(aws_lambda_function.Example.Invoke_arn),
    /// 			IdentitySources: pulumi.StringArray{
    /// 				pulumi.String("route.request.header.Auth"),
    /// 			},
    /// 		})
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		return nil
    /// 	})
    /// }
    /// ```
    /// ```java
    /// package generated_program;
    /// 
    /// import com.pulumi.Context;
    /// import com.pulumi.Pulumi;
    /// import com.pulumi.core.Output;
    /// import com.pulumi.aws.apigatewayv2.Authorizer;
    /// import com.pulumi.aws.apigatewayv2.AuthorizerArgs;
    /// import java.util.List;
    /// import java.util.ArrayList;
    /// import java.util.Map;
    /// import java.io.File;
    /// import java.nio.file.Files;
    /// import java.nio.file.Paths;
    /// 
    /// public class App {
    ///     public static void main(String[] args) {
    ///         Pulumi.run(App::stack);
    ///     }
    /// 
    ///     public static void stack(Context ctx) {
    ///         var example = new Authorizer("example", AuthorizerArgs.builder()        
    ///             .apiId(aws_apigatewayv2_api.example().id())
    ///             .authorizerType("REQUEST")
    ///             .authorizerUri(aws_lambda_function.example().invoke_arn())
    ///             .identitySources("route.request.header.Auth")
    ///             .build());
    /// 
    ///     }
    /// }
    /// ```
    /// ```yaml
    /// resources:
    ///   example:
    ///     type: aws:apigatewayv2:Authorizer
    ///     properties:
    ///       apiId: ${aws_apigatewayv2_api.example.id}
    ///       authorizerType: REQUEST
    ///       authorizerUri: ${aws_lambda_function.example.invoke_arn}
    ///       identitySources:
    ///         - route.request.header.Auth
    /// ```
    /// {{% /example %}}
    /// {{% example %}}
    /// ### Basic HTTP API
    /// 
    /// ```typescript
    /// import * as pulumi from "@pulumi/pulumi";
    /// import * as aws from "@pulumi/aws";
    /// 
    /// const example = new aws.apigatewayv2.Authorizer("example", {
    ///     apiId: aws_apigatewayv2_api.example.id,
    ///     authorizerType: "REQUEST",
    ///     authorizerUri: aws_lambda_function.example.invoke_arn,
    ///     identitySources: ["$request.header.Authorization"],
    ///     authorizerPayloadFormatVersion: "2.0",
    /// });
    /// ```
    /// ```python
    /// import pulumi
    /// import pulumi_aws as aws
    /// 
    /// example = aws.apigatewayv2.Authorizer("example",
    ///     api_id=aws_apigatewayv2_api["example"]["id"],
    ///     authorizer_type="REQUEST",
    ///     authorizer_uri=aws_lambda_function["example"]["invoke_arn"],
    ///     identity_sources=["$request.header.Authorization"],
    ///     authorizer_payload_format_version="2.0")
    /// ```
    /// ```csharp
    /// using System.Collections.Generic;
    /// using System.Linq;
    /// using Pulumi;
    /// using Aws = Pulumi.Aws;
    /// 
    /// return await Deployment.RunAsync(() =&gt; 
    /// {
    ///     var example = new Aws.ApiGatewayV2.Authorizer("example", new()
    ///     {
    ///         ApiId = aws_apigatewayv2_api.Example.Id,
    ///         AuthorizerType = "REQUEST",
    ///         AuthorizerUri = aws_lambda_function.Example.Invoke_arn,
    ///         IdentitySources = new[]
    ///         {
    ///             "$request.header.Authorization",
    ///         },
    ///         AuthorizerPayloadFormatVersion = "2.0",
    ///     });
    /// 
    /// });
    /// ```
    /// ```go
    /// package main
    /// 
    /// import (
    /// 	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/apigatewayv2"
    /// 	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
    /// )
    /// 
    /// func main() {
    /// 	pulumi.Run(func(ctx *pulumi.Context) error {
    /// 		_, err := apigatewayv2.NewAuthorizer(ctx, "example", &amp;apigatewayv2.AuthorizerArgs{
    /// 			ApiId:          pulumi.Any(aws_apigatewayv2_api.Example.Id),
    /// 			AuthorizerType: pulumi.String("REQUEST"),
    /// 			AuthorizerUri:  pulumi.Any(aws_lambda_function.Example.Invoke_arn),
    /// 			IdentitySources: pulumi.StringArray{
    /// 				pulumi.String("$request.header.Authorization"),
    /// 			},
    /// 			AuthorizerPayloadFormatVersion: pulumi.String("2.0"),
    /// 		})
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		return nil
    /// 	})
    /// }
    /// ```
    /// ```java
    /// package generated_program;
    /// 
    /// import com.pulumi.Context;
    /// import com.pulumi.Pulumi;
    /// import com.pulumi.core.Output;
    /// import com.pulumi.aws.apigatewayv2.Authorizer;
    /// import com.pulumi.aws.apigatewayv2.AuthorizerArgs;
    /// import java.util.List;
    /// import java.util.ArrayList;
    /// import java.util.Map;
    /// import java.io.File;
    /// import java.nio.file.Files;
    /// import java.nio.file.Paths;
    /// 
    /// public class App {
    ///     public static void main(String[] args) {
    ///         Pulumi.run(App::stack);
    ///     }
    /// 
    ///     public static void stack(Context ctx) {
    ///         var example = new Authorizer("example", AuthorizerArgs.builder()        
    ///             .apiId(aws_apigatewayv2_api.example().id())
    ///             .authorizerType("REQUEST")
    ///             .authorizerUri(aws_lambda_function.example().invoke_arn())
    ///             .identitySources("$request.header.Authorization")
    ///             .authorizerPayloadFormatVersion("2.0")
    ///             .build());
    /// 
    ///     }
    /// }
    /// ```
    /// ```yaml
    /// resources:
    ///   example:
    ///     type: aws:apigatewayv2:Authorizer
    ///     properties:
    ///       apiId: ${aws_apigatewayv2_api.example.id}
    ///       authorizerType: REQUEST
    ///       authorizerUri: ${aws_lambda_function.example.invoke_arn}
    ///       identitySources:
    ///         - $request.header.Authorization
    ///       authorizerPayloadFormatVersion: '2.0'
    /// ```
    /// {{% /example %}}
    /// {{% /examples %}}
    /// 
    /// ## Import
    /// 
    /// Using `pulumi import`, import `aws_apigatewayv2_authorizer` using the API identifier and authorizer identifier. For example:
    /// 
    /// ```sh
    ///  $ pulumi import aws:apigatewayv2/authorizer:Authorizer example aabbccddee/1122334
    /// ```
    ///  
    /// </summary>
    public sealed class HttpAuthorizerArgs : global::Pulumi.ResourceArgs
    {
        /// <summary>
        /// Required credentials as an IAM role for API Gateway to invoke the authorizer.
        /// Supported only for `REQUEST` authorizers.
        /// </summary>
        [Input("authorizerCredentialsArn")]
        public Input<string>? AuthorizerCredentialsArn { get; set; }

        /// <summary>
        /// Format of the payload sent to an HTTP API Lambda authorizer. Required for HTTP API Lambda authorizers.
        /// Valid values: `1.0`, `2.0`.
        /// </summary>
        [Input("authorizerPayloadFormatVersion")]
        public Input<string>? AuthorizerPayloadFormatVersion { get; set; }

        /// <summary>
        /// Time to live (TTL) for cached authorizer results, in seconds. If it equals 0, authorization caching is disabled.
        /// If it is greater than 0, API Gateway caches authorizer responses. The maximum value is 3600, or 1 hour. Defaults to `300`.
        /// Supported only for HTTP API Lambda authorizers.
        /// </summary>
        [Input("authorizerResultTtlInSeconds")]
        public Input<int>? AuthorizerResultTtlInSeconds { get; set; }

        /// <summary>
        /// Authorizer type. Valid values: `JWT`, `REQUEST`.
        /// Specify `REQUEST` for a Lambda function using incoming request parameters.
        /// For HTTP APIs, specify `JWT` to use JSON Web Tokens.
        /// </summary>
        [Input("authorizerType", required: true)]
        public Input<string> AuthorizerType { get; set; } = null!;

        /// <summary>
        /// Authorizer's Uniform Resource Identifier (URI).
        /// For `REQUEST` authorizers this must be a well-formed Lambda function URI, such as the `invoke_arn` attribute of the `aws.lambda.Function` resource.
        /// Supported only for `REQUEST` authorizers. Must be between 1 and 2048 characters in length.
        /// </summary>
        [Input("authorizerUri")]
        public Input<string>? AuthorizerUri { get; set; }

        /// <summary>
        /// Whether a Lambda authorizer returns a response in a simple format. If enabled, the Lambda authorizer can return a boolean value instead of an IAM policy.
        /// Supported only for HTTP APIs.
        /// </summary>
        [Input("enableSimpleResponses")]
        public Input<bool>? EnableSimpleResponses { get; set; }

        [Input("identitySources")]
        private InputList<string>? _identitySources;

        /// <summary>
        /// Identity sources for which authorization is requested.
        /// For `REQUEST` authorizers the value is a list of one or more mapping expressions of the specified request parameters.
        /// For `JWT` authorizers the single entry specifies where to extract the JSON Web Token (JWT) from inbound requests.
        /// </summary>
        public InputList<string> IdentitySources
        {
            get => _identitySources ?? (_identitySources = new InputList<string>());
            set => _identitySources = value;
        }

        /// <summary>
        /// Configuration of a JWT authorizer. Required for the `JWT` authorizer type.
        /// Supported only for HTTP APIs.
        /// </summary>
        [Input("jwtConfiguration")]
        public Input<Pulumi.Aws.ApiGatewayV2.Inputs.AuthorizerJwtConfigurationArgs>? JwtConfiguration { get; set; }

        /// <summary>
        /// Name of the authorizer. Must be between 1 and 128 characters in length.
        /// </summary>
        [Input("name")]
        public Input<string>? Name { get; set; }

        public HttpAuthorizerArgs()
        {
        }
        public static new HttpAuthorizerArgs Empty => new HttpAuthorizerArgs();
    }
}
