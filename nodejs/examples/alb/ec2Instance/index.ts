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

export default async () => {
    const config = new pulumi.Config("aws");
    const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config.require("envRegion") }) };

    // Create a security group to let traffic flow.
    const sg = await awsx.ec2.SecurityGroup.create("web-sg", {
        vpc: await awsx.ec2.Vpc.getDefault(providerOpts),
    }, providerOpts);

    const ipv4egress = await sg.createEgressRule("ipv4-egress", {
        ports: new awsx.ec2.AllTraffic(),
        location: new awsx.ec2.AnyIPv4Location(),
    });
    const ipv6egress = await sg.createEgressRule("ipv6-egress", {
        ports: new awsx.ec2.AllTraffic(),
        location: new awsx.ec2.AnyIPv6Location(),
    });

    // Creates an ALB associated with the default VPC for this region and listen on port 80.
    const alb = await awsx.elasticloadbalancingv2.ApplicationLoadBalancer.create("web-traffic",
        { external: true, securityGroups: [ sg ] }, providerOpts);
    const listener = await alb.createListener("web-listener", { port: 80 });

    // For each subnet, and each subnet/zone, create a VM and a listener.
    const publicIps: pulumi.Output<string>[] = [];
    for (let i = 0; i < alb.vpc.publicSubnets.length; i++) {
        const getAmiResult = await aws.getAmi({
            filters: [
                { name: "name", values: [ "ubuntu/images/hvm-ssd/ubuntu-trusty-14.04-amd64-server-*" ] },
                { name: "virtualization-type", values: [ "hvm" ] },
            ],
            mostRecent: true,
            owners: [ "099720109477" ], // Canonical
        }, providerOpts);

        const vm = new aws.ec2.Instance(`web-${i}`, {
            ami: getAmiResult.id,
            instanceType: "m5.large",
            subnetId: alb.vpc.publicSubnets[i].subnet.id,
            availabilityZone: alb.vpc.publicSubnets[i].subnet.availabilityZone,
            vpcSecurityGroupIds: [ sg.id ],
            userData: `#!/bin/bash
    echo "Hello World, from Server ${i+1}!" > index.html
    nohup python -m SimpleHTTPServer 80 &`,
        }, providerOpts);
        publicIps.push(vm.publicIp);

        await alb.attachTarget("target-" + i, vm);
    }

    // Export the resulting URL so that it's easy to access.
    return { endpoint: listener.endpoint, publicIps: publicIps };
};