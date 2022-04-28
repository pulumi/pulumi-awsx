// Copyright 2016-2022, Pulumi Corporation.
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
import * as schema from "../schema-types";

export async function getDefaultVpc(): Promise<schema.getDefaultVpcOutputs> {
    const vpc = await aws.ec2.getVpc({ default: true });

    if (vpc === undefined) {
        throw new Error(
            "unable to find default VPC for this region and account",
        );
    }

    const subnetIds = aws.ec2.getSubnetsOutput({
        filters: [{ name: "vpc-id", values: [vpc.id] }],
    }).ids;

    const subnets = subnetIds.apply((subnetIds) =>
        pulumi.all(subnetIds.map((id) => aws.ec2.getSubnetOutput({ id }))),
    );

    const { publicSubnetIds, privateSubnetIds } = subnets.apply((ss) => {
        const publicSubnets = ss.filter((s) => s.mapPublicIpOnLaunch);
        const privateSubnets = ss.filter((s) => !s.mapPublicIpOnLaunch);
        const publicSubnetIds = publicSubnets.map((s) => s.id);
        const privateSubnetIds = privateSubnets.map((s) => s.id);
        return {
            publicSubnetIds,
            privateSubnetIds,
        };
    });

    return {
        vpcId: pulumi.output(vpc.id),
        publicSubnetIds,
        privateSubnetIds,
    };
}
