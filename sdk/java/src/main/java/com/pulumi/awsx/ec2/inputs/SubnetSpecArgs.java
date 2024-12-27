// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.awsx.ec2.inputs;

import com.pulumi.awsx.ec2.enums.SubnetType;
import com.pulumi.core.Output;
import com.pulumi.core.annotations.Import;
import java.lang.Integer;
import java.lang.String;
import java.util.List;
import java.util.Map;
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
     * An optional list of CIDR blocks to assign to the subnet spec for each AZ. If specified, the count must match the number of AZs being used for the VPC, and must also be specified for all other subnet specs.
     * 
     */
    @Import(name="cidrBlocks")
    private @Nullable List<String> cidrBlocks;

    /**
     * @return An optional list of CIDR blocks to assign to the subnet spec for each AZ. If specified, the count must match the number of AZs being used for the VPC, and must also be specified for all other subnet specs.
     * 
     */
    public Optional<List<String>> cidrBlocks() {
        return Optional.ofNullable(this.cidrBlocks);
    }

    /**
     * The netmask for the subnet&#39;s CIDR block. This is optional, the default value is inferred from the `cidrMask`, `cidrBlocks` or based on an even distribution of available space from the VPC&#39;s CIDR block after being divided evenly by availability zone.
     * 
     */
    @Import(name="cidrMask")
    private @Nullable Integer cidrMask;

    /**
     * @return The netmask for the subnet&#39;s CIDR block. This is optional, the default value is inferred from the `cidrMask`, `cidrBlocks` or based on an even distribution of available space from the VPC&#39;s CIDR block after being divided evenly by availability zone.
     * 
     */
    public Optional<Integer> cidrMask() {
        return Optional.ofNullable(this.cidrMask);
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
     * Optional size of the subnet&#39;s CIDR block - the number of hosts. This value must be a power of 2 (e.g. 256, 512, 1024, etc.). This is optional, the default value is inferred from the `cidrMask`, `cidrBlocks` or based on an even distribution of available space from the VPC&#39;s CIDR block after being divided evenly by availability zone.
     * 
     */
    @Import(name="size")
    private @Nullable Integer size;

    /**
     * @return Optional size of the subnet&#39;s CIDR block - the number of hosts. This value must be a power of 2 (e.g. 256, 512, 1024, etc.). This is optional, the default value is inferred from the `cidrMask`, `cidrBlocks` or based on an even distribution of available space from the VPC&#39;s CIDR block after being divided evenly by availability zone.
     * 
     */
    public Optional<Integer> size() {
        return Optional.ofNullable(this.size);
    }

    /**
     * A map of tags to assign to the resource.
     * 
     */
    @Import(name="tags")
    private @Nullable Output<Map<String,String>> tags;

    /**
     * @return A map of tags to assign to the resource.
     * 
     */
    public Optional<Output<Map<String,String>>> tags() {
        return Optional.ofNullable(this.tags);
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
        this.cidrBlocks = $.cidrBlocks;
        this.cidrMask = $.cidrMask;
        this.name = $.name;
        this.size = $.size;
        this.tags = $.tags;
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
         * @param cidrBlocks An optional list of CIDR blocks to assign to the subnet spec for each AZ. If specified, the count must match the number of AZs being used for the VPC, and must also be specified for all other subnet specs.
         * 
         * @return builder
         * 
         */
        public Builder cidrBlocks(@Nullable List<String> cidrBlocks) {
            $.cidrBlocks = cidrBlocks;
            return this;
        }

        /**
         * @param cidrBlocks An optional list of CIDR blocks to assign to the subnet spec for each AZ. If specified, the count must match the number of AZs being used for the VPC, and must also be specified for all other subnet specs.
         * 
         * @return builder
         * 
         */
        public Builder cidrBlocks(String... cidrBlocks) {
            return cidrBlocks(List.of(cidrBlocks));
        }

        /**
         * @param cidrMask The netmask for the subnet&#39;s CIDR block. This is optional, the default value is inferred from the `cidrMask`, `cidrBlocks` or based on an even distribution of available space from the VPC&#39;s CIDR block after being divided evenly by availability zone.
         * 
         * @return builder
         * 
         */
        public Builder cidrMask(@Nullable Integer cidrMask) {
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
         * @param size Optional size of the subnet&#39;s CIDR block - the number of hosts. This value must be a power of 2 (e.g. 256, 512, 1024, etc.). This is optional, the default value is inferred from the `cidrMask`, `cidrBlocks` or based on an even distribution of available space from the VPC&#39;s CIDR block after being divided evenly by availability zone.
         * 
         * @return builder
         * 
         */
        public Builder size(@Nullable Integer size) {
            $.size = size;
            return this;
        }

        /**
         * @param tags A map of tags to assign to the resource.
         * 
         * @return builder
         * 
         */
        public Builder tags(@Nullable Output<Map<String,String>> tags) {
            $.tags = tags;
            return this;
        }

        /**
         * @param tags A map of tags to assign to the resource.
         * 
         * @return builder
         * 
         */
        public Builder tags(Map<String,String> tags) {
            return tags(Output.of(tags));
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
            $.type = Objects.requireNonNull($.type, "expected parameter 'type' to be non-null");
            return $;
        }
    }

}