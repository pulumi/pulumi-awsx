import * as pulumi from "@pulumi/pulumi";

export type ProviderModule = {
    construct: Required<pulumi.provider.Provider>["construct"];
};
