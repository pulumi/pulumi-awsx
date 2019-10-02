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

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const config = new pulumi.Config("aws");
const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config.require("envRegion") }) };

const cluster = new awsx.ecs.Cluster("testing", {}, providerOpts);
const loadBalancer = new awsx.elasticloadbalancingv2.ApplicationLoadBalancer("nginx", { external: true }, providerOpts);

// A simple NGINX service, scaled out over two containers.
const targetGroup = loadBalancer.createTargetGroup("nginx", { port: 80, targetType: "instance" });

const autoScalingGroup = cluster.createAutoScalingGroup("testing-1", {
    subnetIds: awsx.ec2.Vpc.getDefault(providerOpts).publicSubnetIds,
    targetGroups: [targetGroup],
    templateParameters: {
        minSize: 10,
    },
    launchConfigurationArgs: {
        instanceType: "m5.large",
        associatePublicIpAddress: true,
    },
});

const requestCountScalingPolicy = autoScalingGroup.scaleToTrackRequestCountPerTarget("onHighRequest", {
    targetValue: 10,
    estimatedInstanceWarmup: 120,
    targetGroup: targetGroup,
});

const service = new awsx.ecs.EC2Service("nginx", {
    cluster,
    taskDefinitionArgs: {
        networkMode: "bridge",
        containers: {
            nginx: {
                image: "nginx",
                memory: 128,
                applicationListener: { port: 80, external: true, targetGroup },
            },
        },
    },
    desiredCount: 2,
}, providerOpts);

// Create a policy that scales the ASG in response to the average memory utilization of the service.
// When memory goes above 60%, scale up the ASG by 10%.  If it goes above 70%, scale it up by 30%.
// Similarly, if memory goes below 40%, scale down by 10%.  If it goes below 30%, scale it down by
// 30%.
const stepScalingPolicy = autoScalingGroup.scaleInSteps("scale-in-out", {
    metric: awsx.ecs.metrics.memoryUtilization({ service, unit: "Percent", statistic: "Average" }),
    adjustmentType: "PercentChangeInCapacity",
    steps: {
        upper: [{ value: 60, adjustment: 10 }, { value: 70, adjustment: 30 }],
        lower: [{ value: 40, adjustment: -10 }, { value: 30, adjustment: -30 }]
    },
});

export const nginxEndpoint = service.listeners["nginx"].endpoint;
