import * as pulumi from "@pulumi/pulumi";

export type ProviderModule = {
    construct: (
        name: string,
        type: string,
        inputs: pulumi.Inputs,
        options: pulumi.ComponentResourceOptions,
    ) => pulumi.ComponentResource | undefined;
};
