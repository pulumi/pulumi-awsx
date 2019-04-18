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
     *  1 - an existing Usage Plan - the API Keys will be associated with the usage plan
     *  2 - UsagePlanArgs with [usagePlan.apiStages] defined to define a new Usage Plan
     *  3 - UsagePlanArgs with [apis] defined and [usagePlan.apiStages] NOT defined to define a new
     *      Usage Plan
     */
    usagePlan?: aws.apigateway.UsagePlan | aws.apigateway.UsagePlanArgs;

    /**
     * The API keys you would like to create & associate with the usage plan. You can pass an array
     *  that has a combination of:
     *  1 - an existing APIKey
     *  2 - ApiKeyArgs for a new APIKey
     */
    apiKeys?: Array<aws.apigateway.ApiKey | aws.apigateway.ApiKeyArgs>;
}

export interface AssociatedAPIKeys {
    readonly usagePlan: aws.apigateway.UsagePlan;
    readonly keys: Key[];
}

export interface Key {
    apikey: aws.apigateway.ApiKey;
    usagePlanKey: aws.apigateway.UsagePlanKey;
}

/**
 * Helper function that allows you to quickly create API Keys and associate them with an API.
 *
 * @param name The _unique_ name of the resource.
 * @param args The arguments to use to populate this resource's properties.
 */
export function createAssociatedAPIKeys(name: string, args: APIKeyArgs): AssociatedAPIKeys {
    const usagePlan = getUsagePlan(name, args);
    const keys = getKeys(name, args, usagePlan);

    return { usagePlan, keys };
}

/** @internal */
function getUsagePlan(name: string, args: APIKeyArgs): aws.apigateway.UsagePlan {
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
        return new aws.apigateway.UsagePlan(name, usagePlanArgs);
    }
}

/** @internal */
function getKeys(name: string, args: APIKeyArgs, usagePlan: aws.apigateway.UsagePlan): Key[] {
    const keys: Key[] = [];

    if (args.apiKeys) {
        for (let i = 0; i < args.apiKeys.length; i++) {
            const currKey = args.apiKeys[i];
            let apikey: aws.apigateway.ApiKey;

            if (pulumi.CustomResource.isInstance(currKey)) {
                apikey = currKey;
            } else {
                apikey = new aws.apigateway.ApiKey(`${name}-${i}`, currKey);
            }

            const usagePlanKey = new aws.apigateway.UsagePlanKey(`${name}-${i}`, {
                keyId: apikey.id,
                keyType: "API_KEY",
                usagePlanId: usagePlan.id,
            });

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
