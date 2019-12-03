// // Copyright 2016-2018, Pulumi Corporation.
// //
// // Licensed under the Apache License, Version 2.0 (the "License");
// // you may not use this file except in compliance with the License.
// // You may obtain a copy of the License at
// //
// //     http://www.apache.org/licenses/LICENSE-2.0
// //
// // Unless required by applicable law or agreed to in writing, software
// // distributed under the License is distributed on an "AS IS" BASIS,
// // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// // See the License for the specific language governing permissions and
// // limitations under the License.

// import * as aws from "@pulumi/aws";
// import * as pulumi from "@pulumi/pulumi";

// import { Network } from "./network";

// import { sha1hash } from "./utils";

// // The default path to use for mounting EFS inside ECS container instances.
// const defaultEfsMountPath = "/mnt/efs";

// /**
//  * @deprecated Usages of awsx.Cluster should be migrated to awsx.ecs.Cluster.
//  */
// export interface ClusterNetworkArgs {
//     /**
//      * The VPC id of the network for the cluster
//      */
//     vpcId: pulumi.Input<string>;
//     /**
//      * The network subnets for the clusters
//      */
//     subnetIds: pulumi.Input<string>[];
// }

// /**
//  * Arguments bag for creating infrastructure for a new Cluster.
//  * @deprecated Usages of awsx.Cluster should be migrated to awsx.ecs.Cluster.
//  */
// export interface ClusterArgs {
//     /**
//      * The network in which to create this cluster.
//      */
//     network: ClusterNetworkArgs;
//     /**
//      * Whether to create an EFS File System to manage volumes across the cluster.
//      */
//     addEFS: boolean;
//     /**
//      * The EC2 instance type to use for the Cluster.  Defaults to `t2.micro`.
//      */
//     instanceType?: string;
//     /**
//      * The policy to apply to the cluster instance role.
//      *
//      * The default is `["arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role",
//      * "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess"]`.
//      */
//     instanceRolePolicyARNs?: string[];
//     /**
//      * The size (in GiB) of the EBS volume to attach to each instance as the root volume.
//      *
//      * The default is 8 GiB.
//      */
//     instanceRootVolumeSize?: number;
//     /**
//      * The size (in GiB) of the EBS volume to attach to each instance to use for Docker image and metadata storage.
//      *
//      * The default is 50 GiB.
//      */
//     instanceDockerImageVolumeSize?: number;
//     /**
//      * The size (in GiB) of the EBS volume to attach to each instance for swap space.
//      *
//      * The default is 5 GiB.
//      */
//     instanceSwapVolumeSize?: number;
//     /**
//      * The minimum size of the cluster. Defaults to 2.
//      */
//     minSize?: number;
//     /**
//      * The maximum size of the cluster. Setting to 0 will prevent an EC2 AutoScalingGroup from being created. Defaults
//      * to 100.
//      */
//     maxSize?: number;
//     /**
//      * Public key material for SSH access. See allowed formats at:
//      * https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
//      * If not provided, no SSH access is enabled on VMs.
//      */
//     publicKey?: string;
//     /**
//      * The name of the ECS-optimzed AMI to use for the Container Instances in this cluster, e.g.
//      * "amzn-ami-2017.09.l-amazon-ecs-optimized". Defaults to using the latest recommended ECS Optimized AMI, which may
//      * change over time and cause recreation of EC2 instances when new versions are release. To control when these
//      * changes are adopted, set this parameter explicitly to the version you would like to use.
//      *
//      * See http://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html for valid values.
//      */
//     ecsOptimizedAMIName?: string;
// }

// /**
//  * A Cluster is a general purpose ECS cluster configured to run in a provided
//  * Network.
//  *
//  * @deprecated Usages of awsx.Cluster should be migrated to awsx.ecs.Cluster.
//  */
// export class Cluster extends pulumi.ComponentResource {
//     /**
//      * The network in which to create this cluster.
//      */
//     public readonly network: ClusterNetworkArgs;
//     /**
//      * The ECS Cluster ARN.
//      */
//     public readonly ecsClusterARN: pulumi.Output<string>;
//     /**
//      * The ECS Cluster's Security Group ID.
//      */
//     public readonly securityGroupId?: pulumi.Output<string>;
//     /**
//      * The auto-scaling group that ECS Service's should add to their
//      * `dependsOn`.
//      */
//     public readonly autoScalingGroupStack?: pulumi.Resource;
//     /**
//      * The EFS host mount path if EFS is enabled on this Cluster.
//      */
//     public readonly efsMountPath?: string;

//     constructor(name: string, args: ClusterArgs, opts?: pulumi.ComponentResourceOptions) {
//         if (!args.network) {
//             throw new pulumi.RunError("Expected a valid Network to use for creating Cluster");
//         }

