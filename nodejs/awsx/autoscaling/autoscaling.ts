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
import * as roleUtils from "../role";
import * as utils from "./../utils";

import * as policy from "./policy";
import { cronExpression, ScheduleArgs } from "./schedule";

export class AutoScalingLaunchConfiguration extends pulumi.ComponentResource {
    public readonly launchConfiguration: aws.ec2.LaunchConfiguration;
    public readonly id: pulumi.Output<string>;
    public readonly securityGroups: x.ec2.SecurityGroup[];

    public readonly instanceProfile: aws.iam.InstanceProfile;

    /**
     * Name to give the auto-scaling-group's cloudformation stack name.
     */
    public readonly stackName: pulumi.Output<string>;

    constructor(name: string, vpc: x.ec2.Vpc,
                args: AutoScalingLaunchConfigurationArgs = {},
                opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:x:autoscaling:AutoScalingLaunchConfiguration", name, {}, opts);

        const parentOpts = { parent: this };

        // Create the full name of our CloudFormation stack here explicitly. Since the CFN stack
        // references the launch configuration and vice-versa, we use this to break the cycle.
        // TODO[pulumi/pulumi#381]: Creating an S3 bucket is an inelegant way to get a durable,
        // unique name.
        this.stackName = pulumi.output(args.stackName).apply(sn => sn ? pulumi.output(sn) : new aws.s3.Bucket(name, {}, parentOpts).id);

        // Use the instance provided, or create a new one.
        this.instanceProfile = args.instanceProfile ||
            AutoScalingLaunchConfiguration.createInstanceProfile(
                name, /*assumeRolePolicy:*/ undefined, /*policyArns:*/ undefined, parentOpts);

        this.securityGroups = x.ec2.getSecurityGroups(vpc, name, args.securityGroups, parentOpts) || [];

        this.launchConfiguration = new aws.ec2.LaunchConfiguration(name, {
            ...args,
            securityGroups: this.securityGroups.map(g => g.id),
            imageId: getEcsAmiId(args.ecsOptimizedAMIName),
            instanceType: utils.ifUndefined(args.instanceType, "t2.micro"),
            iamInstanceProfile: this.instanceProfile.id,
            enableMonitoring: utils.ifUndefined(args.enableMonitoring, true),
            placementTenancy: utils.ifUndefined(args.placementTenancy, "default"),
            rootBlockDevice: utils.ifUndefined(args.rootBlockDevice, defaultRootBlockDevice),
            ebsBlockDevices: utils.ifUndefined(args.ebsBlockDevices, defaultEbsBlockDevices),
            userData: getInstanceUserData(args, this.stackName),
        }, parentOpts);
        this.id = this.launchConfiguration.id;

        this.registerOutputs();
    }

    public static defaultInstanceProfilePolicyDocument(): aws.iam.PolicyDocument {
        return {
            Version: "2012-10-17",
            Statement: [{
                Action: [
                    "sts:AssumeRole",
                ],
                Effect: "Allow",
                Principal: {
                    Service: [ "ec2.amazonaws.com" ],
                },
            }],
        };
    }

    public static defaultInstanceProfilePolicyARNs() {
        return [aws.iam.AmazonEC2ContainerServiceforEC2Role, aws.iam.AmazonEC2ReadOnlyAccess];
    }

    /**
     * Creates the [instanceProfile] for a [ClusterAutoScalingLaunchConfiguration] if not provided
     * explicitly. If [assumeRolePolicy] is provided it will be used when creating the task,
     * otherwise [defaultInstanceProfilePolicyDocument] will be used.  If [policyArns] are provided,
     * they will be used to create [RolePolicyAttachment]s for the Role.  Otherwise,
     * [defaultInstanceProfilePolicyARNs] will be used.
     */
    public static createInstanceProfile(
        name: string,
        assumeRolePolicy?: string | aws.iam.PolicyDocument,
        policyArns?: string[],
        opts?: pulumi.ComponentResourceOptions) {

        const { role, policies } = roleUtils.createRoleAndPolicies(
            name,
            assumeRolePolicy || AutoScalingLaunchConfiguration.defaultInstanceProfilePolicyDocument(),
            policyArns || AutoScalingLaunchConfiguration.defaultInstanceProfilePolicyARNs(),
            opts);

        return new aws.iam.InstanceProfile(name, { role }, {...opts, dependsOn: policies });
    }
}

