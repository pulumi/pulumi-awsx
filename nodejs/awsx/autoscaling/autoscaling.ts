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
                args: pulumi.WrappedObject<AutoScalingLaunchConfigurationArgs> = {},
                opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:x:autoscaling:AutoScalingLaunchConfiguration", name, {}, opts);

        if (!Array.isArray(args.securityGroups)) {
            throw new Error("args.securityGroups must be an array.");
        }

        const parentOpts = { parent: this };

        // Create the full name of our CloudFormation stack here explicitly. Since the CFN stack
        // references the launch configuration and vice-versa, we use this to break the cycle.
        // TODO[pulumi/pulumi#381]: Creating an S3 bucket is an inelegant way to get a durable,
        // unique name.
        this.stackName = pulumi.output(args.stackName).apply(sn => sn || new aws.s3.Bucket(name, {}, parentOpts).id);

        // Use the instance provided, or create a new one.
        this.instanceProfile = args.instanceProfile ||
            AutoScalingLaunchConfiguration.createInstanceProfile(
                name, /*assumeRolePolicy:*/ undefined, /*policyArns:*/ undefined, parentOpts);

        this.securityGroups = x.ec2.getSecurityGroups(vpc, name, args.securityGroups, parentOpts) || [];

        this.launchConfiguration = new aws.ec2.LaunchConfiguration(name, {
            ...args,
            securityGroups: this.securityGroups.map(g => g.id),
            imageId: getEcsAmiIdOutput(args.ecsOptimizedAMIName),
            instanceType: utils.ifUndefined(args.instanceType, "t2.micro"),
            iamInstanceProfile: this.instanceProfile.id,
            enableMonitoring: utils.ifUndefined(args.enableMonitoring, true),
            placementTenancy: utils.ifUndefined(args.placementTenancy, "default"),
            rootBlockDevice: utils.ifUndefined(args.rootBlockDevice, defaultRootBlockDevice),
            ebsBlockDevices: utils.ifUndefined(args.ebsBlockDevices, defaultEbsBlockDevices),
            userData: getInstanceUserData(args, this.stackName),
        }, parentOpts);
        this.id = this.launchConfiguration.id;

        this.registerOutputs({});
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
function getEcsAmiIdOutput(name: pulumi.Wrap<string> | undefined): pulumi.Output<string> {
    return pulumi.output(name).apply(n => getEcsAmiId(n));
}