//         super("awsx:cluster:Cluster", name, {}, opts);

//         this.network = args.network;

//         // First create an ECS cluster.
//         const cluster = new aws.ecs.Cluster(name, {}, { parent: this });
//         this.ecsClusterARN = cluster.id;

//         // Create the EC2 instance security group
//         const ALL = {
//             fromPort: 0,
//             toPort: 0,
//             protocol: "-1",  // all
//             cidrBlocks: [ "0.0.0.0/0" ],
//         };
//         // IDEA: Can we re-use the network's default security group instead of creating a specific
//         // new security group in the Cluster layer?  This may allow us to share a single Security Group
//         // across both instance and Lambda compute.
//         const instanceSecurityGroup = new aws.ec2.SecurityGroup(name, {
//             vpcId: args.network.vpcId,
//             ingress: [
//                 // Expose SSH
//                 {
//                     fromPort: 22,
//                     toPort: 22,
//                     protocol: "TCP",
//                     cidrBlocks: [ "0.0.0.0/0" ],
//                 },
//                 // Expose ephemeral container ports to Internet.
//                 // TODO: Limit to load balancer(s).
//                 {
//                     fromPort: 0,
//                     toPort: 65535,
//                     protocol: "TCP",
//                     cidrBlocks: [ "0.0.0.0/0" ],
//                 },
//             ],
//             egress: [ ALL ],  // See TerraformEgressNote
//             tags: {
//                 Name: name,
//             },
//         }, { parent: this });
//         this.securityGroupId = instanceSecurityGroup.id;

//         // If requested, add EFS file system and mount targets in each subnet.
//         let filesystem: aws.efs.FileSystem | undefined;
//         if (args.addEFS) {
//             filesystem = new aws.efs.FileSystem(name, {}, { parent: this });
//             const efsSecurityGroupName = `${name}-fs`;
//             const efsSecurityGroup = new aws.ec2.SecurityGroup(efsSecurityGroupName, {
//                 vpcId: args.network.vpcId,
//                 ingress: [
//                     // Allow NFS traffic from the instance security group
//                     {
//                         securityGroups: [ instanceSecurityGroup.id ],
//                         protocol: "TCP",
//                         fromPort: 2049,
//                         toPort: 2049,
//                     },
//                 ],
//                 tags: {
//                     Name: efsSecurityGroupName,
//                 },
//             }, { parent: this });
//             for (let i = 0; i <  args.network.subnetIds.length; i++) {
//                 const subnetId = args.network.subnetIds[i];
//                 const mountTarget = new aws.efs.MountTarget(`${name}-${i}`, {
//                     fileSystemId: filesystem.id,
//                     subnetId: subnetId,
//                     securityGroups: [ efsSecurityGroup.id ],
//                 }, { parent: this });
//             }
//             this.efsMountPath = defaultEfsMountPath;
//         }

//         // If we were asked to not create any EC2 instances, then we are done, else create an AutoScalingGroup.
//         if (args.maxSize !== 0) {
//             this.autoScalingGroupStack = createAutoScalingGroup(
//                 this, name, args, instanceSecurityGroup, cluster, filesystem);
//         }

//         this.registerOutputs();
//     }
// }

// // Create an AutoScalingGroup for the EC2 container instances specified by the cluster arguments, registered with the
// // provided cluster and mounting the provided filesystem
// function createAutoScalingGroup(
//         parent: Cluster,
//         name: string,
//         args: ClusterArgs,
//         securityGroup: aws.ec2.SecurityGroup,
//         cluster: aws.ecs.Cluster,
//         filesystem: aws.efs.FileSystem | undefined): aws.cloudformation.Stack {

//     const efsMountPath = parent.efsMountPath;

//     // Next create all of the IAM/security resources.
//     const assumeInstanceRolePolicyDoc: aws.iam.PolicyDocument = {
//         Version: "2012-10-17",
//         Statement: [{
//             Action: [
//                 "sts:AssumeRole",
//             ],
//             Effect: "Allow",
//             Principal: {
//                 Service: [ "ec2.amazonaws.com" ],
//             },
//         }],
//     };
//     const instanceRole = new aws.iam.Role(name, {
//         assumeRolePolicy: JSON.stringify(assumeInstanceRolePolicyDoc),
//     }, { parent: parent });
//     const policyARNs = args.instanceRolePolicyARNs
//         || [aws.iam.AmazonEC2ContainerServiceforEC2Role, aws.iam.AmazonEC2ReadOnlyAccess];
//     const instanceRolePolicies: aws.iam.RolePolicyAttachment[] = [];
//     for (let i = 0; i < policyARNs.length; i++) {
//         const policyARN = policyARNs[i];
//         const instanceRolePolicy = new aws.iam.RolePolicyAttachment(`${name}-${sha1hash(policyARN)}`, {
//             role: instanceRole,
//             policyArn: policyARN,
//         }, { parent: parent });
//         instanceRolePolicies.push(instanceRolePolicy);
//     }
//     const instanceProfile = new aws.iam.InstanceProfile(name, {
//         role: instanceRole,
//     }, { dependsOn: instanceRolePolicies, parent: parent });

