// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.awsx.lb;

import com.pulumi.aws.ec2.SecurityGroup;
import com.pulumi.aws.lb.Listener;
import com.pulumi.aws.lb.LoadBalancer;
import com.pulumi.aws.lb.TargetGroup;
import com.pulumi.awsx.Utilities;
import com.pulumi.awsx.lb.NetworkLoadBalancerArgs;
import com.pulumi.core.Output;
import com.pulumi.core.annotations.Export;
import com.pulumi.core.annotations.ResourceType;
import com.pulumi.core.internal.Codegen;
import java.lang.String;
import java.util.List;
import java.util.Optional;
import javax.annotation.Nullable;

/**
 * Provides a Network Load Balancer resource with listeners, default target group and default security group.
 * 
 */
@ResourceType(type="awsx:lb:NetworkLoadBalancer")
public class NetworkLoadBalancer extends com.pulumi.resources.ComponentResource {
    /**
     * Default security group, if auto-created
     * 
     */
    @Export(name="defaultSecurityGroup", refs={SecurityGroup.class}, tree="[0]")
    private Output</* @Nullable */ SecurityGroup> defaultSecurityGroup;

    /**
     * @return Default security group, if auto-created
     * 
     */
    public Output<Optional<SecurityGroup>> defaultSecurityGroup() {
        return Codegen.optional(this.defaultSecurityGroup);
    }
    /**
     * Default target group, if auto-created
     * 
     */
    @Export(name="defaultTargetGroup", refs={TargetGroup.class}, tree="[0]")
    private Output<TargetGroup> defaultTargetGroup;

    /**
     * @return Default target group, if auto-created
     * 
     */
    public Output<TargetGroup> defaultTargetGroup() {
        return this.defaultTargetGroup;
    }
    /**
     * Listeners created as part of this load balancer
     * 
     */
    @Export(name="listeners", refs={List.class,Listener.class}, tree="[0,1]")
    private Output</* @Nullable */ List<Listener>> listeners;

    /**
     * @return Listeners created as part of this load balancer
     * 
     */
    public Output<Optional<List<Listener>>> listeners() {
        return Codegen.optional(this.listeners);
    }
    /**
     * Underlying Load Balancer resource
     * 
     */
    @Export(name="loadBalancer", refs={LoadBalancer.class}, tree="[0]")
    private Output<LoadBalancer> loadBalancer;

    /**
     * @return Underlying Load Balancer resource
     * 
     */
    public Output<LoadBalancer> loadBalancer() {
        return this.loadBalancer;
    }
    /**
     * Id of the VPC in which this load balancer is operating
     * 
     */
    @Export(name="vpcId", refs={String.class}, tree="[0]")
    private Output</* @Nullable */ String> vpcId;

    /**
     * @return Id of the VPC in which this load balancer is operating
     * 
     */
    public Output<Optional<String>> vpcId() {
        return Codegen.optional(this.vpcId);
    }

    /**
     *
     * @param name The _unique_ name of the resulting resource.
     */
    public NetworkLoadBalancer(String name) {
        this(name, NetworkLoadBalancerArgs.Empty);
    }
    /**
     *
     * @param name The _unique_ name of the resulting resource.
     * @param args The arguments to use to populate this resource's properties.
     */
    public NetworkLoadBalancer(String name, @Nullable NetworkLoadBalancerArgs args) {
        this(name, args, null);
    }
    /**
     *
     * @param name The _unique_ name of the resulting resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param options A bag of options that control this resource's behavior.
     */
    public NetworkLoadBalancer(String name, @Nullable NetworkLoadBalancerArgs args, @Nullable com.pulumi.resources.ComponentResourceOptions options) {
        super("awsx:lb:NetworkLoadBalancer", name, args == null ? NetworkLoadBalancerArgs.Empty : args, makeResourceOptions(options, Codegen.empty()), true);
    }

    private static com.pulumi.resources.ComponentResourceOptions makeResourceOptions(@Nullable com.pulumi.resources.ComponentResourceOptions options, @Nullable Output<String> id) {
        var defaultOptions = com.pulumi.resources.ComponentResourceOptions.builder()
            .version(Utilities.getVersion())
            .build();
        return com.pulumi.resources.ComponentResourceOptions.merge(defaultOptions, options, id);
    }

}
