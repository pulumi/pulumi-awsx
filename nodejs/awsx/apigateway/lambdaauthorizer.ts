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

import * as cognitoauthorizer from "./cognitoauthorizer";

export type AuthorizerEvent = awslambda.CustomAuthorizerEvent;
export type AuthorizerResponse = awslambda.CustomAuthorizerResult;
export type AuthResponseContext = awslambda.AuthResponseContext;

/**
 * LambdaAuthorizer provides the definition for a custom Authorizer for API Gateway.
 */
export interface LambdaAuthorizer {
    /**
     * The name for the Authorizer to be referenced as. This must be unique for each unique
     * authorizer within the API. If no name if specified, a name will be generated for you.
     */
    authorizerName?: string;

    /**
     * parameterName is the name of the header or query parameter containing the authorization
     * information. Must be "Unused" for multiple identity sources.
     * */
    parameterName: string;

    /**
     * Defines where in the request API Gateway should look for identity information. The value must
     * be "header" or "query". If there are multiple identity sources, the value must be "header".
     */
    parameterLocation: "header" | "query";

    /**
     * Specifies the authorization mechanism for the client. Typical values are "oauth2" or "custom".
     */
    authType: string;

    /**
     * The type of the authorizer. This value must be one of the following:
     *      - "token", for an authorizer with the caller identity embedded in an authorization token
     *      - "request", for an authorizer with the caller identity contained in request parameters
     */
    type: "token" | "request";

    /**
     * The authorizerHandler specifies information about the authorizing Lambda. You can either set
     * up the Lambda separately and just provide the required information or you can define the
     * Lambda inline using a JavaScript function.
     */
    handler: LambdaAuthorizerInfo | aws.lambda.EventHandler<AuthorizerEvent, AuthorizerResponse>;

    /**
     * List of mapping expressions of the request parameters as the identity source. This indicates
     * where in the request identity information is expected. Required for "TOKEN" authorizers.
     * Required for "REQUEST" authorizers when caching is enabled. Example:
     * ["method.request.header.HeaderAuth1", "method.request.querystring.QueryString1"]
     */
    identitySource?: string[];

    /**
     * A regular expression for validating the token as the incoming identity. It only invokes the
     * authorizer's lambda if there is a match, else it will return a 401. This does not apply to
     * REQUEST Lambda Authorizers. Example: "^x-[a-z]+"
     */
    identityValidationExpression?: string;

    /**
     * The number of seconds during which the resulting IAM policy is cached. Default is 300s. You
     * can set this value to 0 to disable caching. Max value is 3600s. Note - if you are sharing an
     * authorizer across more than one route you will want to disable the cache or else it will
     * cause problems for you.
     */
    authorizerResultTtlInSeconds?: number;
}

export interface LambdaAuthorizerInfo {
    /**
     * The Uniform Resource Identifier (URI) of the authorizer Lambda function. The Lambda may also
     * be passed directly, in which cases the URI will be obtained for you.
     */
    uri: pulumi.Input<string> | aws.lambda.Function;

    /**
     * Credentials required for invoking the authorizer in the form of an ARN of an IAM execution role.
     * For example, "arn:aws:iam::account-id:IAM_role".
     */
    credentials: pulumi.Input<string> | aws.iam.Role;
}

/** @internal */
export function isLambdaAuthorizer(authorizer: LambdaAuthorizer | cognitoauthorizer.CognitoAuthorizer): authorizer is LambdaAuthorizer {
    return (<LambdaAuthorizer>authorizer).handler !== undefined;
}

/** @internal */
export function isLambdaAuthorizerInfo(info: LambdaAuthorizerInfo | aws.lambda.EventHandler<AuthorizerEvent, AuthorizerResponse>): info is LambdaAuthorizerInfo {
    return (<LambdaAuthorizerInfo>info).uri !== undefined;
}

/** @internal */
export function isLambdaFunction(uri: pulumi.Input<string> | aws.lambda.Function): uri is aws.lambda.Function {
    return (<aws.lambda.Function>uri).invokeArn !== undefined;
}

