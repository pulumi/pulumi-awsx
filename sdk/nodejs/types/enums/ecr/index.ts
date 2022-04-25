// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***


export const LifecycleTagStatus = {
    /**
     * Evaluate rule against all images
     */
    Any: "any",
    /**
     * Only evaluate rule against untagged images
     */
    Untagged: "untagged",
    /**
     * Only evaluated rule against images with specified prefixes
     */
    Tagged: "tagged",
} as const;

export type LifecycleTagStatus = (typeof LifecycleTagStatus)[keyof typeof LifecycleTagStatus];
