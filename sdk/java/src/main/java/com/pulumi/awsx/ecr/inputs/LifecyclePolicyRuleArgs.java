// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.awsx.ecr.inputs;

import com.pulumi.awsx.ecr.enums.LifecycleTagStatus;
import com.pulumi.core.Output;
import com.pulumi.core.annotations.Import;
import com.pulumi.exceptions.MissingRequiredPropertyException;
import java.lang.Double;
import java.lang.String;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import javax.annotation.Nullable;


/**
 * A lifecycle policy rule that determine which images in a repository should be expired.
 * 
 */
public final class LifecyclePolicyRuleArgs extends com.pulumi.resources.ResourceArgs {

    public static final LifecyclePolicyRuleArgs Empty = new LifecyclePolicyRuleArgs();

    /**
     * Describes the purpose of a rule within a lifecycle policy.
     * 
     */
    @Import(name="description")
    private @Nullable Output<String> description;

    /**
     * @return Describes the purpose of a rule within a lifecycle policy.
     * 
     */
    public Optional<Output<String>> description() {
        return Optional.ofNullable(this.description);
    }

    /**
     * The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
     * 
     */
    @Import(name="maximumAgeLimit")
    private @Nullable Output<Double> maximumAgeLimit;

    /**
     * @return The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
     * 
     */
    public Optional<Output<Double>> maximumAgeLimit() {
        return Optional.ofNullable(this.maximumAgeLimit);
    }

    /**
     * The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
     * 
     */
    @Import(name="maximumNumberOfImages")
    private @Nullable Output<Double> maximumNumberOfImages;

    /**
     * @return The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
     * 
     */
    public Optional<Output<Double>> maximumNumberOfImages() {
        return Optional.ofNullable(this.maximumNumberOfImages);
    }

    /**
     * A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified &#34;tagStatus&#34;: &#34;tagged&#34;. For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
     * 
     */
    @Import(name="tagPrefixList")
    private @Nullable Output<List<String>> tagPrefixList;

    /**
     * @return A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified &#34;tagStatus&#34;: &#34;tagged&#34;. For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
     * 
     */
    public Optional<Output<List<String>>> tagPrefixList() {
        return Optional.ofNullable(this.tagPrefixList);
    }

    /**
     * Determines whether the lifecycle policy rule that you are adding specifies a tag for an image. Acceptable options are tagged, untagged, or any. If you specify any, then all images have the rule evaluated against them. If you specify tagged, then you must also specify a tagPrefixList value. If you specify untagged, then you must omit tagPrefixList.
     * 
     */
    @Import(name="tagStatus", required=true)
    private Output<LifecycleTagStatus> tagStatus;

    /**
     * @return Determines whether the lifecycle policy rule that you are adding specifies a tag for an image. Acceptable options are tagged, untagged, or any. If you specify any, then all images have the rule evaluated against them. If you specify tagged, then you must also specify a tagPrefixList value. If you specify untagged, then you must omit tagPrefixList.
     * 
     */
    public Output<LifecycleTagStatus> tagStatus() {
        return this.tagStatus;
    }

    private LifecyclePolicyRuleArgs() {}

    private LifecyclePolicyRuleArgs(LifecyclePolicyRuleArgs $) {
        this.description = $.description;
        this.maximumAgeLimit = $.maximumAgeLimit;
        this.maximumNumberOfImages = $.maximumNumberOfImages;
        this.tagPrefixList = $.tagPrefixList;
        this.tagStatus = $.tagStatus;
    }

    public static Builder builder() {
        return new Builder();
    }
    public static Builder builder(LifecyclePolicyRuleArgs defaults) {
        return new Builder(defaults);
    }

    public static final class Builder {
        private LifecyclePolicyRuleArgs $;

        public Builder() {
            $ = new LifecyclePolicyRuleArgs();
        }

        public Builder(LifecyclePolicyRuleArgs defaults) {
            $ = new LifecyclePolicyRuleArgs(Objects.requireNonNull(defaults));
        }

