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

import { Network } from "./network";
import { Overwrite, sha1hash } from "./utils";

/**
 * Arguments bag for creating infrastrcture for a new Cluster.
 */
export interface ClusterArgs2 {
    /**
     * The network in which to create this cluster.
     */
    network: Network;

    /**
     * The security group to place new instances into.  If not provided, a default will be
     * created.
     */
    instanceSecurityGroup?: aws.ec2.SecurityGroup;
}

/**
 * Arguments for creating a file system for a cluster.
 */
export interface FileSystemArgs2 {
    /**
     * The security group to use for the file system.  If not provided, a default one that allows
     * ingress for the cluster's VPC from port 2049 will be created.
     */
    securityGroup?: aws.ec2.SecurityGroup;

    /**
     * The subnets to mount the file system against.  If not provided, file system will be mounted
     * for every subnet in the cluster's network.
     */
    subnetIds?: pulumi.Input<string>[];

    /**
     * Path to mount file system at when a cluster is connected to an autoscaling group.  If not
     * provided, the default mountPath will be "/mnt/efs"
     */
    mountPath?: pulumi.Input<string>;
}

export interface AutoScalingGroupArgs2 {
    /**
     * The config to use when creatin the auto scaling group.  If not provided, a default
     * instance will be create by calling [cluster.createAutoScalingConfig()].
     */
    autoScalingConfig?: AutoScalingConfig;

    /**
     * Parameters to control the cloud formation stack template that is created.  If not provided
     * the defaults specified in TemplateParameters will be used.
     */
    templateParameters?: pulumi.Input<TemplateParameters>;
}

/**
 * Parameters to control the cloud formation stack template that is created.
 */
export interface TemplateParameters {
    /**
     * The minimum size of the cluster. Defaults to 2.
     */
    minSize?: number;
    /**
     * The maximum size of the cluster. Setting to 0 will prevent an EC2 AutoScalingGroup from being
     * created. Defaults to 100.
     */
    maxSize?: number;
}

/**
 * Configuration options to create an auto scaling group for a cluster.  It is recommended that ths
 * be created using [cluster.createAutoScalingConfig] so that it can be populated with appropriate
 * values from the cluster.
 */
export interface AutoScalingConfig {
    /**
     * Name of the final aws.cloudformation.Stack that will be created for the autoscaling group.
     */
    stackName: pulumi.Input<string>;

    /**
     * Launch configuration for the auto scaling group.
     */
    launchConfiguration: aws.ec2.LaunchConfiguration;
}

/**
 * The set of arguments when creating the launch configuration for a cluster's autoscaling group.
 */
export type LaunchConfigurationArgs = Overwrite<aws.ec2.LaunchConfigurationArgs, {
    /**
     * Do not provide.  Use [ecsOptimizedAMIName] instead.
     */
    imageId?: never;

    /**
     * Do not provide.  Will be computed based on information from the cluster and filesystem.
     */
    userData?: never;

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
     * Optional file system to mount.  Use [cluster.createFileSystem] to create an instance of this.
     */
    fileSystem?: {
        /**
         * Actual underlying file system.
         */
        fileSystem?: aws.efs.FileSystem;

        /**
         * The path to mount this file system at within the autoscaling group.  If not provided
         * will be mounted to "/mnt/efs"
         */
        mountPath?: pulumi.Output<string>;
    };

    /**
    * A list of associated security group IDS.  If not provided, the instanceSecurityGroup from the
    * cluster will be used.
    */
    securityGroups?: aws.ec2.LaunchConfiguration["securityGroups"];

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
}>;

/**
 * ContainerPort represents the information about how to expose a container port on a [Service].
*/
export interface ClusterLoadBalancerArgs {
    /**
     * The incoming port where the service exposes the endpoint.
    */
    port: number;
    /**
     * The target port on the backing container.  Defaults to the value of [port].
    */
    targetPort?: number;
    /**
     * Whether the port should be exposed externally.  Defaults to `false`.
    */
    external?: boolean;
    /**
     * The protocol to use for exposing the service:
     *  `tcp`: Expose TCP externaly and to the container.  Will create a network load balancer.
     *  `http`: Expose HTTP externally and to the container.  Will create application load balancer.
     *  `https`: Expose HTTPS externally and HTTP to the container.   Will create application load balancer.
     *
     * Defaults to 'tcp' if unspecified.
     */
    protocol?: "tcp" | "http" | "https";

