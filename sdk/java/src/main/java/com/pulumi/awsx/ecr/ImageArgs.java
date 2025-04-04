// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.awsx.ecr;

import com.pulumi.awsx.ecr.enums.BuilderVersion;
import com.pulumi.core.Output;
import com.pulumi.core.annotations.Import;
import java.lang.String;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import javax.annotation.Nullable;


public final class ImageArgs extends com.pulumi.resources.ResourceArgs {

    public static final ImageArgs Empty = new ImageArgs();

    /**
     * An optional map of named build-time argument variables to set during the Docker build.  This flag allows you to pass built-time variables that can be accessed like environment variables inside the `RUN` instruction.
     * 
     */
    @Import(name="args")
    private @Nullable Output<Map<String,String>> args;

    /**
     * @return An optional map of named build-time argument variables to set during the Docker build.  This flag allows you to pass built-time variables that can be accessed like environment variables inside the `RUN` instruction.
     * 
     */
    public Optional<Output<Map<String,String>>> args() {
        return Optional.ofNullable(this.args);
    }

    /**
     * The version of the Docker builder.
     * 
     */
    @Import(name="builderVersion")
    private @Nullable BuilderVersion builderVersion;

    /**
     * @return The version of the Docker builder.
     * 
     */
    public Optional<BuilderVersion> builderVersion() {
        return Optional.ofNullable(this.builderVersion);
    }

    /**
     * Images to consider as cache sources
     * 
     */
    @Import(name="cacheFrom")
    private @Nullable Output<List<String>> cacheFrom;

    /**
     * @return Images to consider as cache sources
     * 
     */
    public Optional<Output<List<String>>> cacheFrom() {
        return Optional.ofNullable(this.cacheFrom);
    }

    /**
     * ECR registries where to store docker build cache
     * 
     */
    @Import(name="cacheTo")
    private @Nullable Output<List<String>> cacheTo;

    /**
     * @return ECR registries where to store docker build cache
     * 
     */
    public Optional<Output<List<String>>> cacheTo() {
        return Optional.ofNullable(this.cacheTo);
    }

    /**
     * Path to a directory to use for the Docker build context, usually the directory in which the Dockerfile resides (although dockerfile may be used to choose a custom location independent of this choice). If not specified, the context defaults to the current working directory; if a relative path is used, it is relative to the current working directory that Pulumi is evaluating.
     * 
     */
    @Import(name="context")
    private @Nullable Output<String> context;

    /**
     * @return Path to a directory to use for the Docker build context, usually the directory in which the Dockerfile resides (although dockerfile may be used to choose a custom location independent of this choice). If not specified, the context defaults to the current working directory; if a relative path is used, it is relative to the current working directory that Pulumi is evaluating.
     * 
     */
    public Optional<Output<String>> context() {
        return Optional.ofNullable(this.context);
    }

    /**
     * dockerfile may be used to override the default Dockerfile name and/or location.  By default, it is assumed to be a file named Dockerfile in the root of the build context.
     * 
     */
    @Import(name="dockerfile")
    private @Nullable Output<String> dockerfile;

    /**
     * @return dockerfile may be used to override the default Dockerfile name and/or location.  By default, it is assumed to be a file named Dockerfile in the root of the build context.
     * 
     */
    public Optional<Output<String>> dockerfile() {
        return Optional.ofNullable(this.dockerfile);
    }

    /**
     * Custom name for the underlying Docker image resource. If omitted, the image tag assigned by the provider will be used
     * 
     */
    @Import(name="imageName")
    private @Nullable Output<String> imageName;

    /**
     * @return Custom name for the underlying Docker image resource. If omitted, the image tag assigned by the provider will be used
     * 
     */
    public Optional<Output<String>> imageName() {
        return Optional.ofNullable(this.imageName);
    }

    /**
     * Custom image tag for the resulting docker image. If omitted a random string will be used
     * 
     */
    @Import(name="imageTag")
    private @Nullable Output<String> imageTag;

    /**
     * @return Custom image tag for the resulting docker image. If omitted a random string will be used
     * 
     */
    public Optional<Output<String>> imageTag() {
        return Optional.ofNullable(this.imageTag);
    }

    /**
     * The architecture of the platform you want to build this image for, e.g. `linux/arm64`.
     * 
     */
    @Import(name="platform")
    private @Nullable Output<String> platform;

