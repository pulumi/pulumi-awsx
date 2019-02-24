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

// tslint:disable:max-line-length

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as x from "..";
import * as utils from "./../utils";

export interface ListenerEndpoint {
    hostname: string;
    port: number;
}

export abstract class Listener
        extends pulumi.ComponentResource
        implements x.ecs.ContainerPortMappingProvider,
                   x.ecs.ContainerLoadBalancerProvider {
    public readonly listener: aws.elasticloadbalancingv2.Listener;
    public readonly loadBalancer: x.elasticloadbalancingv2.LoadBalancer;

    public readonly endpoint: pulumi.Output<ListenerEndpoint>;

    private readonly defaultListenerAction?: ListenerDefaultAction;

    constructor(type: string, name: string,
                defaultListenerAction: ListenerDefaultAction | undefined,
                args: pulumi.WrappedObject<ListenerArgs>, opts?: pulumi.ComponentResourceOptions) {
        super(type, name, args, opts);

        const parentOpts = { parent: this };

        // If SSL is used, and no ssl policy was  we automatically insert the recommended ELB
        // security policy from:
        // http://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html.
        const defaultSslPolicy = pulumi.output(args.certificateArn)
                                       .apply(a => a ? "ELBSecurityPolicy-2016-08" : undefined!);

        this.listener = new aws.elasticloadbalancingv2.Listener(name, {
            ...args,
            loadBalancerArn: args.loadBalancer.loadBalancer.arn,
            sslPolicy: utils.ifUndefined(args.sslPolicy, defaultSslPolicy),
        }, parentOpts);

        const loadBalancer = args.loadBalancer.loadBalancer;
        this.endpoint = this.listener.urn.apply(_ => pulumi.output({
            hostname: loadBalancer.dnsName,
            port: args.port,
        }));

        this.loadBalancer = args.loadBalancer;
        this.defaultListenerAction = defaultListenerAction;

        if (defaultListenerAction) {
            // If our default rule hooked up this listener to a target group, then add our listener
            // to the set of listeners the target group knows about.  This is necessary so that
            // anything that depends on the target group will end up depending on this rule getting
            // created.
            defaultListenerAction.registerListener(this);
        }
    }

    public containerPortMapping(name: string, parent: pulumi.Resource) {
        if (!x.ecs.isContainerPortMappingProvider(this.defaultListenerAction)) {
            throw new Error("[Listener] was not connected to a [defaultAction] that can provide [portMapping]s");
        }

        return this.defaultListenerAction.containerPortMapping(name, parent);
    }

    public containerLoadBalancer(name: string, parent: pulumi.Resource) {
        if (!x.ecs.isContainerLoadBalancerProvider(this.defaultListenerAction)) {
            throw new Error("[Listener] was not connected to a [defaultAction] that can provide [containerLoadBalancer]s");
        }

        return this.defaultListenerAction.containerLoadBalancer(name, parent);
    }

    public addListenerRule(name: string, args: x.elasticloadbalancingv2.ListenerRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        return new x.elasticloadbalancingv2.ListenerRule(name, this, args, opts);
    }
}

export interface ListenerDefaultAction {
    listenerDefaultAction(): pulumi.Wrap<aws.elasticloadbalancingv2.ListenerArgs["defaultAction"]>;
    registerListener(listener: Listener): void;
}

export interface ListenerActions {
    actions(): pulumi.Wrap<aws.elasticloadbalancingv2.ListenerRuleArgs["actions"]>;
    registerListener(listener: Listener): void;
}

/** @internal */
export function isListenerDefaultAction(obj: any): obj is ListenerDefaultAction {
    return obj && !!obj.listenerDefaultAction && !!obj.registerListener;
}

/** @internal */
export function isListenerActions(obj: any): obj is ListenerActions {
    return obj && !!obj.actions && !!obj.registerListener;
}

type OverwriteShape = utils.Overwrite<aws.elasticloadbalancingv2.ListenerArgs, {
    loadBalancer: x.elasticloadbalancingv2.LoadBalancer;
    certificateArn?: string;
    defaultAction: aws.elasticloadbalancingv2.ListenerArgs["defaultAction"];
    loadBalancerArn?: never;
    port: number;
    protocol: "HTTP" | "HTTPS" | "TCP";
    sslPolicy?: string;
}>;

export interface ListenerArgs {
    loadBalancer: x.elasticloadbalancingv2.LoadBalancer;

    /**
     * The ARN of the default SSL server certificate. Exactly one certificate is required if the
     * protocol is HTTPS. For adding additional SSL certificates, see the
     * [`aws_lb_listener_certificate`
     * resource](https://www.terraform.io/docs/providers/aws/r/lb_listener_certificate.html).
     */
    certificateArn?: string;

    /**
     * An Action block. Action blocks are documented below.
     */
    defaultAction: aws.elasticloadbalancingv2.ListenerArgs["defaultAction"];

    /**
     * The port. Specify a value from `1` to `65535`.
     */
    port: number;

    /**
     * The protocol.
     */
    protocol: "HTTP" | "HTTPS" | "TCP";

    /**
     * The name of the SSL Policy for the listener. Required if `protocol` is `HTTPS`.
     */
    sslPolicy?: string;
}

const test1: string = utils.checkCompat<OverwriteShape, ListenerArgs>();
