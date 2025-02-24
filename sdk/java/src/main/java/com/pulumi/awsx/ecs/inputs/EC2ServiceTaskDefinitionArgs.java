// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.awsx.ecs.inputs;

import com.pulumi.aws.ecs.inputs.TaskDefinitionEphemeralStorageArgs;
import com.pulumi.aws.ecs.inputs.TaskDefinitionInferenceAcceleratorArgs;
import com.pulumi.aws.ecs.inputs.TaskDefinitionPlacementConstraintArgs;
import com.pulumi.aws.ecs.inputs.TaskDefinitionProxyConfigurationArgs;
import com.pulumi.aws.ecs.inputs.TaskDefinitionRuntimePlatformArgs;
import com.pulumi.aws.ecs.inputs.TaskDefinitionVolumeArgs;
import com.pulumi.awsx.awsx.inputs.DefaultLogGroupArgs;
import com.pulumi.awsx.awsx.inputs.DefaultRoleWithPolicyArgs;
import com.pulumi.awsx.ecs.inputs.TaskDefinitionContainerDefinitionArgs;
import com.pulumi.core.Output;
import com.pulumi.core.annotations.Import;
import java.lang.Boolean;
import java.lang.String;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import javax.annotation.Nullable;


/**
 * Create a TaskDefinition resource with the given unique name, arguments, and options.
 * Creates required log-group and task &amp; execution roles.
 * Presents required Service load balancers if target group included in port mappings.
 * 
 */
public final class EC2ServiceTaskDefinitionArgs extends com.pulumi.resources.ResourceArgs {

    public static final EC2ServiceTaskDefinitionArgs Empty = new EC2ServiceTaskDefinitionArgs();

    /**
     * Single container to make a TaskDefinition from.  Useful for simple cases where there aren&#39;t
     * multiple containers, especially when creating a TaskDefinition to call [run] on.
     * 
     * Either [container] or [containers] must be provided.
     * 
     */
    @Import(name="container")
    private @Nullable TaskDefinitionContainerDefinitionArgs container;

    /**
     * @return Single container to make a TaskDefinition from.  Useful for simple cases where there aren&#39;t
     * multiple containers, especially when creating a TaskDefinition to call [run] on.
     * 
     * Either [container] or [containers] must be provided.
     * 
     */
    public Optional<TaskDefinitionContainerDefinitionArgs> container() {
        return Optional.ofNullable(this.container);
    }

    /**
     * All the containers to make a TaskDefinition from.  Useful when creating a Service that will
     * contain many containers within.
     * 
     * Either [container] or [containers] must be provided.
     * 
     */
    @Import(name="containers")
    private @Nullable Map<String,TaskDefinitionContainerDefinitionArgs> containers;

    /**
     * @return All the containers to make a TaskDefinition from.  Useful when creating a Service that will
     * contain many containers within.
     * 
     * Either [container] or [containers] must be provided.
     * 
     */
    public Optional<Map<String,TaskDefinitionContainerDefinitionArgs>> containers() {
        return Optional.ofNullable(this.containers);
    }

    /**
     * The number of cpu units used by the task. If not provided, a default will be computed based on the cumulative needs specified by [containerDefinitions]
     * 
     */
    @Import(name="cpu")
    private @Nullable Output<String> cpu;

    /**
     * @return The number of cpu units used by the task. If not provided, a default will be computed based on the cumulative needs specified by [containerDefinitions]
     * 
     */
    public Optional<Output<String>> cpu() {
        return Optional.ofNullable(this.cpu);
    }

    /**
     * Enables fault injection and allows for fault injection requests to be accepted from the task&#39;s containers. Default is `false`.
     * 
     * **Note:** Fault injection only works with tasks using the `awsvpc` or `host` network modes. Fault injection isn&#39;t available on Windows.
     * 
     */
    @Import(name="enableFaultInjection")
    private @Nullable Output<Boolean> enableFaultInjection;

