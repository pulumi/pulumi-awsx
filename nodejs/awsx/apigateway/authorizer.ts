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

import * as awslambda from "aws-lambda";

export type AuthorizerEvent = awslambda.CustomAuthorizerEvent;
export type AuthorizerResponse = awslambda.CustomAuthorizerResult;

/**
 * CustomAuthorizerDefinition provides the definition for a custom Authorizer for API Gateway.
 */
export interface CustomAuthorizerDefinition {
    /**
     * Pretty name for the Authorizer to be referenced as. This must be unique for each unique authorizer
     * within the API. If you want to share an authorizer across routes, provide the same name for them. If
     * not defined, a unique name will be generated for you.
     */
    authorizerName?: string;

    /**
     * parameterName is the name of the header or query parameter containing the authorization token. Must be
     * "Unused" for multiple identity sources.
     * */
    parameterName: string;

    /**
     * Defines where in the request API Gateway should look for identity information. The value must be
     * "header" or "query". If there are multiple identity sources, the value must be "header".
     */
    parameterLocation: "header" | "query";

    /**
     * Specifies the authorization mechanism for the client. Typical values are "oauth2" or "custom".
     */
    authType: string;

    /**
     * Defines an authorizer to be applied for authorization of method invocations in API Gateway.
     */
    authorizer: CustomLambdaAuthorizer;
}

/**
 * Defines a custom Lambda authorizer (the x-amazon-apigateway-authorizer object) to be applied for authorization
 * of method invocations in API Gateway.
 */
export interface CustomLambdaAuthorizer {
    /**
     * The type of the authorizer. This value must be one of the following:
     *      - "token", for an authorizer with the caller identity embedded in an authorization token
     *      - "request", for an authorizer with the caller identity contained in request parameters
     */
    type: "token" | "request";

    /**
     * The authorizerHandler specifies information about the authorizing Lambda. You can either set up the
     * Lambda separately and just provide the required information or you can define the Lambda inline using a
     * JavaScript function.
     */
    authorizerHandler: LambdaAuthorizerInfo | aws.lambda.EventHandler<AuthorizerEvent, AuthorizerResponse>;

    /**
     * List of mapping expressions of the request parameters as the identity source. This indicates where in
     * the request identity information is expected. Applicable for the authorizer of the "request" type only.
     * Example: ["method.request.header.HeaderAuth1", "method.request.querystring.QueryString1"]
     */
    identitySource?: string[];

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

export interface LambdaAuthorizerInfo {
    /**
     * The Uniform Resource Identifier (URI) of the authorizer Lambda function.
     */
    uri: pulumi.Input<string>;

    /**
     * Credentials required for invoking the authorizer in the form of an ARN of an IAM execution role.
     * For example, "arn:aws:iam::account-id:IAM_role".
     */
    credentials: pulumi.Input<string>;
}

/** @internal */
export function isLambdaAuthorizerInfo(info: LambdaAuthorizerInfo | aws.lambda.EventHandler<AuthorizerEvent, AuthorizerResponse>): info is LambdaAuthorizerInfo {
    return (<LambdaAuthorizerInfo>info).uri !== undefined;
}
