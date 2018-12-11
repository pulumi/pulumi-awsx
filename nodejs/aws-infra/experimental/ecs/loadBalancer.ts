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

import * as utils from "../../utils";

import * as ecs from ".";
import * as x from "..";

export interface PortInfo {
    /**
     * The cluster this port will be exposed from.
     */
    cluster: ecs.Cluster;
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

    /**
     * Additional arguments to control the underlying load balancer that is created.
     */
    loadBalancerArgs?: aws.elasticloadbalancingv2.LoadBalancerArgs;
}

export interface TargetGroupInfo {
    targetGroupArn: string;
    containerPort: number;

    /**
     * If not specified, will be set to [containerPort]
     */
    hostPort?: number;
}

export abstract class LoadBalancer
        extends pulumi.ComponentResource
        implements ecs.ContainerPortMappings {

    public abstract portMappings(): pulumi.Input<aws.ecs.PortMapping[]>;
    public abstract loadBalancers(): pulumi.Input<pulumi.Input<x.ecs.ContainerLoadBalancer>[]>;

    public constructor(type: string, name: string, props: Record<string, any>, opts?: pulumi.ComponentResourceOptions) {
        super(type, name, utils.normalizeProps(props), opts);
    }

    public static fromTargetGroupInfo(name: string, info: TargetGroupInfo, opts?: pulumi.ComponentResourceOptions) {
        return LoadBalancer.fromTargetGroupInfos(name, [info], opts);
    }

    public static fromTargetGroupInfos(name: string, infos: TargetGroupInfo[], opts?: pulumi.ComponentResourceOptions) {
        return new TargetGroupInfosLoadBalancer(name, infos, opts);
    }

    public static fromPortInfo(name: string, portInfo: PortInfo, opts?: pulumi.ComponentResourceOptions) {
        return new PortInfoLoadBalancer(name, portInfo, opts);
    }
}

export class TargetGroupInfosLoadBalancer extends LoadBalancer {
    portMappings: () => pulumi.Input<aws.ecs.PortMapping[]>;
    loadBalancers: () => pulumi.Input<pulumi.Input<x.ecs.ContainerLoadBalancer>[]>;

    constructor(name: string, targetGroupInfos: TargetGroupInfo[], opts?: pulumi.ComponentResourceOptions) {
        super("awsinfra:x:ecs:TargetGroupInfosLoadBalancer", name, { targetGroupInfos }, opts);

        this.portMappings = () =>
            targetGroupInfos.map(i => {
                const containerPort = i.containerPort;
                const hostPort = i.hostPort !== undefined ? i.hostPort : containerPort;

                return { containerPort, hostPort };
            });

        this.loadBalancers = () =>
            targetGroupInfos.map(i => ({
                    targetGroupArn: i.targetGroupArn,
                    containerPort: i.containerPort,
                }));
    }
}

export class PortInfoLoadBalancer extends LoadBalancer {
    public readonly loadBalancer: aws.elasticloadbalancingv2.LoadBalancer;
    public readonly targetGroup: aws.elasticloadbalancingv2.TargetGroup;
    public readonly listener: aws.elasticloadbalancingv2.Listener;

    portMappings: () => pulumi.Input<aws.ecs.PortMapping[]>;
    loadBalancers: () => pulumi.Input<pulumi.Input<x.ecs.ContainerLoadBalancer>[]>;

    defaultEndpoint: () => pulumi.Output<aws.apigateway.x.Endpoint>;

    constructor(
        name: string,
        portInfo: PortInfo,
        opts?: pulumi.ComponentResourceOptions) {
        super("awsinfra:x:ecs:PortInfoLoadBalancer", name, portInfo, opts);

        let endpoint: pulumi.Output<aws.apigateway.x.Endpoint>;

        // Load balancers need *very* short names, so we unfortunately have to hash here.
        //
        // Note: Technically, we can only support one LB per service, so only the service name
        // is needed here, but we anticipate this will not always be the case, so we include a
        // set of values which must be unique.
        const longName = `${name}-${portInfo.port}`;
        const shortName = utils.sha1hash(`${longName}`);

        // Create an internal load balancer if requested.
        const cluster = portInfo.cluster;
        const internal = cluster.network.usePrivateSubnets && !portInfo.external;

        // See what kind of load balancer to create (application L7 for HTTP(S) traffic, or network L4 otherwise).
        // Also ensure that we have an SSL certificate for termination at the LB, if that was requested.
        const { listenerProtocol, targetProtocol, useAppLoadBalancer, certificateArn } =
            computeLoadBalancerInfo(portInfo);

        const parentOpts = { parent: this };

        const loadBalancerArgs = portInfo.loadBalancerArgs || {};
        const loadBalancer = new aws.elasticloadbalancingv2.LoadBalancer(shortName, {
            ...loadBalancerArgs,
            loadBalancerType: useAppLoadBalancer ? "application" : "network",
            subnets: cluster.network.publicSubnetIds,
            internal: internal,
            // If this is an application LB, we need to associate it with the ECS cluster's security
            // group, so that traffic on any ports can reach it.  Otherwise, leave blank, and
            // default to the VPC's group.
            securityGroups: useAppLoadBalancer ? cluster.securityGroups.map(g => g.instance.id) : undefined,
            tags: { Name: longName },
        }, parentOpts);

                // Create the target group for the new container/port pair.
        const targetGroup = new aws.elasticloadbalancingv2.TargetGroup(shortName, {
            port: portInfo.targetPort || portInfo.port,
            protocol: targetProtocol,
            vpcId: cluster.network.vpcId,
            deregistrationDelay: 180, // 3 minutes
            tags: { Name: longName },
            targetType: "ip",
        }, parentOpts);

        // Listen on the requested port on the LB and forward to the target.
        const listener = new aws.elasticloadbalancingv2.Listener(longName, {
            loadBalancerArn: loadBalancer.arn,
            protocol: listenerProtocol,
            certificateArn: certificateArn,
            port: portInfo.port,
            defaultAction: {
                type: "forward",
                targetGroupArn: targetGroup.arn,
            },
            // If SSL is used, we automatically insert the recommended ELB security policy from
            // http://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html.
            sslPolicy: certificateArn ? "ELBSecurityPolicy-2016-08" : undefined,
        }, parentOpts);

        endpoint = listener.urn.apply(_ => pulumi.output({
            hostname: loadBalancer.dnsName,
            loadBalancer: loadBalancer,
            port: portInfo.port,
        }));

        const portMappings = () => {
            const containerPort = portInfo.targetPort || portInfo.port;
            const portMappings: aws.ecs.PortMapping[] = [{ containerPort }];
            return listener.urn.apply(_ => portMappings);
        };

        const loadBalancers = () =>
            listener.urn.apply(_ => [{
                    targetGroupArn: targetGroup.arn,
                    containerPort: portInfo.targetPort || portInfo.port,
                }]);

        const defaultEndpoint = () => endpoint;

        this.loadBalancer = loadBalancer;
        this.targetGroup = targetGroup;
        this.listener = listener;

        this.portMappings = portMappings;
        this.loadBalancers = loadBalancers;
        this.defaultEndpoint = defaultEndpoint;

        this.registerOutputs({
            loadBalancer,
            targetGroup,
            listener,
        });
    }
}

function computeLoadBalancerInfo(loadBalancerPort: PortInfo) {
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
