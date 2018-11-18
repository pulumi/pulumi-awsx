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

import * as module from ".";

import * as utils from "./../utils";

export interface ClusterLoadBalancerPort {
    /**
     * The incoming port where the service exposes the endpoint.
    */
    port: number;
    /**
     * The target port on the backing container.  Defaults to the value of [port].
    */
    targetPort?: number;
    /**
     * Whether the port should be exposed externally.  Defaults to `false`.
    */
    external?: boolean;
    /**
     * The protocol to use for exposing the service:
     *  `tcp`: Expose TCP externally and to the container.  Will create a network load balancer.
     *  `http`: Expose HTTP externally and to the container.  Will create application load balancer.
     *  `https`: Expose HTTPS externally and HTTP to the container.   Will create application load balancer.
     *
     * Defaults to 'tcp' if unspecified.
     */
    protocol?: "tcp" | "http" | "https";

    /**
     * The ARN of the default SSL server certificate. Exactly one certificate is required if the
     * protocol is [https]. For adding additional SSL certificates, see the
     * [`aws_lb_listener_certificate`
     * resource](https://www.terraform.io/docs/providers/aws/r/lb_listener_certificate.html).
     */
    certificateArn?: string;
}

/**
 * Arguments to create an ALB or NLB for a cluster.
 */
export type ClusterLoadBalancerArgs = utils.Overwrite<aws.elasticloadbalancingv2.LoadBalancerArgs, {
    /**
     * The incoming port where the service exposes the endpoint.
    */
    loadBalancerPort: ClusterLoadBalancerPort;

    /**
     * Not provided.  Will be determined accordingly based on the data on [loadBalancerPort]
     */
    loadBalancerType?: never;

    /**
     * Not provided.  Will be set to the public subnets of the cluster.
     */
    subnets?: never;

    /**
     * Not provided.  Will be set based on the cluster and loadBalancerPort settings.
     */
    internal?: never;

    /**
     * Not provided.  Will be set to the instanceSecurityGroup of the cluster if this is an
     * "application" load balancer, otherwise it will be unset.
     */
    securityGroups?: never;
}>;

export class ClusterLoadBalancer extends aws.elasticloadbalancingv2.LoadBalancer {
    public readonly cluster: module.Cluster;
    public readonly targetGroup: aws.elasticloadbalancingv2.TargetGroup;
    public readonly listener: aws.elasticloadbalancingv2.Listener;

    constructor(name: string,
                cluster: module.Cluster,
                args: ClusterLoadBalancerArgs,
                opts?: pulumi.ComponentResourceOptions) {

        // Load balancers need *very* short names, so we unfortunately have to hash here.
        //
        // Note: Technically, we can only support one LB per service, so only the service name is needed here, but we
        // anticipate this will not always be the case, so we include a set of values which must be unique.
        const longName = `${name}-${args.loadBalancerPort.port}`;

        // Create an internal load balancer if requested.
        const internal = cluster.network.usePrivateSubnets && !args.loadBalancerPort.external;

        // See what kind of load balancer to create (application L7 for HTTP(S) traffic, or network L4 otherwise).
        // Also ensure that we have an SSL certificate for termination at the LB, if that was requested.
        const { listenerProtocol, targetProtocol, useAppLoadBalancer, certificateArn } =
            computeLoadBalancerInfo(args.loadBalancerPort);

        super(name, {
            ...args,
            loadBalancerType: useAppLoadBalancer ? "application" : "network",
            subnets: cluster.network.publicSubnetIds,
            internal: internal,
            // If this is an application LB, we need to associate it with the ECS cluster's security
            // group, so that traffic on any ports can reach it.  Otherwise, leave blank, and
            // default to the VPC's group.
            securityGroups: useAppLoadBalancer ? [ cluster.instanceSecurityGroup.id ] : undefined,
            tags: { Name: longName },
        }, opts);

        this.cluster = cluster;

        const shortName = utils.sha1hash(`${longName}`);
        const parentOpts = { parent: this };

        // Create the target group for the new container/port pair.
        this.targetGroup = new aws.elasticloadbalancingv2.TargetGroup(shortName, {
            port: args.loadBalancerPort.targetPort || args.loadBalancerPort.port,
            protocol: targetProtocol,
            vpcId: cluster.network.vpcId,
            deregistrationDelay: 180, // 3 minutes
            tags: { Name: longName },
            targetType: "ip",
        }, parentOpts);

        // Listen on the requested port on the LB and forward to the target.
        this.listener = new aws.elasticloadbalancingv2.Listener(longName, {
            loadBalancerArn: this.arn,
            protocol: listenerProtocol,
            certificateArn: certificateArn,
            port: args.loadBalancerPort.port,
            defaultAction: {
                type: "forward",
                targetGroupArn: this.targetGroup.arn,
            },
            // If SSL is used, we automatically insert the recommended ELB security policy from
            // http://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html.
            sslPolicy: certificateArn ? "ELBSecurityPolicy-2016-08" : undefined,
        }, parentOpts);
    }
}

function computeLoadBalancerInfo(loadBalancerPort: ClusterLoadBalancerPort) {
    switch (loadBalancerPort.protocol || "tcp") {
        case "https":
            if (!loadBalancerPort.certificateArn) {
                throw new Error("Cannot create Service for HTTPS trafic. No ACM certificate ARN configured.");
            }

            return {
                listenerProtocol: "HTTPS",
                // Set the target protocol to HTTP, so that the ELB terminates the SSL traffic.
                // IDEA: eventually we should let users choose where the SSL termination occurs.
                targetProtocol: "HTTP",
                useAppLoadBalancer: true,
                certificateArn: loadBalancerPort.certificateArn,
            };
        case "http":
            return {
                listenerProtocol: "HTTP",
                targetProtocol: "HTTP",
                useAppLoadBalancer: true,
                certificateArn: undefined,
            };
        case "tcp":
            return {
                listenerProtocol: "TCP",
                targetProtocol: "TCP",
                useAppLoadBalancer: false,
                certificateArn: undefined,
            };
        default:
            throw new Error(`Unrecognized Service protocol: ${loadBalancerPort.protocol}`);
    }
}
