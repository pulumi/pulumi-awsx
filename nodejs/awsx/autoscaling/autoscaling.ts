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
import * as pulumi from "@pulumi/pulumi";

import * as x from "..";
import * as utils from "./../utils";

import { AutoScalingLaunchConfiguration, AutoScalingLaunchConfigurationArgs } from "./launchConfiguration";
import { cronExpression, ScheduleArgs } from "./schedule";
import * as stepScaling from "./stepScaling";
import * as targetTracking from "./targetTracking";

export class AutoScalingGroup extends pulumi.ComponentResource {
    public readonly vpc: x.ec2.Vpc;

    /**
     * The [cloudformation.Stack] that was used to create this [AutoScalingGroup].  [CloudFormation]
     * is used here as the existing AWS apis for creating [AutoScalingGroup]s are not rich enough to
     * express everything that can be configured through [CloudFormation] itself.
     */
    public readonly stack: aws.cloudformation.Stack;

    /**
     * The launch configuration for this auto scaling group.
     */
    public readonly launchConfiguration: AutoScalingLaunchConfiguration;

    /**
     * Underlying [autoscaling.Group] that is created by cloudformation.
     */
    public readonly group: aws.autoscaling.Group;

    /**
     * Target groups this [AutoScalingGroup] is attached to.  See
     * https://docs.aws.amazon.com/autoscaling/ec2/userguide/attach-load-balancer-asg.html
     * for more details.
     */
    public readonly targetGroups: x.elasticloadbalancingv2.TargetGroup[];

    constructor(name: string,
                args: AutoScalingGroupArgs,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:x:autoscaling:AutoScalingGroup", name, {}, opts);

        const parentOpts = { parent: this };

        this.vpc = args.vpc || x.ec2.Vpc.getDefault();
        const subnetIds = args.subnetIds || this.vpc.privateSubnetIds;
        this.targetGroups = args.targetGroups || [];
        const targetGroupArns = this.targetGroups.map(g => g.targetGroup.arn);

        // Use the autoscaling config provided, otherwise just create a default one for this cluster.
        if (args.launchConfiguration) {
            this.launchConfiguration = args.launchConfiguration;
        }
        else {
            this.launchConfiguration = new AutoScalingLaunchConfiguration(
                name, this.vpc, args.launchConfigurationArgs, parentOpts);
        }

        this.vpc = args.vpc || x.ec2.Vpc.getDefault();

        // Use cloudformation to actually construct the autoscaling group.
        this.stack = new aws.cloudformation.Stack(name, {
            ...args,
            name: this.launchConfiguration.stackName,
            templateBody: getCloudFormationTemplate(
                name,
                this.launchConfiguration.id,
                subnetIds,
                targetGroupArns,
                utils.ifUndefined(args.templateParameters, {})),
        }, parentOpts);

        // Now go and actually find the group created by cloudformation.  The id for the group will
        // be stored in `stack.outputs.Instances`.
        this.group = aws.autoscaling.Group.get(name, this.stack.outputs["Instances"], undefined, parentOpts);

        this.registerOutputs();
    }

    public scaleOnSchedule(name: string, args: ScheduleArgs, opts: pulumi.CustomResourceOptions = {}) {
        const recurrence = args.recurrence === undefined
            ? undefined
            : pulumi.output(args.recurrence).apply(
                x => typeof x === "string" ? x : cronExpression(x));

        return new aws.autoscaling.Schedule(name, {
            ...args,
            recurrence,
            autoscalingGroupName: this.group.name,
            scheduledActionName: args.scheduledActionName || name,
            // Have to explicitly set these to -1.  If we pass 'undefined' through these will become
            // 0, which will actually set the size/capacity to that.
            minSize: utils.ifUndefined(args.minSize, -1),
            maxSize: utils.ifUndefined(args.maxSize, -1),
            desiredCapacity: utils.ifUndefined(args.desiredCapacity, -1),
        }, { parent: this, ...opts });
    }