/** @internal */
export function isIAMRole(creds: pulumi.Input<string> | aws.iam.Role): creds is aws.iam.Role {
    return (<aws.iam.Role>creds).assumeRolePolicy !== undefined;
}

/** @internal */
export function getIdentitySource(identitySources: string[] | undefined): string {
    if (identitySources) {
        return identitySources.join(", ");
    }
    return "";
}

/** @internal */
export function createRoleWithAuthorizerInvocationPolicy(authorizerName: string, authorizerLambda: aws.lambda.Function): aws.iam.Role {
    const policy = aws.iam.assumeRolePolicyForPrincipal({ "Service": ["lambda.amazonaws.com", "apigateway.amazonaws.com"] });
    const role = new aws.iam.Role(authorizerName + "-authorizer-role", {
        assumeRolePolicy: JSON.stringify(policy),
    });

    // Add invocation policy to lambda role
    const invocationPolicy = new aws.iam.RolePolicy(authorizerName + "-invocation-policy", {
        policy: pulumi.interpolate`{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Action": "lambda:InvokeFunction",
                        "Effect": "Allow",
                        "Resource": "${authorizerLambda.arn}"
                    }
                ]
            }`,
        role: role.id,
    });
    return role;
}

/**
 * Simplifies creating an AuthorizerResponse.
 *
 * @param principalId - unique identifier for the user
 * @param effect - whether to "Allow" or "Deny" the request
 * @param resource - the API method to be invoked (typically event.methodArn)
 * @param context - key-value pairs that are passed from the authorizer to the backend Lambda
 * @param apiKey - if the API uses a usage plan, this must be set to one of the usage plan's API keys
 */
export function authorizerResponse(principalId: string, effect: Effect, resource: string, context?: AuthResponseContext, apiKey?: string): AuthorizerResponse {
    const response: AuthorizerResponse = {
        principalId: principalId,
        policyDocument: {
            Version: "2012-10-17",
            Statement: [{
                Action: "execute-api:Invoke",
                Effect: effect,
                Resource: resource,
            }],
        },
    };
    response.context = context;
    response.usageIdentifierKey = apiKey;
    return response;
}

export type Effect = "Allow" | "Deny";

/**
 * The set of arguments for constructing a token LambdaAuthorizer resource.
 */
export interface TokenAuthorizerArgs {

    /**
     * The name for the Authorizer to be referenced as. This must be unique for each unique
     * authorizer within the API. If no name if specified, a name will be generated for you.
     */
    authorizerName?: string;

    /**
     * The request header for the authorization token. If not set, this defaults to
     * Authorization.
     */
    header?: string;

    /**
     * The authorizerHandler specifies information about the authorizing Lambda. You can either set
     * up the Lambda separately and just provide the required information or you can define the
     * Lambda inline using a JavaScript function.
     */
    handler: LambdaAuthorizerInfo | aws.lambda.EventHandler<AuthorizerEvent, AuthorizerResponse>;

    /**
     * A regular expression for validating the token as the incoming identity.
     * Example: "^x-[a-z]+"
     */
    identityValidationExpression?: string;

    /**
     * The number of seconds during which the resulting IAM policy is cached. Default is 300s. You
     * can set this value to 0 to disable caching. Max value is 3600s. Note - if you are sharing an
     * authorizer across more than one route you will want to disable the cache or else it will
     * cause problems for you.
     */
    authorizerResultTtlInSeconds?: number;
}

/**
 * getTokenLambdaAuthorizer is a helper function to generate a token LambdaAuthorizer.
 * @param name - the name for the authorizer. This must be unique for each unique authorizer in the API.
 * @param args - configuration information for the token Lambda.
 */
