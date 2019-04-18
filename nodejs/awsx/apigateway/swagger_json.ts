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

// All the typings for the swagger json blob we need to create for an API. These typings are purely
// so we do the json conversion properly as it's very easy to screw up if using things like the
// 'any' type.

export interface SwaggerSpec {
    swagger: string;
    info: SwaggerInfo;
    paths: { [path: string]: { [method: string]: SwaggerOperation; }; };
    "x-amazon-apigateway-binary-media-types"?: string[];
    "x-amazon-apigateway-gateway-responses": Record<string, SwaggerGatewayResponse>;
    securityDefinitions?: { [securityDefinitionName: string]: SecurityDefinition };
    "x-amazon-apigateway-request-validators"?: {
        [validatorName: string]: {
            validateRequestBody: boolean;
            validateRequestParameters: boolean;
        };
    };
    "x-amazon-apigateway-request-validator"?: RequestValidator;
    "x-amazon-apigateway-api-key-source"?: APIKeySource;
}

export interface SwaggerGatewayResponse {
    statusCode: number;
    responseTemplates: {
        "application/json": string,
    };
}

export interface SwaggerInfo {
    title: string;
    version: string;
}

export interface SwaggerOperation {
    parameters?: SwaggerParameter[];
    responses?: { [code: string]: SwaggerResponse };
    "x-amazon-apigateway-integration": ApigatewayIntegration;
    "x-amazon-apigateway-request-validator"?: RequestValidator;

    /**
    * security is an object whose properties are securityDefinitionName. Each securityDefinitionName
    * refers to a SecurityDefinition, defined at the top level of the swagger definition, by matching
    * a Security Definition's name property. The securityDefinitionNames' values are empty arrays.
    */
    security?: { [securityDefinitionName: string]: string[] }[];
}

export interface SecurityDefinition {
    type: "apiKey";
    name: string;
    in: "header" | "query";
    "x-amazon-apigateway-authtype"?: string;
    "x-amazon-apigateway-authorizer"?: SwaggerLambdaAuthorizer;
}

export interface SwaggerLambdaAuthorizer {
    type: "token" | "request";
    authorizerUri: pulumi.Input<string>;
    authorizerCredentials: pulumi.Input<string>;
    identitySource?: string;
    identityValidationExpression?: string;
    authorizerResultTtlInSeconds?: number;
}

export interface SwaggerParameter {
    name: string;
    in: string;
    required: boolean;
    type?: string;
}

export interface SwaggerResponse {
    description: string;
    schema?: SwaggerSchema;
    headers?: { [header: string]: SwaggerHeader };
}

export interface SwaggerSchema {
    type: string;
}

export interface SwaggerHeader {
    type: "string" | "number" | "integer" | "boolean" | "array";
    items?: SwaggerItems;
}

export interface SwaggerItems {
    type: "string" | "number" | "integer" | "boolean" | "array";
    items?: SwaggerItems;
}

export interface SwaggerAPIGatewayIntegrationResponse {
    statusCode: string;
    responseParameters?: { [key: string]: string };
}

export interface ApigatewayIntegration {
    requestParameters?: any;
    passthroughBehavior?: pulumi.Input<IntegrationPassthroughBehavior>;
    httpMethod: pulumi.Input<Method>;
    type: pulumi.Input<IntegrationType>;
    responses?: { [pattern: string]: SwaggerAPIGatewayIntegrationResponse };
    uri: pulumi.Input<string>;
    connectionType?: pulumi.Input<IntegrationConnectionType | undefined>;
    connectionId?: pulumi.Input<string | undefined>;
    credentials?: pulumi.Output<string>;
}

export type Method = "ANY" | "GET" | "PUT" | "POST" | "DELETE" | "PATCH";
export type IntegrationConnectionType = "INTERNET" | "VPC_LINK";
export type IntegrationType = "aws" | "aws_proxy" | "http" | "http_proxy" | "mock";
export type IntegrationPassthroughBehavior = "when_no_match" | "when_no_templates" | "never";
export type RequestValidator = "ALL" | "PARAMS_ONLY" | "BODY_ONLY";
export type APIKeySource = "HEADER" | "AUTHORIZER";
