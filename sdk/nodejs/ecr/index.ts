// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as utilities from "../utilities";

// Export members:
export * from "./image";
export * from "./repository";

// Export enums:
export * from "../types/enums/ecr";

// Import resources to register:
import { Image } from "./image";
import { Repository } from "./repository";

const _module = {
    version: utilities.getVersion(),
    construct: (name: string, type: string, urn: string): pulumi.Resource => {
        switch (type) {
            case "awsx:ecr:Image":
                return new Image(name, <any>undefined, { urn })
            case "awsx:ecr:Repository":
                return new Repository(name, <any>undefined, { urn })
            default:
                throw new Error(`unknown resource type ${type}`);
        }
    },
};
pulumi.runtime.registerResourceModule("awsx", "ecr", _module)
