// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Awsx.Lb.Inputs
{

    /// <summary>
    /// Provides a Target Group resource for use with Load Balancer resources.
    /// 
    /// &gt; **Note:** `aws.alb.TargetGroup` is known as `aws.lb.TargetGroup`. The functionality is identical.
    /// 
    /// {{% examples %}}
    /// ## Example Usage
    /// {{% example %}}
    /// ### Instance Target Group
    /// 
    /// ```typescript
    /// import * as pulumi from "@pulumi/pulumi";
    /// import * as aws from "@pulumi/aws";
    /// 
    /// const main = new aws.ec2.Vpc("main", {cidrBlock: "10.0.0.0/16"});
    /// const test = new aws.lb.TargetGroup("test", {
    ///     port: 80,
    ///     protocol: "HTTP",
    ///     vpcId: main.id,
    /// });
    /// ```
    /// ```python
    /// import pulumi
    /// import pulumi_aws as aws
    /// 
    /// main = aws.ec2.Vpc("main", cidr_block="10.0.0.0/16")
    /// test = aws.lb.TargetGroup("test",
    ///     port=80,
    ///     protocol="HTTP",
    ///     vpc_id=main.id)
    /// ```
    /// ```csharp
    /// using Pulumi;
    /// using Aws = Pulumi.Aws;
    /// 
    /// class MyStack : Stack
    /// {
    ///     public MyStack()
    ///     {
    ///         var main = new Aws.Ec2.Vpc("main", new Aws.Ec2.VpcArgs
    ///         {
    ///             CidrBlock = "10.0.0.0/16",
    ///         });
    ///         var test = new Aws.LB.TargetGroup("test", new Aws.LB.TargetGroupArgs
    ///         {
    ///             Port = 80,
    ///             Protocol = "HTTP",
    ///             VpcId = main.Id,
    ///         });
    ///     }
    /// 
    /// }
    /// ```
    /// ```go
    /// package main
    /// 
    /// import (
    /// 	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/ec2"
    /// 	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/lb"
    /// 	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
    /// )
    /// 
    /// func main() {
    /// 	pulumi.Run(func(ctx *pulumi.Context) error {
    /// 		main, err := ec2.NewVpc(ctx, "main", &amp;ec2.VpcArgs{
    /// 			CidrBlock: pulumi.String("10.0.0.0/16"),
    /// 		})
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		_, err = lb.NewTargetGroup(ctx, "test", &amp;lb.TargetGroupArgs{
    /// 			Port:     pulumi.Int(80),
    /// 			Protocol: pulumi.String("HTTP"),
    /// 			VpcId:    main.ID(),
    /// 		})
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		return nil
    /// 	})
    /// }
    /// ```
    /// {{% /example %}}
    /// {{% example %}}
    /// ### IP Target Group
    /// 
    /// ```typescript
    /// import * as pulumi from "@pulumi/pulumi";
    /// import * as aws from "@pulumi/aws";
    /// 
    /// const main = new aws.ec2.Vpc("main", {cidrBlock: "10.0.0.0/16"});
    /// const ip_example = new aws.lb.TargetGroup("ip-example", {
    ///     port: 80,
    ///     protocol: "HTTP",
    ///     targetType: "ip",
    ///     vpcId: main.id,
    /// });
    /// ```
    /// ```python
    /// import pulumi
    /// import pulumi_aws as aws
    /// 
    /// main = aws.ec2.Vpc("main", cidr_block="10.0.0.0/16")
    /// ip_example = aws.lb.TargetGroup("ip-example",
    ///     port=80,
    ///     protocol="HTTP",
    ///     target_type="ip",
    ///     vpc_id=main.id)
    /// ```
    /// ```csharp
    /// using Pulumi;
    /// using Aws = Pulumi.Aws;
    /// 
    /// class MyStack : Stack
    /// {
    ///     public MyStack()
    ///     {
    ///         var main = new Aws.Ec2.Vpc("main", new Aws.Ec2.VpcArgs
    ///         {
    ///             CidrBlock = "10.0.0.0/16",
    ///         });
    ///         var ip_example = new Aws.LB.TargetGroup("ip-example", new Aws.LB.TargetGroupArgs
    ///         {
    ///             Port = 80,
    ///             Protocol = "HTTP",
    ///             TargetType = "ip",
    ///             VpcId = main.Id,
    ///         });
    ///     }
    /// 
    /// }
    /// ```
    /// ```go
    /// package main
    /// 
    /// import (
    /// 	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/ec2"
    /// 	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/lb"
    /// 	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
    /// )
    /// 
    /// func main() {
    /// 	pulumi.Run(func(ctx *pulumi.Context) error {
    /// 		main, err := ec2.NewVpc(ctx, "main", &amp;ec2.VpcArgs{
    /// 			CidrBlock: pulumi.String("10.0.0.0/16"),
    /// 		})
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		_, err = lb.NewTargetGroup(ctx, "ip-example", &amp;lb.TargetGroupArgs{
    /// 			Port:       pulumi.Int(80),
    /// 			Protocol:   pulumi.String("HTTP"),
    /// 			TargetType: pulumi.String("ip"),
    /// 			VpcId:      main.ID(),
    /// 		})
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		return nil
    /// 	})
    /// }
    /// ```
    /// {{% /example %}}
    /// {{% example %}}
    /// ### Lambda Target Group
    /// 
    /// ```typescript
    /// import * as pulumi from "@pulumi/pulumi";
    /// import * as aws from "@pulumi/aws";
    /// 
    /// const lambda_example = new aws.lb.TargetGroup("lambda-example", {
    ///     targetType: "lambda",
    /// });
    /// ```
    /// ```python
    /// import pulumi
    /// import pulumi_aws as aws
    /// 
    /// lambda_example = aws.lb.TargetGroup("lambda-example", target_type="lambda")
    /// ```
    /// ```csharp
    /// using Pulumi;
    /// using Aws = Pulumi.Aws;
    /// 
    /// class MyStack : Stack
    /// {
    ///     public MyStack()
    ///     {
    ///         var lambda_example = new Aws.LB.TargetGroup("lambda-example", new Aws.LB.TargetGroupArgs
    ///         {
    ///             TargetType = "lambda",
    ///         });
    ///     }
    /// 
    /// }
    /// ```
    /// ```go
    /// package main
    /// 
    /// import (
    /// 	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/lb"
    /// 	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
    /// )
    /// 
    /// func main() {
    /// 	pulumi.Run(func(ctx *pulumi.Context) error {
    /// 		_, err := lb.NewTargetGroup(ctx, "lambda-example", &amp;lb.TargetGroupArgs{
    /// 			TargetType: pulumi.String("lambda"),
    /// 		})
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		return nil
    /// 	})
    /// }
    /// ```
    /// {{% /example %}}
    /// {{% /examples %}}
    /// 
    /// ## Import
    /// 
    /// Target Groups can be imported using their ARN, e.g.,
    /// 
    /// ```sh
    ///  $ pulumi import aws:lb/targetGroup:TargetGroup app_front_end arn:aws:elasticloadbalancing:us-west-2:187416307283:targetgroup/app-front-end/20cfe21448b66314
    /// ```
    /// 
    ///  
    /// </summary>
    public sealed class TargetGroupArgs : Pulumi.ResourceArgs
    {
        /// <summary>
        /// Whether to terminate connections at the end of the deregistration timeout on Network Load Balancers. See [doc](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html#deregistration-delay) for more information. Default is `false`.
        /// </summary>
        [Input("connectionTermination")]
        public Input<bool>? ConnectionTermination { get; set; }

        /// <summary>
        /// Amount time for Elastic Load Balancing to wait before changing the state of a deregistering target from draining to unused. The range is 0-3600 seconds. The default value is 300 seconds.
        /// </summary>
        [Input("deregistrationDelay")]
        public Input<int>? DeregistrationDelay { get; set; }

        /// <summary>
        /// Health Check configuration block. Detailed below.
        /// </summary>
        [Input("healthCheck")]
        public Input<Pulumi.Aws.LB.Inputs.TargetGroupHealthCheckArgs>? HealthCheck { get; set; }

        /// <summary>
        /// Whether the request and response headers exchanged between the load balancer and the Lambda function include arrays of values or strings. Only applies when `target_type` is `lambda`. Default is `false`.
        /// </summary>
        [Input("lambdaMultiValueHeadersEnabled")]
        public Input<bool>? LambdaMultiValueHeadersEnabled { get; set; }

        /// <summary>
        /// Determines how the load balancer selects targets when routing requests. Only applicable for Application Load Balancer Target Groups. The value is `round_robin` or `least_outstanding_requests`. The default is `round_robin`.
        /// </summary>
        [Input("loadBalancingAlgorithmType")]
        public Input<string>? LoadBalancingAlgorithmType { get; set; }

        /// <summary>
        /// Name of the target group. If omitted, this provider will assign a random, unique name.
        /// </summary>
        [Input("name")]
        public Input<string>? Name { get; set; }

        /// <summary>
        /// Creates a unique name beginning with the specified prefix. Conflicts with `name`. Cannot be longer than 6 characters.
        /// </summary>
        [Input("namePrefix")]
        public Input<string>? NamePrefix { get; set; }

        /// <summary>
        /// Port to use to connect with the target. Valid values are either ports 1-65535, or `traffic-port`. Defaults to `traffic-port`.
        /// </summary>
        [Input("port")]
        public Input<int>? Port { get; set; }

        /// <summary>
        /// Whether client IP preservation is enabled. See [doc](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html#client-ip-preservation) for more information.
        /// </summary>
        [Input("preserveClientIp")]
        public Input<string>? PreserveClientIp { get; set; }

        /// <summary>
        /// Protocol to use to connect with the target. Defaults to `HTTP`. Not applicable when `target_type` is `lambda`.
        /// </summary>
        [Input("protocol")]
        public Input<string>? Protocol { get; set; }

        /// <summary>
        /// Only applicable when `protocol` is `HTTP` or `HTTPS`. The protocol version. Specify GRPC to send requests to targets using gRPC. Specify HTTP2 to send requests to targets using HTTP/2. The default is HTTP1, which sends requests to targets using HTTP/1.1
        /// </summary>
        [Input("protocolVersion")]
        public Input<string>? ProtocolVersion { get; set; }

        /// <summary>
        /// Whether to enable support for proxy protocol v2 on Network Load Balancers. See [doc](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html#proxy-protocol) for more information. Default is `false`.
        /// </summary>
        [Input("proxyProtocolV2")]
        public Input<bool>? ProxyProtocolV2 { get; set; }

        /// <summary>
        /// Amount time for targets to warm up before the load balancer sends them a full share of requests. The range is 30-900 seconds or 0 to disable. The default value is 0 seconds.
        /// </summary>
        [Input("slowStart")]
        public Input<int>? SlowStart { get; set; }

        /// <summary>
        /// Stickiness configuration block. Detailed below.
        /// </summary>
        [Input("stickiness")]
        public Input<Pulumi.Aws.LB.Inputs.TargetGroupStickinessArgs>? Stickiness { get; set; }

        [Input("tags")]
        private InputMap<string>? _tags;

        /// <summary>
        /// Map of tags to assign to the resource. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        /// </summary>
        public InputMap<string> Tags
        {
            get => _tags ?? (_tags = new InputMap<string>());
            set => _tags = value;
        }

        /// <summary>
        /// Type of target that you must specify when registering targets with this target group. See [doc](https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_CreateTargetGroup.html) for supported values. The default is `instance`.
        /// </summary>
        [Input("targetType")]
        public Input<string>? TargetType { get; set; }

        /// <summary>
        /// Identifier of the VPC in which to create the target group. Required when `target_type` is `instance` or `ip`. Does not apply when `target_type` is `lambda`.
        /// </summary>
        [Input("vpcId")]
        public Input<string>? VpcId { get; set; }

        public TargetGroupArgs()
        {
        }
    }
}