//     // If requested, add a new EC2 KeyPair for SSH access to the instances.
//     let keyName: pulumi.Output<string> | undefined;
//     if (args.publicKey) {
//         const key = new aws.ec2.KeyPair(name, {
//             publicKey: args.publicKey,
//         }, { parent: parent });
//         keyName = key.keyName;
//     }

//     // Create the full name of our CloudFormation stack here explicitly. Since the CFN stack references the
//     // launch configuration and vice-versa, we use this to break the cycle.
//     // TODO[pulumi/pulumi#381]: Creating an S3 bucket is an inelegant way to get a durable, unique name.
//     const cloudFormationStackName = new aws.s3.Bucket(name).id;

//     // Specify the intance configuration for the cluster.
//     const instanceLaunchConfiguration = new aws.ec2.LaunchConfiguration(name, {
//         imageId: getEcsAmiId(args.ecsOptimizedAMIName),
//         instanceType: args.instanceType || "t2.micro",
//         keyName: keyName,
//         iamInstanceProfile: instanceProfile.id,
//         enableMonitoring: true,  // default is true
//         placementTenancy: "default",  // default is "default"
//         rootBlockDevice: {
//             volumeSize: args.instanceRootVolumeSize || 8, // GiB
//             volumeType: "gp2", // default is "standard"
//             deleteOnTermination: true,
//         },
//         ebsBlockDevices: [
//             {
//                 // Swap volume
//                 deviceName: "/dev/xvdb",
//                 volumeSize: args.instanceSwapVolumeSize || 5, // GiB
//                 volumeType: "gp2", // default is "standard"
//                 deleteOnTermination: true,
//             },
//             {
//                 // Docker image and metadata volume
//                 deviceName: "/dev/xvdcz",
//                 volumeSize: args.instanceDockerImageVolumeSize || 50, // GiB
//                 volumeType: "gp2",
//                 deleteOnTermination: true,
//             },
//         ],
//         securityGroups: [ securityGroup.id ],
//         userData: getInstanceUserData(cluster, filesystem, efsMountPath, cloudFormationStackName),
//     }, { parent: parent });

//     // Finally, create the AutoScaling Group.
//     return new aws.cloudformation.Stack(name, {
//             name: cloudFormationStackName,
//             templateBody: getCloudFormationAsgTemplate(
//                 name,
//                 args.minSize || 2,
//                 args.maxSize || 100,
//                 instanceLaunchConfiguration.id,
//                 args.network.subnetIds,
//             ),
//         }, { parent: parent });
// }

// (<any>Cluster).doNotCapture = true;

// // http://docs.aws.amazon.com/AmazonECS/latest/developerguide/container_agent_versions.html
// async function getEcsAmiId(name?: string) {
//     // If a name was not provided, use the latest recommended version.
//     if (!name) {
//         // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/retrieve-ecs-optimized_AMI.html
//         const ecsRecommendedAMI = await aws.ssm.getParameter({
//             name: "/aws/service/ecs/optimized-ami/amazon-linux/recommended",
//         });
//         return JSON.parse(ecsRecommendedAMI.value).image_id;
//     }
//     // Else, if a name was provided, look it up and use that imageId.
//     const result: aws.GetAmiResult = await aws.getAmi({
//         owners: [
//             "591542846629", // Amazon
//         ],
//         filters: [
//             {
//                 name: "name",
//                 values: [ name ],
//             },
//         ],
//         mostRecent: true,
//     });
//     return result.imageId;
// }

// // http://cloudinit.readthedocs.io/en/latest/topics/format.html#cloud-config-data
// // ours seems inspired by:
// // https://github.com/convox/rack/blob/023831d8/provider/aws/dist/rack.json#L1669
// // https://github.com/awslabs/amazon-ecs-amazon-efs/blob/d92791f3/amazon-efs-ecs.json#L655
// function getInstanceUserData(
//     cluster: aws.ecs.Cluster,
//     fileSystem: aws.efs.FileSystem | undefined,
//     mountPath: string | undefined,
//     cloudFormationStackName: pulumi.Output<string>) {

//     const fileSystemId = fileSystem ? fileSystem.id : undefined;