    /**
     * @return Enables fault injection and allows for fault injection requests to be accepted from the task&#39;s containers. Default is `false`.
     * 
     * **Note:** Fault injection only works with tasks using the `awsvpc` or `host` network modes. Fault injection isn&#39;t available on Windows.
     * 
     */
    public Optional<Output<Boolean>> enableFaultInjection() {
        return Optional.ofNullable(this.enableFaultInjection);
    }

    /**
     * The amount of ephemeral storage to allocate for the task. This parameter is used to expand the total amount of ephemeral storage available, beyond the default amount, for tasks hosted on AWS Fargate. See Ephemeral Storage.
     * 
     */
    @Import(name="ephemeralStorage")
    private @Nullable Output<TaskDefinitionEphemeralStorageArgs> ephemeralStorage;

    /**
     * @return The amount of ephemeral storage to allocate for the task. This parameter is used to expand the total amount of ephemeral storage available, beyond the default amount, for tasks hosted on AWS Fargate. See Ephemeral Storage.
     * 
     */
    public Optional<Output<TaskDefinitionEphemeralStorageArgs>> ephemeralStorage() {
        return Optional.ofNullable(this.ephemeralStorage);
    }

    /**
     * The execution role that the Amazon ECS container agent and the Docker daemon can assume.
     * Will be created automatically if not defined.
     * 
     */
    @Import(name="executionRole")
    private @Nullable DefaultRoleWithPolicyArgs executionRole;

    /**
     * @return The execution role that the Amazon ECS container agent and the Docker daemon can assume.
     * Will be created automatically if not defined.
     * 
     */
    public Optional<DefaultRoleWithPolicyArgs> executionRole() {
        return Optional.ofNullable(this.executionRole);
    }

    /**
     * An optional unique name for your task definition. If not specified, then a default will be created.
     * 
     */
    @Import(name="family")
    private @Nullable Output<String> family;

    /**
     * @return An optional unique name for your task definition. If not specified, then a default will be created.
     * 
     */
    public Optional<Output<String>> family() {
        return Optional.ofNullable(this.family);
    }

    /**
     * Configuration block(s) with Inference Accelerators settings. Detailed below.
     * 
     */
    @Import(name="inferenceAccelerators")
    private @Nullable Output<List<TaskDefinitionInferenceAcceleratorArgs>> inferenceAccelerators;

    /**
     * @return Configuration block(s) with Inference Accelerators settings. Detailed below.
     * 
     */
    public Optional<Output<List<TaskDefinitionInferenceAcceleratorArgs>>> inferenceAccelerators() {
        return Optional.ofNullable(this.inferenceAccelerators);
    }

    /**
     * IPC resource namespace to be used for the containers in the task The valid values are `host`, `task`, and `none`.
     * 
     */
    @Import(name="ipcMode")
    private @Nullable Output<String> ipcMode;

    /**
     * @return IPC resource namespace to be used for the containers in the task The valid values are `host`, `task`, and `none`.
     * 
     */
    public Optional<Output<String>> ipcMode() {
        return Optional.ofNullable(this.ipcMode);
    }

    /**
     * A set of volume blocks that containers in your task may use.
     * 
     */
    @Import(name="logGroup")
    private @Nullable DefaultLogGroupArgs logGroup;

    /**
     * @return A set of volume blocks that containers in your task may use.
     * 
     */
    public Optional<DefaultLogGroupArgs> logGroup() {
        return Optional.ofNullable(this.logGroup);
    }

    /**
     * The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
     * based on the cumulative needs specified by [containerDefinitions]
     * 
     */
    @Import(name="memory")
    private @Nullable Output<String> memory;

    /**
     * @return The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
     * based on the cumulative needs specified by [containerDefinitions]
     * 
     */
    public Optional<Output<String>> memory() {
        return Optional.ofNullable(this.memory);
    }

