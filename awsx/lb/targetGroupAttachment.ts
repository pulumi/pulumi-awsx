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

export class TargetGroupAttachment extends schema.TargetGroupAttachment {
    constructor(
        name: string,
        args: schema.TargetGroupAttachmentArgs,
        opts: pulumi.ComponentResourceOptions = {},
    ) {
        super(name, args, opts);
        if (utils.countDefined([args.targetGroup, args.targetGroupArn]) !== 1) {
            throw new Error(
                "Exactly 1 of [targetGroup] or [targetGroupArn] must be provided",
            );
        }
        if (
            utils.countDefined([
                args.instance,
                args.instanceId,
                args.lambda,
                args.lambdaArn,
            ]) !== 1
        ) {
            throw new Error(
                "Exactly 1 of [instance], [instanceId], [lambda] or [lambdaArn] must be provided.",
            );
        }

        const { targetGroupArn, targetType } = (() => {
            const { targetGroup, targetGroupArn } = args;
            if (targetGroup) {
                const tgOutput = pulumi.output(args.targetGroup!);
                return {
                    targetGroupArn: tgOutput.arn,
                    targetType: tgOutput.targetType,
                };
            }
            if (targetGroupArn) {
                const arnOutput = pulumi.output(targetGroupArn);
                return {
                    targetGroupArn: arnOutput,
                    targetType: arnOutput
                        .apply((arn) => aws.lb.getTargetGroup({ arn }))
                        .apply((tg) => tg.targetType),
                };
            }
            throw new Error("Unreachable");
        })();

        const { instance, instanceId, lambda, lambdaArn } = args;

        const attachmentArgs = (() => {
            if (instance) {
                const instanceOutputs = pulumi.output(instance);
                return {
                    targetId: targetType.apply((t) =>
                        t === "instance"
                            ? instanceOutputs.id
                            : instanceOutputs.privateIp,
                    ),
                    availabilityZone: instanceOutputs.availabilityZone,
                };
            }
            if (instanceId) {
                const instanceOutputs = aws.ec2.getInstanceOutput({
                    instanceId,
                });
                return {
                    targetId: targetType.apply((t) =>
                        t === "instance"
                            ? instanceOutputs.id
                            : instanceOutputs.privateIp,
                    ),
                    availabilityZone: instanceOutputs.availabilityZone,
                };
            }
            if (lambda) {
                return {
                    targetId: pulumi.output(lambda).arn,
                };
            }
            if (lambdaArn) {
                return {
                    targetId: lambdaArn,
                };
            }
            throw new Error("Unreachable condition");
        })();

        if (lambda || lambdaArn) {
            this.lambdaPermission = new aws.lambda.Permission(
                name,
                {
                    action: "lambda:InvokeFunction",
                    function: lambda ?? lambdaArn!,
                    principal: "elasticloadbalancing.amazonaws.com",
                    sourceArn: targetGroupArn,
                },
                { parent: this },
            );
        }

        this.targetGroupAttachment = new aws.lb.TargetGroupAttachment(
            name,
            {
                ...attachmentArgs,
                targetGroupArn: targetGroupArn,
            },
            {
                parent: this,
                dependsOn: this.lambdaPermission ? [this.lambdaPermission] : [],
            },
        );
    }
}
