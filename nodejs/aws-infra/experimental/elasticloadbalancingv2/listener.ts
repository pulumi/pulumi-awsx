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

import * as x from "..";
import { Network } from "./../../network";

import * as utils from "./../../utils";

export abstract class Listener extends pulumi.ComponentResource {
    public readonly instance: aws.elasticloadbalancingv2.Listener;
    public readonly loadBalancer: x.elasticloadbalancingv2.LoadBalancer;

    public readonly endpoint: () => pulumi.Output<aws.apigateway.x.Endpoint>;

    constructor(type: string, name: string, args: ListenerArgs, opts?: pulumi.ComponentResourceOptions) {
        super(type, name, utils.normalizeProps(args), opts);

        const parentOpts = { parent: this };

        // If SSL is used, and no ssl policy was  we automatically insert the recommended ELB
        // security policy from:
        // http://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html.
        const defaultSslPolicy = pulumi.output(args.certificateArn)
                                       .apply(a => a ? "ELBSecurityPolicy-2016-08" : undefined!);

        const instance = new aws.elasticloadbalancingv2.Listener(name, {
            ...args,
            loadBalancerArn: args.loadBalancer.instance.arn,
            sslPolicy: utils.ifUndefined(args.sslPolicy, defaultSslPolicy),
        }, parentOpts);

        const loadBalancer = args.loadBalancer.instance;
        const endpoint = instance.urn.apply(_ => pulumi.output({
            hostname: loadBalancer.dnsName,
            loadBalancer: loadBalancer,
            port: args.port,
        }));

        this.instance = instance;
        this.loadBalancer = args.loadBalancer;
        this.endpoint = () => endpoint;
    }
}

type OverwriteShape = utils.Overwrite<aws.elasticloadbalancingv2.ListenerArgs, {
    loadBalancer: x.elasticloadbalancingv2.LoadBalancer;
    certificateArn?: pulumi.Input<string>;
    defaultAction: aws.elasticloadbalancingv2.ListenerArgs["defaultAction"];
    loadBalancerArn?: never;
    port: pulumi.Input<number>;
    protocol: pulumi.Input<"HTTP" | "HTTPS" | "TCP">;
    sslPolicy?: pulumi.Input<string>;
}>;

export interface ListenerArgs {
    loadBalancer: x.elasticloadbalancingv2.LoadBalancer;

    /**
     * The ARN of the default SSL server certificate. Exactly one certificate is required if the
     * protocol is HTTPS. For adding additional SSL certificates, see the
     * [`aws_lb_listener_certificate`
     * resource](https://www.terraform.io/docs/providers/aws/r/lb_listener_certificate.html).
     */
    certificateArn?: pulumi.Input<string>;

    /**
     * An Action block. Action blocks are documented below.
     */
    defaultAction: aws.elasticloadbalancingv2.ListenerArgs["defaultAction"];

    /**
     * The port. Specify a value from `1` to `65535`.
     */
    port: pulumi.Input<number>;

    /**
     * The protocol.
     */
    protocol: pulumi.Input<"HTTP" | "HTTPS" | "TCP">;

    /**
     * The name of the SSL Policy for the listener. Required if `protocol` is `HTTPS`.
     */
    sslPolicy?: pulumi.Input<string>;
}

const test1: string = utils.checkCompat<OverwriteShape, ListenerArgs>();
