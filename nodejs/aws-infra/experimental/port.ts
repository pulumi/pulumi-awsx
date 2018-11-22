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

export interface ILoadBalancerProvider {
    loadBalancer: aws.elasticloadbalancingv2.LoadBalancer;

    initialize(name: string, parent: pulumi.Resource): void;
    updateContainer(containerName: string, container: mod.ContainerDefinition): void;
    updateService(containerName: string, service: aws.ecs.ServiceArgs): void;
}

export interface PortInfo {
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
    public loadBalancer: aws.elasticloadbalancingv2.LoadBalancer;

    public abstract initialize(name: string, parent: pulumi.Resource): void;
    public abstract updateContainer(containerName: string, container: mod.ContainerDefinition): void;
    public abstract updateService(containerName: string, service: aws.ecs.ServiceArgs): void;

    public static fromPortInfo(
            portInfo: PortInfo,
            cluster: mod.Cluster,
            args: aws.elasticloadbalancingv2.LoadBalancerArgs = {}): ILoadBalancerProvider {
        return new PortInfoLoadBalancerProvider(portInfo, cluster, args);
    }
}

export class PortInfoLoadBalancerProvider extends LoadBalancerProvider {
    public targetGroup: aws.elasticloadbalancingv2.TargetGroup;

    constructor(
        private readonly portInfo: PortInfo,
        private readonly cluster: mod.Cluster,
        private readonly loadBalancerArgs: aws.elasticloadbalancingv2.LoadBalancerArgs) {

        super();
    }

    public initialize(name: string, parent: pulumi.Resource): void {
        if (this.loadBalancer) {
            throw new Error("Called into updateContainer multiple times.");
        }

        // Load balancers need *very* short names, so we unfortunately have to hash here.
        //
        // Note: Technically, we can only support one LB per service, so only the service name is needed here, but we
        // anticipate this will not always be the case, so we include a set of values which must be unique.
        const longName = `${name}-${this.portInfo.port}`;
        const shortName = utils.sha1hash(`${longName}`);

        // Create an internal load balancer if requested.
        const internal = this.cluster.network.usePrivateSubnets && !this.portInfo.external;

        // See what kind of load balancer to create (application L7 for HTTP(S) traffic, or network L4 otherwise).
        // Also ensure that we have an SSL certificate for termination at the LB, if that was requested.
        const { listenerProtocol, targetProtocol, useAppLoadBalancer, certificateArn } =
            computeLoadBalancerInfo(this.portInfo);

        const parentOpts = { parent };

        this.loadBalancer = new aws.elasticloadbalancingv2.LoadBalancer(shortName, {
            ...this.loadBalancerArgs,
            loadBalancerType: useAppLoadBalancer ? "application" : "network",
            subnets: this.cluster.network.publicSubnetIds,
            internal: internal,
            // If this is an application LB, we need to associate it with the ECS cluster's security
            // group, so that traffic on any ports can reach it.  Otherwise, leave blank, and
            // default to the VPC's group.
            securityGroups: useAppLoadBalancer ? [ this.cluster.instanceSecurityGroup.id ] : undefined,
            tags: { Name: longName },
        }, parentOpts);

                // Create the target group for the new container/port pair.
        this.targetGroup = new aws.elasticloadbalancingv2.TargetGroup(shortName, {
            port: this.portInfo.targetPort || this.portInfo.port,
            protocol: targetProtocol,
            vpcId: this.cluster.network.vpcId,
            deregistrationDelay: 180, // 3 minutes
            tags: { Name: longName },
            targetType: "ip",
        }, parentOpts);

        // Listen on the requested port on the LB and forward to the target.
        const listener = new aws.elasticloadbalancingv2.Listener(longName, {
            loadBalancerArn: this.loadBalancer.arn,
            protocol: listenerProtocol,
            certificateArn: certificateArn,
            port: this.portInfo.port,
            defaultAction: {
                type: "forward",
                targetGroupArn: this.targetGroup.arn,
            },
            // If SSL is used, we automatically insert the recommended ELB security policy from
            // http://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html.
            sslPolicy: certificateArn ? "ELBSecurityPolicy-2016-08" : undefined,
        }, parentOpts);
    }

    public updateContainer(containerName: string, container: mod.ContainerDefinition): void {
        if (!this.loadBalancer) {
            throw new Error("Must call [initialize] first.");
        }

        container.portMappings = pulumi.output(container.portMappings).apply(
            portMappings => {
                portMappings = portMappings || [];

                const port = this.portInfo.targetPort || this.portInfo.port;
                portMappings.push({
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
                });

                return portMappings;
            });
    }

    public updateService(containerName: string, service: aws.ecs.ServiceArgs): void {
        (<any>service).loadBalancers =
            pulumi.all([service.loadBalancers, this.targetGroup.arn])
                  .apply(([loadBalancers, targetGroupArn]) => {
                loadBalancers = loadBalancers || [];
                loadBalancers.push({
                    targetGroupArn,
                    containerName,
                    containerPort: this.portInfo.targetPort || this.portInfo.port,
                });
                return loadBalancers;
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

