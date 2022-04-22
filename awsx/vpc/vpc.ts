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
import * as utils from "../utils";

interface VpcData {
    vpc: aws.ec2.Vpc;
    subnets: aws.ec2.Subnet[];
}

export class Vpc extends schema.Vpc<VpcData> {
    constructor(name: string, args: schema.VpcArgs, opts: pulumi.ComponentResourceOptions = {}) {
        super(name, {}, opts);

        const data = pulumi.output(this.getData());
        this.vpc = data.vpc;
    }

    protected async initialize(props: { name: string, args: schema.VpcArgs, opts: pulumi.ComponentResourceOptions }) {
        const {name, args} = props;
        const availabilityZones = args.availabilityZoneNames ?? await this.getDefaultAzs();

        const natGatewayStrategy: schema.NatGatewayStrategyInputs = args.natGateways?.strategy ?? "OnePerAz";
        const eips = args.natGateways?.elasticIpAllocationIds;

        // We are strict about matching NAT Gateway strategies with the number of supplied EIPs (if supplied) because if
        // EIPs are supplied, we are assuming the user has a scenario where all outbound traffic from the VPC must come
        // from known IP addresses, e.g. because they are hitting a data center-based service with a firewall that must
        // allowlist specific IP addresses. Assuming this is the user's scenario, e.g. we have 3 AZs, and only 2 EIPs
        // specified, 1/3 of the traffic coming from the VPC will be seemingly randomly rejected, which is a difficult
        // and frustrating problem to debug. Therefore, we feel it's better to be strict about the acceptable inputs to
        // avoid potentially confusing problems in production.
        switch (natGatewayStrategy) {
            case "None":
                if (eips?.length ?? 0 !== 0) {
                    throw new Error(`Elastic IP allocation IDs cannot be specified when NAT Gateway strategy is '${natGatewayStrategy}'.`);
                }
                break;
            case "Single":
                if (eips && eips.length !== 1) {
                    throw new Error(`Exactly one Elastic IP may be specified when NAT Gateway strategy is '${natGatewayStrategy}'.`);
                }
                break;
            case "OnePerAz":
                if (eips && eips.length !== availabilityZones.length) {
                    throw new Error(`The number of Elastic IPs, if specified, must match the number of availability zones for the VPC (${availabilityZones.length}) when NAT Gateway strategy is '${natGatewayStrategy}'`);
                }
                break;
            default:
                throw new Error(`Unknown NatGatewayStrategy '${natGatewayStrategy}'`);
        }

        return {
            vpc: new aws.ec2.Vpc(name, args, {parent: this}),
            subnets: [],
        };
    }

    async getDefaultAzs(): Promise<string[]> {
        const result = await aws.getAvailabilityZones();
        if (result.names.length < 3) {
            throw new Error("The configured region for this provider does not have at least 3 Availability Zones. Either specify an explicit list of zones in availabilityZoneNames or choose a region with at least 3 AZs.");
        }
        return result.names.slice(0, 2);
    }
}
