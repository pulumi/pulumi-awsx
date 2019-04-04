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

import * as awslambda from "aws-lambda";

export type AuthorizerResponse = awslambda.CustomAuthorizerResult;

export interface SecurityDefinition {
    /**
     * Pretty name for the security definition to be referenced as. This is only used within the
     * swagger and must be unique for each unique authorizer within the API. If you want
     * to share an authorizer across routes, provide the same name for them. If not defined, a unique
     * name for you.
     */
    authorizerName?: string;

    /**
     * parameterName is the name of the header or query parameter containing the authorization token. Must be
     * "Unused" for multiple identity sources or non header or query type of request parameters.
     * */
    parameterName: string;

    /**
     * Required and the value must be "header" or "query" for an API Gateway API. Must be "header" for multiple
     * identity sources or non header or query type of request parameters.
     */
    parameterLocation: "header" | "query";

    /**
     * Specifies the authorization mechanism for the client. Typical values are "oauth2" or
     * "custom".
     */
    authType: string;

    /**
     * Defines a Lambda authorizer to be applied for authorization of method invocations in API Gateway.
     */
    authorizer: LambdaAuthorizer;
}

export interface LambdaInfo {
    /**
     * The Uniform Resource Identifier (URI) of the authorizer Lambda function.
     */
    authorizerUri: pulumi.Input<string>;

    /**
     * Credentials required for invoking the authorizer, if any, in the form of an ARN of an IAM execution role.
     * For example, "arn:aws:iam::account-id:IAM_role".
     */
    authorizerCredentials: pulumi.Input<string>;
}

export function isLambdaInfo(info: LambdaInfo | aws.lambda.EventHandler<api.Request, AuthorizerResponse>): info is LambdaInfo {
    return (<LambdaInfo>info).authorizerUri !== undefined;
}

/**
 * Defines a Lambda authorizer (the x-amazon-apigateway-authorizer object) to be applied for authorization of
 * method invocations in API Gateway.
 */
export interface LambdaAuthorizer {
    /**
     * The type of the authorizer. This is a required property and the value must be one of the following:
     *      - "token", for an authorizer with the caller identity embedded in an authorization token
     *      - "request", for an authorizer with the caller identity contained in request parameters
     */
    type: "token" | "request";

    /**
     * The authorizer specifies information about the authorizing Lambda. You can either set up the Lambda
     * separately and just provide the required information or you can define the Lambda inline.
     */
    authorizer: LambdaInfo | aws.lambda.EventHandler<api.Request, AuthorizerResponse>;

    /**
     * Comma-separated list of mapping expressions of the request parameters as the identity source. Applicable
     * for the authorizer of the "request" type only.
     * Example: "method.request.header.HeaderAuth1, method.request.querystring.QueryString1"
     */
    identitySource?: string;

    /**
     * A regular expression for validating the token as the incoming identity.
     * Example: "^x-[a-z]+"
     */
    identityValidationExpression?: string;

    /**
     * The number of seconds during which the resulting IAM policy is cached. Default is 300s.
     * You can set this value to 0 to disable caching. Max value is 3600s.
     */
    authorizerResultTtlInSeconds?: number;
}

export interface CognitoPoolAuthorizer {
    type: "cognito_user_pools";

    /**
     * List of the Amazon Cognito user pool ARNs for the "cognito_user_pools" authorizer. Each element is of this format:
     * arn:aws:cognito-idp:{region}:{account_id}:userpool/{user_pool_id}.
     * Not defined for a "token" or "request" authorizers.
     */
    providerARNs: string[];
}

export function isCognitoPoolAuthorizer(auth: CognitoPoolAuthorizer | LambdaAuthorizer): auth is CognitoPoolAuthorizer {
    return (<CognitoPoolAuthorizer>auth).providerARNs !== undefined;
}
