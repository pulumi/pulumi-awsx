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
     * Define the api you would like to associate the usage plan with. If used
     * this will override any apiStages defined in the [usagePlan].
     */
    api?: api.API;

    /**
     * Define the usage plan to create.
     */
    usagePlan?: aws.apigateway.UsagePlanArgs;

    /**
     * The API keys you would like to create & associate with the usage plan.
     */
    apiKeys?: aws.apigateway.ApiKeyArgs[];
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
    let usagePlanArgs: aws.apigateway.UsagePlanArgs | undefined = args.usagePlan;

    if (args.api) {
        const stages = [{
            apiId: args.api.restAPI.id,
            stage: args.api.stage.stageName,
        }];

        if (args.usagePlan) {
            if (args.usagePlan.apiStages) {
                throw new Error("[args.api] and [args.usagePlan.apiStages] cannot both be defined");
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

    const usagePlan = new aws.apigateway.UsagePlan(name, usagePlanArgs);
    let keys: Key[] = [];

    if (args.apiKeys) {
        keys = [];

        for (let i = 0; i < args.apiKeys.length; i++) {
            const currKey = args.apiKeys[i];
            const apikey = new aws.apigateway.ApiKey(name + "-apikey-" + i, currKey);

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