    /**
     * Docker networking mode to use for the containers in the task. Valid values are `none`, `bridge`, `awsvpc`, and `host`.
     * 
     */
    @Import(name="networkMode")
    private @Nullable Output<String> networkMode;

    /**
     * @return Docker networking mode to use for the containers in the task. Valid values are `none`, `bridge`, `awsvpc`, and `host`.
     * 
     */
    public Optional<Output<String>> networkMode() {
        return Optional.ofNullable(this.networkMode);
    }

    /**
     * Process namespace to use for the containers in the task. The valid values are `host` and `task`.
     * 
     */
    @Import(name="pidMode")
    private @Nullable Output<String> pidMode;

    /**
     * @return Process namespace to use for the containers in the task. The valid values are `host` and `task`.
     * 
     */
    public Optional<Output<String>> pidMode() {
        return Optional.ofNullable(this.pidMode);
    }

    /**
     * Configuration block for rules that are taken into consideration during task placement. Maximum number of `placement_constraints` is `10`. Detailed below.
     * 
     */
    @Import(name="placementConstraints")
    private @Nullable Output<List<TaskDefinitionPlacementConstraintArgs>> placementConstraints;

    /**
     * @return Configuration block for rules that are taken into consideration during task placement. Maximum number of `placement_constraints` is `10`. Detailed below.
     * 
     */
    public Optional<Output<List<TaskDefinitionPlacementConstraintArgs>>> placementConstraints() {
        return Optional.ofNullable(this.placementConstraints);
    }

    /**
     * Configuration block for the App Mesh proxy. Detailed below.
     * 
     */
    @Import(name="proxyConfiguration")
    private @Nullable Output<TaskDefinitionProxyConfigurationArgs> proxyConfiguration;

    /**
     * @return Configuration block for the App Mesh proxy. Detailed below.
     * 
     */
    public Optional<Output<TaskDefinitionProxyConfigurationArgs>> proxyConfiguration() {
        return Optional.ofNullable(this.proxyConfiguration);
    }

    /**
     * Configuration block for runtime_platform that containers in your task may use.
     * 
     */
    @Import(name="runtimePlatform")
    private @Nullable Output<TaskDefinitionRuntimePlatformArgs> runtimePlatform;

    /**
     * @return Configuration block for runtime_platform that containers in your task may use.
     * 
     */
    public Optional<Output<TaskDefinitionRuntimePlatformArgs>> runtimePlatform() {
        return Optional.ofNullable(this.runtimePlatform);
    }

    /**
     * Whether to retain the old revision when the resource is destroyed or replacement is necessary. Default is `false`.
     * 
     */
    @Import(name="skipDestroy")
    private @Nullable Output<Boolean> skipDestroy;

    /**
     * @return Whether to retain the old revision when the resource is destroyed or replacement is necessary. Default is `false`.
     * 
     */
    public Optional<Output<Boolean>> skipDestroy() {
        return Optional.ofNullable(this.skipDestroy);
    }

    /**
     * Key-value map of resource tags. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
     * 
     */
    @Import(name="tags")
    private @Nullable Output<Map<String,String>> tags;

    /**
     * @return Key-value map of resource tags. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
     * 
     */
    public Optional<Output<Map<String,String>>> tags() {
        return Optional.ofNullable(this.tags);
    }

    /**
     * IAM role that allows your Amazon ECS container task to make calls to other AWS services.
     * Will be created automatically if not defined.
     * 
     */
    @Import(name="taskRole")
    private @Nullable DefaultRoleWithPolicyArgs taskRole;

    /**
     * @return IAM role that allows your Amazon ECS container task to make calls to other AWS services.
     * Will be created automatically if not defined.
     * 
     */
    public Optional<DefaultRoleWithPolicyArgs> taskRole() {
        return Optional.ofNullable(this.taskRole);
    }

    /**
     * Whether should track latest `ACTIVE` task definition on AWS or the one created with the resource stored in state. Default is `false`. Useful in the event the task definition is modified outside of this resource.
     * 
     */
    @Import(name="trackLatest")
    private @Nullable Output<Boolean> trackLatest;

