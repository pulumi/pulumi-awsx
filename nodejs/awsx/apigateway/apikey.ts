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
import * as api from "./api";

export type APIKeySource = "HEADER" | "AUTHORIZER";

/**
 * Input properties for creating a UsagePlan and associated API Keys.
 */
export interface APIKeyArgs {

    /**
     * Define the apis you would like to associate the usage plan with. This can be used in place of
     * defining the apiStages defined in the [usagePlan].
     */
    apis?: api.API[];

    /**
     * Define the usage plan to create. If an existing Usage Plan is passed in, then the API Keys
     * will be associated with the usage plan and no [apis] can be added.
     */
    usagePlan?: aws.apigateway.UsagePlanArgs | aws.apigateway.UsagePlan;

    /**
     * The API keys you would like to create & associate with the usage plan.
     */
    apiKeys?: Array<aws.apigateway.ApiKeyArgs | aws.apigateway.ApiKey>;
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
    let usagePlan: aws.apigateway.UsagePlan;

    if (args.usagePlan && isUsagePlan(args.usagePlan)) {
        usagePlan = args.usagePlan;
        if (args.apis) {
            throw new Error("cannot add [args.apis] to an existing [args.usagePlan]");
        }
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
                    throw new Error("[args.apis] and [args.usagePlan.apiStages] cannot both be defined");
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

        usagePlan = new aws.apigateway.UsagePlan(name, usagePlanArgs);
    }

    let keys: Key[] = [];

    if (args.apiKeys) {
        keys = [];

        for (let i = 0; i < args.apiKeys.length; i++) {
            const currKey = args.apiKeys[i];
            let apikey: aws.apigateway.ApiKey;
            if (isAPIKey(currKey)) {
                apikey = currKey;
            } else {
                apikey = new aws.apigateway.ApiKey(name + "-apikey-" + i, currKey);
            }

            const usagePlanKey = new aws.apigateway.UsagePlanKey(name + "-usage-plan-key-" + i, {
                keyId: apikey.id,
                keyType: "API_KEY",
                usagePlanId: usagePlan.id,
            });

            keys.push({
                apikey: apikey,
                usagePlanKey: usagePlanKey,
            });
        }
    }
    return {
        usagePlan: usagePlan,
        keys: keys,
    };
}

/** @internal */
export function isAPIKey(key: aws.apigateway.ApiKeyArgs | aws.apigateway.ApiKey): key is aws.apigateway.ApiKey {
    return (<aws.apigateway.ApiKey>key).value !== undefined;
}

/** @internal */
export function isUsagePlan(plan: aws.apigateway.UsagePlanArgs | aws.apigateway.UsagePlan): plan is aws.apigateway.UsagePlan {
    return (<aws.apigateway.UsagePlan>plan).id !== undefined;
}
