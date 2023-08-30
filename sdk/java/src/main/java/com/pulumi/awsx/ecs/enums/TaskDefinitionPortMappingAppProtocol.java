// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.awsx.ecs.enums;

import com.pulumi.core.annotations.EnumType;
import java.lang.String;
import java.util.Objects;
import java.util.StringJoiner;

    @EnumType
    public enum TaskDefinitionPortMappingAppProtocol {
        Http("http"),
        Http2("http2"),
        Grpc("grpc");

        private final String value;

        TaskDefinitionPortMappingAppProtocol(String value) {
            this.value = Objects.requireNonNull(value);
        }

        @EnumType.Converter
        public String getValue() {
            return this.value;
        }

        @Override
        public String toString() {
            return new StringJoiner(", ", "TaskDefinitionPortMappingAppProtocol[", "]")
                .add("value='" + this.value + "'")
                .toString();
        }
    }
