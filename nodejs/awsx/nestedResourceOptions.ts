import { ID, Input } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

/**
 * ResourceOptions is a bag of optional settings that control a resource's behavior.
 */
export interface NestedResourceOptions {
    /**
     * An optional existing ID to load, rather than create.
     */
    id?: Input<ID>;
    /**
     * When set to true, protect ensures this resource cannot be deleted.
     */
    protect?: boolean;
    /**
     * Ignore changes to any of the specified properties.
     */
    ignoreChanges?: string[];
    /**
     * When provided with a resource ID, import indicates that this resource's provider should import its state from
     * the cloud resource with the given ID. The inputs to the resource's constructor must align with the resource's
     * current state. Once a resource has been imported, the import property must be removed from the resource's
     * options.
     */
    import?: ID;
    /**
     * Changes to any of these property paths will force a replacement.  If this list includes `"*"`, changes to any
     * properties will force a replacement.  Initialization errors from previous deployments will require replacement
     * instead of update only if `"*"` is passed.
     */
    replaceOnChanges?: string[];
    /**
     * An optional provider to use for this resource's CRUD operations. If no provider is supplied,
     * the default provider for the resource's package will be used. The default provider is pulled
     * from the parent's provider bag (see also ComponentResourceOptions.providers).
     */
    provider?: aws.Provider;
}