    /**
     * With target tracking scaling policies, you select a scaling metric and set a target value.
     * Amazon EC2 Auto Scaling creates and manages the CloudWatch alarms that trigger the scaling
     * policy and calculates the scaling adjustment based on the metric and the target value. The
     * scaling policy adds or removes capacity as required to keep the metric at, or close to, the
     * specified target value. In addition to keeping the metric close to the target value, a target
     * tracking scaling policy also adjusts to the changes in the metric due to a changing load
     * pattern.
     *
     * For example, you can use target tracking scaling to:
     *
     * * Configure a target tracking scaling policy to keep the average aggregate CPU utilization of
     *   your Auto Scaling group at 50 percent.
     *
     * * Configure a target tracking scaling policy to keep the request count per target of your
     *   Elastic Load Balancing target group at 1000 for your Auto Scaling group.
     *
     * We recommend that you scale on Amazon EC2 instance metrics with a 1-minute frequency because
     * that ensures a faster response to utilization changes. Scaling on metrics with a 5-minute
     * frequency can result in slower response times and scaling on stale metric data. By default,
     * Amazon EC2 instances are enabled for basic monitoring, which means metric data for instances
     * is available at 5-minute intervals. You can enable detailed monitoring to get metric data for
     * instances at 1-minute frequency. For more information, see
     * [Configure-Monitoring-for-Auto-Scaling-Instances](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-instance-monitoring.html#enable-as-instance-metrics).
     *
     * See https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html for
     * more details.
     */
    public scaleToTrackMetric(name: string, args: targetTracking.CustomMetricTargetTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions): aws.autoscaling.Policy {
        return targetTracking.createCustomMetricPolicy(name, this, args, opts);
    }

    /**
     * Scales in response to the average CPU utilization of the [AutoScalingGroup].
     */
    public scaleToTrackAverageCPUUtilization(name: string, args: targetTracking.TargetTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions): aws.autoscaling.Policy {
        return targetTracking.createPredefinedMetricPolicy(name, this, {
            predefinedMetricType: "ASGAverageCPUUtilization",
            ...args,
        }, opts);
    }

    /**
     * Scales in response to the average number of bytes received on all network interfaces by the
     * [AutoScalingGroup].
     */
    public scaleToTrackAverageNetworkIn(name: string, args: targetTracking.TargetTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions): aws.autoscaling.Policy {
        return targetTracking.createPredefinedMetricPolicy(name, this, {
            predefinedMetricType: "ASGAverageNetworkIn",
            ...args,
        }, opts);
    }

    /**
     * Scales in response to the average number of bytes sent out on all network interfaces by the
     * [AutoScalingGroup].
     */
    public scaleToTrackAverageNetworkOut(name: string, args: targetTracking.TargetTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions): aws.autoscaling.Policy {
        return targetTracking.createPredefinedMetricPolicy(name, this, {
            predefinedMetricType: "ASGAverageNetworkOut",
            ...args,
        }, opts);
    }

    /**
     * Scales in response to the number of requests completed per target in an [TargetGroup].
     * [AutoScalingGroup].  These [TargetGroup]s must have been provided to the [AutoScalingGroup]
     * when constructed using [AutoScalingGroupArgs.targetGroups].
     */
    public scaleToTrackRequestCountPerTarget(name: string, args: targetTracking.ApplicationTargetGroupTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions) {
        const targetGroup = args.targetGroup;
        if (this.targetGroups.indexOf(targetGroup) < 0) {
            throw new Error("AutoScalingGroup must have been created with [args.targetGroup] to support scaling by request count.");
        }

        // loadbalancer-arnsuffix/targetgroup-arnsuffix is the format necessary to specify an
        // AppTargetGroup for a tracking policy.  See
        // https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_PredefinedMetricSpecification.html
        // for more details.
        const loadBalancerSuffix = targetGroup.loadBalancer.loadBalancer.arnSuffix;
        const targetGroupSuffix = targetGroup.targetGroup.arnSuffix;

        return targetTracking.createPredefinedMetricPolicy(name, this, {
            predefinedMetricType: "ALBRequestCountPerTarget",
            resourceLabel: pulumi.interpolate `${loadBalancerSuffix}/${targetGroupSuffix}`,
            ...args,
        }, opts);
    }

