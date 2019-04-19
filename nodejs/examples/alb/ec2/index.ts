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
import * as awsx from "@pulumi/awsx";

const cluster = new awsx.ecs.Cluster("testing");
const loadBalancer = new awsx.elasticloadbalancingv2.ApplicationLoadBalancer("nginx", { external: true });

// A simple NGINX service, scaled out over two containers.
const targetGroup = loadBalancer.createTargetGroup("nginx", { port: 80, targetType: "instance" });

const autoScalingGroup = cluster.createAutoScalingGroup("testing-1", {
    subnetIds: awsx.ec2.Vpc.getDefault().publicSubnetIds,
    targetGroups: [targetGroup],
    templateParameters: {
        minSize: 10,
    },
    launchConfigurationArgs: {
        instanceType: "t2.medium",
        associatePublicIpAddress: true,
    },
});

const policy = autoScalingGroup.scaleToTrackRequestCountPerTarget("onHighRequest", {
    targetValue: 10,
    estimatedInstanceWarmup: 120,
    targetGroup: targetGroup,
});

const nginxListener = targetGroup.createListener("nginx", { port: 80, external: true });
const nginx = new awsx.ecs.EC2Service("nginx", {
    cluster,
    taskDefinitionArgs: {
        networkMode: "bridge",
        containers: {
            nginx: {
                image: "nginx",
                memory: 128,
                portMappings: [nginxListener],
            },
        },
    },
    desiredCount: 2,
});

loadBalancer.securityGroups[0].createEgressRule("nginxEgress",
    awsx.ec2.SecurityGroupRule.egressArgs(
        new awsx.ec2.AnyIPv4Location(), new awsx.ec2.TcpPorts(80)));

export const nginxEndpoint = nginxListener.endpoint;
