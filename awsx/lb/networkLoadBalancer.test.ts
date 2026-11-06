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

import * as runtime from "@pulumi/pulumi/runtime";
import { NetworkLoadBalancer } from "./networkLoadBalancer";

describe("NetworkLoadBalancer region", () => {
  let invokeCalls: any[] = [];
  let newResources: any[] = [];

  beforeAll(async () => {
    await runtime.setMocks({
      call(args) {
        invokeCalls.push(args);
        switch (args.token) {
          case "aws:ec2/getVpc:getVpc":
            return { id: "vpc-default", region: args.inputs.region };
          case "aws:ec2/getSubnets:getSubnets":
            return { id: "subnets", ids: ["subnet-a"], region: args.inputs.region };
          case "aws:ec2/getSubnet:getSubnet":
            return {
              id: args.inputs.id,
              vpcId: "vpc-default",
              mapPublicIpOnLaunch: true,
              region: args.inputs.region,
            };
          default:
            throw new Error(`Mock not implemented: ${args.token}`);
        }
      },
      newResource(args) {
        newResources.push(args);
        return { id: `mocked::${args.type}::${args.name}-id`, state: args.inputs };
      },
    });
  });

  beforeEach(() => {
    invokeCalls = [];
    newResources = [];
  });

  it("passes the top-level region to the load balancer, target group, listeners and default VPC lookups", async () => {
    new NetworkLoadBalancer("nlb", { region: "eu-central-1" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const regionOf = (type: string) => {
      const resource = newResources.find((r) => r.type === type);
      expect(resource).toBeDefined();
      return resource.inputs.region;
    };
    expect(regionOf("aws:lb/loadBalancer:LoadBalancer")).toBe("eu-central-1");
    expect(regionOf("aws:lb/targetGroup:TargetGroup")).toBe("eu-central-1");
    expect(regionOf("aws:lb/listener:Listener")).toBe("eu-central-1");

    const lookup = invokeCalls.find((c) => c.token === "aws:ec2/getVpc:getVpc");
    expect(lookup).toBeDefined();
    expect(lookup.inputs.region).toBe("eu-central-1");
  });
});
