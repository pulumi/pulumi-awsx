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

// Define the Authorizers up here so we can use it for two routes. Note - if you are sharing an
// authorizer you will want to set the authorizerResultTtlInSeconds to 0 seconds or else it will
// cause problems for you.
const lambdaAuthorizer: awsx.apigateway.LambdaAuthorizer = {
    authorizerName: "prettyAuthorizer",
    parameterName: "auth",
    parameterLocation: "query",
    authType: "custom",
    type: "request",
    handler: async (event: awsx.apigateway.AuthorizerEvent) => {
        return awsx.apigateway.authorizerResponse("user", "Allow", event.methodArn);
    },
    identitySource: ["method.request.querystring.auth"],
    authorizerResultTtlInSeconds: 0,
};

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
        authorizers: lambdaAuthorizer,
    }, {
        path: "/b",
        method: "GET",
        eventHandler: lambda,
        apiKeyRequired: true,
        authorizers: lambdaAuthorizer,
    }, {
        path: "/www",
        localPath: "www",
        requiredParameters: [{
            name: "key",
            in: "query",
        }],
        apiKeyRequired: true,
        authorizers: [awsx.apigateway.getTokenLambdaAuthorizer({
            header: "Authorization",
            handler: async (event: awsx.apigateway.AuthorizerEvent) => {
                const token = event.authorizationToken;
                if (token === "Allow") {
                    return awsx.apigateway.authorizerResponse("user", "Allow", event.methodArn);
                }
                return awsx.apigateway.authorizerResponse("user", "Deny", event.methodArn);
            },
        })],
    }, {
        path: "/rawdata",
        method: "GET",
        data: {
            "responses": {},
            "x-amazon-apigateway-request-validator": "ALL",
            "x-amazon-apigateway-integration": {
                "uri": "https://www.google.com/",
                "responses": {
                    "default": {
                        "statusCode": "200",
                    },
                },
                "passthroughBehavior": "when_no_match",
                "httpMethod": "GET",
                "type": "http_proxy",
            },
        },
    }, {
        path: "/integration",
        target: {
            uri: "https://www.google.com",
            type: "http_proxy",
        },
    }],
    requestValidator: "ALL",
});

// Export the url of the API.
export const url = api.url;

// Set up a usage plan and an associated api key
const apikeys = awsx.apigateway.createAssociatedAPIKeys("my-api-keys", {
    apis: [api],
    apiKeys: [{
        name: "test-key",
    }],
});

// Export the API Key of the API for testing.
export const apiKeyValue = apikeys.keys[0].apikey.value;

/**
 * ----------------------------------------------------------------------------
 * The example below shows how to use a pre-existing Lambda as an Authorizer.
 * ----------------------------------------------------------------------------
 */

// Create a role for the authorizer lambda
const authorizerRole = new aws.iam.Role("myauthorizer-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ "Service": ["lambda.amazonaws.com"] }),
});

// Create API Key for Lambda Authorizer to use
const apikey = new aws.apigateway.ApiKey("apikey-test");

// Create Authorizer Lambda
const authorizerLambda = new aws.lambda.CallbackFunction("authorizer-lambda2", {
    role: authorizerRole,
    callback: async (event: awsx.apigateway.AuthorizerEvent) => {
        console.log(event);
        if (event.queryStringParameters) {
            const token = event.queryStringParameters.auth;
            if (token === "Allow") {
                // use .get() to get the apikey value at Pulumi runtime
                return awsx.apigateway.authorizerResponse("user", "Allow", event.methodArn, undefined, apikey.id.get());
            }
        }
        return awsx.apigateway.authorizerResponse("user", "Deny", event.methodArn);
    },
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
        authorizers: [awsx.apigateway.getRequestLambdaAuthorizer({
            queryParameters: ["auth"],
            headers: ["secret"],
            handler: authorizerLambda,
        })],
    }],
});

// Create a usage plan + associate the apikey with it
const associateKeys = awsx.apigateway.createAssociatedAPIKeys("authorizer-api", {
    apis: [apiWithAuthorizer],
    apiKeys: [apikey],
});

export const authorizerUrl = apiWithAuthorizer.url;
