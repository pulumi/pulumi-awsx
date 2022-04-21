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
    /// Provides a Load Balancer Listener resource.
    /// 
    /// &gt; **Note:** `aws.alb.Listener` is known as `aws.lb.Listener`. The functionality is identical.
    /// 
    /// {{% examples %}}
    /// ## Example Usage
    /// {{% example %}}
    /// ### Forward Action
    /// 
    /// ```typescript
    /// import * as pulumi from "@pulumi/pulumi";
    /// import * as aws from "@pulumi/aws";
    /// 
    /// const frontEndLoadBalancer = new aws.lb.LoadBalancer("frontEndLoadBalancer", {});
    /// // ...
    /// const frontEndTargetGroup = new aws.lb.TargetGroup("frontEndTargetGroup", {});
    /// // ...
    /// const frontEndListener = new aws.lb.Listener("frontEndListener", {
    ///     loadBalancerArn: frontEndLoadBalancer.arn,
    ///     port: "443",
    ///     protocol: "HTTPS",
    ///     sslPolicy: "ELBSecurityPolicy-2016-08",
    ///     certificateArn: "arn:aws:iam::187416307283:server-certificate/test_cert_rab3wuqwgja25ct3n4jdj2tzu4",
    ///     defaultActions: [{
    ///         type: "forward",
    ///         targetGroupArn: frontEndTargetGroup.arn,
    ///     }],
    /// });
    /// ```
    /// ```python
    /// import pulumi
    /// import pulumi_aws as aws
    /// 
    /// front_end_load_balancer = aws.lb.LoadBalancer("frontEndLoadBalancer")
    /// # ...
    /// front_end_target_group = aws.lb.TargetGroup("frontEndTargetGroup")
    /// # ...
    /// front_end_listener = aws.lb.Listener("frontEndListener",
    ///     load_balancer_arn=front_end_load_balancer.arn,
    ///     port=443,
    ///     protocol="HTTPS",
    ///     ssl_policy="ELBSecurityPolicy-2016-08",
    ///     certificate_arn="arn:aws:iam::187416307283:server-certificate/test_cert_rab3wuqwgja25ct3n4jdj2tzu4",
    ///     default_actions=[aws.lb.ListenerDefaultActionArgs(
    ///         type="forward",
    ///         target_group_arn=front_end_target_group.arn,
    ///     )])
    /// ```
    /// ```csharp
    /// using Pulumi;
    /// using Aws = Pulumi.Aws;
    /// 
    /// class MyStack : Stack
    /// {
    ///     public MyStack()
    ///     {
    ///         var frontEndLoadBalancer = new Aws.LB.LoadBalancer("frontEndLoadBalancer", new Aws.LB.LoadBalancerArgs
    ///         {
    ///         });
    ///         // ...
    ///         var frontEndTargetGroup = new Aws.LB.TargetGroup("frontEndTargetGroup", new Aws.LB.TargetGroupArgs
    ///         {
    ///         });
    ///         // ...
    ///         var frontEndListener = new Aws.LB.Listener("frontEndListener", new Aws.LB.ListenerArgs
    ///         {
    ///             LoadBalancerArn = frontEndLoadBalancer.Arn,
    ///             Port = 443,
    ///             Protocol = "HTTPS",
    ///             SslPolicy = "ELBSecurityPolicy-2016-08",
    ///             CertificateArn = "arn:aws:iam::187416307283:server-certificate/test_cert_rab3wuqwgja25ct3n4jdj2tzu4",
    ///             DefaultActions = 
    ///             {
    ///                 new Aws.LB.Inputs.ListenerDefaultActionArgs
    ///                 {
    ///                     Type = "forward",
    ///                     TargetGroupArn = frontEndTargetGroup.Arn,
    ///                 },
    ///             },
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
    /// 		frontEndLoadBalancer, err := lb.NewLoadBalancer(ctx, "frontEndLoadBalancer", nil)
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		frontEndTargetGroup, err := lb.NewTargetGroup(ctx, "frontEndTargetGroup", nil)
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		_, err = lb.NewListener(ctx, "frontEndListener", &amp;lb.ListenerArgs{
    /// 			LoadBalancerArn: frontEndLoadBalancer.Arn,
    /// 			Port:            pulumi.Int(443),
    /// 			Protocol:        pulumi.String("HTTPS"),
    /// 			SslPolicy:       pulumi.String("ELBSecurityPolicy-2016-08"),
    /// 			CertificateArn:  pulumi.String("arn:aws:iam::187416307283:server-certificate/test_cert_rab3wuqwgja25ct3n4jdj2tzu4"),
    /// 			DefaultActions: lb.ListenerDefaultActionArray{
    /// 				&amp;lb.ListenerDefaultActionArgs{
    /// 					Type:           pulumi.String("forward"),
    /// 					TargetGroupArn: frontEndTargetGroup.Arn,
    /// 				},
    /// 			},
    /// 		})
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		return nil
    /// 	})
    /// }
    /// ```
    /// 
    /// To a NLB:
    /// 
    /// ```typescript
    /// import * as pulumi from "@pulumi/pulumi";
    /// import * as aws from "@pulumi/aws";
    /// 
    /// const frontEnd = new aws.lb.Listener("frontEnd", {
    ///     loadBalancerArn: aws_lb.front_end.arn,
    ///     port: "443",
    ///     protocol: "TLS",
    ///     certificateArn: "arn:aws:iam::187416307283:server-certificate/test_cert_rab3wuqwgja25ct3n4jdj2tzu4",
    ///     alpnPolicy: "HTTP2Preferred",
    ///     defaultActions: [{
    ///         type: "forward",
    ///         targetGroupArn: aws_lb_target_group.front_end.arn,
    ///     }],
    /// });
    /// ```
    /// ```python
    /// import pulumi
    /// import pulumi_aws as aws
    /// 
    /// front_end = aws.lb.Listener("frontEnd",
    ///     load_balancer_arn=aws_lb["front_end"]["arn"],
    ///     port=443,
    ///     protocol="TLS",
    ///     certificate_arn="arn:aws:iam::187416307283:server-certificate/test_cert_rab3wuqwgja25ct3n4jdj2tzu4",
    ///     alpn_policy="HTTP2Preferred",
    ///     default_actions=[aws.lb.ListenerDefaultActionArgs(
    ///         type="forward",
    ///         target_group_arn=aws_lb_target_group["front_end"]["arn"],
    ///     )])
    /// ```
    /// ```csharp
    /// using Pulumi;
    /// using Aws = Pulumi.Aws;
    /// 
    /// class MyStack : Stack
    /// {
    ///     public MyStack()
    ///     {
    ///         var frontEnd = new Aws.LB.Listener("frontEnd", new Aws.LB.ListenerArgs
    ///         {
    ///             LoadBalancerArn = aws_lb.Front_end.Arn,
    ///             Port = 443,
    ///             Protocol = "TLS",
    ///             CertificateArn = "arn:aws:iam::187416307283:server-certificate/test_cert_rab3wuqwgja25ct3n4jdj2tzu4",
    ///             AlpnPolicy = "HTTP2Preferred",
    ///             DefaultActions = 
    ///             {
    ///                 new Aws.LB.Inputs.ListenerDefaultActionArgs
    ///                 {
    ///                     Type = "forward",
    ///                     TargetGroupArn = aws_lb_target_group.Front_end.Arn,
    ///                 },
    ///             },
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
    /// 		_, err := lb.NewListener(ctx, "frontEnd", &amp;lb.ListenerArgs{
    /// 			LoadBalancerArn: pulumi.Any(aws_lb.Front_end.Arn),
    /// 			Port:            pulumi.Int(443),
    /// 			Protocol:        pulumi.String("TLS"),
    /// 			CertificateArn:  pulumi.String("arn:aws:iam::187416307283:server-certificate/test_cert_rab3wuqwgja25ct3n4jdj2tzu4"),
    /// 			AlpnPolicy:      pulumi.String("HTTP2Preferred"),
    /// 			DefaultActions: lb.ListenerDefaultActionArray{
    /// 				&amp;lb.ListenerDefaultActionArgs{
    /// 					Type:           pulumi.String("forward"),
    /// 					TargetGroupArn: pulumi.Any(aws_lb_target_group.Front_end.Arn),
    /// 				},
    /// 			},
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
    /// ### Redirect Action
    /// 
    /// ```typescript
    /// import * as pulumi from "@pulumi/pulumi";
    /// import * as aws from "@pulumi/aws";
    /// 
    /// const frontEndLoadBalancer = new aws.lb.LoadBalancer("frontEndLoadBalancer", {});
    /// // ...
    /// const frontEndListener = new aws.lb.Listener("frontEndListener", {
    ///     loadBalancerArn: frontEndLoadBalancer.arn,
    ///     port: "80",
    ///     protocol: "HTTP",
    ///     defaultActions: [{
    ///         type: "redirect",
    ///         redirect: {
    ///             port: "443",
    ///             protocol: "HTTPS",
    ///             statusCode: "HTTP_301",
    ///         },
    ///     }],
    /// });
    /// ```
    /// ```python
    /// import pulumi
    /// import pulumi_aws as aws
    /// 
    /// front_end_load_balancer = aws.lb.LoadBalancer("frontEndLoadBalancer")
    /// # ...
    /// front_end_listener = aws.lb.Listener("frontEndListener",
    ///     load_balancer_arn=front_end_load_balancer.arn,
    ///     port=80,
    ///     protocol="HTTP",
    ///     default_actions=[aws.lb.ListenerDefaultActionArgs(
    ///         type="redirect",
    ///         redirect=aws.lb.ListenerDefaultActionRedirectArgs(
    ///             port="443",
    ///             protocol="HTTPS",
    ///             status_code="HTTP_301",
    ///         ),
    ///     )])
    /// ```
    /// ```csharp
    /// using Pulumi;
    /// using Aws = Pulumi.Aws;
    /// 
    /// class MyStack : Stack
    /// {
    ///     public MyStack()
    ///     {
    ///         var frontEndLoadBalancer = new Aws.LB.LoadBalancer("frontEndLoadBalancer", new Aws.LB.LoadBalancerArgs
    ///         {
    ///         });
    ///         // ...
    ///         var frontEndListener = new Aws.LB.Listener("frontEndListener", new Aws.LB.ListenerArgs
    ///         {
    ///             LoadBalancerArn = frontEndLoadBalancer.Arn,
    ///             Port = 80,
    ///             Protocol = "HTTP",
    ///             DefaultActions = 
    ///             {
    ///                 new Aws.LB.Inputs.ListenerDefaultActionArgs
    ///                 {
    ///                     Type = "redirect",
    ///                     Redirect = new Aws.LB.Inputs.ListenerDefaultActionRedirectArgs
    ///                     {
    ///                         Port = "443",
    ///                         Protocol = "HTTPS",
    ///                         StatusCode = "HTTP_301",
    ///                     },
    ///                 },
    ///             },
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
    /// 		frontEndLoadBalancer, err := lb.NewLoadBalancer(ctx, "frontEndLoadBalancer", nil)
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		_, err = lb.NewListener(ctx, "frontEndListener", &amp;lb.ListenerArgs{
    /// 			LoadBalancerArn: frontEndLoadBalancer.Arn,
    /// 			Port:            pulumi.Int(80),
    /// 			Protocol:        pulumi.String("HTTP"),
    /// 			DefaultActions: lb.ListenerDefaultActionArray{
    /// 				&amp;lb.ListenerDefaultActionArgs{
    /// 					Type: pulumi.String("redirect"),
    /// 					Redirect: &amp;lb.ListenerDefaultActionRedirectArgs{
    /// 						Port:       pulumi.String("443"),
    /// 						Protocol:   pulumi.String("HTTPS"),
    /// 						StatusCode: pulumi.String("HTTP_301"),
    /// 					},
    /// 				},
    /// 			},
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
    /// ### Fixed-response Action
    /// 
    /// ```typescript
    /// import * as pulumi from "@pulumi/pulumi";
    /// import * as aws from "@pulumi/aws";
    /// 
    /// const frontEndLoadBalancer = new aws.lb.LoadBalancer("frontEndLoadBalancer", {});
    /// // ...
    /// const frontEndListener = new aws.lb.Listener("frontEndListener", {
    ///     loadBalancerArn: frontEndLoadBalancer.arn,
    ///     port: "80",
    ///     protocol: "HTTP",
    ///     defaultActions: [{
    ///         type: "fixed-response",
    ///         fixedResponse: {
    ///             contentType: "text/plain",
    ///             messageBody: "Fixed response content",
    ///             statusCode: "200",
    ///         },
    ///     }],
    /// });
    /// ```
    /// ```python
    /// import pulumi
    /// import pulumi_aws as aws
    /// 
    /// front_end_load_balancer = aws.lb.LoadBalancer("frontEndLoadBalancer")
    /// # ...
    /// front_end_listener = aws.lb.Listener("frontEndListener",
    ///     load_balancer_arn=front_end_load_balancer.arn,
    ///     port=80,
    ///     protocol="HTTP",
    ///     default_actions=[aws.lb.ListenerDefaultActionArgs(
    ///         type="fixed-response",
    ///         fixed_response=aws.lb.ListenerDefaultActionFixedResponseArgs(
    ///             content_type="text/plain",
    ///             message_body="Fixed response content",
    ///             status_code="200",
    ///         ),
    ///     )])
    /// ```
    /// ```csharp
    /// using Pulumi;
    /// using Aws = Pulumi.Aws;
    /// 
    /// class MyStack : Stack
    /// {
    ///     public MyStack()
    ///     {
    ///         var frontEndLoadBalancer = new Aws.LB.LoadBalancer("frontEndLoadBalancer", new Aws.LB.LoadBalancerArgs
    ///         {
    ///         });
    ///         // ...
    ///         var frontEndListener = new Aws.LB.Listener("frontEndListener", new Aws.LB.ListenerArgs
    ///         {
    ///             LoadBalancerArn = frontEndLoadBalancer.Arn,
    ///             Port = 80,
    ///             Protocol = "HTTP",
    ///             DefaultActions = 
    ///             {
    ///                 new Aws.LB.Inputs.ListenerDefaultActionArgs
    ///                 {
    ///                     Type = "fixed-response",
    ///                     FixedResponse = new Aws.LB.Inputs.ListenerDefaultActionFixedResponseArgs
    ///                     {
    ///                         ContentType = "text/plain",
    ///                         MessageBody = "Fixed response content",
    ///                         StatusCode = "200",
    ///                     },
    ///                 },
    ///             },
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
    /// 		frontEndLoadBalancer, err := lb.NewLoadBalancer(ctx, "frontEndLoadBalancer", nil)
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		_, err = lb.NewListener(ctx, "frontEndListener", &amp;lb.ListenerArgs{
    /// 			LoadBalancerArn: frontEndLoadBalancer.Arn,
    /// 			Port:            pulumi.Int(80),
    /// 			Protocol:        pulumi.String("HTTP"),
    /// 			DefaultActions: lb.ListenerDefaultActionArray{
    /// 				&amp;lb.ListenerDefaultActionArgs{
    /// 					Type: pulumi.String("fixed-response"),
    /// 					FixedResponse: &amp;lb.ListenerDefaultActionFixedResponseArgs{
    /// 						ContentType: pulumi.String("text/plain"),
    /// 						MessageBody: pulumi.String("Fixed response content"),
    /// 						StatusCode:  pulumi.String("200"),
    /// 					},
    /// 				},
    /// 			},
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
    /// ### Authenticate-cognito Action
    /// 
    /// ```typescript
    /// import * as pulumi from "@pulumi/pulumi";
    /// import * as aws from "@pulumi/aws";
    /// 
    /// const frontEndLoadBalancer = new aws.lb.LoadBalancer("frontEndLoadBalancer", {});
    /// // ...
    /// const frontEndTargetGroup = new aws.lb.TargetGroup("frontEndTargetGroup", {});
    /// // ...
    /// const pool = new aws.cognito.UserPool("pool", {});
    /// // ...
    /// const client = new aws.cognito.UserPoolClient("client", {});
    /// // ...
    /// const domain = new aws.cognito.UserPoolDomain("domain", {});
    /// // ...
    /// const frontEndListener = new aws.lb.Listener("frontEndListener", {
    ///     loadBalancerArn: frontEndLoadBalancer.arn,
    ///     port: "80",
    ///     protocol: "HTTP",
    ///     defaultActions: [
    ///         {
    ///             type: "authenticate-cognito",
    ///             authenticateCognito: {
    ///                 userPoolArn: pool.arn,
    ///                 userPoolClientId: client.id,
    ///                 userPoolDomain: domain.domain,
    ///             },
    ///         },
    ///         {
    ///             type: "forward",
    ///             targetGroupArn: frontEndTargetGroup.arn,
    ///         },
    ///     ],
    /// });
    /// ```
    /// ```python
    /// import pulumi
    /// import pulumi_aws as aws
    /// 
    /// front_end_load_balancer = aws.lb.LoadBalancer("frontEndLoadBalancer")
    /// # ...
    /// front_end_target_group = aws.lb.TargetGroup("frontEndTargetGroup")
    /// # ...
    /// pool = aws.cognito.UserPool("pool")
    /// # ...
    /// client = aws.cognito.UserPoolClient("client")
    /// # ...
    /// domain = aws.cognito.UserPoolDomain("domain")
    /// # ...
    /// front_end_listener = aws.lb.Listener("frontEndListener",
    ///     load_balancer_arn=front_end_load_balancer.arn,
    ///     port=80,
    ///     protocol="HTTP",
    ///     default_actions=[
    ///         aws.lb.ListenerDefaultActionArgs(
    ///             type="authenticate-cognito",
    ///             authenticate_cognito=aws.lb.ListenerDefaultActionAuthenticateCognitoArgs(
    ///                 user_pool_arn=pool.arn,
    ///                 user_pool_client_id=client.id,
    ///                 user_pool_domain=domain.domain,
    ///             ),
    ///         ),
    ///         aws.lb.ListenerDefaultActionArgs(
    ///             type="forward",
    ///             target_group_arn=front_end_target_group.arn,
    ///         ),
    ///     ])
    /// ```
    /// ```csharp
    /// using Pulumi;
    /// using Aws = Pulumi.Aws;
    /// 
    /// class MyStack : Stack
    /// {
    ///     public MyStack()
    ///     {
    ///         var frontEndLoadBalancer = new Aws.LB.LoadBalancer("frontEndLoadBalancer", new Aws.LB.LoadBalancerArgs
    ///         {
    ///         });
    ///         // ...
    ///         var frontEndTargetGroup = new Aws.LB.TargetGroup("frontEndTargetGroup", new Aws.LB.TargetGroupArgs
    ///         {
    ///         });
    ///         // ...
    ///         var pool = new Aws.Cognito.UserPool("pool", new Aws.Cognito.UserPoolArgs
    ///         {
    ///         });
    ///         // ...
    ///         var client = new Aws.Cognito.UserPoolClient("client", new Aws.Cognito.UserPoolClientArgs
    ///         {
    ///         });
    ///         // ...
    ///         var domain = new Aws.Cognito.UserPoolDomain("domain", new Aws.Cognito.UserPoolDomainArgs
    ///         {
    ///         });
    ///         // ...
    ///         var frontEndListener = new Aws.LB.Listener("frontEndListener", new Aws.LB.ListenerArgs
    ///         {
    ///             LoadBalancerArn = frontEndLoadBalancer.Arn,
    ///             Port = 80,
    ///             Protocol = "HTTP",
    ///             DefaultActions = 
    ///             {
    ///                 new Aws.LB.Inputs.ListenerDefaultActionArgs
    ///                 {
    ///                     Type = "authenticate-cognito",
    ///                     AuthenticateCognito = new Aws.LB.Inputs.ListenerDefaultActionAuthenticateCognitoArgs
    ///                     {
    ///                         UserPoolArn = pool.Arn,
    ///                         UserPoolClientId = client.Id,
    ///                         UserPoolDomain = domain.Domain,
    ///                     },
    ///                 },
    ///                 new Aws.LB.Inputs.ListenerDefaultActionArgs
    ///                 {
    ///                     Type = "forward",
    ///                     TargetGroupArn = frontEndTargetGroup.Arn,
    ///                 },
    ///             },
    ///         });
    ///     }
    /// 
    /// }
    /// ```
    /// ```go
    /// package main
    /// 
    /// import (
    /// 	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/cognito"
    /// 	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/lb"
    /// 	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
    /// )
    /// 
    /// func main() {
    /// 	pulumi.Run(func(ctx *pulumi.Context) error {
    /// 		frontEndLoadBalancer, err := lb.NewLoadBalancer(ctx, "frontEndLoadBalancer", nil)
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		frontEndTargetGroup, err := lb.NewTargetGroup(ctx, "frontEndTargetGroup", nil)
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		pool, err := cognito.NewUserPool(ctx, "pool", nil)
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		client, err := cognito.NewUserPoolClient(ctx, "client", nil)
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		domain, err := cognito.NewUserPoolDomain(ctx, "domain", nil)
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		_, err = lb.NewListener(ctx, "frontEndListener", &amp;lb.ListenerArgs{
    /// 			LoadBalancerArn: frontEndLoadBalancer.Arn,
    /// 			Port:            pulumi.Int(80),
    /// 			Protocol:        pulumi.String("HTTP"),
    /// 			DefaultActions: lb.ListenerDefaultActionArray{
    /// 				&amp;lb.ListenerDefaultActionArgs{
    /// 					Type: pulumi.String("authenticate-cognito"),
    /// 					AuthenticateCognito: &amp;lb.ListenerDefaultActionAuthenticateCognitoArgs{
    /// 						UserPoolArn:      pool.Arn,
    /// 						UserPoolClientId: client.ID(),
    /// 						UserPoolDomain:   domain.Domain,
    /// 					},
    /// 				},
    /// 				&amp;lb.ListenerDefaultActionArgs{
    /// 					Type:           pulumi.String("forward"),
    /// 					TargetGroupArn: frontEndTargetGroup.Arn,
    /// 				},
    /// 			},
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
    /// ### Authenticate-OIDC Action
    /// 
    /// ```typescript
    /// import * as pulumi from "@pulumi/pulumi";
    /// import * as aws from "@pulumi/aws";
    /// 
    /// const frontEndLoadBalancer = new aws.lb.LoadBalancer("frontEndLoadBalancer", {});
    /// // ...
    /// const frontEndTargetGroup = new aws.lb.TargetGroup("frontEndTargetGroup", {});
    /// // ...
    /// const frontEndListener = new aws.lb.Listener("frontEndListener", {
    ///     loadBalancerArn: frontEndLoadBalancer.arn,
    ///     port: "80",
    ///     protocol: "HTTP",
    ///     defaultActions: [
    ///         {
    ///             type: "authenticate-oidc",
    ///             authenticateOidc: {
    ///                 authorizationEndpoint: "https://example.com/authorization_endpoint",
    ///                 clientId: "client_id",
    ///                 clientSecret: "client_secret",
    ///                 issuer: "https://example.com",
    ///                 tokenEndpoint: "https://example.com/token_endpoint",
    ///                 userInfoEndpoint: "https://example.com/user_info_endpoint",
    ///             },
    ///         },
    ///         {
    ///             type: "forward",
    ///             targetGroupArn: frontEndTargetGroup.arn,
    ///         },
    ///     ],
    /// });
    /// ```
    /// ```python
    /// import pulumi
    /// import pulumi_aws as aws
    /// 
    /// front_end_load_balancer = aws.lb.LoadBalancer("frontEndLoadBalancer")
    /// # ...
    /// front_end_target_group = aws.lb.TargetGroup("frontEndTargetGroup")
    /// # ...
    /// front_end_listener = aws.lb.Listener("frontEndListener",
    ///     load_balancer_arn=front_end_load_balancer.arn,
    ///     port=80,
    ///     protocol="HTTP",
    ///     default_actions=[
    ///         aws.lb.ListenerDefaultActionArgs(
    ///             type="authenticate-oidc",
    ///             authenticate_oidc=aws.lb.ListenerDefaultActionAuthenticateOidcArgs(
    ///                 authorization_endpoint="https://example.com/authorization_endpoint",
    ///                 client_id="client_id",
    ///                 client_secret="client_secret",
    ///                 issuer="https://example.com",
    ///                 token_endpoint="https://example.com/token_endpoint",
    ///                 user_info_endpoint="https://example.com/user_info_endpoint",
    ///             ),
    ///         ),
    ///         aws.lb.ListenerDefaultActionArgs(
    ///             type="forward",
    ///             target_group_arn=front_end_target_group.arn,
    ///         ),
    ///     ])
    /// ```
    /// ```csharp
    /// using Pulumi;
    /// using Aws = Pulumi.Aws;
    /// 
    /// class MyStack : Stack
    /// {
    ///     public MyStack()
    ///     {
    ///         var frontEndLoadBalancer = new Aws.LB.LoadBalancer("frontEndLoadBalancer", new Aws.LB.LoadBalancerArgs
    ///         {
    ///         });
    ///         // ...
    ///         var frontEndTargetGroup = new Aws.LB.TargetGroup("frontEndTargetGroup", new Aws.LB.TargetGroupArgs
    ///         {
    ///         });
    ///         // ...
    ///         var frontEndListener = new Aws.LB.Listener("frontEndListener", new Aws.LB.ListenerArgs
    ///         {
    ///             LoadBalancerArn = frontEndLoadBalancer.Arn,
    ///             Port = 80,
    ///             Protocol = "HTTP",
    ///             DefaultActions = 
    ///             {
    ///                 new Aws.LB.Inputs.ListenerDefaultActionArgs
    ///                 {
    ///                     Type = "authenticate-oidc",
    ///                     AuthenticateOidc = new Aws.LB.Inputs.ListenerDefaultActionAuthenticateOidcArgs
    ///                     {
    ///                         AuthorizationEndpoint = "https://example.com/authorization_endpoint",
    ///                         ClientId = "client_id",
    ///                         ClientSecret = "client_secret",
    ///                         Issuer = "https://example.com",
    ///                         TokenEndpoint = "https://example.com/token_endpoint",
    ///                         UserInfoEndpoint = "https://example.com/user_info_endpoint",
    ///                     },
    ///                 },
    ///                 new Aws.LB.Inputs.ListenerDefaultActionArgs
    ///                 {
    ///                     Type = "forward",
    ///                     TargetGroupArn = frontEndTargetGroup.Arn,
    ///                 },
    ///             },
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
    /// 		frontEndLoadBalancer, err := lb.NewLoadBalancer(ctx, "frontEndLoadBalancer", nil)
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		frontEndTargetGroup, err := lb.NewTargetGroup(ctx, "frontEndTargetGroup", nil)
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		_, err = lb.NewListener(ctx, "frontEndListener", &amp;lb.ListenerArgs{
    /// 			LoadBalancerArn: frontEndLoadBalancer.Arn,
    /// 			Port:            pulumi.Int(80),
    /// 			Protocol:        pulumi.String("HTTP"),
    /// 			DefaultActions: lb.ListenerDefaultActionArray{
    /// 				&amp;lb.ListenerDefaultActionArgs{
    /// 					Type: pulumi.String("authenticate-oidc"),
    /// 					AuthenticateOidc: &amp;lb.ListenerDefaultActionAuthenticateOidcArgs{
    /// 						AuthorizationEndpoint: pulumi.String("https://example.com/authorization_endpoint"),
    /// 						ClientId:              pulumi.String("client_id"),
    /// 						ClientSecret:          pulumi.String("client_secret"),
    /// 						Issuer:                pulumi.String("https://example.com"),
    /// 						TokenEndpoint:         pulumi.String("https://example.com/token_endpoint"),
    /// 						UserInfoEndpoint:      pulumi.String("https://example.com/user_info_endpoint"),
    /// 					},
    /// 				},
    /// 				&amp;lb.ListenerDefaultActionArgs{
    /// 					Type:           pulumi.String("forward"),
    /// 					TargetGroupArn: frontEndTargetGroup.Arn,
    /// 				},
    /// 			},
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
    /// ### Gateway Load Balancer Listener
    /// 
    /// ```typescript
    /// import * as pulumi from "@pulumi/pulumi";
    /// import * as aws from "@pulumi/aws";
    /// 
    /// const exampleLoadBalancer = new aws.lb.LoadBalancer("exampleLoadBalancer", {
    ///     loadBalancerType: "gateway",
    ///     subnetMappings: [{
    ///         subnetId: aws_subnet.example.id,
    ///     }],
    /// });
    /// const exampleTargetGroup = new aws.lb.TargetGroup("exampleTargetGroup", {
    ///     port: 6081,
    ///     protocol: "GENEVE",
    ///     vpcId: aws_vpc.example.id,
    ///     healthCheck: {
    ///         port: 80,
    ///         protocol: "HTTP",
    ///     },
    /// });
    /// const exampleListener = new aws.lb.Listener("exampleListener", {
    ///     loadBalancerArn: exampleLoadBalancer.id,
    ///     defaultActions: [{
    ///         targetGroupArn: exampleTargetGroup.id,
    ///         type: "forward",
    ///     }],
    /// });
    /// ```
    /// ```python
    /// import pulumi
    /// import pulumi_aws as aws
    /// 
    /// example_load_balancer = aws.lb.LoadBalancer("exampleLoadBalancer",
    ///     load_balancer_type="gateway",
    ///     subnet_mappings=[aws.lb.LoadBalancerSubnetMappingArgs(
    ///         subnet_id=aws_subnet["example"]["id"],
    ///     )])
    /// example_target_group = aws.lb.TargetGroup("exampleTargetGroup",
    ///     port=6081,
    ///     protocol="GENEVE",
    ///     vpc_id=aws_vpc["example"]["id"],
    ///     health_check=aws.lb.TargetGroupHealthCheckArgs(
    ///         port="80",
    ///         protocol="HTTP",
    ///     ))
    /// example_listener = aws.lb.Listener("exampleListener",
    ///     load_balancer_arn=example_load_balancer.id,
    ///     default_actions=[aws.lb.ListenerDefaultActionArgs(
    ///         target_group_arn=example_target_group.id,
    ///         type="forward",
    ///     )])
    /// ```
    /// ```csharp
    /// using Pulumi;
    /// using Aws = Pulumi.Aws;
    /// 
    /// class MyStack : Stack
    /// {
    ///     public MyStack()
    ///     {
    ///         var exampleLoadBalancer = new Aws.LB.LoadBalancer("exampleLoadBalancer", new Aws.LB.LoadBalancerArgs
    ///         {
    ///             LoadBalancerType = "gateway",
    ///             SubnetMappings = 
    ///             {
    ///                 new Aws.LB.Inputs.LoadBalancerSubnetMappingArgs
    ///                 {
    ///                     SubnetId = aws_subnet.Example.Id,
    ///                 },
    ///             },
    ///         });
    ///         var exampleTargetGroup = new Aws.LB.TargetGroup("exampleTargetGroup", new Aws.LB.TargetGroupArgs
    ///         {
    ///             Port = 6081,
    ///             Protocol = "GENEVE",
    ///             VpcId = aws_vpc.Example.Id,
    ///             HealthCheck = new Aws.LB.Inputs.TargetGroupHealthCheckArgs
    ///             {
    ///                 Port = "80",
    ///                 Protocol = "HTTP",
    ///             },
    ///         });
    ///         var exampleListener = new Aws.LB.Listener("exampleListener", new Aws.LB.ListenerArgs
    ///         {
    ///             LoadBalancerArn = exampleLoadBalancer.Id,
    ///             DefaultActions = 
    ///             {
    ///                 new Aws.LB.Inputs.ListenerDefaultActionArgs
    ///                 {
    ///                     TargetGroupArn = exampleTargetGroup.Id,
    ///                     Type = "forward",
    ///                 },
    ///             },
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
    /// 		exampleLoadBalancer, err := lb.NewLoadBalancer(ctx, "exampleLoadBalancer", &amp;lb.LoadBalancerArgs{
    /// 			LoadBalancerType: pulumi.String("gateway"),
    /// 			SubnetMappings: lb.LoadBalancerSubnetMappingArray{
    /// 				&amp;lb.LoadBalancerSubnetMappingArgs{
    /// 					SubnetId: pulumi.Any(aws_subnet.Example.Id),
    /// 				},
    /// 			},
    /// 		})
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		exampleTargetGroup, err := lb.NewTargetGroup(ctx, "exampleTargetGroup", &amp;lb.TargetGroupArgs{
    /// 			Port:     pulumi.Int(6081),
    /// 			Protocol: pulumi.String("GENEVE"),
    /// 			VpcId:    pulumi.Any(aws_vpc.Example.Id),
    /// 			HealthCheck: &amp;lb.TargetGroupHealthCheckArgs{
    /// 				Port:     pulumi.String("80"),
    /// 				Protocol: pulumi.String("HTTP"),
    /// 			},
    /// 		})
    /// 		if err != nil {
    /// 			return err
    /// 		}
    /// 		_, err = lb.NewListener(ctx, "exampleListener", &amp;lb.ListenerArgs{
    /// 			LoadBalancerArn: exampleLoadBalancer.ID(),
    /// 			DefaultActions: lb.ListenerDefaultActionArray{
    /// 				&amp;lb.ListenerDefaultActionArgs{
    /// 					TargetGroupArn: exampleTargetGroup.ID(),
    /// 					Type:           pulumi.String("forward"),
    /// 				},
    /// 			},
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
    /// Listeners can be imported using their ARN, e.g.,
    /// 
    /// ```sh
    ///  $ pulumi import aws:lb/listener:Listener front_end arn:aws:elasticloadbalancing:us-west-2:187416307283:listener/app/front-end-alb/8e4497da625e2d8a/9ab28ade35828f96
    /// ```
    /// 
    ///  
    /// </summary>
    public sealed class ListenerArgs : Pulumi.ResourceArgs
    {
        /// <summary>
        /// Name of the Application-Layer Protocol Negotiation (ALPN) policy. Can be set if `protocol` is `TLS`. Valid values are `HTTP1Only`, `HTTP2Only`, `HTTP2Optional`, `HTTP2Preferred`, and `None`.
        /// </summary>
        [Input("alpnPolicy")]
        public Input<string>? AlpnPolicy { get; set; }

        /// <summary>
        /// ARN of the default SSL server certificate. Exactly one certificate is required if the protocol is HTTPS. For adding additional SSL certificates, see the `aws.lb.ListenerCertificate` resource.
        /// </summary>
        [Input("certificateArn")]
        public Input<string>? CertificateArn { get; set; }

        [Input("defaultActions")]
        private InputList<Pulumi.Aws.LB.Inputs.ListenerDefaultActionArgs>? _defaultActions;

        /// <summary>
        /// Configuration block for default actions. Detailed below.
        /// </summary>
        public InputList<Pulumi.Aws.LB.Inputs.ListenerDefaultActionArgs> DefaultActions
        {
            get => _defaultActions ?? (_defaultActions = new InputList<Pulumi.Aws.LB.Inputs.ListenerDefaultActionArgs>());
            set => _defaultActions = value;
        }

        /// <summary>
        /// Port. Specify a value from `1` to `65535` or `#{port}`. Defaults to `#{port}`.
        /// </summary>
        [Input("port")]
        public Input<int>? Port { get; set; }

        /// <summary>
        /// Protocol. Valid values are `HTTP`, `HTTPS`, or `#{protocol}`. Defaults to `#{protocol}`.
        /// </summary>
        [Input("protocol")]
        public Input<string>? Protocol { get; set; }

        /// <summary>
        /// Name of the SSL Policy for the listener. Required if `protocol` is `HTTPS` or `TLS`.
        /// </summary>
        [Input("sslPolicy")]
        public Input<string>? SslPolicy { get; set; }

        [Input("tags")]
        private InputMap<string>? _tags;

        /// <summary>
        /// A map of tags to assign to the resource. .If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        /// </summary>
        public InputMap<string> Tags
        {
            get => _tags ?? (_tags = new InputMap<string>());
            set => _tags = value;
        }

        public ListenerArgs()
        {
        }
    }
}
