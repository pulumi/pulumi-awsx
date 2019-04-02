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

import * as pulumi from "@pulumi/pulumi";

export interface SecurityDefinition {
    /**
     * Pretty name for the security definition to be referenced as. This is only
     * used w/in the swagger. If not defined, we will create a name for you.
     */
    authorizerName: string;

    /**
     * The type is required and the value must be "apiKey" for an API Gateway API.
     */
    type: "apiKey";

    /**
     * parameterName is the name of the header or query parameter containing the authorization token.
     * */
    parameterName: string;

    /**
     * Required and the value must be "header" or "query" for an API Gateway API.
     */
    parameterLocation: "header" | "query";

    /**
     * Specifies the authorization mechanism for the client.
     */
    "x-amazon-apigateway-authtype": AuthType;

    /**
     * Defines a Lambda authorizer to be applied for authorization of method invocations in API Gateway.
     */
    "x-amazon-apigateway-authorizer": Authorizer;
}

export type AuthType = "oauth2" | "custom";

/**
 * Defines a Lambda authorizer (the x-amazon-apigateway-authorizer object) to be applied for authorization of
 * method invocations in API Gateway.
 */
export interface Authorizer {
    /**
     * The type of the authorizer. This is a required property and the value must be "token", for an authorizer
     * with the caller identity embedded in an authorization token, or "request", for an authorizer with the
     * caller identity contained in request parameters.
     */
    type: AuthorizerType;

    /**
     * The Uniform Resource Identifier (URI) of the authorizer Lambda function.
     */
    authorizerUri: pulumi.Input<string>;

    /**
     * Credentials required for invoking the authorizer, if any, in the form of an ARN of an IAM execution role.
     * For example, "arn:aws:iam::account-id:IAM_role".
     */
    authorizerCredentials: pulumi.Input<string>;

    /**
     * Comma-separated list of mapping expressions of the request parameters as the identity source. Applicable
     * for the authorizer of the "request" type only.
     */
    identitySource?: string;

    /**
     * A regular expression for validating the token as the incoming identity. For example, "^x-[a-z]+".
     */
    identityValidationExpression?: string;

    /**
     * The number of seconds during which the resulting IAM policy is cached. Default is 300s.
     * You can set this value to 0 to disable caching. Max value is 3600s.
     */
    authorizerResultTtlInSeconds?: number;
}

export type AuthorizerType = "token" | "request";