export function getTokenLambdaAuthorizer(args: TokenAuthorizerArgs): LambdaAuthorizer {
    const parameterName = args.header || "Authorization";
    return {
        authorizerName: args.authorizerName,
        parameterName: parameterName,
        parameterLocation: "header",
        authType: "oauth2",
        type: "token",
        handler: args.handler,
        identitySource: ["method.request.header." + parameterName],
        identityValidationExpression: args.identityValidationExpression,
        authorizerResultTtlInSeconds: args.authorizerResultTtlInSeconds,
    };
}

/**
 * The set of arguments for constructing a request LambdaAuthorizer resource.
 */
export interface RequestAuthorizerArgs {

    /**
     * The name for the Authorizer to be referenced as. This must be unique for each unique authorizer
     * within the API. If no name if specified, a name will be generated for you.
     */
    authorizerName?: string;

    /**
     * queryParameters is an array of the expected query parameter keys used to authorize a request.
     * While this argument is optional, at least one queryParameter or one header must be defined.
     * */
    queryParameters?: string[];

    /**
     * headers is an array of the expected header keys used to authorize a request.
     *  While this argument is optional, at least one queryParameter or one header must be defined.
     * */
    headers?: string[];

    /**
     * The authorizerHandler specifies information about the authorizing Lambda. You can either set
     * up the Lambda separately and just provide the required information or you can define the
     * Lambda inline using a JavaScript function.
     */
    handler: LambdaAuthorizerInfo | aws.lambda.EventHandler<AuthorizerEvent, AuthorizerResponse>;

    /**
     * The number of seconds during which the resulting IAM policy is cached. Default is 300s. You
     * can set this value to 0 to disable caching. Max value is 3600s. Note - if you are sharing an
     * authorizer across more than one route you will want to disable the cache or else it will
     * cause problems for you.
     */
    authorizerResultTtlInSeconds?: number;
}

/**
 * getRequestLambdaAuthorizer is a helper function to generate a request LambdaAuthorizer.
 *
 * @param name - the name for the authorizer. This must be unique for each unique authorizer in the
 * API.
 * @param args - configuration information for the token Lambda.
 */
export function getRequestLambdaAuthorizer(args: RequestAuthorizerArgs): LambdaAuthorizer {
    let parameterName: string;
    let location: "header" | "query";

    const numQueryParams = getLength(args.queryParameters);
    const numHeaders = getLength(args.headers);

    if (numQueryParams === 0 && numHeaders === 0) {
        throw new Error("[args.queryParameters] and [args.headers] were both empty. At least one query parameter or header must be specified");
    } else {
        location = getLocation(numHeaders, numQueryParams);
        parameterName = getParameterName(args, numHeaders, numQueryParams);
    }

    return {
        authorizerName: args.authorizerName,
        parameterName: parameterName,
        parameterLocation: location,
        authType: "custom",
        type: "request",
        handler: args.handler,
        identitySource: parametersToIdentitySources(args),
        authorizerResultTtlInSeconds: args.authorizerResultTtlInSeconds,
    };
}

/** @internal */
function getLength(params: string[] | undefined): number {
    if (!params) {
        return 0;
    }
    return params.length;
}

/** @internal */
function getParameterName(args: RequestAuthorizerArgs, numHeaders: number, numQueryParameters: number): string {
    if (numQueryParameters + numHeaders === 1) {
        if (args.queryParameters) {
            return args.queryParameters[0];
        } else if (args.headers) {
            return args.headers[0];
        }
    }
    return "Unused";
}

/** @internal */
function getLocation(numHeaders: number, numQueryParameters: number): "header" | "query" {
    if (numHeaders > 0) {
        return "header";
    } else if (numQueryParameters > 0) {
        return "query";
    } else {
        throw new Error("Could not determine parameter location");
    }
}

/** @internal */
function parametersToIdentitySources(args: RequestAuthorizerArgs): string[] {
    const identitySource: string[] = [];
    if (args.headers) {
        for (const header of args.headers) {
            identitySource.push("method.request.header." + header);
        }
    }

    if (args.queryParameters) {
        for (const param of args.queryParameters) {
            identitySource.push("method.request.querystring." + param);
        }
    }
    return identitySource;
}
