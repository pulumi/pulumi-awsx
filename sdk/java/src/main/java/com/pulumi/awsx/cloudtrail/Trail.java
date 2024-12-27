// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.awsx.cloudtrail;

import com.pulumi.aws.cloudwatch.LogGroup;
import com.pulumi.aws.s3.Bucket;
import com.pulumi.awsx.Utilities;
import com.pulumi.awsx.cloudtrail.TrailArgs;
import com.pulumi.core.Output;
import com.pulumi.core.annotations.Export;
import com.pulumi.core.annotations.ResourceType;
import com.pulumi.core.internal.Codegen;
import java.util.Optional;
import javax.annotation.Nullable;

@ResourceType(type="awsx:cloudtrail:Trail")
public class Trail extends com.pulumi.resources.ComponentResource {
    /**
     * The managed S3 Bucket where the Trail will place its logs.
     * 
     */
    @Export(name="bucket", refs={Bucket.class}, tree="[0]")
    private Output</* @Nullable */ Bucket> bucket;

    /**
     * @return The managed S3 Bucket where the Trail will place its logs.
     * 
     */
    public Output<Optional<Bucket>> bucket() {
        return Codegen.optional(this.bucket);
    }
    /**
     * The managed Cloudwatch Log Group.
     * 
     */
    @Export(name="logGroup", refs={LogGroup.class}, tree="[0]")
    private Output</* @Nullable */ LogGroup> logGroup;

    /**
     * @return The managed Cloudwatch Log Group.
     * 
     */
    public Output<Optional<LogGroup>> logGroup() {
        return Codegen.optional(this.logGroup);
    }
    /**
     * The CloudTrail Trail.
     * 
     */
    @Export(name="trail", refs={com.pulumi.aws.cloudtrail.Trail.class}, tree="[0]")
    private Output<com.pulumi.aws.cloudtrail.Trail> trail;

    /**
     * @return The CloudTrail Trail.
     * 
     */
    public Output<com.pulumi.aws.cloudtrail.Trail> trail() {
        return this.trail;
    }

    /**
     *
     * @param name The _unique_ name of the resulting resource.
     */
    public Trail(String name) {
        this(name, TrailArgs.Empty);
    }
    /**
     *
     * @param name The _unique_ name of the resulting resource.
     * @param args The arguments to use to populate this resource's properties.
     */
    public Trail(String name, @Nullable TrailArgs args) {
        this(name, args, null);
    }
    /**
     *
     * @param name The _unique_ name of the resulting resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param options A bag of options that control this resource's behavior.
     */
    public Trail(String name, @Nullable TrailArgs args, @Nullable com.pulumi.resources.ComponentResourceOptions options) {
        super("awsx:cloudtrail:Trail", name, args == null ? TrailArgs.Empty : args, makeResourceOptions(options, Codegen.empty()), true);
    }

    private static com.pulumi.resources.ComponentResourceOptions makeResourceOptions(@Nullable com.pulumi.resources.ComponentResourceOptions options, @Nullable Output<String> id) {
        var defaultOptions = com.pulumi.resources.ComponentResourceOptions.builder()
            .version(Utilities.getVersion())
            .build();
        return com.pulumi.resources.ComponentResourceOptions.merge(defaultOptions, options, id);
    }

}