    /**
     * @return The architecture of the platform you want to build this image for, e.g. `linux/arm64`.
     * 
     */
    public Optional<Output<String>> platform() {
        return Optional.ofNullable(this.platform);
    }

    /**
     * ID of the ECR registry in which to store the image.  If not provided, this will be inferred from the repository URL)
     * 
     */
    @Import(name="registryId")
    private @Nullable Output<String> registryId;

    /**
     * @return ID of the ECR registry in which to store the image.  If not provided, this will be inferred from the repository URL)
     * 
     */
    public Optional<Output<String>> registryId() {
        return Optional.ofNullable(this.registryId);
    }

    /**
     * Url of the repository
     * 
     */
    @Import(name="repositoryUrl", required=true)
    private Output<String> repositoryUrl;

    /**
     * @return Url of the repository
     * 
     */
    public Output<String> repositoryUrl() {
        return this.repositoryUrl;
    }

    /**
     * The target of the dockerfile to build
     * 
     */
    @Import(name="target")
    private @Nullable Output<String> target;

    /**
     * @return The target of the dockerfile to build
     * 
     */
    public Optional<Output<String>> target() {
        return Optional.ofNullable(this.target);
    }

    private ImageArgs() {}

    private ImageArgs(ImageArgs $) {
        this.args = $.args;
        this.builderVersion = $.builderVersion;
        this.cacheFrom = $.cacheFrom;
        this.cacheTo = $.cacheTo;
        this.context = $.context;
        this.dockerfile = $.dockerfile;
        this.imageName = $.imageName;
        this.imageTag = $.imageTag;
        this.platform = $.platform;
        this.registryId = $.registryId;
        this.repositoryUrl = $.repositoryUrl;
        this.target = $.target;
    }

    public static Builder builder() {
        return new Builder();
    }
    public static Builder builder(ImageArgs defaults) {
        return new Builder(defaults);
    }

    public static final class Builder {
        private ImageArgs $;

        public Builder() {
            $ = new ImageArgs();
        }

        public Builder(ImageArgs defaults) {
            $ = new ImageArgs(Objects.requireNonNull(defaults));
        }

        /**
         * @param args An optional map of named build-time argument variables to set during the Docker build.  This flag allows you to pass built-time variables that can be accessed like environment variables inside the `RUN` instruction.
         * 
         * @return builder
         * 
         */
        public Builder args(@Nullable Output<Map<String,String>> args) {
            $.args = args;
            return this;
        }

        /**
         * @param args An optional map of named build-time argument variables to set during the Docker build.  This flag allows you to pass built-time variables that can be accessed like environment variables inside the `RUN` instruction.
         * 
         * @return builder
         * 
         */
        public Builder args(Map<String,String> args) {
            return args(Output.of(args));
        }

        /**
         * @param builderVersion The version of the Docker builder.
         * 
         * @return builder
         * 
         */
        public Builder builderVersion(@Nullable BuilderVersion builderVersion) {
            $.builderVersion = builderVersion;
            return this;
        }

        /**
         * @param cacheFrom Images to consider as cache sources
         * 
         * @return builder
         * 
         */
        public Builder cacheFrom(@Nullable Output<List<String>> cacheFrom) {
            $.cacheFrom = cacheFrom;
            return this;
        }

        /**
         * @param cacheFrom Images to consider as cache sources
         * 
         * @return builder
         * 
         */
        public Builder cacheFrom(List<String> cacheFrom) {
            return cacheFrom(Output.of(cacheFrom));
        }

        /**
         * @param cacheFrom Images to consider as cache sources
         * 
         * @return builder
         * 
         */
        public Builder cacheFrom(String... cacheFrom) {
            return cacheFrom(List.of(cacheFrom));
        }

        /**
         * @param cacheTo ECR registries where to store docker build cache
         * 
         * @return builder
         * 
         */
        public Builder cacheTo(@Nullable Output<List<String>> cacheTo) {
            $.cacheTo = cacheTo;
            return this;
        }

        /**
         * @param cacheTo ECR registries where to store docker build cache
         * 
         * @return builder
         * 
         */
        public Builder cacheTo(List<String> cacheTo) {
            return cacheTo(Output.of(cacheTo));
        }

        /**
         * @param cacheTo ECR registries where to store docker build cache
         * 
         * @return builder
         * 
         */
        public Builder cacheTo(String... cacheTo) {
            return cacheTo(List.of(cacheTo));
        }

