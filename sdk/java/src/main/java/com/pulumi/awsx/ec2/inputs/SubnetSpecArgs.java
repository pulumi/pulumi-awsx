// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.awsx.ec2.inputs;

import com.pulumi.awsx.ec2.enums.SubnetType;
import com.pulumi.core.annotations.Import;
import java.lang.Integer;
import java.lang.String;
import java.util.Objects;
import java.util.Optional;
import javax.annotation.Nullable;


/**
 * Configuration for a VPC subnet.
 * 
 */
public final class SubnetSpecArgs extends com.pulumi.resources.ResourceArgs {

    public static final SubnetSpecArgs Empty = new SubnetSpecArgs();

    /**
     * The bitmask for the subnet&#39;s CIDR block.
     * 
     */
    @Import(name="cidrMask", required=true)
    private Integer cidrMask;

    /**
     * @return The bitmask for the subnet&#39;s CIDR block.
     * 
     */
    public Integer cidrMask() {
        return this.cidrMask;
    }

    /**
     * The subnet&#39;s name. Will be templated upon creation.
     * 
     */
    @Import(name="name")
    private @Nullable String name;

    /**
     * @return The subnet&#39;s name. Will be templated upon creation.
     * 
     */
    public Optional<String> name() {
        return Optional.ofNullable(this.name);
    }

    /**
     * The type of subnet.
     * 
     */
    @Import(name="type", required=true)
    private SubnetType type;

    /**
     * @return The type of subnet.
     * 
     */
    public SubnetType type() {
        return this.type;
    }

    private SubnetSpecArgs() {}

    private SubnetSpecArgs(SubnetSpecArgs $) {
        this.cidrMask = $.cidrMask;
        this.name = $.name;
        this.type = $.type;
    }

    public static Builder builder() {
        return new Builder();
    }
    public static Builder builder(SubnetSpecArgs defaults) {
        return new Builder(defaults);
    }

    public static final class Builder {
        private SubnetSpecArgs $;

        public Builder() {
            $ = new SubnetSpecArgs();
        }

        public Builder(SubnetSpecArgs defaults) {
            $ = new SubnetSpecArgs(Objects.requireNonNull(defaults));
        }

        /**
         * @param cidrMask The bitmask for the subnet&#39;s CIDR block.
         * 
         * @return builder
         * 
         */
        public Builder cidrMask(Integer cidrMask) {
            $.cidrMask = cidrMask;
            return this;
        }

        /**
         * @param name The subnet&#39;s name. Will be templated upon creation.
         * 
         * @return builder
         * 
         */
        public Builder name(@Nullable String name) {
            $.name = name;
            return this;
        }

        /**
         * @param type The type of subnet.
         * 
         * @return builder
         * 
         */
        public Builder type(SubnetType type) {
            $.type = type;
            return this;
        }

        public SubnetSpecArgs build() {
            $.cidrMask = Objects.requireNonNull($.cidrMask, "expected parameter 'cidrMask' to be non-null");
            $.type = Objects.requireNonNull($.type, "expected parameter 'type' to be non-null");
            return $;
        }
    }

}
