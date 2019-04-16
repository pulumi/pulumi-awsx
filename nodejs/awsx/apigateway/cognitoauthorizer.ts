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

/**
 * CognitoAuthorizer provides the definition for a Cognito User Pools Authorizer for API Gateway.
 */
export interface CognitoAuthorizer {
    /**
     * The name for the Authorizer to be referenced as. This must be unique for each unique
     * authorizer within the API. If no name if specified, a name will be generated for you.
     */
    authorizerName?: string;

    /**
     * parameterName is the name of the header containing the authorization token.
     * */
    parameterName: string;

    /**
     * Defines where in the request API Gateway should look for identity information. The value must
     * be "header" for a Cognito Authorizer.
     */
    parameterLocation: "header";

    /**
     * Specifies the authorization mechanism for the client.
     */
    authType: "cognito_user_pools";

    /**
     * The ARNs of the Cognito User Pools to use.
     */
    providerARNs: pulumi.Input<string>[];

    /**
     * List containing the request header that holds the authorization token. Example: if the token
     * header is `Auth` the identity source would be ["method.request.header.Auth"]
     */
    identitySource: string[];

    /**
     * A regular expression for validating the token as the incoming identity. It only invokes the
     * authorizer if there is a match, else it will return a 401. Example: "^x-[a-z]+"
     */
    identityValidationExpression?: string;

    /**
     * The number of seconds during which the resulting IAM policy is cached. Default is 300s. You
     * can set this value to 0 to disable caching. Max value is 3600s. Note - if you are sharing an
     * authorizer across more than one route you will want to disable the cache or else it will
     * cause problems for you.
     */
    authorizerResultTtlInSeconds?: number;

    /**
     * For method authorization, you can define resource servers and custom scopes by specifying the
     * "resource-server/scope". e.g. ["com.hamuta.movies/drama.view",
     * "http://my.resource.com/file.read"] For more information on resource servers and custom
     * scopes visit the AWS documentation -
     * https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html
     */
    methodsToAuthorize?: string[];
}

/**
 * The set of arguments for constructing a CognitoAuthorizer resource.
 */
export interface CognitoAuthorizerArgs {

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
     * The ARNs of the Cognito User Pools to use.
     */
    providerARNs: pulumi.Input<string>[];

    /**
     * A regular expression for validating the token as the incoming identity. It only invokes the
     * authorizer if there is a match, else it will return a 401. Example: "^x-[a-z]+"
     */
    identityValidationExpression?: string;

    /**
     * The number of seconds during which the resulting IAM policy is cached. Default is 300s. You
     * can set this value to 0 to disable caching. Max value is 3600s. Note - if you are sharing an
     * authorizer across more than one route you will want to disable the cache or else it will
     * cause problems for you.
     */
    authorizerResultTtlInSeconds?: number;

    /**
     * For method authorization, you can define resource servers and custom scopes by specifying the
     * "resource-server/scope". e.g. ["com.hamuta.movies/drama.view",
     * "http://my.resource.com/file.read"] For more information on resource servers and custom
     * scopes visit the AWS documentation -
     * https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html
     */
    methodsToAuthorize?: string[];
}

/**
 * getCognitoAuthorizer is a helper function to generate a CognitoAuthorizer.
 * @param name - the name for the authorizer. This must be unique for each unique authorizer in the API.
 * @param args - configuration information for the Cognito Authorizer.
 */
export function getCognitoAuthorizer(args: CognitoAuthorizerArgs): CognitoAuthorizer {
    const parameterName = args.header || "Authorization";

    return {
        authorizerName: args.authorizerName,
        parameterName: parameterName,
        parameterLocation: "header",
        authType: "cognito_user_pools",
        providerARNs: args.providerARNs,
        identitySource: ["method.request.header." + parameterName],
        identityValidationExpression: args.identityValidationExpression,
        authorizerResultTtlInSeconds: args.authorizerResultTtlInSeconds,
        methodsToAuthorize: args.methodsToAuthorize,
    };
}
