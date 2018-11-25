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
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

import * as utils from "../utils";

import * as mod from ".";

export type LoadBalancers = aws.ecs.ServiceArgs["loadBalancers"];

export interface ILoadBalancerProvider {
    portMappings(containerName: string, name: string, parent: pulumi.Resource): pulumi.Input<aws.ecs.PortMapping[]>;
    loadBalancers(containerName: string, name: string, parent: pulumi.Resource): LoadBalancers;

    // endpoints(): pulumi.Output<aws.apigateway.x.Endpoint[]>;
    // defaultEndpoint(): pulumi.Output<aws.apigateway.x.Endpoint>;
}

export interface PortInfo {
    /**
     * The cluster this port will be exposed from.
     */
    cluster: mod.Cluster;
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

export abstract class LoadBalancerProvider implements ILoadBalancerProvider {
    public abstract portMappings(
        containerName: string, name: string, parent: pulumi.Resource): pulumi.Input<aws.ecs.PortMapping[]>;
    public abstract loadBalancers(
        containerName: string, name: string, parent: pulumi.Resource): LoadBalancers;

    // public abstract endpoints(): pulumi.Output<aws.apigateway.x.Endpoint[]>;
    // public abstract defaultEndpoint(): pulumi.Output<aws.apigateway.x.Endpoint>;

    public static fromPortInfo(
            portInfo: PortInfo,
            args: aws.elasticloadbalancingv2.LoadBalancerArgs = {}) {
        return new PortInfoLoadBalancerProvider(portInfo, args);
    }
}

export class PortInfoLoadBalancerProvider extends LoadBalancerProvider {
    portMappings: (containerName: string, name: string, parent: pulumi.Resource) => pulumi.Input<aws.ecs.PortMapping[]>;
    loadBalancers: (containerName: string, name: string, parent: pulumi.Resource) => LoadBalancers;
    defaultEndpoint: () => pulumi.Output<aws.apigateway.x.Endpoint>;

    constructor(portInfo: PortInfo, loadBalancerArgs: aws.elasticloadbalancingv2.LoadBalancerArgs) {
        super();

        let loadBalancer: aws.elasticloadbalancingv2.LoadBalancer;
        let targetGroup: aws.elasticloadbalancingv2.TargetGroup;
        let listener: aws.elasticloadbalancingv2.Listener;
        let endpoint: pulumi.Output<aws.apigateway.x.Endpoint>;

        const initialize = (containerName: string, name: string, parent: pulumi.Resource) => {
            if (loadBalancer) {
                return;
            }

            // Load balancers need *very* short names, so we unfortunately have to hash here.
            //
            // Note: Technically, we can only support one LB per service, so only the service name
            // is needed here, but we anticipate this will not always be the case, so we include a
            // set of values which must be unique.
            const longName = `${name}-${containerName}-${portInfo.port}`;
            const shortName = utils.sha1hash(`${longName}`);

            // Create an internal load balancer if requested.
            const cluster = portInfo.cluster;
            const internal = cluster.network.usePrivateSubnets && !portInfo.external;

            // See what kind of load balancer to create (application L7 for HTTP(S) traffic, or network L4 otherwise).
            // Also ensure that we have an SSL certificate for termination at the LB, if that was requested.
            const { listenerProtocol, targetProtocol, useAppLoadBalancer, certificateArn } =
                computeLoadBalancerInfo(portInfo);

            const parentOpts = { parent };

            loadBalancer = new aws.elasticloadbalancingv2.LoadBalancer(shortName, {
                ...loadBalancerArgs,
                loadBalancerType: useAppLoadBalancer ? "application" : "network",
                subnets: cluster.network.publicSubnetIds,
                internal: internal,
                // If this is an application LB, we need to associate it with the ECS cluster's security
                // group, so that traffic on any ports can reach it.  Otherwise, leave blank, and
                // default to the VPC's group.
                securityGroups: useAppLoadBalancer ? [ cluster.instanceSecurityGroup.id ] : undefined,
                tags: { Name: longName },
            }, parentOpts);

                    // Create the target group for the new container/port pair.
            targetGroup = new aws.elasticloadbalancingv2.TargetGroup(shortName, {
                port: portInfo.targetPort || portInfo.port,
                protocol: targetProtocol,
                vpcId: cluster.network.vpcId,
                deregistrationDelay: 180, // 3 minutes
                tags: { Name: longName },
                targetType: "ip",
            }, { ...parentOpts, dependsOn: loadBalancer });

            // Listen on the requested port on the LB and forward to the target.
            listener = new aws.elasticloadbalancingv2.Listener(longName, {
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
            }, { ...parentOpts, dependsOn: [loadBalancer, targetGroup] });

            endpoint = pulumi.all([loadBalancer.dnsName, listener.urn]).apply(([dnsName]) => ({
                hostname: dnsName,
                loadBalancer: loadBalancer,
                port: portInfo.port,
            }));
        };

        const portMappings = (containerName: string, name: string, parent: pulumi.Resource) => {
            initialize(containerName, name, parent);

            const port = portInfo.targetPort || portInfo.port;
            const portMappings: aws.ecs.PortMapping[] = [{
                containerPort: port,
                // From https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html:
                // > For task definitions that use the awsvpc network mode, you should only
                // > specify the containerPort. The hostPort can be left blank or it must be the
                // > same value as the containerPort.
                //
                // However, if left blank, it will be automatically populated by AWS, potentially leading to dirty
                // diffs even when no changes have been made. Since we are currently always using `awsvpc` mode, we
                // go ahead and populate it with the same value as `containerPort`.
                //
                // See https://github.com/terraform-providers/terraform-provider-aws/issues/3401.
                hostPort: port,
            }];

            return listener.urn.apply(_ => portMappings);
        };

        const loadBalancers = (containerName: string, name: string, parent: pulumi.Resource) => {
            initialize(containerName, name, parent);

            const loadBalancers: LoadBalancers =
                pulumi.all([targetGroup.arn, listener.urn]).apply(([targetGroupArn]) => [{
                    containerName,
                    targetGroupArn,
                    containerPort: portInfo.targetPort || portInfo.port,
                }]);

            return loadBalancers;
        };

        const defaultEndpoint = () => endpoint;
        //     if (!loadBalancer) {
        //         throw new Error("Cannot get endpoints for an uninitialized load balancer provider.");
        //     }

        //     return pulumi.output({
        //         hostname: loadBalancer.dnsName,
        //         loadBalancer: loadBalancer,
        //         port: portInfo.port,
        //     });
        // };

        this.portMappings = portMappings;
        this.loadBalancers = loadBalancers;
        this.defaultEndpoint = defaultEndpoint;
    }

    // public endpoints() {
    //     return this.defaultEndpoint().apply(e => [e]);
    // }
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