//     const all = pulumi.all([fileSystemId, cluster.id, cloudFormationStackName]);
//     return all.apply(([fsId, clusterId, stackName]) => {
//         let fileSystemRuncmdBlock = "";
//         if (fileSystem && mountPath) {
//             // This string must be indented exactly as much as the block of commands it's inserted into below!

//             // tslint:disable max-line-length
//             fileSystemRuncmdBlock = `
//                 # Create EFS mount path
//                 mkdir ${mountPath}
//                 chown ec2-user:ec2-user ${mountPath}
//                 # Create environment variables
//                 EFS_FILE_SYSTEM_ID=${fsId}
//                 DIR_SRC=$AWS_AVAILABILITY_ZONE.$EFS_FILE_SYSTEM_ID.efs.$AWS_REGION.amazonaws.com
//                 DIR_TGT=${mountPath}
//                 # Update /etc/fstab with the new NFS mount
//                 cp -p /etc/fstab /etc/fstab.back-$(date +%F)
//                 echo -e \"$DIR_SRC:/ $DIR_TGT nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2 0 0\" | tee -a /etc/fstab
//                 mount -a -t nfs4
//                 # Restart Docker
//                 docker ps
//                 service docker stop
//                 service docker start
//             `;
//         }

//         return `#cloud-config
//         repo_upgrade_exclude:
//             - kernel*
//         packages:
//             - aws-cfn-bootstrap
//             - aws-cli
//             - nfs-utils
//         mounts:
//             - ['/dev/xvdb', 'none', 'swap', 'sw', '0', '0']
//         bootcmd:
//             - mkswap /dev/xvdb
//             - swapon /dev/xvdb
//             - echo ECS_CLUSTER='${clusterId}' >> /etc/ecs/ecs.config
//             - echo ECS_ENGINE_AUTH_TYPE=docker >> /etc/ecs/ecs.config
//         runcmd:
//             # Set and use variables in the same command, since it's not obvious if
//             # different commands will run in different shells.
//             - |
//                 # Knock one letter off of availability zone to get region.
//                 AWS_AVAILABILITY_ZONE=$(curl -s 169.254.169.254/2016-09-02/meta-data/placement/availability-zone)
//                 AWS_REGION=$(echo $AWS_AVAILABILITY_ZONE | sed 's/.$//')

//                 ${fileSystemRuncmdBlock}

//                 # Disable container access to EC2 metadata instance
//                 # See http://docs.aws.amazon.com/AmazonECS/latest/developerguide/instance_IAM_role.html
//                 iptables --insert FORWARD 1 --in-interface docker+ --destination 169.254.169.254/32 --jump DROP
//                 service iptables save

//                 /opt/aws/bin/cfn-signal \
//                     --region "\${AWS_REGION}" \
//                     --stack "${stackName}" \
//                     --resource Instances
//         `;
//     });
// }

// // TODO[pulumi/pulumi-aws/issues#43]: We'd prefer not to use CloudFormation, but it's the best way to implement
// // rolling updates in an autoscaling group.
// function getCloudFormationAsgTemplate(
//     instanceName: string,
//     minSize: number,
//     maxSize: number,
//     instanceLaunchConfigurationId: pulumi.Output<string>,
//     subnetIds: pulumi.Input<string>[]): pulumi.Output<string> {

//     const subnetsIdsArray = pulumi.all(subnetIds);
//     return pulumi.all([subnetsIdsArray, instanceLaunchConfigurationId])
//                  .apply(([array, configId]) => {
//     return `
//     AWSTemplateFormatVersion: '2010-09-09'
//     Outputs:
//         Instances:
//             Value: !Ref Instances
//     Resources:
//         Instances:
//             Type: AWS::AutoScaling::AutoScalingGroup
//             Properties:
//                 Cooldown: 300
//                 DesiredCapacity: ${minSize}
//                 HealthCheckGracePeriod: 120
//                 HealthCheckType: EC2
//                 LaunchConfigurationName: "${configId}"
//                 MaxSize: ${maxSize}
//                 MetricsCollection:
//                 -   Granularity: 1Minute
//                 MinSize: ${minSize}
//                 VPCZoneIdentifier: ${JSON.stringify(array)}
//                 Tags:
//                 -   Key: Name
//                     Value: ${instanceName}
//                     PropagateAtLaunch: true
//             CreationPolicy:
//                 ResourceSignal:
//                     Count: ${minSize}
//                     Timeout: PT15M
//             UpdatePolicy:
//                 AutoScalingRollingUpdate:
//                     MaxBatchSize: 1
//                     MinInstancesInService: ${minSize}
//                     PauseTime: PT15M
//                     SuspendProcesses:
//                     -   ScheduledActions
//                     WaitOnResourceSignals: true
//     `;
//                  });
// }