    /**
     * @return Whether should track latest `ACTIVE` task definition on AWS or the one created with the resource stored in state. Default is `false`. Useful in the event the task definition is modified outside of this resource.
     * 
     */
    public Optional<Output<Boolean>> trackLatest() {
        return Optional.ofNullable(this.trackLatest);
    }

    /**
     * Configuration block for volumes that containers in your task may use. Detailed below.
     * 
     */
    @Import(name="volumes")
    private @Nullable Output<List<TaskDefinitionVolumeArgs>> volumes;

    /**
     * @return Configuration block for volumes that containers in your task may use. Detailed below.
     * 
     */
    public Optional<Output<List<TaskDefinitionVolumeArgs>>> volumes() {
        return Optional.ofNullable(this.volumes);
    }

    private EC2ServiceTaskDefinitionArgs() {}

    private EC2ServiceTaskDefinitionArgs(EC2ServiceTaskDefinitionArgs $) {
        this.container = $.container;
        this.containers = $.containers;
        this.cpu = $.cpu;
        this.enableFaultInjection = $.enableFaultInjection;
        this.ephemeralStorage = $.ephemeralStorage;
        this.executionRole = $.executionRole;
        this.family = $.family;
        this.inferenceAccelerators = $.inferenceAccelerators;
        this.ipcMode = $.ipcMode;
        this.logGroup = $.logGroup;
        this.memory = $.memory;
        this.networkMode = $.networkMode;
        this.pidMode = $.pidMode;
        this.placementConstraints = $.placementConstraints;
        this.proxyConfiguration = $.proxyConfiguration;
        this.runtimePlatform = $.runtimePlatform;
        this.skipDestroy = $.skipDestroy;
        this.tags = $.tags;
        this.taskRole = $.taskRole;
        this.trackLatest = $.trackLatest;
        this.volumes = $.volumes;
    }

    public static Builder builder() {
        return new Builder();
    }
    public static Builder builder(EC2ServiceTaskDefinitionArgs defaults) {
        return new Builder(defaults);
    }

    public static final class Builder {
        private EC2ServiceTaskDefinitionArgs $;

        public Builder() {
            $ = new EC2ServiceTaskDefinitionArgs();
        }

        public Builder(EC2ServiceTaskDefinitionArgs defaults) {
            $ = new EC2ServiceTaskDefinitionArgs(Objects.requireNonNull(defaults));
        }

        /**
         * @param container Single container to make a TaskDefinition from.  Useful for simple cases where there aren&#39;t
         * multiple containers, especially when creating a TaskDefinition to call [run] on.
         * 
         * Either [container] or [containers] must be provided.
         * 
         * @return builder
         * 
         */
        public Builder container(@Nullable TaskDefinitionContainerDefinitionArgs container) {
            $.container = container;
            return this;
        }

        /**
         * @param containers All the containers to make a TaskDefinition from.  Useful when creating a Service that will
         * contain many containers within.
         * 
         * Either [container] or [containers] must be provided.
         * 
         * @return builder
         * 
         */
        public Builder containers(@Nullable Map<String,TaskDefinitionContainerDefinitionArgs> containers) {
            $.containers = containers;
            return this;
        }

        /**
         * @param cpu The number of cpu units used by the task. If not provided, a default will be computed based on the cumulative needs specified by [containerDefinitions]
         * 
         * @return builder
         * 
         */
        public Builder cpu(@Nullable Output<String> cpu) {
            $.cpu = cpu;
            return this;
        }

        /**
         * @param cpu The number of cpu units used by the task. If not provided, a default will be computed based on the cumulative needs specified by [containerDefinitions]
         * 
         * @return builder
         * 
         */
        public Builder cpu(String cpu) {
            return cpu(Output.of(cpu));
        }