    /**
     * The ARN of the default SSL server certificate. Exactly one certificate is required if the
     * protocol is [https]. For adding additional SSL certificates, see the
     * [`aws_lb_listener_certificate`
     * resource](https://www.terraform.io/docs/providers/aws/r/lb_listener_certificate.html).
     */
    certificateArn?: string;
}

/**
 * A Cluster is a general purpose ECS cluster configured to run in a provided Network.
 */
export class Cluster2 extends pulumi.ComponentResource {
    /**
     * The network in which to create this cluster.
     */
    public readonly network: Network;
    /**
     * The Underlying ECS Cluster.
     */
    public readonly resource: aws.ecs.Cluster;
    /**
     * The ECS Cluster's Security Group.
     */
    public readonly instanceSecurityGroup: aws.ec2.SecurityGroup;

    constructor(name: string, args: ClusterArgs2, opts?: pulumi.ResourceOptions) {
        if (!args.network) {
            throw new pulumi.RunError("Expected a valid Network to use for creating Cluster");
        }

        super("aws-infra:cluster:Cluster", name, args, opts);

        this.network = args.network;

        // First create an ECS cluster.
        const parentOpts = { parent: this };
        const cluster = new aws.ecs.Cluster(name, {}, parentOpts);
        this.resource = cluster;

        // Create the EC2 instance security group
        const ALL = {
            fromPort: 0,
            toPort: 0,
            protocol: "-1",  // all
            cidrBlocks: [ "0.0.0.0/0" ],
        };

        // IDEA: Can we re-use the network's default security group instead of creating a specific
        // new security group in the Cluster layer?  This may allow us to share a single Security Group
        // across both instance and Lambda compute.
        this.instanceSecurityGroup = args.instanceSecurityGroup || new aws.ec2.SecurityGroup(name, {
            vpcId: args.network.vpcId,
            ingress: [
                // Expose SSH
                {
                    fromPort: 22,
                    toPort: 22,
                    protocol: "TCP",
                    cidrBlocks: [ "0.0.0.0/0" ],
                },
                // Expose ephemeral container ports to Internet.
                // TODO: Limit to load balancer(s).
                {
                    fromPort: 0,
                    toPort: 65535,
                    protocol: "TCP",
                    cidrBlocks: [ "0.0.0.0/0" ],
                },
            ],
            egress: [ ALL ],  // See TerraformEgressNote
            tags: { Name: name },
        }, parentOpts);

        this.registerOutputs({
            network: this.network,
            resource: this.resource,
            instanceSecurityGroup: this.instanceSecurityGroup,
        });
    }

    public createFileSystem(name: string, args: FileSystemArgs2): aws.efs.FileSystem {
        // If requested, add EFS file system and mount targets in each subnet.
        const parentOpts = { parent: this };

        const fileSystem = new aws.efs.FileSystem(name, {}, parentOpts);
        const efsSecurityGroupName = `${name}-fs`;
        const efsSecurityGroup = args.securityGroup || new aws.ec2.SecurityGroup(efsSecurityGroupName, {
            vpcId: this.network.vpcId,
            ingress: [
                // Allow NFS traffic from the instance security group
                {
                    securityGroups: [ this.instanceSecurityGroup.id ],
                    protocol: "TCP",
                    fromPort: 2049,
                    toPort: 2049,
                },
            ],
            tags: { Name: efsSecurityGroupName },
        }, parentOpts);

        const subnetIds = args.subnetIds || this.network.subnetIds;
        for (let i = 0; i < subnetIds.length; i++) {
            const subnetId = subnetIds[i];
            const mountTarget = new aws.efs.MountTarget(`${name}-${i}`, {
                fileSystemId: fileSystem.id,
                subnetId: subnetId,
                securityGroups: [ efsSecurityGroup.id ],
            }, parentOpts);
        }

        return fileSystem;
    }

