// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.awsx.ecs.inputs;

import com.pulumi.core.Output;
import com.pulumi.core.annotations.Import;
import com.pulumi.exceptions.MissingRequiredPropertyException;
import java.lang.Integer;
import java.lang.String;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import javax.annotation.Nullable;


public final class TaskDefinitionTmpfsArgs extends com.pulumi.resources.ResourceArgs {

    public static final TaskDefinitionTmpfsArgs Empty = new TaskDefinitionTmpfsArgs();

    @Import(name="containerPath")
    private @Nullable Output<String> containerPath;

    public Optional<Output<String>> containerPath() {
        return Optional.ofNullable(this.containerPath);
    }

    @Import(name="mountOptions")
    private @Nullable Output<List<String>> mountOptions;

    public Optional<Output<List<String>>> mountOptions() {
        return Optional.ofNullable(this.mountOptions);
    }

    @Import(name="size", required=true)
    private Output<Integer> size;

    public Output<Integer> size() {
        return this.size;
    }

    private TaskDefinitionTmpfsArgs() {}

    private TaskDefinitionTmpfsArgs(TaskDefinitionTmpfsArgs $) {
        this.containerPath = $.containerPath;
        this.mountOptions = $.mountOptions;
        this.size = $.size;
    }

    public static Builder builder() {
        return new Builder();
    }
    public static Builder builder(TaskDefinitionTmpfsArgs defaults) {
        return new Builder(defaults);
    }

    public static final class Builder {
        private TaskDefinitionTmpfsArgs $;

        public Builder() {
            $ = new TaskDefinitionTmpfsArgs();
        }

        public Builder(TaskDefinitionTmpfsArgs defaults) {
            $ = new TaskDefinitionTmpfsArgs(Objects.requireNonNull(defaults));
        }

        public Builder containerPath(@Nullable Output<String> containerPath) {
            $.containerPath = containerPath;
            return this;
        }

        public Builder containerPath(String containerPath) {
            return containerPath(Output.of(containerPath));
        }

        public Builder mountOptions(@Nullable Output<List<String>> mountOptions) {
            $.mountOptions = mountOptions;
            return this;
        }

        public Builder mountOptions(List<String> mountOptions) {
            return mountOptions(Output.of(mountOptions));
        }

        public Builder mountOptions(String... mountOptions) {
            return mountOptions(List.of(mountOptions));
        }

        public Builder size(Output<Integer> size) {
            $.size = size;
            return this;
        }

        public Builder size(Integer size) {
            return size(Output.of(size));
        }

        public TaskDefinitionTmpfsArgs build() {
            if ($.size == null) {
                throw new MissingRequiredPropertyException("TaskDefinitionTmpfsArgs", "size");
            }
            return $;
        }
    }

}
