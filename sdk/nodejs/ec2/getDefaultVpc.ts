// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as utilities from "../utilities";

/**
 * [NOT YET IMPLEMENTED] Get the Default VPC for a region.
 */
/** @deprecated Waiting for https://github.com/pulumi/pulumi/issues/7583. Use the DefaultVpc resource until resolved. */
export function getDefaultVpc(args?: GetDefaultVpcArgs, opts?: pulumi.InvokeOptions): Promise<GetDefaultVpcResult> {
    pulumi.log.warn("getDefaultVpc is deprecated: Waiting for https://github.com/pulumi/pulumi/issues/7583. Use the DefaultVpc resource until resolved.")
    args = args || {};

    opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts || {});
    return pulumi.runtime.invoke("awsx:ec2:getDefaultVpc", {
    }, opts);
}

/**
 * Arguments for getting the default VPC
 */
export interface GetDefaultVpcArgs {
}

/**
 * Outputs from the default VPC configuration
 */
export interface GetDefaultVpcResult {
    readonly privateSubnetIds: string[];
    readonly publicSubnetIds: string[];
    /**
     * The VPC ID for the default VPC
     */
    readonly vpcId: string;
}
