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

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

// Create role for our lambda
const role = new aws.iam.Role("mylambda-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ "Service": ["lambda.amazonaws.com", "apigateway.amazonaws.com"] }),
});

// Create the lambda whose code lives in the ./afunction directory
const lambda = new aws.lambda.Function("myfunction", {
    code: new pulumi.asset.FileArchive("./afunction"),
    role: role.arn,
    handler: "index.handler",
    runtime: aws.lambda.NodeJS8d10Runtime,
});

// Define the Authorizers up here so we can use it for two routes
const authorizers: awsx.apigateway.LambdaAuthorizerDefinition[] = [{
    authorizerName: "prettyAuthorizer",
    parameterName: "auth",
    parameterLocation: "query",
    authType: "custom",
    type: "request",
    handler: async (event: awsx.apigateway.AuthorizerEvent) => {
        return awsx.apigateway.AuthorizerResponse(
            "user",
            "Allow",
            event.methodArn);
    },
    identitySource: ["method.request.querystring.auth"],
}];

/**
 * In the following example, parameter validation is required for the `/a` route.
 * `curl $(pulumi stack output url)/a?key=hello` would return a 200, whereas
 * `curl $(url)/a` would return a 400, since the required key query parameter is
 * missing.
 */
const api = new awsx.apigateway.API("myapi", {
    routes: [{
        path: "/a",
        method: "GET",
        eventHandler: async () => {
            return {
                statusCode: 200,
                body: "<h1>Hello world!</h1>",
            };
        },
        requiredParameters: [{
            name: "key",
            in: "query",
        }],
    }, {
        path: "/b",
        method: "GET",
        eventHandler: lambda,
        authorizers: authorizers,
    }, {
        path: "/anotherauthorizedpath",
        localPath: "www",
        authorizers: authorizers,
    }, {
        path: "/www",
        localPath: "www",
        requiredParameters: [{
            name: "key",
            in: "query",
        }],
        // TODO - add this test
        // }, {
        //     path: "/wwwauthorized",
        //     localPath: "www",
        //     requiredParameters: [{
        //         name: "key",
        //         in: "query",
        //     }],
        //     authorizers: [awsx.apigateway.getTokenLambdaAuthorizerDefinition({
        //         header: "Authorization",
        //         handler: async (event: awsx.apigateway.AuthorizerEvent) => {
        //             const token = event.authorizationToken;
        //             if (token === "Allow") {
        //                 return awsx.apigateway.AuthorizerResponse(
        //                     "user",
        //                     "Allow",
        //                     event.methodArn);
        //             }
        //             return awsx.apigateway.AuthorizerResponse(
        //                 "user",
        //                 "Deny",
        //                 event.methodArn);
        //         },
        //     })],
    }],
    requestValidator: "ALL",
});

export const url = api.url;


/**
 *The example below shows using a Lambda Authorizer that is created elsewhere.
 */

// Create a role for the authorizer lambda
const authorizerRole = new aws.iam.Role("myauthorizer-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ "Service": ["lambda.amazonaws.com"] }),
});

// Create the Authorizer Lambda
const authorizerLambda = new aws.lambda.Function("authorizer-lambda", {
    code: new pulumi.asset.FileArchive("./authfunction"),
    role: authorizerRole.arn,
    handler: "index.handler",
    runtime: aws.lambda.NodeJS8d10Runtime,
});

// Create a role for the gateway to use to invoke the Authorizer Lambda
const gatewayRole = new aws.iam.Role("gateway-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ "Service": ["lambda.amazonaws.com", "apigateway.amazonaws.com"] }),
});

// Give the lambda role permission to invoke the Authorizer -- TODO this can be another role
const invocationPolicy = new aws.iam.RolePolicy("invocation-policy", {
    policy: authorizerLambda.arn.apply(arn => `{
     "Version": "2012-10-17",
       "Statement": [
         {
           "Action": "lambda:InvokeFunction",
           "Effect": "Allow",
           "Resource": "${arn}"
         }
       ]
     }
     `),
    role: gatewayRole.id,
});

// Specify the authorizerUri and authorizerCredentials to use an Authorizer that is created elsewhere.
const apiWithAuthorizer = new awsx.apigateway.API("authorizer-api", {
    routes: [{
        path: "/www_old",
        localPath: "www",
        authorizers: [awsx.apigateway.getRequestLambdaAuthorizerDefinition({
            queryParameters: ["auth"],
            handler: authorizerLambda,
        })],
    }],
});

export const authorizerUrl = apiWithAuthorizer.url;