    /**
     * Create an auto-scaling group for this cluster.
     */
    public createAutoScalingGroup(name: string, args: AutoScalingGroupArgs2): aws.cloudformation.Stack {
        // Use the autoscaling config provided, otherwise just create a default one for this cluster.
        const config = args.autoScalingConfig || this.createAutoScalingConfig(name);
        const { stackName, launchConfiguration } = config;

        // Finally, create the AutoScaling Group.
        return new aws.cloudformation.Stack(name, {
            name: stackName,
            templateBody: getCloudFormationTemplate(
                name,
                launchConfiguration.id,
                this.network.subnetIds,
                args.templateParameters || {}),
        }, { parent: this });
    }

    public createAutoScalingConfig(name: string, args?: LaunchConfigurationArgs): AutoScalingConfig {
        args = args || {};

        // Use the instance provided, or create a new one.
        const instanceProfile = getInstanceProfile(this, args);

        // Create the full name of our CloudFormation stack here explicitly. Since the CFN stack
        // references the launch configuration and vice-versa, we use this to break the cycle.
        // TODO[pulumi/pulumi#381]: Creating an S3 bucket is an inelegant way to get a durable,
        // unique name.
        const stackName = pulumi.output(args.stackName!) || new aws.s3.Bucket(name).id;

        const launchConfiguration = new aws.ec2.LaunchConfiguration(name, {
            imageId: getEcsAmiId(args.ecsOptimizedAMIName),
            instanceType: pulumi.output(args.instanceType).apply(t => t || "t2.micro"),
            keyName: args.keyName,
            iamInstanceProfile: instanceProfile.id,
            enableMonitoring: pulumi.output(args.enableMonitoring).apply(b => b !== undefined ? b : true),
            placementTenancy: pulumi.output(args.placementTenancy).apply(t => t || "default"),
            rootBlockDevice: pulumi.output(args.rootBlockDevice).apply(d => d || defaultRootBlockDevice),
            ebsBlockDevices: pulumi.output(args.ebsBlockDevices).apply(d => d || defaultEbsBlockDevices),
            securityGroups: pulumi.output(args.securityGroups).apply(g => g || [ this.instanceSecurityGroup.id ]),
            userData: getInstanceUserData(this.resource, args, stackName),
        }, { parent: this });

        return { stackName, launchConfiguration };
    }

    /**
     * Creates an ALB or NLB for this cluster
     */
    public createLoadBalancer(name: string, args: ClusterLoadBalancerArgs): ClusterLoadBalancer {
        return new ClusterLoadBalancer(name, this, args);
    }
}

export class ClusterLoadBalancer extends pulumi.ComponentResource {
    public readonly cluster: Cluster2;
    public readonly loadBalancer: aws.elasticloadbalancingv2.LoadBalancer;
    public readonly targetGroup: aws.elasticloadbalancingv2.TargetGroup;
    public readonly listener: aws.elasticloadbalancingv2.Listener;

