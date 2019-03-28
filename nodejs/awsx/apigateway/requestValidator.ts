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

export type RequestValidator = "ALL" | "PARAMS_ONLY" | "BODY_ONLY";

export interface Validators {
    [name: string]: {
        validateRequestBody: boolean;
        validateRequestParameters: boolean;
    };
}

export interface Parameter {
    name: string;
    in: Location;
}
export type Location = "path" | "query" | "header";

export function getValidators(requestValidator: RequestValidator): Validators {
    return {
        "ALL": {
            validateRequestBody: true,
            validateRequestParameters: true,
        },
        "BODY_ONLY": {
            validateRequestBody: true,
            validateRequestParameters: false,
        },
        "PARAMS_ONLY": {
            validateRequestBody: false,
            validateRequestParameters: true,
        },
    };
}
