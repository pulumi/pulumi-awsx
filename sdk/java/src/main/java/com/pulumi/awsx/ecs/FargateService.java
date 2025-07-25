// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.awsx.ecs;

import com.pulumi.aws.ecs.Service;
import com.pulumi.aws.ecs.TaskDefinition;
import com.pulumi.awsx.Utilities;
import com.pulumi.awsx.ecs.FargateServiceArgs;
import com.pulumi.core.Output;
import com.pulumi.core.annotations.Export;
import com.pulumi.core.annotations.ResourceType;
import com.pulumi.core.internal.Codegen;
import java.util.Optional;
import javax.annotation.Nullable;

/**
 * Create an ECS Service resource for Fargate with the given unique name, arguments, and options.
 * Creates Task definition if `taskDefinitionArgs` is specified.
 * 
 */
@ResourceType(type="awsx:ecs:FargateService")
public class FargateService extends com.pulumi.resources.ComponentResource {
    /**
     * Underlying ECS Service resource
     * 
     */
    @Export(name="service", refs={Service.class}, tree="[0]")
    private Output<Service> service;

    /**
     * @return Underlying ECS Service resource
     * 
     */
    public Output<Service> service() {
        return this.service;
    }
    /**
     * Underlying Fargate component resource if created from args
     * 
     */
    @Export(name="taskDefinition", refs={TaskDefinition.class}, tree="[0]")
    private Output</* @Nullable */ TaskDefinition> taskDefinition;

    /**
     * @return Underlying Fargate component resource if created from args
     * 
     */
    public Output<Optional<TaskDefinition>> taskDefinition() {
        return Codegen.optional(this.taskDefinition);
    }

    /**
     *
     * @param name The _unique_ name of the resulting resource.
     */
    public FargateService(java.lang.String name) {
        this(name, FargateServiceArgs.Empty);
    }
    /**
     *
     * @param name The _unique_ name of the resulting resource.
     * @param args The arguments to use to populate this resource's properties.
     */
    public FargateService(java.lang.String name, @Nullable FargateServiceArgs args) {
        this(name, args, null);
    }
    /**
     *
     * @param name The _unique_ name of the resulting resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param options A bag of options that control this resource's behavior.
     */
    public FargateService(java.lang.String name, @Nullable FargateServiceArgs args, @Nullable com.pulumi.resources.ComponentResourceOptions options) {
        super("awsx:ecs:FargateService", name, makeArgs(args, options), makeResourceOptions(options, Codegen.empty()), true);
    }

    private static FargateServiceArgs makeArgs(@Nullable FargateServiceArgs args, @Nullable com.pulumi.resources.ComponentResourceOptions options) {
        if (options != null && options.getUrn().isPresent()) {
            return null;
        }
        return args == null ? FargateServiceArgs.Empty : args;
    }

    private static com.pulumi.resources.ComponentResourceOptions makeResourceOptions(@Nullable com.pulumi.resources.ComponentResourceOptions options, @Nullable Output<java.lang.String> id) {
        var defaultOptions = com.pulumi.resources.ComponentResourceOptions.builder()
            .version(Utilities.getVersion())
            .build();
        return com.pulumi.resources.ComponentResourceOptions.merge(defaultOptions, options, id);
    }

}