    /**
     * Creates a [StepScalingPolicy]  that increases or decreases the current capacity of this
     * AutoScalingGroup based on a set of scaling adjustments, known as step adjustments. The
     * adjustments vary based on the size of the alarm breach.
     *
     * See [StepScalingPolicy] for more details.
     */
    public scaleInSteps(name: string, args: stepScaling.StepScalingPolicyArgs, opts?: pulumi.ComponentResourceOptions) {
        return new stepScaling.StepScalingPolicy(name, this, args, opts);
    }
}

function ifUndefined<T>(val: T | undefined, defVal: T) {
    return val !== undefined ? val : defVal;
}

// TODO[pulumi/pulumi-aws/issues#43]: We'd prefer not to use CloudFormation, but it's the best way to implement
// rolling updates in an autoscaling group.
function getCloudFormationTemplate(
    instanceName: string,
    instanceLaunchConfigurationId: pulumi.Output<string>,
    subnetIds: pulumi.Input<string>[],
    targetGroupArns: pulumi.Input<string>[],
    parameters: pulumi.Output<TemplateParameters>): pulumi.Output<string> {

    const subnetIdsArray = pulumi.all(subnetIds);
    return pulumi.all([subnetIdsArray, targetGroupArns, instanceLaunchConfigurationId, parameters])
                 .apply(([subnetIdsArray, targetGroupArns, instanceLaunchConfigurationId, parameters]) => {

    const minSize = ifUndefined(parameters.minSize, 2);
    const maxSize = ifUndefined(parameters.maxSize, 100);
    const cooldown = ifUndefined(parameters.defaultCooldown, 300);
    const healthCheckGracePeriod = ifUndefined(parameters.healthCheckGracePeriod, 120);
    const healthCheckType = ifUndefined(parameters.healthCheckType, "EC2");
    const suspendProcesses = ifUndefined(parameters.suspendedProcesses, ["ScheduledActions"]);

    let suspendProcessesString = "";
    for (let i = 0, n = suspendProcesses.length; i < n; i++) {
        const sp = suspendProcesses[i];
        if (i > 0) {
            suspendProcessesString += "\n";
        }

        suspendProcessesString += "                    -   " + sp;
    }

    let result = `
    AWSTemplateFormatVersion: '2010-09-09'
    Outputs:
        Instances:
            Value: !Ref Instances
    Resources:
        Instances:
            Type: AWS::AutoScaling::AutoScalingGroup
            Properties:
                Cooldown: ${cooldown}
                DesiredCapacity: ${minSize}
                HealthCheckGracePeriod: ${healthCheckGracePeriod}
                HealthCheckType: ${healthCheckType}
                LaunchConfigurationName: "${instanceLaunchConfigurationId}"
                MaxSize: ${maxSize}
                MetricsCollection:
                -   Granularity: 1Minute
                MinSize: ${minSize}`;

    if (targetGroupArns.length) {
        result += `
                TargetGroupARNs: ${JSON.stringify(targetGroupArns)}`;
    }

    result += `
                VPCZoneIdentifier: ${JSON.stringify(subnetIdsArray)}
                Tags:
                -   Key: Name
                    Value: ${instanceName}
                    PropagateAtLaunch: true
            CreationPolicy:
                ResourceSignal:
                    Count: ${minSize}
                    Timeout: PT15M
            UpdatePolicy:
                AutoScalingRollingUpdate:
                    MaxBatchSize: 1
                    MinInstancesInService: ${minSize}
                    PauseTime: PT15M
                    SuspendProcesses:
${suspendProcessesString}
                    WaitOnResourceSignals: true
    `;

    return result;
                 });
}

export interface AutoScalingGroupArgs {
    /**
     * The vpc this autoscaling group is for.  If not provided this autoscaling group will be
     * created for the default vpc.
     */
    vpc?: x.ec2.Vpc;

    /**
     * The subnets to use for the autoscaling group.  If not provided, the `private` subnets of
     * the `vpc` will be used.
     */
    subnetIds?: pulumi.Input<string>[];