        /**
         * @param enableFaultInjection Enables fault injection and allows for fault injection requests to be accepted from the task&#39;s containers. Default is `false`.
         * 
         * **Note:** Fault injection only works with tasks using the `awsvpc` or `host` network modes. Fault injection isn&#39;t available on Windows.
         * 
         * @return builder
         * 
         */
        public Builder enableFaultInjection(@Nullable Output<Boolean> enableFaultInjection) {
            $.enableFaultInjection = enableFaultInjection;
            return this;
        }

        /**
         * @param enableFaultInjection Enables fault injection and allows for fault injection requests to be accepted from the task&#39;s containers. Default is `false`.
         * 
         * **Note:** Fault injection only works with tasks using the `awsvpc` or `host` network modes. Fault injection isn&#39;t available on Windows.
         * 
         * @return builder
         * 
         */
        public Builder enableFaultInjection(Boolean enableFaultInjection) {
            return enableFaultInjection(Output.of(enableFaultInjection));
        }

        /**
         * @param ephemeralStorage The amount of ephemeral storage to allocate for the task. This parameter is used to expand the total amount of ephemeral storage available, beyond the default amount, for tasks hosted on AWS Fargate. See Ephemeral Storage.
         * 
         * @return builder
         * 
         */
        public Builder ephemeralStorage(@Nullable Output<TaskDefinitionEphemeralStorageArgs> ephemeralStorage) {
            $.ephemeralStorage = ephemeralStorage;
            return this;
        }

        /**
         * @param ephemeralStorage The amount of ephemeral storage to allocate for the task. This parameter is used to expand the total amount of ephemeral storage available, beyond the default amount, for tasks hosted on AWS Fargate. See Ephemeral Storage.
         * 
         * @return builder
         * 
         */
        public Builder ephemeralStorage(TaskDefinitionEphemeralStorageArgs ephemeralStorage) {
            return ephemeralStorage(Output.of(ephemeralStorage));
        }

        /**
         * @param executionRole The execution role that the Amazon ECS container agent and the Docker daemon can assume.
         * Will be created automatically if not defined.
         * 
         * @return builder
         * 
         */
        public Builder executionRole(@Nullable DefaultRoleWithPolicyArgs executionRole) {
            $.executionRole = executionRole;
            return this;
        }

        /**
         * @param family An optional unique name for your task definition. If not specified, then a default will be created.
         * 
         * @return builder
         * 
         */
        public Builder family(@Nullable Output<String> family) {
            $.family = family;
            return this;
        }

        /**
         * @param family An optional unique name for your task definition. If not specified, then a default will be created.
         * 
         * @return builder
         * 
         */
        public Builder family(String family) {
            return family(Output.of(family));
        }

        /**
         * @param inferenceAccelerators Configuration block(s) with Inference Accelerators settings. Detailed below.
         * 
         * @return builder
         * 
         */
        public Builder inferenceAccelerators(@Nullable Output<List<TaskDefinitionInferenceAcceleratorArgs>> inferenceAccelerators) {
            $.inferenceAccelerators = inferenceAccelerators;
            return this;
        }

        /**
         * @param inferenceAccelerators Configuration block(s) with Inference Accelerators settings. Detailed below.
         * 
         * @return builder
         * 
         */
        public Builder inferenceAccelerators(List<TaskDefinitionInferenceAcceleratorArgs> inferenceAccelerators) {
            return inferenceAccelerators(Output.of(inferenceAccelerators));
        }

        /**
         * @param inferenceAccelerators Configuration block(s) with Inference Accelerators settings. Detailed below.
         * 
         * @return builder
         * 
         */
        public Builder inferenceAccelerators(TaskDefinitionInferenceAcceleratorArgs... inferenceAccelerators) {
            return inferenceAccelerators(List.of(inferenceAccelerators));
        }

