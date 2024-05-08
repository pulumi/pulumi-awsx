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
import { getDefaultVpc } from "../ec2";
import * as schema from "../schema-types";
import * as utils from "../utils";

export class ApplicationLoadBalancer extends schema.ApplicationLoadBalancer {
  constructor(
    name: string,
    args: schema.ApplicationLoadBalancerArgs,
    opts: pulumi.ComponentResourceOptions = {},
  ) {
    super(
      name,
      {},
      pulumi.mergeOptions(opts, {
        aliases: [
          {
            name: "awsx:x:elasticloadbalancingv2:ApplicationLoadBalancer",
          },
        ],
      }),
    );

    const {
      subnetIds,
      subnets,
      defaultTargetGroup,
      defaultTargetGroupPort,
      defaultSecurityGroup,
      listener,
      listeners,
      /* tslint:disable */ //rest args will always be last so don't have trailing commas
      ...restArgs
      /* tslint:enable */
    } = args;
    const lbArgs: aws.lb.LoadBalancerArgs = restArgs;

    const definedSubnetArgs = utils.countDefined([subnetIds, subnets, restArgs.subnetMappings]);
    if (definedSubnetArgs > 1) {
      throw new Error("Only one of [subnets], [subnetIds] or [subnetMappings] can be specified");
    }
    if (subnets) {
      lbArgs.subnets = pulumi.output(subnets).apply((subnets) => subnets.map((s) => s.id));
      this.vpcId = pulumi.output(subnets).apply((subnets) => subnets[0].vpcId);
    } else if (subnetIds) {
      lbArgs.subnets = subnetIds;
      this.vpcId = pulumi
        .output(subnetIds)
        .apply((ids) => aws.ec2.getSubnet({ id: ids[0] }, { parent: this })).vpcId;
    } else if (restArgs.subnetMappings) {
      this.vpcId = pulumi
        .output(restArgs.subnetMappings!)
        .apply((s) => aws.ec2.getSubnet({ id: s[0].subnetId }, { parent: this })).vpcId;
    } else {
      const defaultVpc = pulumi.output(getDefaultVpc({ parent: this }));
      this.vpcId = defaultVpc.vpcId;
      lbArgs.subnets = defaultVpc.publicSubnetIds;
    }

    if (listener && listeners) {
      throw new Error("Only one of [listener] and [listeners] can be specified");
    }

    if (!lbArgs.securityGroups && !defaultSecurityGroup?.skip) {
      if (defaultSecurityGroup?.args && defaultSecurityGroup.securityGroupId) {
        throw new Error(
          "Only one of [defaultSecurityGroup] [args] or [securityGroupId] can be specified",
        );
      }
      const securityGroupId = defaultSecurityGroup?.securityGroupId;
      if (securityGroupId) {
        lbArgs.securityGroups = [securityGroupId];
      } else {
        const securityGroup = new aws.ec2.SecurityGroup(
          name,
          defaultSecurityGroup?.args ?? {
            // TO-DO: we default to open SG rules at this point - we should review this!
            vpcId: this.vpcId,
            ingress: [
              {
                fromPort: 0,
                toPort: 0,
                protocol: "-1",
                cidrBlocks: ["0.0.0.0/0"],
                ipv6CidrBlocks: ["::/0"],
              },
            ],
            egress: [
              {
                fromPort: 0,
                toPort: 65535,
                protocol: "tcp",
                cidrBlocks: ["0.0.0.0/0"],
                ipv6CidrBlocks: ["::/0"],
              },
            ],
          },
          { parent: this },
        );
        this.defaultSecurityGroup = securityGroup;
        lbArgs.securityGroups = [securityGroup.id];
      }
    }

    // this is an application loadbalancer so we set this explicitly
    // we have removed this from the input properties in the schema
    lbArgs.loadBalancerType = "application";

    this.loadBalancer = new aws.lb.LoadBalancer(name, lbArgs, {
      parent: this,
    });

    if (defaultTargetGroup !== undefined && defaultTargetGroupPort !== undefined) {
      throw new Error(
        "Only one of `defaultTargetGroup` or `defaultTargetGroupPort` can be provided.",
      );
    }

    const defaultProtocol = getDefaultProtocol(args);

    this.defaultTargetGroup = new aws.lb.TargetGroup(
      name,
      {
        vpcId: this.vpcId,
        targetType: "ip",
        ...defaultProtocol,
        ...defaultTargetGroup,
      },
      { parent: this },
    );

    const defaultActions = [
      {
        type: "forward",
        targetGroupArn: this.defaultTargetGroup.arn,
      },
    ];

    if (listener) {
      this.listeners = [
        new aws.lb.Listener(
          `${name}-0`,
          {
            defaultActions,
            ...defaultProtocol,
            ...listener,
            loadBalancerArn: this.loadBalancer.arn,
          },
          { parent: this },
        ),
      ];
    } else if (listeners) {
      this.listeners = listeners.map(
        (args, i) =>
          // TODO: Check name compat with classic
          new aws.lb.Listener(
            `${name}-${i}`,
            {
              defaultActions,
              ...getListenerProtocol(args),
              ...args,
              loadBalancerArn: this.loadBalancer.arn,
            },
            { parent: this },
          ),
      );
    } else {
      this.listeners = [
        new aws.lb.Listener(
          `${name}-0`,
          {
            defaultActions,
            ...defaultProtocol,
            loadBalancerArn: this.loadBalancer.arn,
          },
          { parent: this },
        ),
      ];
    }
  }
}

/** Get default port if there's just 1 listener */
function getDefaultProtocol(
  args: Readonly<schema.ApplicationLoadBalancerArgs>,
): { port: pulumi.Input<number>; protocol: pulumi.Input<string> } | undefined {
  let { listener } = args;
  if (args.listeners) {
    if (args.listeners.length !== 1) {
      listener = args.listeners[0];
    } else {
      return undefined;
    }
  }
  return getListenerProtocol(listener, args.defaultTargetGroupPort);
}

function getListenerProtocol(
  listener: schema.ListenerInputs | undefined,
  defaultPort?: pulumi.Input<number>,
): { port: pulumi.Input<number>; protocol: pulumi.Input<string> } | undefined {
  if (listener) {
    const { port, protocol } = listener;
    if (port && protocol) {
      return { port, protocol };
    }
    if (port) {
      return {
        port,
        protocol: protocol ?? pulumi.output(port).apply(portToProtocol),
      };
    }
    if (protocol) {
      return {
        protocol,
        port: pulumi.output(protocol).apply(protocolToPort),
      };
    }
  }
  return { port: defaultPort ?? 80, protocol: "HTTP" };
}

function portToProtocol(port: number) {
  if (port === 443) {
    return "HTTPS";
  }

  return "HTTP";
}

function protocolToPort(protocol: string) {
  if (protocol === "HTTPS") {
    return 443;
  }

  return 80;
}
