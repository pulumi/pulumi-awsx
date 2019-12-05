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

// tslint:disable:max-line-length

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as mod from ".";
import * as utils from "../utils";

export class TargetGroupAttachment extends pulumi.ComponentResource {
    public readonly targetGroupAttachment!: aws.lb.TargetGroupAttachment;
    public readonly permission?: aws.lambda.Permission;
    public readonly func?: aws.lambda.Function;

    /** @internal */
    constructor(version: number, name: string, targetGroup: mod.TargetGroup, opts: pulumi.ComponentResourceOptions) {
        opts = pulumi.mergeOptions(opts, { aliases: [{ type: "awsx:elasticloadbalancingv2:TargetGroupAttachment" }] });
        super("awsx:lb:TargetGroupAttachment", name, {}, { parent: targetGroup, ...opts });

        if (typeof version !== "number") {
            throw new pulumi.ResourceError("Do not call [new TargetGroupAttachment] directly. Use [TargetGroupAttachment.create] instead.", this);
        }
    }

    public static async create(name: string, targetGroup: mod.TargetGroup, args: mod.LoadBalancerTarget, opts: pulumi.ComponentResourceOptions = {}) {
        const result = new TargetGroupAttachment(1, name, targetGroup, opts);
        await result.initialize(name, targetGroup, args);
        return result;
    }

    /** @internal */
    public async initialize(name: string, targetGroup: mod.TargetGroup, args: mod.LoadBalancerTarget) {
        const _this = utils.Mutable(this);

        const { targetInfo, func, permission } = getTargetInfo(this, targetGroup, name, args);

        const dependsOn = permission ? [permission] : [];

        _this.targetGroupAttachment = new aws.lb.TargetGroupAttachment(name, {
            availabilityZone: <pulumi.Input<string>>targetInfo.availabilityZone,
            port: <pulumi.Input<number>>targetInfo.port,
            targetGroupArn: targetGroup.targetGroup.arn,
            targetId: targetInfo.targetId,
        }, { parent: this, dependsOn });

        _this.func = func;
        _this.permission = permission;

        this.registerOutputs();
    }
}

utils.Capture(TargetGroupAttachment.prototype).initialize.doNotCapture = true;

function getTargetInfo(parent: TargetGroupAttachment, targetGroup: mod.TargetGroup, name: string, args: mod.LoadBalancerTarget) {
    if (aws.ec2.Instance.isInstance(args)) {
        return { targetInfo: getEc2InstanceTargetInfo(targetGroup, args), permission: undefined, func: undefined };
    }

    if (aws.lambda.Function.isInstance(args)) {
        return getLambdaFunctionTargetInfo(parent, targetGroup, name, args);
    }

    if (args instanceof Function) {
        return getLambdaFunctionTargetInfo(parent, targetGroup, name, new aws.lambda.CallbackFunction(name, { callback: args }, { parent }));
    }

    if (mod.isLoadBalancerTargetInfoProvider(args)) {
        const targetType = <pulumi.Output<mod.TargetType>>targetGroup.targetGroup.targetType;
        return { targetInfo: args.loadBalancerTargetInfo(targetType), permission: undefined, func: undefined };
    }

    return { targetInfo: pulumi.output(args), permission: undefined, func: undefined } ;
}

/**
 * Allows an EC2 instance to simply be used as the target of an ALB or NLB.  To use, just call:
 */
function getEc2InstanceTargetInfo(targetGroup: mod.TargetGroup, instance: aws.ec2.Instance) {
    const targetInfo = pulumi.output([targetGroup.targetGroup.targetType, instance.id, instance.privateIp, instance.availabilityZone])
                             .apply(([targetType, instanceId, privateIp, availabilityZone]) => {

        if (targetType === "lambda") {
            throw new pulumi.ResourceError("Cannot connect a [TargetGroup] with type [lambda] to an ec2.Instance", targetGroup);
        }

        return <mod.LoadBalancerTargetInfo>{
            targetId: targetType === "instance" ? instanceId : privateIp,
            availabilityZone: availabilityZone,
        };
    });

    return targetInfo;
}

/**
 * Allows a Lambda to simply be used as the target of an ALB.  To use, just call:
 */
function getLambdaFunctionTargetInfo(parent: TargetGroupAttachment, targetGroup: mod.TargetGroup, name: string, func: aws.lambda.Function) {
    const permission = new aws.lambda.Permission(name, {
        action: "lambda:InvokeFunction",
        function: func,
        principal: "elasticloadbalancing.amazonaws.com",
        sourceArn: targetGroup.targetGroup.arn,
    }, { parent });

    const targetInfo = pulumi.output([targetGroup.targetGroup.targetType, func.arn])
                             .apply(([targetType, lambdaArn]) => {

        if (targetType !== "lambda") {
            throw new pulumi.ResourceError("Can only connect a [TargetGroup] with type [lambda] to an aws.lambda.Function", targetGroup);
        }

        return <mod.LoadBalancerTargetInfo>{
            targetId: lambdaArn,
        };
    });

    return { targetInfo, func, permission };
}

export interface TargetGroupAttachmentArgs {
    /**
     * The Availability Zone where the IP address of the target is to be registered.
     */
    availabilityZone?: pulumi.Input<string>;

    /**
     * The port on which targets receive traffic.
     */
    port?: pulumi.Input<number>;

    /**
     * The ID of the target. This is the Instance ID for an instance, or the container ID for an ECS container. If the target type is ip, specify an IP address. If the target type is lambda, specify the arn of lambda.
     */
    targetId: pulumi.Input<string>;

    /**
     * Optional function this target group attachment targets.
     */
    func?: aws.lambda.Function;
}