        /**
         * @param context Path to a directory to use for the Docker build context, usually the directory in which the Dockerfile resides (although dockerfile may be used to choose a custom location independent of this choice). If not specified, the context defaults to the current working directory; if a relative path is used, it is relative to the current working directory that Pulumi is evaluating.
         * 
         * @return builder
         * 
         */
        public Builder context(@Nullable Output<String> context) {
            $.context = context;
            return this;
        }

        /**
         * @param context Path to a directory to use for the Docker build context, usually the directory in which the Dockerfile resides (although dockerfile may be used to choose a custom location independent of this choice). If not specified, the context defaults to the current working directory; if a relative path is used, it is relative to the current working directory that Pulumi is evaluating.
         * 
         * @return builder
         * 
         */
        public Builder context(String context) {
            return context(Output.of(context));
        }

        /**
         * @param dockerfile dockerfile may be used to override the default Dockerfile name and/or location.  By default, it is assumed to be a file named Dockerfile in the root of the build context.
         * 
         * @return builder
         * 
         */
        public Builder dockerfile(@Nullable Output<String> dockerfile) {
            $.dockerfile = dockerfile;
            return this;
        }

        /**
         * @param dockerfile dockerfile may be used to override the default Dockerfile name and/or location.  By default, it is assumed to be a file named Dockerfile in the root of the build context.
         * 
         * @return builder
         * 
         */
        public Builder dockerfile(String dockerfile) {
            return dockerfile(Output.of(dockerfile));
        }

        /**
         * @param imageName Custom name for the underlying Docker image resource. If omitted, the image tag assigned by the provider will be used
         * 
         * @return builder
         * 
         */
        public Builder imageName(@Nullable Output<String> imageName) {
            $.imageName = imageName;
            return this;
        }

        /**
         * @param imageName Custom name for the underlying Docker image resource. If omitted, the image tag assigned by the provider will be used
         * 
         * @return builder
         * 
         */
        public Builder imageName(String imageName) {
            return imageName(Output.of(imageName));
        }

        /**
         * @param imageTag Custom image tag for the resulting docker image. If omitted a random string will be used
         * 
         * @return builder
         * 
         */
        public Builder imageTag(@Nullable Output<String> imageTag) {
            $.imageTag = imageTag;
            return this;
        }

        /**
         * @param imageTag Custom image tag for the resulting docker image. If omitted a random string will be used
         * 
         * @return builder
         * 
         */
        public Builder imageTag(String imageTag) {
            return imageTag(Output.of(imageTag));
        }

        /**
         * @param platform The architecture of the platform you want to build this image for, e.g. `linux/arm64`.
         * 
         * @return builder
         * 
         */
        public Builder platform(@Nullable Output<String> platform) {
            $.platform = platform;
            return this;
        }

        /**
         * @param platform The architecture of the platform you want to build this image for, e.g. `linux/arm64`.
         * 
         * @return builder
         * 
         */
        public Builder platform(String platform) {
            return platform(Output.of(platform));
        }

        /**
         * @param registryId ID of the ECR registry in which to store the image.  If not provided, this will be inferred from the repository URL)
         * 
         * @return builder
         * 
         */
        public Builder registryId(@Nullable Output<String> registryId) {
            $.registryId = registryId;
            return this;
        }

        /**
         * @param registryId ID of the ECR registry in which to store the image.  If not provided, this will be inferred from the repository URL)
         * 
         * @return builder
         * 
         */
        public Builder registryId(String registryId) {
            return registryId(Output.of(registryId));
        }

        /**
         * @param repositoryUrl Url of the repository
         * 
         * @return builder
         * 
         */
        public Builder repositoryUrl(Output<String> repositoryUrl) {
            $.repositoryUrl = repositoryUrl;
            return this;
        }

        /**
         * @param repositoryUrl Url of the repository
         * 
         * @return builder
         * 
         */
        public Builder repositoryUrl(String repositoryUrl) {
            return repositoryUrl(Output.of(repositoryUrl));
        }

        /**
         * @param target The target of the dockerfile to build
         * 
         * @return builder
         * 
         */
        public Builder target(@Nullable Output<String> target) {
            $.target = target;
            return this;
        }

        /**
         * @param target The target of the dockerfile to build
         * 
         * @return builder
         * 
         */
        public Builder target(String target) {
            return target(Output.of(target));
        }

        public ImageArgs build() {
            $.repositoryUrl = Objects.requireNonNull($.repositoryUrl, "expected parameter 'repositoryUrl' to be non-null");
            return $;
        }
    }

}
