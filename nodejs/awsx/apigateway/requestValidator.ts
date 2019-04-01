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

/** Parameter is used to define required path, query or header parameters for
 * API Gateway. If "ALL" or "PARAMS_ONLY" validator is set then, api gateway
 * will validate the parameter is included and non-blank for incoming requests.
*/
export interface Parameter {
    // name is the specific key of the parameter that is required.
    name: string;

    /**
     * in is where the parameter is expected to appear. API Gateway can validate
     * parameters expected in the path, query or header.
     */
    in: "path" | "query" | "header";
}