    constructor(name: string, cluster: Cluster2, args: ClusterLoadBalancerArgs) {
        super("aws.infra.ClusterLoadBalancer", name, args);
        this.cluster = cluster;

        // Load balancers need *very* short names, so we unfortunately have to hash here.
        //
        // Note: Technically, we can only support one LB per service, so only the service name is needed here, but we
        // anticipate this will not always be the case, so we include a set of values which must be unique.
        const longName = `${name}-${args.port}`;
        const shortName = sha1hash(`${longName}`);

        // Create an internal load balancer if requested.
        const internal = cluster.network.usePrivateSubnets && !args.external;

        // See what kind of load balancer to create (application L7 for HTTP(S) traffic, or network L4 otherwise).
        // Also ensure that we have an SSL certificate for termination at the LB, if that was requested.
        const { listenerProtocol, targetProtocol, useAppLoadBalancer, certificateArn } =
            computeLoadBalancerInfo(args);

        const parentOpts = { parent: this };
        this.loadBalancer = new aws.elasticloadbalancingv2.LoadBalancer(shortName, {
            loadBalancerType: useAppLoadBalancer ? "application" : "network",
            subnets: cluster.network.publicSubnetIds,
            internal: internal,
            // If this is an application LB, we need to associate it with the ECS cluster's security
            // group, so that traffic on any ports can reach it.  Otherwise, leave blank, and
            // default to the VPC's group.
            securityGroups: useAppLoadBalancer ? [ cluster.instanceSecurityGroup.id ] : undefined,
            tags: { Name: longName },
        }, parentOpts);

        // Create the target group for the new container/port pair.
        this.targetGroup = new aws.elasticloadbalancingv2.TargetGroup(shortName, {
            port: args.targetPort || args.port,
            protocol: targetProtocol,
            vpcId: cluster.network.vpcId,
            deregistrationDelay: 180, // 3 minutes
            tags: { Name: longName },
            targetType: "ip",
        }, parentOpts);

        // Listen on the requested port on the LB and forward to the target.
        this.listener = new aws.elasticloadbalancingv2.Listener(longName, {
            loadBalancerArn: this.loadBalancer.arn,
            protocol: listenerProtocol,
            certificateArn: certificateArn,
            port: args.port,
            defaultAction: {
                type: "forward",
                targetGroupArn: this.targetGroup.arn,
            },
            // If SSL is used, we automatically insert the recommended ELB security policy from
            // http://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html.
            sslPolicy: certificateArn ? "ELBSecurityPolicy-2016-08" : undefined,
        }, parentOpts);

        this.registerOutputs({
            loadBalancer: this.loadBalancer,
            targetGroup: this.targetGroup,
            listener: this.listener,
        });
    }
}

function computeLoadBalancerInfo(args: ClusterLoadBalancerArgs) {
    switch (args.protocol || "tcp") {
        case "https":
            if (!args.certificateArn) {
                throw new Error("Cannot create Service for HTTPS trafic. No ACM certificate ARN configured.");
            }

            return {
                listenerProtocol: "HTTPS",
                // Set the target protocol to HTTP, so that the ELB terminates the SSL traffic.
                // IDEA: eventually we should let users choose where the SSL termination occurs.
                targetProtocol: "HTTP",
                useAppLoadBalancer: true,
                certificateArn: args.certificateArn,
            };
        case "http":
            return {
                listenerProtocol: "HTTP",
                targetProtocol: "HTTP",
                useAppLoadBalancer: true,
                certificateArn: undefined,
            };
        case "tcp":
            return {
                listenerProtocol: "TCP",
                targetProtocol: "TCP",
                useAppLoadBalancer: false,
                certificateArn: undefined,
            };
        default:
            throw new Error(`Unrecognized Service protocol: ${args.protocol}`);
    }
}