        /**
         * @param description Describes the purpose of a rule within a lifecycle policy.
         * 
         * @return builder
         * 
         */
        public Builder description(@Nullable Output<String> description) {
            $.description = description;
            return this;
        }

        /**
         * @param description Describes the purpose of a rule within a lifecycle policy.
         * 
         * @return builder
         * 
         */
        public Builder description(String description) {
            return description(Output.of(description));
        }

        /**
         * @param maximumAgeLimit The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
         * 
         * @return builder
         * 
         */
        public Builder maximumAgeLimit(@Nullable Output<Double> maximumAgeLimit) {
            $.maximumAgeLimit = maximumAgeLimit;
            return this;
        }

        /**
         * @param maximumAgeLimit The maximum age limit (in days) for your images. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
         * 
         * @return builder
         * 
         */
        public Builder maximumAgeLimit(Double maximumAgeLimit) {
            return maximumAgeLimit(Output.of(maximumAgeLimit));
        }

        /**
         * @param maximumNumberOfImages The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
         * 
         * @return builder
         * 
         */
        public Builder maximumNumberOfImages(@Nullable Output<Double> maximumNumberOfImages) {
            $.maximumNumberOfImages = maximumNumberOfImages;
            return this;
        }

        /**
         * @param maximumNumberOfImages The maximum number of images that you want to retain in your repository. Either [maximumNumberOfImages] or [maximumAgeLimit] must be provided.
         * 
         * @return builder
         * 
         */
        public Builder maximumNumberOfImages(Double maximumNumberOfImages) {
            return maximumNumberOfImages(Output.of(maximumNumberOfImages));
        }

        /**
         * @param tagPrefixList A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified &#34;tagStatus&#34;: &#34;tagged&#34;. For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
         * 
         * @return builder
         * 
         */
        public Builder tagPrefixList(@Nullable Output<List<String>> tagPrefixList) {
            $.tagPrefixList = tagPrefixList;
            return this;
        }

        /**
         * @param tagPrefixList A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified &#34;tagStatus&#34;: &#34;tagged&#34;. For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
         * 
         * @return builder
         * 
         */
        public Builder tagPrefixList(List<String> tagPrefixList) {
            return tagPrefixList(Output.of(tagPrefixList));
        }

        /**
         * @param tagPrefixList A list of image tag prefixes on which to take action with your lifecycle policy. Only used if you specified &#34;tagStatus&#34;: &#34;tagged&#34;. For example, if your images are tagged as prod, prod1, prod2, and so on, you would use the tag prefix prod to specify all of them. If you specify multiple tags, only the images with all specified tags are selected.
         * 
         * @return builder
         * 
         */
        public Builder tagPrefixList(String... tagPrefixList) {
            return tagPrefixList(List.of(tagPrefixList));
        }

        /**
         * @param tagStatus Determines whether the lifecycle policy rule that you are adding specifies a tag for an image. Acceptable options are tagged, untagged, or any. If you specify any, then all images have the rule evaluated against them. If you specify tagged, then you must also specify a tagPrefixList value. If you specify untagged, then you must omit tagPrefixList.
         * 
         * @return builder
         * 
         */
        public Builder tagStatus(Output<LifecycleTagStatus> tagStatus) {
            $.tagStatus = tagStatus;
            return this;
        }

        /**
         * @param tagStatus Determines whether the lifecycle policy rule that you are adding specifies a tag for an image. Acceptable options are tagged, untagged, or any. If you specify any, then all images have the rule evaluated against them. If you specify tagged, then you must also specify a tagPrefixList value. If you specify untagged, then you must omit tagPrefixList.
         * 
         * @return builder
         * 
         */
        public Builder tagStatus(LifecycleTagStatus tagStatus) {
            return tagStatus(Output.of(tagStatus));
        }

        public LifecyclePolicyRuleArgs build() {
            if ($.tagStatus == null) {
                throw new MissingRequiredPropertyException("LifecyclePolicyRuleArgs", "tagStatus");
            }
            return $;
        }
    }

}