        /**
         * @param ipcMode IPC resource namespace to be used for the containers in the task The valid values are `host`, `task`, and `none`.
         * 
         * @return builder
         * 
         */
        public Builder ipcMode(@Nullable Output<String> ipcMode) {
            $.ipcMode = ipcMode;
            return this;
        }

        /**
         * @param ipcMode IPC resource namespace to be used for the containers in the task The valid values are `host`, `task`, and `none`.
         * 
         * @return builder
         * 
         */
        public Builder ipcMode(String ipcMode) {
            return ipcMode(Output.of(ipcMode));
        }

        /**
         * @param logGroup A set of volume blocks that containers in your task may use.
         * 
         * @return builder
         * 
         */
        public Builder logGroup(@Nullable DefaultLogGroupArgs logGroup) {
            $.logGroup = logGroup;
            return this;
        }

        /**
         * @param memory The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
         * based on the cumulative needs specified by [containerDefinitions]
         * 
         * @return builder
         * 
         */
        public Builder memory(@Nullable Output<String> memory) {
            $.memory = memory;
            return this;
        }

        /**
         * @param memory The amount (in MiB) of memory used by the task.  If not provided, a default will be computed
         * based on the cumulative needs specified by [containerDefinitions]
         * 
         * @return builder
         * 
         */
        public Builder memory(String memory) {
            return memory(Output.of(memory));
        }

        /**
         * @param networkMode Docker networking mode to use for the containers in the task. Valid values are `none`, `bridge`, `awsvpc`, and `host`.
         * 
         * @return builder
         * 
         */
        public Builder networkMode(@Nullable Output<String> networkMode) {
            $.networkMode = networkMode;
            return this;
        }

        /**
         * @param networkMode Docker networking mode to use for the containers in the task. Valid values are `none`, `bridge`, `awsvpc`, and `host`.
         * 
         * @return builder
         * 
         */
        public Builder networkMode(String networkMode) {
            return networkMode(Output.of(networkMode));
        }

        /**
         * @param pidMode Process namespace to use for the containers in the task. The valid values are `host` and `task`.
         * 
         * @return builder
         * 
         */
        public Builder pidMode(@Nullable Output<String> pidMode) {
            $.pidMode = pidMode;
            return this;
        }

        /**
         * @param pidMode Process namespace to use for the containers in the task. The valid values are `host` and `task`.
         * 
         * @return builder
         * 
         */
        public Builder pidMode(String pidMode) {
            return pidMode(Output.of(pidMode));
        }

        /**
         * @param placementConstraints Configuration block for rules that are taken into consideration during task placement. Maximum number of `placement_constraints` is `10`. Detailed below.
         * 
         * @return builder
         * 
         */
        public Builder placementConstraints(@Nullable Output<List<TaskDefinitionPlacementConstraintArgs>> placementConstraints) {
            $.placementConstraints = placementConstraints;
            return this;
        }

        /**
         * @param placementConstraints Configuration block for rules that are taken into consideration during task placement. Maximum number of `placement_constraints` is `10`. Detailed below.
         * 
         * @return builder
         * 
         */
        public Builder placementConstraints(List<TaskDefinitionPlacementConstraintArgs> placementConstraints) {
            return placementConstraints(Output.of(placementConstraints));
        }

        /**
         * @param placementConstraints Configuration block for rules that are taken into consideration during task placement. Maximum number of `placement_constraints` is `10`. Detailed below.
         * 
         * @return builder
         * 
         */
        public Builder placementConstraints(TaskDefinitionPlacementConstraintArgs... placementConstraints) {
            return placementConstraints(List.of(placementConstraints));
        }

        /**
         * @param proxyConfiguration Configuration block for the App Mesh proxy. Detailed below.
         * 
         * @return builder
         * 
         */
        public Builder proxyConfiguration(@Nullable Output<TaskDefinitionProxyConfigurationArgs> proxyConfiguration) {
            $.proxyConfiguration = proxyConfiguration;
            return this;
        }

