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

import * as mod from ".";
import * as x from "..";
import * as utils from "../utils";

export interface ListenerEndpoint {
    hostname: string;
    port: number;
}

export abstract class Listener
        extends pulumi.ComponentResource
        implements x.ecs.ContainerPortMappingProvider,
                   x.ecs.ContainerLoadBalancerProvider {
    public readonly listener: aws.lb.Listener;
    public readonly loadBalancer: x.lb.LoadBalancer;
    public readonly defaultTargetGroup?: x.lb.TargetGroup;

    public readonly endpoint: pulumi.Output<ListenerEndpoint>;

    private readonly defaultListenerAction?: ListenerDefaultAction;

    // tslint:disable-next-line:variable-name
    private readonly __isListenerInstance = true;

    constructor(type: string, name: string,
                defaultListenerAction: ListenerDefaultAction | undefined,
                args: ListenerArgs, opts: pulumi.ComponentResourceOptions) {

        // By default, we'd like to be parented by the LB .  However, we didn't use to do this.
        // Create an alias from teh old urn to the new one so that we don't cause these to eb
        // created/destroyed.
        super(type, name, {}, {
            parent: args.loadBalancer,
            ...pulumi.mergeOptions(opts, { aliases: [{ parent: opts.parent }] }),
        });

        // If SSL is used, and no ssl policy was  we automatically insert the recommended ELB
        // security policy from:
        // http://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html.
        const defaultSslPolicy = pulumi.output(args.certificateArn)
                                       .apply(a => a ? "ELBSecurityPolicy-2016-08" : undefined!);

        this.listener = new aws.lb.Listener(name, {
            ...args,
            loadBalancerArn: args.loadBalancer.loadBalancer.arn,
            sslPolicy: utils.ifUndefined(args.sslPolicy, defaultSslPolicy),
        }, { parent: this });

        const loadBalancer = args.loadBalancer.loadBalancer;
        this.endpoint = this.listener.urn.apply(_ => pulumi.output({
            hostname: loadBalancer.dnsName,
            port: args.port,
        }));

        this.loadBalancer = args.loadBalancer;
        this.defaultListenerAction = defaultListenerAction;

        if (defaultListenerAction instanceof mod.TargetGroup) {
            this.defaultTargetGroup = defaultListenerAction;
        }

        if (defaultListenerAction) {
            // If our default rule hooked up this listener to a target group, then add our listener
            // to the set of listeners the target group knows about.  This is necessary so that
            // anything that depends on the target group will end up depending on this rule getting
            // created.
            defaultListenerAction.registerListener(this);
        }
    }

    /** @internal */
    public static isListenerInstance(obj: any): obj is Listener {
        return obj && !!(<Listener>obj).__isListenerInstance;
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

    public addListenerRule(name: string, args: x.lb.ListenerRuleArgs, opts?: pulumi.ComponentResourceOptions) {
        return new x.lb.ListenerRule(name, this, args, opts);
    }

    /**
     * Attaches a target to the `defaultTargetGroup` for this Listener.
     */
    public attachTarget(name: string, args: mod.LoadBalancerTarget, opts: pulumi.CustomResourceOptions = {}) {
        if (!this.defaultTargetGroup) {
            throw new pulumi.ResourceError("Listener must have a [defaultTargetGroup] in order to attach a target.", this);
        }

        return this.defaultTargetGroup.attachTarget(name, args, opts);
    }
}

/**
 * See https://www.terraform.io/docs/providers/aws/r/lb_listener.html#default_action
 */
export interface ListenerDefaultActionArgs {
    authenticateCognito?: pulumi.Input<{
        /**
         * The query parameters to include in the redirect request to the authorization endpoint.
         * Max: 10.
         */
        authenticationRequestExtraParams?: pulumi.Input<{
            [key: string]: any;
        }>;
        /**
         * The behavior if the user is not authenticated. Valid values: deny, allow and
         * authenticate.
         */
        onUnauthenticatedRequest?: pulumi.Input<string>;
        /**
         * The set of user claims to be requested from the IdP.
         */
        scope?: pulumi.Input<string>;
        /**
         * The name of the cookie used to maintain session information.
         */
        sessionCookieName?: pulumi.Input<string>;
        /**
         * The maximum duration of the authentication session, in seconds.
         */
        sessionTimeout?: pulumi.Input<number>;
        /**
         * The ARN of the Cognito user pool.
         */
        userPoolArn: pulumi.Input<string>;
        /**
         * The ID of the Cognito user pool client.
         */
        userPoolClientId: pulumi.Input<string>;
        /**
         * The domain prefix or fully-qualified domain name of the Cognito user pool.
         */
        userPoolDomain: pulumi.Input<string>;
    }>;
    authenticateOidc?: pulumi.Input<{
        /**
         * The query parameters to include in the redirect request to the authorization endpoint.
         * Max: 10.
         */
        authenticationRequestExtraParams?: pulumi.Input<{
            [key: string]: any;
        }>;
        /**
         *  The authorization endpoint of the IdP.
         */
        authorizationEndpoint: pulumi.Input<string>;
        /**
         * The OAuth 2.0 client identifier.
         */
        clientId: pulumi.Input<string>;
        /**
         * The OAuth 2.0 client secret.
         */
        clientSecret: pulumi.Input<string>;
        /**
         * The OIDC issuer identifier of the IdP.
         */
        issuer: pulumi.Input<string>;
        /**
         * The behavior if the user is not authenticated. Valid values: deny, allow and authenticate
         */
        onUnauthenticatedRequest?: pulumi.Input<string>;
        /**
         * The set of user claims to be requested from the IdP.
         */
        scope?: pulumi.Input<string>;
        /**
         * The name of the cookie used to maintain session information.
         */
        sessionCookieName?: pulumi.Input<string>;
        /**
         * The maximum duration of the authentication session, in seconds.
         */
        sessionTimeout?: pulumi.Input<number>;
        /**
         * The token endpoint of the IdP.
         */
        tokenEndpoint: pulumi.Input<string>;
        /**
         * The user info endpoint of the IdP.
         */
        userInfoEndpoint: pulumi.Input<string>;
    }>;

    /**
     * Information for creating an action that returns a custom HTTP response. Required if type is
     * "fixed-response".
     */
    fixedResponse?: pulumi.Input<{
        /**
         * The content type. Valid values are text/plain, text/css, text/html,
         * application/javascript and application/json.
         */
        contentType: pulumi.Input<string>;
        messageBody?: pulumi.Input<string>;
        /**
         * The HTTP response code. Valid values are 2XX, 4XX, or 5XX.
         */
        statusCode?: pulumi.Input<string>;
    }>;
    order?: pulumi.Input<number>;

    /**
     * Information for creating a redirect action. Required if type is "redirect".
     */
    redirect?: pulumi.Input<{
        /**
         * The hostname. This component is not percent-encoded. The hostname can contain #{host}.
         * Defaults to #{host}.
         */
        host?: pulumi.Input<string>;

        /**
         * The absolute path, starting with the leading "/". This component is not percent-encoded.
         * The path can contain #{host}, #{path}, and #{port}. Defaults to /#{path}.
         */
        path?: pulumi.Input<string>;
        /**
         * The port. Specify a value from 1 to 65535 or #{port}. Defaults to #{port}.
         */
        port?: pulumi.Input<string>;
        /**
         * The protocol. Valid values are HTTP, HTTPS, or #{protocol}. Defaults to #{protocol}.
         */
        protocol?: pulumi.Input<string>;

        /**
         * The query parameters, URL-encoded when necessary, but not percent-encoded. Do not include
         * the leading "?".
         */
        query?: pulumi.Input<string>;

        /**
         * The HTTP redirect code. The redirect is either permanent (HTTP_301) or temporary
         * (HTTP_302).
         */
        statusCode: pulumi.Input<string>;
    }>;

    /**
     * The ARN of the Target Group to which to route traffic. Required if type is "forward".
     */
    targetGroupArn?: pulumi.Input<string>;

    /**
     * The type of routing action. Valid values are "forward", "redirect", "fixed-response",
     * "authenticate-cognito" and "authenticate-oidc".
     */
    type: pulumi.Input<string>;
}

export interface ListenerDefaultAction {
    listenerDefaultAction(): pulumi.Input<ListenerDefaultActionArgs>;
    registerListener(listener: Listener): void;
}

export interface ListenerActions {
    actions(): aws.lb.ListenerRuleArgs["actions"];
    registerListener(listener: Listener): void;
}

/** @internal */
export function isListenerDefaultAction(obj: any): obj is ListenerDefaultAction {
    return obj &&
        (<ListenerDefaultAction>obj).listenerDefaultAction instanceof Function &&
        (<ListenerDefaultAction>obj).registerListener instanceof Function;
}

/** @internal */
export function isListenerActions(obj: any): obj is ListenerActions {
    return obj &&
        (<ListenerActions>obj).actions instanceof Function &&
        (<ListenerActions>obj).registerListener instanceof Function;
}

type OverwriteShape = utils.Overwrite<aws.lb.ListenerArgs, {
    loadBalancer: x.lb.LoadBalancer;
    certificateArn?: pulumi.Input<string>;
    defaultActions: pulumi.Input<pulumi.Input<ListenerDefaultActionArgs>[]>;
    loadBalancerArn?: never;
    port: pulumi.Input<number>;
    protocol: pulumi.Input<"HTTP" | "HTTPS" | "TCP" | "TLS">;
    sslPolicy?: pulumi.Input<string>;
}>;

export interface ListenerArgs {
    loadBalancer: x.lb.LoadBalancer;

    /**
     * The ARN of the default SSL server certificate. Exactly one certificate is required if the
     * protocol is HTTPS. For adding additional SSL certificates, see the
     * [`aws_lb_listener_certificate`
     * resource](https://www.terraform.io/docs/providers/aws/r/lb_listener_certificate.html).
     */
    certificateArn?: pulumi.Input<string>;

    /**
     * An list of Action blocks. See [ListenerDefaultActionArgs] for more information.
     */
    defaultActions: pulumi.Input<pulumi.Input<ListenerDefaultActionArgs>[]>;

    /**
     * The port. Specify a value from `1` to `65535`.
     */
    port: pulumi.Input<number>;

    /**
     * The protocol.
     */
    protocol: pulumi.Input<"HTTP" | "HTTPS" | "TCP" | "TLS">;

    /**
     * The name of the SSL Policy for the listener. Required if `protocol` is `HTTPS`.
     */
    sslPolicy?: pulumi.Input<string>;
}

const test1: string = utils.checkCompat<OverwriteShape, ListenerArgs>();