const assumeInstanceRolePolicyDoc: aws.iam.PolicyDocument = {
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

function getInstanceProfile(parent: Cluster2, args: LaunchConfigurationArgs) {
    if (args.instanceProfile) {
        return args.instanceProfile;
    }

    const parentOpts = { parent };
    const instanceRole = new aws.iam.Role(name, {
        assumeRolePolicy: JSON.stringify(assumeInstanceRolePolicyDoc),
    }, parentOpts);

    const policyARNs = [aws.iam.AmazonEC2ContainerServiceforEC2Role, aws.iam.AmazonEC2ReadOnlyAccess];
    const instanceRolePolicies: aws.iam.RolePolicyAttachment[] = [];
    for (let i = 0; i < policyARNs.length; i++) {
        const policyARN = policyARNs[i];

        instanceRolePolicies.push(new aws.iam.RolePolicyAttachment(`${name}-${sha1hash(policyARN)}`, {
            role: instanceRole,
            policyArn: policyARN,
        }, parentOpts));
    }

    return new aws.iam.InstanceProfile(name, {
        role: instanceRole,
    }, { dependsOn: instanceRolePolicies, parent: parent });
}

(<any>Cluster2).doNotCapture = true;

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
    cluster: aws.ecs.Cluster,
    args: LaunchConfigurationArgs,
    cloudFormationStackName: pulumi.Output<string>) {

    const fileSystem = args.fileSystem || {};
    const fileSystemId = fileSystem.fileSystem ? fileSystem.fileSystem.id : undefined;

    return pulumi.all([cluster.id, cloudFormationStackName, fileSystemId, fileSystem.mountPath])
                 .apply(([clusterId, stackName, fsId, mountPath]) => {
        let fileSystemRuncmdBlock = "";

        if (fsId) {
            // This string must be indented exactly as much as the block of commands it's inserted
            // into below!
            mountPath = mountPath || "/mnt/efs";

            // tslint:disable max-line-length
            fileSystemRuncmdBlock = `
                # Create EFS mount path
                mkdir ${mountPath}
                chown ec2-user:ec2-user ${mountPath}
                # Create environment variables
                EFS_FILE_SYSTEM_ID=${fsId}
                DIR_SRC=$AWS_AVAILABILITY_ZONE.$EFS_FILE_SYSTEM_ID.efs.$AWS_REGION.amazonaws.com
                DIR_TGT=${mountPath}
                # Update /etc/fstab with the new NFS mount
                cp -p /etc/fstab /etc/fstab.back-$(date +%F)
                echo -e \"$DIR_SRC:/ $DIR_TGT nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2 0 0\" | tee -a /etc/fstab
                mount -a -t nfs4
                # Restart Docker
                docker ps
                service docker stop
                service docker start
            `;
        }

        return `#cloud-config
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
            - echo ECS_CLUSTER='${clusterId}' >> /etc/ecs/ecs.config
            - echo ECS_ENGINE_AUTH_TYPE=docker >> /etc/ecs/ecs.config
        runcmd:
            # Set and use variables in the same command, since it's not obvious if
            # different commands will run in different shells.
            - |
                # Knock one letter off of availability zone to get region.
                AWS_AVAILABILITY_ZONE=$(curl -s 169.254.169.254/2016-09-02/meta-data/placement/availability-zone)
                AWS_REGION=$(echo $AWS_AVAILABILITY_ZONE | sed 's/.$//')

                ${fileSystemRuncmdBlock}

                # Disable container access to EC2 metadata instance
                # See http://docs.aws.amazon.com/AmazonECS/latest/developerguide/instance_IAM_role.html
                iptables --insert FORWARD 1 --in-interface docker+ --destination 169.254.169.254/32 --jump DROP
                service iptables save

                /opt/aws/bin/cfn-signal \
                    --region "\${AWS_REGION}" \
                    --stack "${stackName}" \
                    --resource Instances
        `;
    });
}

// TODO[pulumi/pulumi-aws/issues#43]: We'd prefer not to use CloudFormation, but it's the best way to implement
// rolling updates in an autoscaling group.
function getCloudFormationTemplate(
    instanceName: string,
    instanceLaunchConfigurationId: pulumi.Output<string>,
    subnetIds: pulumi.Input<string>[],
    parameters: pulumi.Input<TemplateParameters>): pulumi.Output<string> {

    const subnetIdsArray = pulumi.all(subnetIds);
    return pulumi.all([subnetIdsArray, instanceLaunchConfigurationId, parameters])
                 .apply(([array, configId, params]) => {

    const minSize = params.minSize !== undefined ? params.minSize : 2;
    const maxSize = params.maxSize !== undefined ? params.maxSize : 100;

    return `
    AWSTemplateFormatVersion: '2010-09-09'
    Outputs:
        Instances:
            Value: !Ref Instances
    Resources:
        Instances:
            Type: AWS::AutoScaling::AutoScalingGroup
            Properties:
                Cooldown: 300
                DesiredCapacity: ${minSize}
                HealthCheckGracePeriod: 120
                HealthCheckType: EC2
                LaunchConfigurationName: "${configId}"
                MaxSize: ${maxSize}
                MetricsCollection:
                -   Granularity: 1Minute
                MinSize: ${minSize}
                VPCZoneIdentifier: ${JSON.stringify(array)}
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
                    -   ScheduledActions
                    WaitOnResourceSignals: true
    `;
                 });
}
