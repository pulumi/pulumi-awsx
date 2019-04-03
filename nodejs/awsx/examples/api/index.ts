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

const policy: aws.iam.PolicyDocument = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sts:AssumeRole",
            "Principal": {
                "Service": ["lambda.amazonaws.com", "apigateway.amazonaws.com"],
            },
            "Effect": "Allow",
            "Sid": "",
        },
    ],
};
const role = new aws.iam.Role("mylambda-role", {
    assumeRolePolicy: JSON.stringify(policy),
});

const authorizerPolicy: aws.iam.PolicyDocument = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sts:AssumeRole",
            "Principal": {
                "Service": ["lambda.amazonaws.com"],
            },
            "Effect": "Allow",
            "Sid": "",
        },
    ],
};
const authorizerRole = new aws.iam.Role("myauthorizer-role", {
    assumeRolePolicy: JSON.stringify(authorizerPolicy),
});

// TODO: is this needed?
// const fullAccess = new aws.iam.RolePolicyAttachment("mylambda-access", {
//     role: role,
//     policyArn: aws.iam.AWSLambdaFullAccess,
// });

const lambda = new aws.lambda.Function("myfunction", {
    code: new pulumi.asset.FileArchive("./afunction"),
    role: role.arn,
    handler: "index.handler",
    runtime: aws.lambda.NodeJS8d10Runtime,
});

const region = aws.config.requireRegion();

const authorizerLambda = new aws.lambda.Function("ekrengel-authorizerLambda", {
    code: new pulumi.asset.FileArchive("./authfunction"),
    role: authorizerRole.arn,
    handler: "index.handler",
    runtime: aws.lambda.NodeJS8d10Runtime,
});

// Give the lambda role permission to invoke the Authorizer
const invocationPolicy = new aws.iam.RolePolicy("invocation_policy", {
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
    role: role.id,
});

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
        authorizers: [{
            parameterName: "auth",
            parameterLocation: "query",
            "x-amazon-apigateway-authtype": "custom",
            "x-amazon-apigateway-authorizer": {
                type: "request",
                authorizerUri: pulumi.interpolate`arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${authorizerLambda.arn}/invocations`,
                authorizerCredentials: role.arn,
                identitySource: "method.request.querystring.auth",
            },
        }],
    }, {
        path: "/www",
        localPath: "www",
        requiredParameters: [{
            name: "key",
            in: "query",
        }],
        /**
         * These parameters will not actually be required since the method level validator is
         * set to only validate the body.
         */
        requestValidator: "BODY_ONLY", // This will override the API level requestValidator.
    }, {
        path: "/www_old",
        localPath: "www",
        authorizers: [{
            parameterName: "auth",
            parameterLocation: "query",
            "x-amazon-apigateway-authtype": "custom",
            "x-amazon-apigateway-authorizer": {
                type: "request",
                authorizerUri: pulumi.interpolate`arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${authorizerLambda.arn}/invocations`,
                authorizerCredentials: role.arn,
                identitySource: "method.request.querystring.auth",
            },
        }],
    }],
    requestValidator: "ALL",
});

export const url = api.url;
