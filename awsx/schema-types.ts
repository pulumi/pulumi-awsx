/* tslint:disable */
/**
 * This file was automatically generated by pulumi-provider-scripts.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source Pulumi Schema file,
 * and run "pulumi-provider-scripts gen-provider-types" to regenerate this file. */
import * as pulumi from "@pulumi/pulumi";
export type ConstructComponent<T extends pulumi.ComponentResource = pulumi.ComponentResource> = (name: string, inputs: any, options: pulumi.ComponentResourceOptions) => T;
export type ResourceConstructor = {
    readonly "awsx:cloudtrail:Trail": ConstructComponent<Trail>;
    readonly "awsx:ecr:Repository": ConstructComponent<Repository>;
    readonly "awsx:ecs:FargateService": ConstructComponent<FargateService>;
    readonly "awsx:ecs:FargateTaskDefinition": ConstructComponent<FargateTaskDefinition>;
    readonly "awsx:lb:ApplicationLoadBalancer": ConstructComponent<ApplicationLoadBalancer>;
};
import * as aws from "@pulumi/aws";
export abstract class Trail<TData = any> extends pulumi.ComponentResource<TData> {
    public bucket?: aws.s3.Bucket | pulumi.Output<aws.s3.Bucket>;
    public logGroup?: aws.cloudwatch.LogGroup | pulumi.Output<aws.cloudwatch.LogGroup>;
    public trail!: aws.cloudtrail.Trail | pulumi.Output<aws.cloudtrail.Trail>;
    constructor(name: string, args: pulumi.Inputs, opts: pulumi.ComponentResourceOptions = {}) { super("awsx:cloudtrail:Trail", name, {}, opts); }
}
export interface TrailArgs {
    readonly advancedEventSelectors?: pulumi.Input<pulumi.Input<aws.types.input.cloudtrail.TrailAdvancedEventSelector>[]>;
    readonly cloudWatchLogsGroup?: OptionalLogGroupInputs;
    readonly enableLogFileValidation?: pulumi.Input<boolean>;
    readonly enableLogging?: pulumi.Input<boolean>;
    readonly eventSelectors?: pulumi.Input<pulumi.Input<aws.types.input.cloudtrail.TrailEventSelector>[]>;
    readonly includeGlobalServiceEvents?: pulumi.Input<boolean>;
    readonly insightSelectors?: pulumi.Input<pulumi.Input<aws.types.input.cloudtrail.TrailInsightSelector>[]>;
    readonly isMultiRegionTrail?: pulumi.Input<boolean>;
    readonly isOrganizationTrail?: pulumi.Input<boolean>;
    readonly kmsKeyId?: pulumi.Input<string>;
    readonly name?: pulumi.Input<string>;
    readonly s3Bucket?: RequiredBucketInputs;
    readonly s3KeyPrefix?: pulumi.Input<string>;
    readonly snsTopicName?: pulumi.Input<string>;
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
}
export abstract class Repository<TData = any> extends pulumi.ComponentResource<TData> {
    public lifecyclePolicy?: aws.ecr.LifecyclePolicy | pulumi.Output<aws.ecr.LifecyclePolicy>;
    public repository!: aws.ecr.Repository | pulumi.Output<aws.ecr.Repository>;
    constructor(name: string, args: pulumi.Inputs, opts: pulumi.ComponentResourceOptions = {}) { super("awsx:ecr:Repository", name, {}, opts); }
}
export interface RepositoryArgs {
    readonly encryptionConfigurations?: pulumi.Input<pulumi.Input<aws.types.input.ecr.RepositoryEncryptionConfiguration>[]>;
    readonly imageScanningConfiguration?: pulumi.Input<aws.types.input.ecr.RepositoryImageScanningConfiguration>;
    readonly imageTagMutability?: pulumi.Input<string>;
    readonly lifecyclePolicy?: lifecyclePolicyInputs;
    readonly name?: pulumi.Input<string>;
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
}
export abstract class FargateService<TData = any> extends pulumi.ComponentResource<TData> {
    public service!: aws.ecs.Service | pulumi.Output<aws.ecs.Service>;
    public taskDefinition?: aws.ecs.TaskDefinition | pulumi.Output<aws.ecs.TaskDefinition>;
    constructor(name: string, args: pulumi.Inputs, opts: pulumi.ComponentResourceOptions = {}) { super("awsx:ecs:FargateService", name, {}, opts); }
}
export interface FargateServiceArgs {
    readonly capacityProviderStrategies?: pulumi.Input<pulumi.Input<aws.types.input.ecs.ServiceCapacityProviderStrategy>[]>;
    readonly cluster?: pulumi.Input<string>;
    readonly continueBeforeSteadyState?: pulumi.Input<boolean>;
    readonly deploymentCircuitBreaker?: pulumi.Input<aws.types.input.ecs.ServiceDeploymentCircuitBreaker>;
    readonly deploymentController?: pulumi.Input<aws.types.input.ecs.ServiceDeploymentController>;
    readonly deploymentMaximumPercent?: pulumi.Input<number>;
    readonly deploymentMinimumHealthyPercent?: pulumi.Input<number>;
    readonly desiredCount?: pulumi.Input<number>;
    readonly enableEcsManagedTags?: pulumi.Input<boolean>;
    readonly enableExecuteCommand?: pulumi.Input<boolean>;
    readonly forceNewDeployment?: pulumi.Input<boolean>;
    readonly healthCheckGracePeriodSeconds?: pulumi.Input<number>;
    readonly iamRole?: pulumi.Input<string>;
    readonly loadBalancers?: pulumi.Input<pulumi.Input<aws.types.input.ecs.ServiceLoadBalancer>[]>;
    readonly name?: pulumi.Input<string>;
    readonly networkConfiguration: pulumi.Input<aws.types.input.ecs.ServiceNetworkConfiguration>;
    readonly orderedPlacementStrategies?: pulumi.Input<pulumi.Input<aws.types.input.ecs.ServiceOrderedPlacementStrategy>[]>;
    readonly placementConstraints?: pulumi.Input<pulumi.Input<aws.types.input.ecs.ServicePlacementConstraint>[]>;
    readonly platformVersion?: pulumi.Input<string>;
    readonly propagateTags?: pulumi.Input<string>;
    readonly schedulingStrategy?: pulumi.Input<string>;
    readonly serviceRegistries?: pulumi.Input<aws.types.input.ecs.ServiceServiceRegistries>;
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
    readonly taskDefinition?: pulumi.Input<string>;
    readonly taskDefinitionArgs?: FargateServiceTaskDefinitionInputs;
}
export abstract class FargateTaskDefinition<TData = any> extends pulumi.ComponentResource<TData> {
    public executionRole?: aws.iam.Role | pulumi.Output<aws.iam.Role>;
    public loadBalancers!: aws.types.output.ecs.ServiceLoadBalancer[] | pulumi.Output<aws.types.output.ecs.ServiceLoadBalancer[]>;
    public logGroup?: aws.cloudwatch.LogGroup | pulumi.Output<aws.cloudwatch.LogGroup>;
    public taskDefinition!: aws.ecs.TaskDefinition | pulumi.Output<aws.ecs.TaskDefinition>;
    public taskRole?: aws.iam.Role | pulumi.Output<aws.iam.Role>;
    constructor(name: string, args: pulumi.Inputs, opts: pulumi.ComponentResourceOptions = {}) { super("awsx:ecs:FargateTaskDefinition", name, {}, opts); }
}
export interface FargateTaskDefinitionArgs {
    readonly container?: TaskDefinitionContainerDefinitionInputs;
    readonly containers?: Record<string, TaskDefinitionContainerDefinitionInputs>;
    readonly cpu?: pulumi.Input<string>;
    readonly ephemeralStorage?: pulumi.Input<aws.types.input.ecs.TaskDefinitionEphemeralStorage>;
    readonly executionRole?: DefaultRoleWithPolicyInputs;
    readonly family?: pulumi.Input<string>;
    readonly inferenceAccelerators?: pulumi.Input<pulumi.Input<aws.types.input.ecs.TaskDefinitionInferenceAccelerator>[]>;
    readonly ipcMode?: pulumi.Input<string>;
    readonly logGroup?: DefaultLogGroupInputs;
    readonly memory?: pulumi.Input<string>;
    readonly networkMode?: pulumi.Input<string>;
    readonly pidMode?: pulumi.Input<string>;
    readonly placementConstraints?: pulumi.Input<pulumi.Input<aws.types.input.ecs.TaskDefinitionPlacementConstraint>[]>;
    readonly proxyConfiguration?: pulumi.Input<aws.types.input.ecs.TaskDefinitionProxyConfiguration>;
    readonly requiresCompatibilities?: pulumi.Input<pulumi.Input<string>[]>;
    readonly runtimePlatform?: pulumi.Input<aws.types.input.ecs.TaskDefinitionRuntimePlatform>;
    readonly skipDestroy?: pulumi.Input<boolean>;
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
    readonly taskRole?: DefaultRoleWithPolicyInputs;
    readonly volumes?: pulumi.Input<pulumi.Input<aws.types.input.ecs.TaskDefinitionVolume>[]>;
}
export abstract class ApplicationLoadBalancer<TData = any> extends pulumi.ComponentResource<TData> {
    public defaultSecurityGroup?: aws.ec2.SecurityGroup | pulumi.Output<aws.ec2.SecurityGroup>;
    public defaultTargetGroup!: aws.lb.TargetGroup | pulumi.Output<aws.lb.TargetGroup>;
    public listeners?: aws.lb.Listener[] | pulumi.Output<aws.lb.Listener[]>;
    public loadBalancer!: aws.lb.LoadBalancer | pulumi.Output<aws.lb.LoadBalancer>;
    public vpcId?: string | pulumi.Output<string>;
    constructor(name: string, args: pulumi.Inputs, opts: pulumi.ComponentResourceOptions = {}) { super("awsx:lb:ApplicationLoadBalancer", name, {}, opts); }
}
export interface ApplicationLoadBalancerArgs {
    readonly accessLogs?: pulumi.Input<aws.types.input.lb.LoadBalancerAccessLogs>;
    readonly customerOwnedIpv4Pool?: pulumi.Input<string>;
    readonly defaultSecurityGroup?: DefaultSecurityGroupInputs;
    readonly defaultTargetGroup?: TargetGroupInputs;
    readonly desyncMitigationMode?: pulumi.Input<string>;
    readonly dropInvalidHeaderFields?: pulumi.Input<boolean>;
    readonly enableDeletionProtection?: pulumi.Input<boolean>;
    readonly enableHttp2?: pulumi.Input<boolean>;
    readonly enableWafFailOpen?: pulumi.Input<boolean>;
    readonly idleTimeout?: pulumi.Input<number>;
    readonly internal?: pulumi.Input<boolean>;
    readonly ipAddressType?: pulumi.Input<string>;
    readonly listener?: ListenerInputs;
    readonly listeners?: ListenerInputs[];
    readonly name?: pulumi.Input<string>;
    readonly namePrefix?: pulumi.Input<string>;
    readonly securityGroups?: pulumi.Input<pulumi.Input<string>[]>;
    readonly subnetIds?: pulumi.Input<pulumi.Input<string>[]>;
    readonly subnetMappings?: pulumi.Input<pulumi.Input<aws.types.input.lb.LoadBalancerSubnetMapping>[]>;
    readonly subnets?: pulumi.Input<pulumi.Input<aws.ec2.Subnet>[]>;
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
}
export interface BucketInputs {
    readonly accelerationStatus?: pulumi.Input<string>;
    readonly acl?: pulumi.Input<string>;
    readonly arn?: pulumi.Input<string>;
    readonly bucket?: pulumi.Input<string>;
    readonly bucketPrefix?: pulumi.Input<string>;
    readonly corsRules?: pulumi.Input<pulumi.Input<aws.types.input.s3.BucketCorsRule>[]>;
    readonly forceDestroy?: pulumi.Input<boolean>;
    readonly grants?: pulumi.Input<pulumi.Input<aws.types.input.s3.BucketGrant>[]>;
    readonly hostedZoneId?: pulumi.Input<string>;
    readonly lifecycleRules?: pulumi.Input<pulumi.Input<aws.types.input.s3.BucketLifecycleRule>[]>;
    readonly loggings?: pulumi.Input<pulumi.Input<aws.types.input.s3.BucketLogging>[]>;
    readonly objectLockConfiguration?: pulumi.Input<aws.types.input.s3.BucketObjectLockConfiguration>;
    readonly policy?: pulumi.Input<string>;
    readonly replicationConfiguration?: pulumi.Input<aws.types.input.s3.BucketReplicationConfiguration>;
    readonly requestPayer?: pulumi.Input<string>;
    readonly serverSideEncryptionConfiguration?: pulumi.Input<aws.types.input.s3.BucketServerSideEncryptionConfiguration>;
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
    readonly versioning?: pulumi.Input<aws.types.input.s3.BucketVersioning>;
    readonly website?: pulumi.Input<aws.types.input.s3.BucketWebsite>;
    readonly websiteDomain?: pulumi.Input<string>;
    readonly websiteEndpoint?: pulumi.Input<string>;
}
export interface BucketOutputs {
    readonly accelerationStatus?: pulumi.Output<string>;
    readonly acl?: pulumi.Output<string>;
    readonly arn?: pulumi.Output<string>;
    readonly bucket?: pulumi.Output<string>;
    readonly bucketPrefix?: pulumi.Output<string>;
    readonly corsRules?: pulumi.Output<aws.types.output.s3.BucketCorsRule[]>;
    readonly forceDestroy?: pulumi.Output<boolean>;
    readonly grants?: pulumi.Output<aws.types.output.s3.BucketGrant[]>;
    readonly hostedZoneId?: pulumi.Output<string>;
    readonly lifecycleRules?: pulumi.Output<aws.types.output.s3.BucketLifecycleRule[]>;
    readonly loggings?: pulumi.Output<aws.types.output.s3.BucketLogging[]>;
    readonly objectLockConfiguration?: pulumi.Output<aws.types.output.s3.BucketObjectLockConfiguration>;
    readonly policy?: pulumi.Output<string>;
    readonly replicationConfiguration?: pulumi.Output<aws.types.output.s3.BucketReplicationConfiguration>;
    readonly requestPayer?: pulumi.Output<string>;
    readonly serverSideEncryptionConfiguration?: pulumi.Output<aws.types.output.s3.BucketServerSideEncryptionConfiguration>;
    readonly tags?: pulumi.Output<Record<string, string>>;
    readonly versioning?: pulumi.Output<aws.types.output.s3.BucketVersioning>;
    readonly website?: pulumi.Output<aws.types.output.s3.BucketWebsite>;
    readonly websiteDomain?: pulumi.Output<string>;
    readonly websiteEndpoint?: pulumi.Output<string>;
}
export interface DefaultBucketInputs {
    readonly args?: BucketInputs;
    readonly existing?: ExistingBucketInputs;
    readonly skip?: boolean;
}
export interface DefaultBucketOutputs {
    readonly args?: BucketOutputs;
    readonly existing?: ExistingBucketOutputs;
    readonly skip?: boolean;
}
export interface DefaultLogGroupInputs {
    readonly args?: LogGroupInputs;
    readonly existing?: ExistingLogGroupInputs;
    readonly skip?: boolean;
}
export interface DefaultLogGroupOutputs {
    readonly args?: LogGroupOutputs;
    readonly existing?: ExistingLogGroupOutputs;
    readonly skip?: boolean;
}
export interface DefaultRoleWithPolicyInputs {
    readonly args?: RoleWithPolicyInputs;
    readonly roleArn?: pulumi.Input<string>;
    readonly skip?: boolean;
}
export interface DefaultRoleWithPolicyOutputs {
    readonly args?: RoleWithPolicyOutputs;
    readonly roleArn?: pulumi.Output<string>;
    readonly skip?: boolean;
}
export interface DefaultSecurityGroupInputs {
    readonly args?: SecurityGroupInputs;
    readonly securityGroupId?: pulumi.Input<string>;
    readonly skip?: boolean;
}
export interface DefaultSecurityGroupOutputs {
    readonly args?: SecurityGroupOutputs;
    readonly securityGroupId?: pulumi.Output<string>;
    readonly skip?: boolean;
}
export interface ExistingBucketInputs {
    readonly arn?: pulumi.Input<string>;
    readonly name?: pulumi.Input<string>;
}
export interface ExistingBucketOutputs {
    readonly arn?: pulumi.Output<string>;
    readonly name?: pulumi.Output<string>;
}
export interface ExistingLogGroupInputs {
    readonly arn?: pulumi.Input<string>;
    readonly name?: pulumi.Input<string>;
    readonly region?: pulumi.Input<string>;
}
export interface ExistingLogGroupOutputs {
    readonly arn?: pulumi.Output<string>;
    readonly name?: pulumi.Output<string>;
    readonly region?: pulumi.Output<string>;
}
export interface LogGroupInputs {
    readonly kmsKeyId?: pulumi.Input<string>;
    readonly name?: pulumi.Input<string>;
    readonly namePrefix?: pulumi.Input<string>;
    readonly retentionInDays?: pulumi.Input<number>;
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
}
export interface LogGroupOutputs {
    readonly kmsKeyId?: pulumi.Output<string>;
    readonly name?: pulumi.Output<string>;
    readonly namePrefix?: pulumi.Output<string>;
    readonly retentionInDays?: pulumi.Output<number>;
    readonly tags?: pulumi.Output<Record<string, string>>;
}
export interface OptionalLogGroupInputs {
    readonly args?: LogGroupInputs;
    readonly enable?: boolean;
    readonly existing?: ExistingLogGroupInputs;
}
export interface OptionalLogGroupOutputs {
    readonly args?: LogGroupOutputs;
    readonly enable?: boolean;
    readonly existing?: ExistingLogGroupOutputs;
}
export interface RequiredBucketInputs {
    readonly args?: BucketInputs;
    readonly existing?: ExistingBucketInputs;
}
export interface RequiredBucketOutputs {
    readonly args?: BucketOutputs;
    readonly existing?: ExistingBucketOutputs;
}
export interface RequiredLogGroupInputs {
    readonly args?: LogGroupInputs;
    readonly existing?: ExistingLogGroupInputs;
}
export interface RequiredLogGroupOutputs {
    readonly args?: LogGroupOutputs;
    readonly existing?: ExistingLogGroupOutputs;
}
export interface RoleWithPolicyInputs {
    readonly description?: pulumi.Input<string>;
    readonly forceDetachPolicies?: pulumi.Input<boolean>;
    readonly inlinePolicies?: pulumi.Input<pulumi.Input<aws.types.input.iam.RoleInlinePolicy>[]>;
    readonly managedPolicyArns?: pulumi.Input<pulumi.Input<string>[]>;
    readonly maxSessionDuration?: pulumi.Input<number>;
    readonly name?: pulumi.Input<string>;
    readonly namePrefix?: pulumi.Input<string>;
    readonly path?: pulumi.Input<string>;
    readonly permissionsBoundary?: pulumi.Input<string>;
    readonly policyArns?: string[];
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
}
export interface RoleWithPolicyOutputs {
    readonly description?: pulumi.Output<string>;
    readonly forceDetachPolicies?: pulumi.Output<boolean>;
    readonly inlinePolicies?: pulumi.Output<aws.types.output.iam.RoleInlinePolicy[]>;
    readonly managedPolicyArns?: pulumi.Output<string[]>;
    readonly maxSessionDuration?: pulumi.Output<number>;
    readonly name?: pulumi.Output<string>;
    readonly namePrefix?: pulumi.Output<string>;
    readonly path?: pulumi.Output<string>;
    readonly permissionsBoundary?: pulumi.Output<string>;
    readonly policyArns?: string[];
    readonly tags?: pulumi.Output<Record<string, string>>;
}
export interface SecurityGroupInputs {
    readonly description?: pulumi.Input<string>;
    readonly egress?: pulumi.Input<pulumi.Input<aws.types.input.ec2.SecurityGroupEgress>[]>;
    readonly ingress?: pulumi.Input<pulumi.Input<aws.types.input.ec2.SecurityGroupIngress>[]>;
    readonly name?: pulumi.Input<string>;
    readonly namePrefix?: pulumi.Input<string>;
    readonly revokeRulesOnDelete?: pulumi.Input<boolean>;
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
    readonly vpcId?: pulumi.Input<string>;
}
export interface SecurityGroupOutputs {
    readonly description?: pulumi.Output<string>;
    readonly egress?: pulumi.Output<aws.types.output.ec2.SecurityGroupEgress[]>;
    readonly ingress?: pulumi.Output<aws.types.output.ec2.SecurityGroupIngress[]>;
    readonly name?: pulumi.Output<string>;
    readonly namePrefix?: pulumi.Output<string>;
    readonly revokeRulesOnDelete?: pulumi.Output<boolean>;
    readonly tags?: pulumi.Output<Record<string, string>>;
    readonly vpcId?: pulumi.Output<string>;
}
export interface LogGroupInputs {
    readonly kmsKeyId?: pulumi.Input<string>;
    readonly namePrefix?: pulumi.Input<string>;
    readonly retentionInDays?: pulumi.Input<number>;
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
}
export interface LogGroupOutputs {
    readonly kmsKeyId?: pulumi.Output<string>;
    readonly namePrefix?: pulumi.Output<string>;
    readonly retentionInDays?: pulumi.Output<number>;
    readonly tags?: pulumi.Output<Record<string, string>>;
}
export interface DockerBuildInputs {
    readonly args?: pulumi.Input<Record<string, pulumi.Input<string>>>;
    readonly cacheFrom?: pulumi.Input<pulumi.Input<string>[]>;
    readonly dockerfile?: pulumi.Input<string>;
    readonly env?: pulumi.Input<Record<string, pulumi.Input<string>>>;
    readonly extraOptions?: pulumi.Input<pulumi.Input<string>[]>;
    readonly path?: pulumi.Input<string>;
    readonly target?: pulumi.Input<string>;
}
export interface DockerBuildOutputs {
    readonly args?: pulumi.Output<Record<string, string>>;
    readonly cacheFrom?: pulumi.Output<string[]>;
    readonly dockerfile?: pulumi.Output<string>;
    readonly env?: pulumi.Output<Record<string, string>>;
    readonly extraOptions?: pulumi.Output<string[]>;
    readonly path?: pulumi.Output<string>;
    readonly target?: pulumi.Output<string>;
}
export interface lifecyclePolicyInputs {
    readonly rules?: pulumi.Input<pulumi.Input<lifecyclePolicyRuleInputs>[]>;
    readonly skip?: boolean;
}
export interface lifecyclePolicyOutputs {
    readonly rules?: pulumi.Output<lifecyclePolicyRuleOutputs[]>;
    readonly skip?: boolean;
}
export interface lifecyclePolicyRuleInputs {
    readonly description?: pulumi.Input<string>;
    readonly maximumAgeLimit?: pulumi.Input<number>;
    readonly maximumNumberOfImages?: pulumi.Input<number>;
    readonly tagPrefixList?: pulumi.Input<pulumi.Input<string>[]>;
    readonly tagStatus: pulumi.Input<lifecycleTagStatusInputs>;
}
export interface lifecyclePolicyRuleOutputs {
    readonly description?: pulumi.Output<string>;
    readonly maximumAgeLimit?: pulumi.Output<number>;
    readonly maximumNumberOfImages?: pulumi.Output<number>;
    readonly tagPrefixList?: pulumi.Output<string[]>;
    readonly tagStatus: pulumi.Output<lifecycleTagStatusOutputs>;
}
export interface lifecycleTagStatusInputs {
}
export interface lifecycleTagStatusOutputs {
}
export interface FargateServiceTaskDefinitionInputs {
    readonly container?: TaskDefinitionContainerDefinitionInputs;
    readonly containers?: Record<string, TaskDefinitionContainerDefinitionInputs>;
    readonly cpu?: pulumi.Input<string>;
    readonly ephemeralStorage?: pulumi.Input<aws.types.input.ecs.TaskDefinitionEphemeralStorage>;
    readonly executionRole?: DefaultRoleWithPolicyInputs;
    readonly family?: pulumi.Input<string>;
    readonly inferenceAccelerators?: pulumi.Input<pulumi.Input<aws.types.input.ecs.TaskDefinitionInferenceAccelerator>[]>;
    readonly ipcMode?: pulumi.Input<string>;
    readonly logGroup?: DefaultLogGroupInputs;
    readonly memory?: pulumi.Input<string>;
    readonly networkMode?: pulumi.Input<string>;
    readonly pidMode?: pulumi.Input<string>;
    readonly placementConstraints?: pulumi.Input<pulumi.Input<aws.types.input.ecs.TaskDefinitionPlacementConstraint>[]>;
    readonly proxyConfiguration?: pulumi.Input<aws.types.input.ecs.TaskDefinitionProxyConfiguration>;
    readonly requiresCompatibilities?: pulumi.Input<pulumi.Input<string>[]>;
    readonly runtimePlatform?: pulumi.Input<aws.types.input.ecs.TaskDefinitionRuntimePlatform>;
    readonly skipDestroy?: pulumi.Input<boolean>;
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
    readonly taskRole?: DefaultRoleWithPolicyInputs;
    readonly volumes?: pulumi.Input<pulumi.Input<aws.types.input.ecs.TaskDefinitionVolume>[]>;
}
export interface FargateServiceTaskDefinitionOutputs {
    readonly container?: TaskDefinitionContainerDefinitionOutputs;
    readonly containers?: Record<string, TaskDefinitionContainerDefinitionOutputs>;
    readonly cpu?: pulumi.Output<string>;
    readonly ephemeralStorage?: pulumi.Output<aws.types.output.ecs.TaskDefinitionEphemeralStorage>;
    readonly executionRole?: DefaultRoleWithPolicyOutputs;
    readonly family?: pulumi.Output<string>;
    readonly inferenceAccelerators?: pulumi.Output<aws.types.output.ecs.TaskDefinitionInferenceAccelerator[]>;
    readonly ipcMode?: pulumi.Output<string>;
    readonly logGroup?: DefaultLogGroupOutputs;
    readonly memory?: pulumi.Output<string>;
    readonly networkMode?: pulumi.Output<string>;
    readonly pidMode?: pulumi.Output<string>;
    readonly placementConstraints?: pulumi.Output<aws.types.output.ecs.TaskDefinitionPlacementConstraint[]>;
    readonly proxyConfiguration?: pulumi.Output<aws.types.output.ecs.TaskDefinitionProxyConfiguration>;
    readonly requiresCompatibilities?: pulumi.Output<string[]>;
    readonly runtimePlatform?: pulumi.Output<aws.types.output.ecs.TaskDefinitionRuntimePlatform>;
    readonly skipDestroy?: pulumi.Output<boolean>;
    readonly tags?: pulumi.Output<Record<string, string>>;
    readonly taskRole?: DefaultRoleWithPolicyOutputs;
    readonly volumes?: pulumi.Output<aws.types.output.ecs.TaskDefinitionVolume[]>;
}
export interface TaskDefinitionContainerDefinitionInputs {
    readonly command?: pulumi.Input<pulumi.Input<string>[]>;
    readonly cpu?: pulumi.Input<number>;
    readonly dependsOn?: pulumi.Input<pulumi.Input<TaskDefinitionContainerDependencyInputs>[]>;
    readonly disableNetworking?: pulumi.Input<boolean>;
    readonly dnsSearchDomains?: pulumi.Input<pulumi.Input<string>[]>;
    readonly dnsServers?: pulumi.Input<pulumi.Input<string>[]>;
    readonly dockerLabels?: pulumi.Input<any>;
    readonly dockerSecurityOptions?: pulumi.Input<pulumi.Input<string>[]>;
    readonly entryPoint?: pulumi.Input<pulumi.Input<string>[]>;
    readonly environment?: pulumi.Input<pulumi.Input<TaskDefinitionKeyValuePairInputs>[]>;
    readonly environmentFiles?: pulumi.Input<pulumi.Input<TaskDefinitionEnvironmentFileInputs>[]>;
    readonly essential?: pulumi.Input<boolean>;
    readonly extraHosts?: pulumi.Input<pulumi.Input<TaskDefinitionHostEntryInputs>[]>;
    readonly firelensConfiguration?: pulumi.Input<TaskDefinitionFirelensConfigurationInputs>;
    readonly healthCheck?: pulumi.Input<TaskDefinitionHealthCheckInputs>;
    readonly hostname?: pulumi.Input<string>;
    readonly image?: pulumi.Input<string>;
    readonly interactive?: pulumi.Input<boolean>;
    readonly links?: pulumi.Input<pulumi.Input<string>[]>;
    readonly linuxParameters?: pulumi.Input<TaskDefinitionLinuxParametersInputs>;
    readonly logConfiguration?: pulumi.Input<TaskDefinitionLogConfigurationInputs>;
    readonly memory?: pulumi.Input<number>;
    readonly memoryReservation?: pulumi.Input<number>;
    readonly mountPoints?: pulumi.Input<pulumi.Input<TaskDefinitionMountPointInputs>[]>;
    readonly name?: pulumi.Input<string>;
    readonly portMappings?: pulumi.Input<pulumi.Input<TaskDefinitionPortMappingInputs>[]>;
    readonly privileged?: pulumi.Input<boolean>;
    readonly pseudoTerminal?: pulumi.Input<boolean>;
    readonly readonlyRootFilesystem?: pulumi.Input<boolean>;
    readonly repositoryCredentials?: pulumi.Input<TaskDefinitionRepositoryCredentialsInputs>;
    readonly resourceRequirements?: pulumi.Input<pulumi.Input<TaskDefinitionResourceRequirementInputs>[]>;
    readonly secrets?: pulumi.Input<pulumi.Input<TaskDefinitionSecretInputs>[]>;
    readonly startTimeout?: pulumi.Input<number>;
    readonly stopTimeout?: pulumi.Input<number>;
    readonly systemControls?: pulumi.Input<pulumi.Input<TaskDefinitionSystemControlInputs>[]>;
    readonly ulimits?: pulumi.Input<pulumi.Input<TaskDefinitionUlimitInputs>[]>;
    readonly user?: pulumi.Input<string>;
    readonly volumesFrom?: pulumi.Input<pulumi.Input<TaskDefinitionVolumeFromInputs>[]>;
    readonly workingDirectory?: pulumi.Input<string>;
}
export interface TaskDefinitionContainerDefinitionOutputs {
    readonly command?: pulumi.Output<string[]>;
    readonly cpu?: pulumi.Output<number>;
    readonly dependsOn?: pulumi.Output<TaskDefinitionContainerDependencyOutputs[]>;
    readonly disableNetworking?: pulumi.Output<boolean>;
    readonly dnsSearchDomains?: pulumi.Output<string[]>;
    readonly dnsServers?: pulumi.Output<string[]>;
    readonly dockerLabels?: pulumi.Output<any>;
    readonly dockerSecurityOptions?: pulumi.Output<string[]>;
    readonly entryPoint?: pulumi.Output<string[]>;
    readonly environment?: pulumi.Output<TaskDefinitionKeyValuePairOutputs[]>;
    readonly environmentFiles?: pulumi.Output<TaskDefinitionEnvironmentFileOutputs[]>;
    readonly essential?: pulumi.Output<boolean>;
    readonly extraHosts?: pulumi.Output<TaskDefinitionHostEntryOutputs[]>;
    readonly firelensConfiguration?: pulumi.Output<TaskDefinitionFirelensConfigurationOutputs>;
    readonly healthCheck?: pulumi.Output<TaskDefinitionHealthCheckOutputs>;
    readonly hostname?: pulumi.Output<string>;
    readonly image?: pulumi.Output<string>;
    readonly interactive?: pulumi.Output<boolean>;
    readonly links?: pulumi.Output<string[]>;
    readonly linuxParameters?: pulumi.Output<TaskDefinitionLinuxParametersOutputs>;
    readonly logConfiguration?: pulumi.Output<TaskDefinitionLogConfigurationOutputs>;
    readonly memory?: pulumi.Output<number>;
    readonly memoryReservation?: pulumi.Output<number>;
    readonly mountPoints?: pulumi.Output<TaskDefinitionMountPointOutputs[]>;
    readonly name?: pulumi.Output<string>;
    readonly portMappings?: pulumi.Output<TaskDefinitionPortMappingOutputs[]>;
    readonly privileged?: pulumi.Output<boolean>;
    readonly pseudoTerminal?: pulumi.Output<boolean>;
    readonly readonlyRootFilesystem?: pulumi.Output<boolean>;
    readonly repositoryCredentials?: pulumi.Output<TaskDefinitionRepositoryCredentialsOutputs>;
    readonly resourceRequirements?: pulumi.Output<TaskDefinitionResourceRequirementOutputs[]>;
    readonly secrets?: pulumi.Output<TaskDefinitionSecretOutputs[]>;
    readonly startTimeout?: pulumi.Output<number>;
    readonly stopTimeout?: pulumi.Output<number>;
    readonly systemControls?: pulumi.Output<TaskDefinitionSystemControlOutputs[]>;
    readonly ulimits?: pulumi.Output<TaskDefinitionUlimitOutputs[]>;
    readonly user?: pulumi.Output<string>;
    readonly volumesFrom?: pulumi.Output<TaskDefinitionVolumeFromOutputs[]>;
    readonly workingDirectory?: pulumi.Output<string>;
}
export interface TaskDefinitionContainerDependencyInputs {
    readonly condition?: pulumi.Input<string>;
    readonly containerName?: pulumi.Input<string>;
}
export interface TaskDefinitionContainerDependencyOutputs {
    readonly condition?: pulumi.Output<string>;
    readonly containerName?: pulumi.Output<string>;
}
export interface TaskDefinitionDeviceInputs {
    readonly containerPath?: pulumi.Input<string>;
    readonly hostPath?: pulumi.Input<string>;
    readonly permissions?: pulumi.Input<pulumi.Input<string>[]>;
}
export interface TaskDefinitionDeviceOutputs {
    readonly containerPath?: pulumi.Output<string>;
    readonly hostPath?: pulumi.Output<string>;
    readonly permissions?: pulumi.Output<string[]>;
}
export interface TaskDefinitionEnvironmentFileInputs {
    readonly type?: pulumi.Input<string>;
    readonly value?: pulumi.Input<string>;
}
export interface TaskDefinitionEnvironmentFileOutputs {
    readonly type?: pulumi.Output<string>;
    readonly value?: pulumi.Output<string>;
}
export interface TaskDefinitionFirelensConfigurationInputs {
    readonly options?: pulumi.Input<any>;
    readonly type?: pulumi.Input<string>;
}
export interface TaskDefinitionFirelensConfigurationOutputs {
    readonly options?: pulumi.Output<any>;
    readonly type?: pulumi.Output<string>;
}
export interface TaskDefinitionHealthCheckInputs {
    readonly command?: pulumi.Input<pulumi.Input<string>[]>;
    readonly interval?: pulumi.Input<number>;
    readonly retries?: pulumi.Input<number>;
    readonly startPeriod?: pulumi.Input<number>;
    readonly timeout?: pulumi.Input<number>;
}
export interface TaskDefinitionHealthCheckOutputs {
    readonly command?: pulumi.Output<string[]>;
    readonly interval?: pulumi.Output<number>;
    readonly retries?: pulumi.Output<number>;
    readonly startPeriod?: pulumi.Output<number>;
    readonly timeout?: pulumi.Output<number>;
}
export interface TaskDefinitionHostEntryInputs {
    readonly hostname?: pulumi.Input<string>;
    readonly ipAddress?: pulumi.Input<string>;
}
export interface TaskDefinitionHostEntryOutputs {
    readonly hostname?: pulumi.Output<string>;
    readonly ipAddress?: pulumi.Output<string>;
}
export interface TaskDefinitionKernelCapabilitiesInputs {
    readonly add?: pulumi.Input<pulumi.Input<string>[]>;
    readonly drop?: pulumi.Input<pulumi.Input<string>[]>;
}
export interface TaskDefinitionKernelCapabilitiesOutputs {
    readonly add?: pulumi.Output<string[]>;
    readonly drop?: pulumi.Output<string[]>;
}
export interface TaskDefinitionKeyValuePairInputs {
    readonly name?: pulumi.Input<string>;
    readonly value?: pulumi.Input<string>;
}
export interface TaskDefinitionKeyValuePairOutputs {
    readonly name?: pulumi.Output<string>;
    readonly value?: pulumi.Output<string>;
}
export interface TaskDefinitionLinuxParametersInputs {
    readonly capabilities?: pulumi.Input<TaskDefinitionKernelCapabilitiesInputs>;
    readonly devices?: pulumi.Input<pulumi.Input<TaskDefinitionDeviceInputs>[]>;
    readonly initProcessEnabled?: pulumi.Input<boolean>;
    readonly maxSwap?: pulumi.Input<number>;
    readonly sharedMemorySize?: pulumi.Input<number>;
    readonly swappiness?: pulumi.Input<number>;
    readonly tmpfs?: pulumi.Input<pulumi.Input<TaskDefinitionTmpfsInputs>[]>;
}
export interface TaskDefinitionLinuxParametersOutputs {
    readonly capabilities?: pulumi.Output<TaskDefinitionKernelCapabilitiesOutputs>;
    readonly devices?: pulumi.Output<TaskDefinitionDeviceOutputs[]>;
    readonly initProcessEnabled?: pulumi.Output<boolean>;
    readonly maxSwap?: pulumi.Output<number>;
    readonly sharedMemorySize?: pulumi.Output<number>;
    readonly swappiness?: pulumi.Output<number>;
    readonly tmpfs?: pulumi.Output<TaskDefinitionTmpfsOutputs[]>;
}
export interface TaskDefinitionLogConfigurationInputs {
    readonly logDriver: pulumi.Input<string>;
    readonly options?: pulumi.Input<any>;
    readonly secretOptions?: pulumi.Input<pulumi.Input<TaskDefinitionSecretInputs>[]>;
}
export interface TaskDefinitionLogConfigurationOutputs {
    readonly logDriver: pulumi.Output<string>;
    readonly options?: pulumi.Output<any>;
    readonly secretOptions?: pulumi.Output<TaskDefinitionSecretOutputs[]>;
}
export interface TaskDefinitionMountPointInputs {
    readonly containerPath?: pulumi.Input<string>;
    readonly readOnly?: pulumi.Input<boolean>;
    readonly sourceVolume?: pulumi.Input<string>;
}
export interface TaskDefinitionMountPointOutputs {
    readonly containerPath?: pulumi.Output<string>;
    readonly readOnly?: pulumi.Output<boolean>;
    readonly sourceVolume?: pulumi.Output<string>;
}
export interface TaskDefinitionPortMappingInputs {
    readonly containerPort?: pulumi.Input<number>;
    readonly hostPort?: pulumi.Input<number>;
    readonly protocol?: pulumi.Input<string>;
    readonly targetGroup?: pulumi.Input<aws.lb.TargetGroup>;
}
export interface TaskDefinitionPortMappingOutputs {
    readonly containerPort?: pulumi.Output<number>;
    readonly hostPort?: pulumi.Output<number>;
    readonly protocol?: pulumi.Output<string>;
    readonly targetGroup?: pulumi.Output<aws.lb.TargetGroup>;
}
export interface TaskDefinitionRepositoryCredentialsInputs {
    readonly credentialsParameter?: pulumi.Input<string>;
}
export interface TaskDefinitionRepositoryCredentialsOutputs {
    readonly credentialsParameter?: pulumi.Output<string>;
}
export interface TaskDefinitionResourceRequirementInputs {
    readonly type: pulumi.Input<string>;
    readonly value: pulumi.Input<string>;
}
export interface TaskDefinitionResourceRequirementOutputs {
    readonly type: pulumi.Output<string>;
    readonly value: pulumi.Output<string>;
}
export interface TaskDefinitionSecretInputs {
    readonly name: pulumi.Input<string>;
    readonly valueFrom: pulumi.Input<string>;
}
export interface TaskDefinitionSecretOutputs {
    readonly name: pulumi.Output<string>;
    readonly valueFrom: pulumi.Output<string>;
}
export interface TaskDefinitionSystemControlInputs {
    readonly namespace?: pulumi.Input<string>;
    readonly value?: pulumi.Input<string>;
}
export interface TaskDefinitionSystemControlOutputs {
    readonly namespace?: pulumi.Output<string>;
    readonly value?: pulumi.Output<string>;
}
export interface TaskDefinitionTmpfsInputs {
    readonly containerPath?: pulumi.Input<string>;
    readonly mountOptions?: pulumi.Input<pulumi.Input<string>[]>;
    readonly size: pulumi.Input<number>;
}
export interface TaskDefinitionTmpfsOutputs {
    readonly containerPath?: pulumi.Output<string>;
    readonly mountOptions?: pulumi.Output<string[]>;
    readonly size: pulumi.Output<number>;
}
export interface TaskDefinitionUlimitInputs {
    readonly hardLimit: pulumi.Input<number>;
    readonly name: pulumi.Input<string>;
    readonly softLimit: pulumi.Input<number>;
}
export interface TaskDefinitionUlimitOutputs {
    readonly hardLimit: pulumi.Output<number>;
    readonly name: pulumi.Output<string>;
    readonly softLimit: pulumi.Output<number>;
}
export interface TaskDefinitionVolumeFromInputs {
    readonly readOnly?: pulumi.Input<boolean>;
    readonly sourceContainer?: pulumi.Input<string>;
}
export interface TaskDefinitionVolumeFromOutputs {
    readonly readOnly?: pulumi.Output<boolean>;
    readonly sourceContainer?: pulumi.Output<string>;
}
export interface ListenerInputs {
    readonly alpnPolicy?: pulumi.Input<string>;
    readonly certificateArn?: pulumi.Input<string>;
    readonly defaultActions?: pulumi.Input<pulumi.Input<aws.types.input.lb.ListenerDefaultAction>[]>;
    readonly port?: pulumi.Input<number>;
    readonly protocol?: pulumi.Input<string>;
    readonly sslPolicy?: pulumi.Input<string>;
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
}
export interface ListenerOutputs {
    readonly alpnPolicy?: pulumi.Output<string>;
    readonly certificateArn?: pulumi.Output<string>;
    readonly defaultActions?: pulumi.Output<aws.types.output.lb.ListenerDefaultAction[]>;
    readonly port?: pulumi.Output<number>;
    readonly protocol?: pulumi.Output<string>;
    readonly sslPolicy?: pulumi.Output<string>;
    readonly tags?: pulumi.Output<Record<string, string>>;
}
export interface TargetGroupInputs {
    readonly connectionTermination?: pulumi.Input<boolean>;
    readonly deregistrationDelay?: pulumi.Input<number>;
    readonly healthCheck?: pulumi.Input<aws.types.input.lb.TargetGroupHealthCheck>;
    readonly lambdaMultiValueHeadersEnabled?: pulumi.Input<boolean>;
    readonly loadBalancingAlgorithmType?: pulumi.Input<string>;
    readonly name?: pulumi.Input<string>;
    readonly namePrefix?: pulumi.Input<string>;
    readonly port?: pulumi.Input<number>;
    readonly preserveClientIp?: pulumi.Input<string>;
    readonly protocol?: pulumi.Input<string>;
    readonly protocolVersion?: pulumi.Input<string>;
    readonly proxyProtocolV2?: pulumi.Input<boolean>;
    readonly slowStart?: pulumi.Input<number>;
    readonly stickiness?: pulumi.Input<aws.types.input.lb.TargetGroupStickiness>;
    readonly tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
    readonly targetType?: pulumi.Input<string>;
    readonly vpcId?: pulumi.Input<string>;
}
export interface TargetGroupOutputs {
    readonly connectionTermination?: pulumi.Output<boolean>;
    readonly deregistrationDelay?: pulumi.Output<number>;
    readonly healthCheck?: pulumi.Output<aws.types.output.lb.TargetGroupHealthCheck>;
    readonly lambdaMultiValueHeadersEnabled?: pulumi.Output<boolean>;
    readonly loadBalancingAlgorithmType?: pulumi.Output<string>;
    readonly name?: pulumi.Output<string>;
    readonly namePrefix?: pulumi.Output<string>;
    readonly port?: pulumi.Output<number>;
    readonly preserveClientIp?: pulumi.Output<string>;
    readonly protocol?: pulumi.Output<string>;
    readonly protocolVersion?: pulumi.Output<string>;
    readonly proxyProtocolV2?: pulumi.Output<boolean>;
    readonly slowStart?: pulumi.Output<number>;
    readonly stickiness?: pulumi.Output<aws.types.output.lb.TargetGroupStickiness>;
    readonly tags?: pulumi.Output<Record<string, string>>;
    readonly targetType?: pulumi.Output<string>;
    readonly vpcId?: pulumi.Output<string>;
}
