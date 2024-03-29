// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.awsx.awsx.inputs;

import com.pulumi.awsx.awsx.inputs.ExistingLogGroupArgs;
import com.pulumi.awsx.awsx.inputs.LogGroupArgs;
import com.pulumi.core.annotations.Import;
import java.lang.Boolean;
import java.util.Objects;
import java.util.Optional;
import javax.annotation.Nullable;


/**
 * Log group with default setup unless explicitly skipped.
 * 
 */
public final class DefaultLogGroupArgs extends com.pulumi.resources.ResourceArgs {

    public static final DefaultLogGroupArgs Empty = new DefaultLogGroupArgs();

    /**
     * Arguments to use instead of the default values during creation.
     * 
     */
    @Import(name="args")
    private @Nullable LogGroupArgs args;

    /**
     * @return Arguments to use instead of the default values during creation.
     * 
     */
    public Optional<LogGroupArgs> args() {
        return Optional.ofNullable(this.args);
    }

    /**
     * Identity of an existing log group to use. Cannot be used in combination with `args` or `opts`.
     * 
     */
    @Import(name="existing")
    private @Nullable ExistingLogGroupArgs existing;

    /**
     * @return Identity of an existing log group to use. Cannot be used in combination with `args` or `opts`.
     * 
     */
    public Optional<ExistingLogGroupArgs> existing() {
        return Optional.ofNullable(this.existing);
    }

    /**
     * Skip creation of the log group.
     * 
     */
    @Import(name="skip")
    private @Nullable Boolean skip;

    /**
     * @return Skip creation of the log group.
     * 
     */
    public Optional<Boolean> skip() {
        return Optional.ofNullable(this.skip);
    }

    private DefaultLogGroupArgs() {}

    private DefaultLogGroupArgs(DefaultLogGroupArgs $) {
        this.args = $.args;
        this.existing = $.existing;
        this.skip = $.skip;
    }

    public static Builder builder() {
        return new Builder();
    }
    public static Builder builder(DefaultLogGroupArgs defaults) {
        return new Builder(defaults);
    }

    public static final class Builder {
        private DefaultLogGroupArgs $;

        public Builder() {
            $ = new DefaultLogGroupArgs();
        }

        public Builder(DefaultLogGroupArgs defaults) {
            $ = new DefaultLogGroupArgs(Objects.requireNonNull(defaults));
        }

        /**
         * @param args Arguments to use instead of the default values during creation.
         * 
         * @return builder
         * 
         */
        public Builder args(@Nullable LogGroupArgs args) {
            $.args = args;
            return this;
        }

        /**
         * @param existing Identity of an existing log group to use. Cannot be used in combination with `args` or `opts`.
         * 
         * @return builder
         * 
         */
        public Builder existing(@Nullable ExistingLogGroupArgs existing) {
            $.existing = existing;
            return this;
        }

        /**
         * @param skip Skip creation of the log group.
         * 
         * @return builder
         * 
         */
        public Builder skip(@Nullable Boolean skip) {
            $.skip = skip;
            return this;
        }

        public DefaultLogGroupArgs build() {
            return $;
        }
    }

}