const defaultRootBlockDevice = {
    volumeSize: 8, // GiB
    volumeType: "gp2", // default is "standard"
    deleteOnTermination: true,
};

const defaultEbsBlockDevices = [{
        // Swap volume
        deviceName: "/dev/xvdb",
        volumeSize: 5, // GiB
        volumeType: "gp2", // default is "standard"
        deleteOnTermination: true,
    }, {
        // Docker image and metadata volume
        deviceName: "/dev/xvdcz",
        volumeSize: 50, // GiB
        volumeType: "gp2",
        deleteOnTermination: true,
    }];


// http://docs.aws.amazon.com/AmazonECS/latest/developerguide/container_agent_versions.html
async function getEcsAmiId(name?: string): Promise<string> {
    // If a name was not provided, use the latest recommended version.
    if (!name) {
        // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/retrieve-ecs-optimized_AMI.html
        const ecsRecommendedAMI = await aws.ssm.getParameter({
            name: "/aws/service/ecs/optimized-ami/amazon-linux/recommended",
        });
        return JSON.parse(ecsRecommendedAMI.value).image_id;
    }

    // Else, if a name was provided, look it up and use that imageId.
    const result: aws.GetAmiResult = await aws.getAmi({
        owners: [
            "591542846629", // Amazon
        ],
        filters: [
            {
                name: "name",
                values: [ name ],
            },
        ],
        mostRecent: true,
    });

    return result.imageId;
}

// http://cloudinit.readthedocs.io/en/latest/topics/format.html#cloud-config-data
// ours seems inspired by:
// https://github.com/convox/rack/blob/023831d8/provider/aws/dist/rack.json#L1669
// https://github.com/awslabs/amazon-ecs-amazon-efs/blob/d92791f3/amazon-efs-ecs.json#L655
function getInstanceUserData(
    args: AutoScalingLaunchConfigurationArgs,
    cloudFormationStackName: pulumi.Output<string>) {

    const autoScalingUserData = <AutoScalingUserData>args.userData;
    if (args.userData !== undefined && !isAutoScalingUserData(args.userData)) {
        return args.userData;
    }

    const additionalBootcmdLines = getAdditionalBootcmdLines(autoScalingUserData);
    const additionalRuncmdLines = getAdditionalRuncmdLines(autoScalingUserData);

    return pulumi.all([additionalBootcmdLines, additionalRuncmdLines, cloudFormationStackName])
                 .apply(([additionalBootcmdLines, additionalRuncmdLines, cloudFormationStackName]) => {

        let userData = `#cloud-config
        repo_upgrade_exclude:
            - kernel*
        packages:
            - aws-cfn-bootstrap
            - aws-cli
            - nfs-utils
        mounts:
            - ['/dev/xvdb', 'none', 'swap', 'sw', '0', '0']
        bootcmd:
            - mkswap /dev/xvdb
            - swapon /dev/xvdb
            - echo ECS_ENGINE_AUTH_TYPE=docker >> /etc/ecs/ecs.config
`;
        userData += collapseLines(additionalBootcmdLines);

        userData +=
`        runcmd:
            # Set and use variables in the same command, since it's not obvious if
            # different commands will run in different shells.
            - |
                # Knock one letter off of availability zone to get region.
                AWS_AVAILABILITY_ZONE=$(curl -s 169.254.169.254/2016-09-02/meta-data/placement/availability-zone)
                AWS_REGION=$(echo $AWS_AVAILABILITY_ZONE | sed 's/.$//')

`;

        userData += collapseLines(additionalRuncmdLines);

        userData += `
                # Disable container access to EC2 metadata instance
                # See http://docs.aws.amazon.com/AmazonECS/latest/developerguide/instance_IAM_role.html
                iptables --insert FORWARD 1 --in-interface docker+ --destination 169.254.169.254/32 --jump DROP
                service iptables save

                /opt/aws/bin/cfn-signal \
                    --region "\${AWS_REGION}" \
                    --stack "${cloudFormationStackName}" \
                    --resource Instances
        `;

        return userData;
    });
}

