// Copyright 2016-2018, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// These APIs are currently experimental and may change.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as api from "./api";
import { SecurityDefinition } from "./swagger_json";

import * as utils from "../utils";

/**
 * Input properties for creating a UsagePlan and associated API Keys.
 */
export interface APIKeyArgs {

    /**
     * Define the apis you would like to associate the usage plan with. This can be used in place of
     * defining the apiStages defined in the [usagePlan]. You cannot define both [apis] and
     * [usagePlan.apiStages].
     */
    apis?: api.API[];

    /**
     * Define the usage plan to create. You can either define:
     *  1. an existing Usage Plan - the API Keys will be associated with the usage plan
     *  2. UsagePlanArgs with [usagePlan.apiStages] defined to define a new Usage Plan
     *  3. UsagePlanArgs with [apis] defined and [usagePlan.apiStages] NOT defined to define a new
     *      Usage Plan
     *  4. Nothing - if you do not specify [apis] and pass in an empty object, a new usage plan will
     *     be created on your behalf with the all the default values.
     */
    usagePlan?: aws.apigateway.UsagePlan | aws.apigateway.UsagePlanArgs;

    /**
     * The API keys you would like to create & associate with the usage plan. You can pass an array
     *  that has a combination of:
     *  1. an existing APIKey
     *  2. ApiKeyArgs for a new APIKey
     */
    apiKeys?: Array<aws.apigateway.ApiKey | aws.apigateway.ApiKeyArgs>;
}

/**
 * The associate api keys and the usage plan as created by the `createAssociatedAPIKeys` function.
 */
export interface AssociatedAPIKeys {
    /**
     * Either the `aws.apigateway.UsagePlan` created for you, or the usage plan passed to as part of
     * the `APIKeyArgs`.
     */
    readonly usagePlan: aws.apigateway.UsagePlan;

    /**
     * The keys that were associated with the usage plan.
     */
    readonly keys: Key[];
}

/**
 * A key represents an `aws.apigateway.ApiKey` and the `aws.apigateway.UsagePlanKey` that ties it to
 * a usage plan.
 */
export interface Key {

    /**
     * apikey is either a `aws.apigateway.ApiKey` passed in or the `aws.apigateway.ApiKey` created
     * on your behalf using the `ApiKeyArgs`
     */
    apikey: aws.apigateway.ApiKey;

    /**
     * usagePlanKey is created on your behalf to associate the apikey with the usage plan.
     */
    usagePlanKey: aws.apigateway.UsagePlanKey;
}

/**
 * Helper function that allows you to quickly create API Keys and associate them with an API.
 *
 * @param name The _unique_ name of the resource.
 * @param args The arguments to use to populate this resource's properties.
 */
export function createAssociatedAPIKeys(name: string, args: APIKeyArgs, opts: pulumi.CustomResourceOptions = {}): AssociatedAPIKeys {
    const usagePlan = getUsagePlan(name, args, opts);
    const keys = getKeys(name, args, usagePlan);

    return { usagePlan, keys };
}

/** @internal */
function getUsagePlan(name: string, args: APIKeyArgs, opts: pulumi.CustomResourceOptions): aws.apigateway.UsagePlan {
    if (args.usagePlan && pulumi.CustomResource.isInstance(args.usagePlan)) {
        if (args.apis) {
            throw new Error("cannot define both [args.apis] and an existing usagePlan [args.usagePlan]");
        }
        return args.usagePlan;
    } else {
        let usagePlanArgs: aws.apigateway.UsagePlanArgs | undefined = args.usagePlan;

        if (args.apis) {
            const stages = [];

            for (const a of args.apis) {
                stages.push({
                    apiId: a.restAPI.id,
                    stage: a.stage.stageName,
                });
            }

            if (args.usagePlan) {
                if (args.usagePlan.apiStages) {
                    throw new Error("cannot define both [args.apis] and [args.usagePlan.apiStages]");
                }

                usagePlanArgs = {
                    apiStages: stages,
                    description: args.usagePlan.description,
                    name: args.usagePlan.name,
                    productCode: args.usagePlan.productCode,
                    quotaSettings: args.usagePlan.quotaSettings,
                    throttleSettings: args.usagePlan.throttleSettings,
                };
            } else {
                usagePlanArgs = {
                    apiStages: stages,
                };
            }
        }

        // We previously did not parent the UsagePlan. We now do. Provide an alias so this doesn't
        // cause resources to be destroyed/recreated for existing stacks.
        return new aws.apigateway.UsagePlan(name, usagePlanArgs,
            pulumi.mergeOptions(opts, { aliases: [{ parent: pulumi.rootStackResource }] }));
    }
}

/** @internal */
function getKeys(name: string, args: APIKeyArgs, usagePlan: aws.apigateway.UsagePlan): Key[] {
    const keys: Key[] = [];

    if (args.apiKeys) {
        for (let i = 0; i < args.apiKeys.length; i++) {
            const currKey = args.apiKeys[i];

            // We previously did not parent the ApiKey or UsagePlanKey. We now do. Provide an alias so this doesn't
            // cause resources to be destroyed/recreated for existing stacks.
            const childName = `${name}-${i}`;
            const apikey = pulumi.CustomResource.isInstance(currKey)
                ? currKey
                : new aws.apigateway.ApiKey(childName, currKey, { aliases: [{ parent: pulumi.rootStackResource }], parent: usagePlan });

            const usagePlanKey = new aws.apigateway.UsagePlanKey(childName, {
                keyId: apikey.id,
                keyType: "API_KEY",
                usagePlanId: usagePlan.id,
            }, { aliases: [{ parent: pulumi.rootStackResource }], parent: usagePlan });

            keys.push({ apikey, usagePlanKey });
        }
    }

    return keys;
}

export const apiKeySecurityDefinition: SecurityDefinition = {
    type: "apiKey",
    name: "x-api-key",
    in: "header",
};