        /**
         * @param proxyConfiguration Configuration block for the App Mesh proxy. Detailed below.
         * 
         * @return builder
         * 
         */
        public Builder proxyConfiguration(TaskDefinitionProxyConfigurationArgs proxyConfiguration) {
            return proxyConfiguration(Output.of(proxyConfiguration));
        }

        /**
         * @param runtimePlatform Configuration block for runtime_platform that containers in your task may use.
         * 
         * @return builder
         * 
         */
        public Builder runtimePlatform(@Nullable Output<TaskDefinitionRuntimePlatformArgs> runtimePlatform) {
            $.runtimePlatform = runtimePlatform;
            return this;
        }

        /**
         * @param runtimePlatform Configuration block for runtime_platform that containers in your task may use.
         * 
         * @return builder
         * 
         */
        public Builder runtimePlatform(TaskDefinitionRuntimePlatformArgs runtimePlatform) {
            return runtimePlatform(Output.of(runtimePlatform));
        }

        /**
         * @param skipDestroy Whether to retain the old revision when the resource is destroyed or replacement is necessary. Default is `false`.
         * 
         * @return builder
         * 
         */
        public Builder skipDestroy(@Nullable Output<Boolean> skipDestroy) {
            $.skipDestroy = skipDestroy;
            return this;
        }

        /**
         * @param skipDestroy Whether to retain the old revision when the resource is destroyed or replacement is necessary. Default is `false`.
         * 
         * @return builder
         * 
         */
        public Builder skipDestroy(Boolean skipDestroy) {
            return skipDestroy(Output.of(skipDestroy));
        }

        /**
         * @param tags Key-value map of resource tags. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
         * 
         * @return builder
         * 
         */
        public Builder tags(@Nullable Output<Map<String,String>> tags) {
            $.tags = tags;
            return this;
        }

        /**
         * @param tags Key-value map of resource tags. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
         * 
         * @return builder
         * 
         */
        public Builder tags(Map<String,String> tags) {
            return tags(Output.of(tags));
        }

        /**
         * @param taskRole IAM role that allows your Amazon ECS container task to make calls to other AWS services.
         * Will be created automatically if not defined.
         * 
         * @return builder
         * 
         */
        public Builder taskRole(@Nullable DefaultRoleWithPolicyArgs taskRole) {
            $.taskRole = taskRole;
            return this;
        }

        /**
         * @param trackLatest Whether should track latest `ACTIVE` task definition on AWS or the one created with the resource stored in state. Default is `false`. Useful in the event the task definition is modified outside of this resource.
         * 
         * @return builder
         * 
         */
        public Builder trackLatest(@Nullable Output<Boolean> trackLatest) {
            $.trackLatest = trackLatest;
            return this;
        }

        /**
         * @param trackLatest Whether should track latest `ACTIVE` task definition on AWS or the one created with the resource stored in state. Default is `false`. Useful in the event the task definition is modified outside of this resource.
         * 
         * @return builder
         * 
         */
        public Builder trackLatest(Boolean trackLatest) {
            return trackLatest(Output.of(trackLatest));
        }

        /**
         * @param volumes Configuration block for volumes that containers in your task may use. Detailed below.
         * 
         * @return builder
         * 
         */
        public Builder volumes(@Nullable Output<List<TaskDefinitionVolumeArgs>> volumes) {
            $.volumes = volumes;
            return this;
        }

        /**
         * @param volumes Configuration block for volumes that containers in your task may use. Detailed below.
         * 
         * @return builder
         * 
         */
        public Builder volumes(List<TaskDefinitionVolumeArgs> volumes) {
            return volumes(Output.of(volumes));
        }

        /**
         * @param volumes Configuration block for volumes that containers in your task may use. Detailed below.
         * 
         * @return builder
         * 
         */
        public Builder volumes(TaskDefinitionVolumeArgs... volumes) {
            return volumes(List.of(volumes));
        }

        public EC2ServiceTaskDefinitionArgs build() {
            return $;
        }
    }

}