async function getEcsAmiId(name: string | undefined): Promise<string> {
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
        filters: [
            {
                name: "name",
                values: [ name ],
            },
            {
                name: "owner-id",
                values: [ "591542846629" ], // Amazon
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
    args: pulumi.WrappedObject<AutoScalingLaunchConfigurationArgs>,
    cloudFormationStackName: pulumi.Output<string>): pulumi.Wrap<string> {

    const autoScalingUserData = <AutoScalingUserData>args.userData;
    if (args.userData !== undefined && !isAutoScalingUserData(args.userData)) {
        return <pulumi.Input<string>>args.userData;
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
    public readonly stack: aws.cloudformation.Stack;

    /**
     * The launch configuration for this auto scaling group.
     */
    public readonly launchConfiguration: AutoScalingLaunchConfiguration;

    constructor(name: string,
                args: AutoScalingGroupArgs,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("awsx:x:autoscaling:AutoScalingGroup", name, {}, opts);

        const parentOpts = { parent: this };

        this.vpc = args.vpc || x.ec2.Vpc.getDefault();
        const subnetIds = args.subnetIds || this.vpc.privateSubnetIds;

        // Use the autoscaling config provided, otherwise just create a default one for this cluster.
        if (args.launchConfiguration) {
            this.launchConfiguration = args.launchConfiguration;
        }
        else {
            this.launchConfiguration = new AutoScalingLaunchConfiguration(
                name, this.vpc, args.launchConfigurationArgs, parentOpts);
        }

        this.vpc = args.vpc || x.ec2.Vpc.getDefault();
        this.stack = new aws.cloudformation.Stack(name, {
            ...args,
            name: this.launchConfiguration.stackName,
            templateBody: getCloudFormationTemplate(
                name,
                this.launchConfiguration.id,
                subnetIds,
                utils.ifUndefined(args.templateParameters, {})),
        }, parentOpts);

        this.registerOutputs({});
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
    subnetIds: pulumi.Wrap<string>[],
    parameters: pulumi.Output<TemplateParameters>): pulumi.Output<string> {

    const subnetIdsArray = pulumi.all(subnetIds);
    return pulumi.all([subnetIdsArray, instanceLaunchConfigurationId, parameters])
                 .apply(([subnetIdsArray, instanceLaunchConfigurationId, parameters]) => {

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

    const result = `
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
                MinSize: ${minSize}
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
    subnetIds?: string[];

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
    templateParameters?: TemplateParameters;
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
    maxSize?: number;
    /**
     * The minimum size of the auto scale group.  Defaults to 2 if unspecified.
     */
    minSize?: number;
}>;

export interface TemplateParameters {
    // Properties we've changed.
    /**
     * The amount of time, in seconds, after a scaling activity completes before another scaling
     * activity can start.  Defaults to 300 if unspecified.
     */
    defaultCooldown?: number;

    /**
     * Time (in seconds) after instance comes into service before checking health. Defaults to 120
     * if unspecified.
     */
    healthCheckGracePeriod?: number;

    /**
     * "EC2" or "ELB". Controls how health checking is done.  Defaults to "EC2" if unspecified.
     */
    healthCheckType?: "EC2" | "ELB";

    /**
     * A list of processes to suspend for the AutoScaling Group. The allowed values are `Launch`,
     * `Terminate`, `HealthCheck`, `ReplaceUnhealthy`, `AZRebalance`, `AlarmNotification`,
     * `ScheduledActions`, `AddToLoadBalancer`. Note that if you suspend either the `Launch` or
     * `Terminate` process types, it can prevent your autoscaling group from functioning properly.
     *
     * Defaults to "ScheduledActions" if not specified
     */
    suspendedProcesses?:
        ("Launch" | "Terminate" | "HealthCheck" | "ReplaceUnhealthy" |
         "AZRebalance" | "AlarmNotification" | "ScheduledActions" | "AddToLoadBalancer")[];

    /**
     * The maximum size of the auto scale group.  Defaults to 100 if unspecified.
     */
    maxSize?: number;

    /**
     * The minimum size of the auto scale group.  Defaults to 100 if unspecified.
     */
    minSize?: number;
}

// Make sure our exported args shape is compatible with the overwrite shape we're trying to provide.
const test1: string = utils.checkCompat<OverwriteTemplateParameters, TemplateParameters>();

// The shape we want for ClusterAutoScalingLaunchConfigurationArgs.  We don't export this as
// 'Overwrite' types are not pleasant to work with. However, they internally allow us to succinctly
// express the shape we're trying to provide. Code later on will ensure these types are compatible.
type OverwriteAutoScalingLaunchConfigurationArgs = utils.Overwrite<utils.Mutable<aws.ec2.LaunchConfigurationArgs>, {
    imageId?: never;
    stackName?: string;
    instanceProfile?: aws.iam.InstanceProfile;
    ecsOptimizedAMIName?: string;
    instanceType?: aws.ec2.InstanceType;
    placementTenancy?: "default" | "dedicated";
    securityGroups?: x.ec2.SecurityGroupOrId[];
    userData?: string | AutoScalingUserData;
}>;

/**
 * The set of arguments when creating the launch configuration for a cluster's autoscaling group.
 */
export interface AutoScalingLaunchConfigurationArgs {
    // Values copied directly from aws.ec2.LaunchConfigurationArgs

    /**
     * Associate a public ip address with an instance in a VPC.
     */
    associatePublicIpAddress?: boolean;

    /**
     * If true, the launched EC2 instance will be EBS-optimized.
     */
    ebsOptimized?: boolean;

    /**
     * Enables/disables detailed monitoring. This is enabled by default.
     */
    enableMonitoring?: boolean;

    /**
     * Customize Ephemeral (also known as
     * "Instance Store") volumes on the instance. See Block Devices below for details.
     */
    ephemeralBlockDevices?: aws.ec2.LaunchConfigurationArgs["ephemeralBlockDevices"];

    /**
     * The name attribute of the IAM instance profile to associate
     * with launched instances.
     */
    iamInstanceProfile?: string | aws.iam.InstanceProfile;

    /**
     * The key name that should be used for the instance.
     */
    keyName?: string;

    /**
     * The name of the launch configuration. If you leave
     * this blank, Terraform will auto-generate a unique name.
     */
    name?: string;

    /**
     * Creates a unique name beginning with the specified
     * prefix. Conflicts with `name`.
     */
    namePrefix?: string;

    /**
     * The maximum price to use for reserving spot instances.
     */
    spotPrice?: string;

    /**
     * Can be used instead of `user_data` to pass base64-encoded binary data directly. Use this
     * instead of `user_data` whenever the value is not a valid UTF-8 string. For example,
     * gzip-encoded user data must be base64-encoded and passed via this argument to avoid
     * corruption.
     */
    userDataBase64?: string;

    /**
     * The ID of a ClassicLink-enabled VPC. Only applies to EC2-Classic instances. (eg. `vpc-2730681a`)
     */
    vpcClassicLinkId?: string;

    /**
     * The IDs of one or more security groups for the specified ClassicLink-enabled VPC (eg. `sg-46ae3d11`).
     */
    vpcClassicLinkSecurityGroups?: string[];

    // Changes made to normal args type.

    /**
     * The name of the stack the launch configuration will signal.
     */
    stackName?: string;

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
    instanceType?: aws.ec2.InstanceType;

    /**
     * The tenancy of the instance. Valid values are `"default"` or `"dedicated"`, see
     * http://docs.aws.amazon.com/AutoScaling/latest/APIReference/API_CreateLaunchConfiguration.html
     * for more details.  Default is "default" if unspecified.
     */
    placementTenancy?: "default" | "dedicated";

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
    userData?: string | AutoScalingUserData;
}

export interface AutoScalingUserData {
    /**
     * Additional lines to be placed in the `runcmd` section of the launch configuration.
     */
    extraRuncmdLines?(): pulumi.Wrap<UserDataLine[]>;

    /**
     * Additional lines to be placed in the `bootcmd` section of the launch configuration.
     */
    extraBootcmdLines?(): pulumi.Wrap<UserDataLine[]>;
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