    /**
     * The config to use when creating the auto scaling group.
     *
     * [launchConfiguration] or [launchConfigurationArgs] can be provided.  And, if either are
     * provided will be used as the launch configuration for the auto scaling group.
     *
     * If neither are provided, a default instance will be create by calling
     * [cluster.createAutoScalingConfig()].
     */
    launchConfiguration?: AutoScalingLaunchConfiguration;

    /**
     * The config to use when creating the auto scaling group.
     *
     * [launchConfiguration] or [launchConfigurationArgs] can be provided.  And, if either are
     * provided will be used as the launch configuration for the auto scaling group.
     *
     * If neither are provided, a default instance will be create by calling
     * [cluster.createAutoScalingConfig()].
     */
    launchConfigurationArgs?: AutoScalingLaunchConfigurationArgs;

    /**
     * Parameters to control the cloud formation stack template that is created.  If not provided
     * the defaults specified in TemplateParameters will be used.
     */
    templateParameters?: pulumi.Input<TemplateParameters>;

    /**
     * A list of target groups to associate with the Auto Scaling group.  All target groups must
     * have the "instance" [targetType].
     */
    targetGroups?: x.elasticloadbalancingv2.TargetGroup[];
}

type OverwriteTemplateParameters = utils.Overwrite<utils.Mutable<aws.autoscaling.GroupArgs>, {
    availabilityZones?: never;
    desiredCapacity?: never;
    enabledMetrics?: never;
    forceDelete?: never;
    initialLifecycleHooks?: never;
    launchConfiguration?: never;
    launchTemplate?: never;
    loadBalancers?: never;
    metricsGranularity?: never;
    minElbCapacity?: never;
    name?: never;
    namePrefix?: never;
    placementGroup?: never;
    protectFromScaleIn?: never;
    serviceLinkedRoleArn?: never;
    tags?: never;
    tagsCollection?: never;
    targetGroupArns?: never;
    terminationPolicies?: never;
    vpcZoneIdentifiers?: never;
    waitForCapacityTimeout?: never;
    waitForElbCapacity?: never;

    /**
     * The maximum size of the auto scale group.  Defaults to 100 if unspecified.
     */
    maxSize?: pulumi.Input<number>;
    /**
     * The minimum size of the auto scale group.  Defaults to 2 if unspecified.
     */
    minSize?: pulumi.Input<number>;
}>;

export interface TemplateParameters {
    // Properties we've changed.
    /**
     * The amount of time, in seconds, after a scaling activity completes before another scaling
     * activity can start.  Defaults to 300 if unspecified.
     */
    defaultCooldown?: pulumi.Input<number>;

    /**
     * Time (in seconds) after instance comes into service before checking health. Defaults to 120
     * if unspecified.
     */
    healthCheckGracePeriod?: pulumi.Input<number>;

    /**
     * "EC2" or "ELB". Controls how health checking is done.  Defaults to "EC2" if unspecified.
     */
    healthCheckType?: pulumi.Input<"EC2" | "ELB">;

    /**
     * A list of processes to suspend for the AutoScaling Group. The allowed values are `Launch`,
     * `Terminate`, `HealthCheck`, `ReplaceUnhealthy`, `AZRebalance`, `AlarmNotification`,
     * `ScheduledActions`, `AddToLoadBalancer`. Note that if you suspend either the `Launch` or
     * `Terminate` process types, it can prevent your autoscaling group from functioning properly.
     *
     * Defaults to "ScheduledActions" if not specified
     */
    suspendedProcesses?: pulumi.Input<pulumi.Input<
        "Launch" | "Terminate" | "HealthCheck" | "ReplaceUnhealthy" |
        "AZRebalance" | "AlarmNotification" | "ScheduledActions" | "AddToLoadBalancer">[]>;

    /**
     * The maximum size of the auto scale group.  Defaults to 100 if unspecified.
     */
    maxSize?: pulumi.Input<number>;

    /**
     * The minimum size of the auto scale group.  Defaults to 100 if unspecified.
     */
    minSize?: pulumi.Input<number>;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteTemplateParameters, TemplateParameters>();