function collapseLines(additionalBootcmdLines: x.autoscaling.UserDataLine[]) {
    let result = "";
    for (const line of additionalBootcmdLines) {
        let contents = line.contents;

        // By default, automatically indent.  Do not indent only in the case where the client
        // explicitly passes 'false'.
        if (line.automaticallyIndent !== false) {
            contents = "            " + contents;
            if (contents[contents.length - 1] !== "\n") {
                contents += "\n";
            }
        }

        result += contents;
    }

    return result;
}

function getAdditionalBootcmdLines(args: AutoScalingUserData | undefined): pulumi.Output<UserDataLine[]> {
    if (!args || !args.extraBootcmdLines) {
        return pulumi.output([]);
    }

    return pulumi.output(args.extraBootcmdLines());
}

function getAdditionalRuncmdLines(args: AutoScalingUserData | undefined): pulumi.Output<UserDataLine[]> {
    if (!args || !args.extraRuncmdLines) {
        return pulumi.output([]);
    }

    return pulumi.output(args.extraRuncmdLines());
}

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

    private scaleOnPolicy(name: string, type: policy.PolicyType, args: policy.PolicyArgs, opts: pulumi.CustomResourceOptions = {}) {
        const awsArgs: aws.autoscaling.PolicyArgs = {
            autoscalingGroupName: this.group.name,
            policyType: type,
            ...args,
        };

        return new aws.autoscaling.Policy(name, awsArgs, { parent: this, ...opts });
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
    public scaleToTrackMetric(name: string, args: policy.CustomMetricTargetTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions) {
        return new policy.CustomMetricTargetTrackingPolicy(name, this, args, opts);
    }

    /**
     * Scales in response to the average CPU utilization of the [AutoScalingGroup].
     */
    public scaleToTrackAverageCPUUtilization(name: string, args: policy.BaseMetricTargetTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions) {
        return new policy.PredefinedMetricTargetTrackingPolicy(name, this, {
            predefinedMetricType: "ASGAverageCPUUtilization",
            ...args,
        }, opts);
    }

    /**
     * Scales in response to the average number of bytes received on all network interfaces by the
     * [AutoScalingGroup].
     */
    public scaleToTrackAverageNetworkIn(name: string, args: policy.BaseMetricTargetTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions) {
        return new policy.PredefinedMetricTargetTrackingPolicy(name, this, {
            predefinedMetricType: "ASGAverageNetworkIn",
            ...args,
        }, opts);
    }

    /**
     * Scales in response to the average number of bytes sent out on all network interfaces by the
     * [AutoScalingGroup].
     */
    public scaleToTrackAverageNetworkOut(name: string, args: policy.BaseMetricTargetTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions) {
        return new policy.PredefinedMetricTargetTrackingPolicy(name, this, {
            predefinedMetricType: "ASGAverageNetworkOut",
            ...args,
        }, opts);
    }

    /**
     * Scales in response to the number of requests completed per target in an [TargetGroup].
     * [AutoScalingGroup].  These [TargetGroup]s must have been provided to the [AutoScalingGroup]
     * when constructed using [AutoScalingGroupArgs.targetGroups].
     */
    public scaleToTrackRequestCountPerTarget(name: string, args: policy.ApplicationTargetGroupTrackingPolicyArgs, opts?: pulumi.ComponentResourceOptions) {
        // For predefined metric type ALBRequestCountPerTarget, the parameter must be specified
        // in the format: loadbalancersuffix/targetgroupsuffix

        const firstTargetGroup = this.targetGroups.find(
            tg => x.elasticloadbalancingv2.ApplicationTargetGroup.isInstance(tg));

        if (!firstTargetGroup) {
            throw new Error("AutoScalingGroup must have been created with at least one ApplicationTargetGroup to support scaling by request count.");
        }

        const targetGroup = args.targetGroup || firstTargetGroup;
        if (this.targetGroups.indexOf(targetGroup) < 0) {
            throw new Error("AutoScalingGroup must have been created with [args.targetGroup] to support scaling by request count.");
        }

        const loadBalancer = targetGroup.loadBalancer.loadBalancer;

        return new policy.PredefinedMetricTargetTrackingPolicy(name, this, {
            predefinedMetricType: "ALBRequestCountPerTarget",
            resourceLabel: pulumi.interpolate `${loadBalancer.arnSuffix}/${targetGroup.targetGroup.arnSuffix}`,
            ...args,
        }, opts);
    }

    // public simpleScalingPolicy(name: string, args: policy.SimpleScalingPolicyArgs, opts?: pulumi.CustomResourceOptions) {
    //     return this.createPolicy(name, "SimpleScaling", args, opts);
    // }

    // public stepScalingPolicy(name: string, args: policy.StepScalingPolicyArgs, opts?: pulumi.CustomResourceOptions) {
    //     return this.createPolicy(name, "StepScaling", args, opts);
    // }

    // public trackingScalingPolicy(name: string, args: policy.TargetTrackingScalingPolicyArgs, opts?: pulumi.CustomResourceOptions) {
    //     return this.createPolicy(name, "TargetTrackingScaling", args, opts);
    // }

    // public create
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

// The shape we want for ClusterAutoScalingLaunchConfigurationArgs.  We don't export this as
// 'Overwrite' types are not pleasant to work with. However, they internally allow us to succinctly
// express the shape we're trying to provide. Code later on will ensure these types are compatible.
type OverwriteAutoScalingLaunchConfigurationArgs = utils.Overwrite<utils.Mutable<aws.ec2.LaunchConfigurationArgs>, {
    imageId?: never;
    stackName?: pulumi.Input<string>;
    instanceProfile?: aws.iam.InstanceProfile;
    ecsOptimizedAMIName?: string;
    instanceType?: pulumi.Input<aws.ec2.InstanceType>;
    placementTenancy?: pulumi.Input<"default" | "dedicated">;
    securityGroups?: x.ec2.SecurityGroupOrId[];
    userData?: pulumi.Input<string> | AutoScalingUserData;
}>;

/**
 * The set of arguments when creating the launch configuration for a cluster's autoscaling group.
 */
export interface AutoScalingLaunchConfigurationArgs {
    // Values copied directly from aws.ec2.LaunchConfigurationArgs

    /**
     * Associate a public ip address with an instance in a VPC.
     */
    associatePublicIpAddress?: pulumi.Input<boolean>;

    /**
     * If true, the launched EC2 instance will be EBS-optimized.
     */
    ebsOptimized?: pulumi.Input<boolean>;

    /**
     * Enables/disables detailed monitoring. This is enabled by default.
     */
    enableMonitoring?: pulumi.Input<boolean>;

    /**
     * Customize Ephemeral (also known as
     * "Instance Store") volumes on the instance. See Block Devices below for details.
     */
    ephemeralBlockDevices?: aws.ec2.LaunchConfigurationArgs["ephemeralBlockDevices"];

    /**
     * The name attribute of the IAM instance profile to associate
     * with launched instances.
     */
    iamInstanceProfile?: pulumi.Input<string | aws.iam.InstanceProfile>;

    /**
     * The key name that should be used for the instance.
     */
    keyName?: pulumi.Input<string>;

    /**
     * The name of the launch configuration. If you leave
     * this blank, Terraform will auto-generate a unique name.
     */
    name?: pulumi.Input<string>;

    /**
     * Creates a unique name beginning with the specified
     * prefix. Conflicts with `name`.
     */
    namePrefix?: pulumi.Input<string>;

    /**
     * The maximum price to use for reserving spot instances.
     */
    spotPrice?: pulumi.Input<string>;

    /**
     * Can be used instead of `user_data` to pass base64-encoded binary data directly. Use this
     * instead of `user_data` whenever the value is not a valid UTF-8 string. For example,
     * gzip-encoded user data must be base64-encoded and passed via this argument to avoid
     * corruption.
     */
    userDataBase64?: pulumi.Input<string>;

    /**
     * The ID of a ClassicLink-enabled VPC. Only applies to EC2-Classic instances. (eg. `vpc-2730681a`)
     */
    vpcClassicLinkId?: pulumi.Input<string>;

    /**
     * The IDs of one or more security groups for the specified ClassicLink-enabled VPC (eg. `sg-46ae3d11`).
     */
    vpcClassicLinkSecurityGroups?: pulumi.Input<pulumi.Input<string>[]>;

    // Changes made to normal args type.

    /**
     * The name of the stack the launch configuration will signal.
     */
    stackName?: pulumi.Input<string>;

    /**
     * The instance profile to use for the autoscaling group.  If not provided, a default one will
     * be created.
     */
    instanceProfile?: aws.iam.InstanceProfile;

    /**
     * The name of the ECS-optimzed AMI to use for the Container Instances in this cluster, e.g.
     * "amzn-ami-2017.09.l-amazon-ecs-optimized". Defaults to using the latest recommended ECS Linux
     * Optimized AMI, which may change over time and cause recreation of EC2 instances when new
     * versions are release. To control when these changes are adopted, set this parameter
     * explicitly to the version you would like to use.
     *
     * See http://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html for
     * valid values.
     */
    ecsOptimizedAMIName?: string;

    /**
     * The size of instance to launch.  Defaults to t2.micro if unspecified.
     */
    instanceType?: pulumi.Input<aws.ec2.InstanceType>;

    /**
     * The tenancy of the instance. Valid values are `"default"` or `"dedicated"`, see
     * http://docs.aws.amazon.com/AutoScaling/latest/APIReference/API_CreateLaunchConfiguration.html
     * for more details.  Default is "default" if unspecified.
     */
    placementTenancy?: pulumi.Input<"default" | "dedicated">;

    /**
     * Customize details about the root block device of the instance. See Block Devices below for
     * details.
     *
     * If not provided, an 8gb 'gp2' root device will be created.  This device will be deleted upon
     * termination.
     */
    rootBlockDevice?: aws.ec2.LaunchConfigurationArgs["rootBlockDevice"];

    /**
     * Additional EBS block devices to attach to the instance.  See Block Devices below for details.
     *
     * If not provided, a 5gb 'gp2' device will be mounted at '/dev/xvdb' and a 50gb 'gp2' device
     * will be mounted at '/dev/xvdcz'.  Both devices will be deleted upon termination.
     */
    ebsBlockDevices?: aws.ec2.LaunchConfigurationArgs["ebsBlockDevices"];

    // Changed by us.

    /**
    * A list of associated security group IDs.
    */
   securityGroups?: x.ec2.SecurityGroupOrId[];

    /**
     * The user data to provide when launching the instance. Do not pass gzip-compressed data via this argument; see `user_data_base64` instead.
     */
    userData?: pulumi.Input<string> | AutoScalingUserData;
}

export interface AutoScalingUserData {
    /**
     * Additional lines to be placed in the `runcmd` section of the launch configuration.
     */
    extraRuncmdLines?(): pulumi.Input<UserDataLine[]>;

    /**
     * Additional lines to be placed in the `bootcmd` section of the launch configuration.
     */
    extraBootcmdLines?(): pulumi.Input<UserDataLine[]>;
}

function isAutoScalingUserData(obj: any): obj is AutoScalingUserData {
    return obj !== undefined &&
        (!!(<AutoScalingUserData>obj).extraBootcmdLines ||
         !!(<AutoScalingUserData>obj).extraRuncmdLines);
}

/**
 * A line that should be added to the [userData] section of a LaunchConfiguration template.
 */
export interface UserDataLine {
    /**
     * Actual contents of the line.
     */
    contents: string;

    /**
     * Whether the line should be automatically indented to the right level.  Defaults to [true].
     * Set explicitly to [false] to control all indentation.
     */
    automaticallyIndent?: boolean;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test2: string = utils.checkCompat<OverwriteAutoScalingLaunchConfigurationArgs, AutoScalingLaunchConfigurationArgs>();
