import { ID, Input } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

/**
 * NestedResourceOptions is a bag of optional settings that control a resource's behavior.
 */
export interface NestedResourceOptions {
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
    import?: string;
    /**
     * Changes to any of these property paths will force a replacement.  If this list includes `"*"`, changes to any
     * properties will force a replacement.  Initialization errors from previous deployments will require replacement
     * instead of update only if `"*"` is passed.
     */
    replaceOnChanges?: string[];
}
