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

import * as fs from "fs";
import * as mime from "mime";
import * as fspath from "path";

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as awslambda from "aws-lambda";

import { getRegion, ifUndefined, sha1hash } from "../utils";

import { apiKeySecurityDefinition } from "./apikey";
import * as cognitoAuthorizer from "./cognitoAuthorizer";
import * as lambdaAuthorizer from "./lambdaAuthorizer";
import * as reqvalidation from "./requestValidator";
import {
    APIKeySource,
    IntegrationConnectionType,
    IntegrationPassthroughBehavior,
    IntegrationType,
    Method,
    RequestValidator,
    SwaggerCognitoAuthorizer,
    SwaggerGatewayResponse,
    SwaggerLambdaAuthorizer,
    SwaggerOperation,
    SwaggerSpec,
} from "./swagger_json";

export type Request = awslambda.APIGatewayProxyEvent;

export type RequestContext = awslambda.APIGatewayEventRequestContext;

export type Response = awslambda.APIGatewayProxyResult;

/**
 * A route that that APIGateway should accept and forward to some type of destination. All routes
 * have an incoming path that they match against.  However, destinations are determined by the kind
 * of the route.  See [EventHandlerRoute], [StaticRoute], [IntegrationRoute] and [RawJsonRoute] for
 * additional details.
 */
export type Route = EventHandlerRoute | StaticRoute | IntegrationRoute | RawDataRoute;

/**
 * Subset of `Route` types that can be passed in as an `Output` to the API.  These Route types will
 * not themselves cause other Resources to be created.
 *
 * Unlike `routes`, these can be provided as an `Output` of an `array` instead of having to just be
 * an `array`. However, because they can be `Output`s, they are restricted to a subset of `Route`
 * types that will not cause resources to be created.
 *
 * This can be useful, for example, when creating an API that needs to create an indeterminate
 * number of integration-routes based on the `Output` of some other resource.  For example:
 *
 * ```ts
 * const additionalRoutes = elasticBeanstalkEnvironment.loadBalancers.apply(lbs =>
 *   lbs.map(arn => <awsx.apigateway.IntegrationRoute>{
 *     path: "/greeting",
 *     method: "GET",
 *     target: {
 *         type: "http_proxy",
 *         uri: `http://${aws.lb.getLoadBalancer({ arn }).dnsName}`,
 *     }
 *   }));
 *
 * const api = new awsx.apigateway.API("apiName", { additionalRoutes });
 * ```
 *
 * In this example computing all of the individual `additionalRoutes` depends on the individual
 * array values in `elasticBeanstalkEnvironment.loadBalancers` (which is itself an `Output`).  These
 * could not normally be converted into the reified `Route[]` array since computing a value off of
 * an `Output` produces yet another `Output`.  `routes` itself cannot be an `Output` because it will
 * often create additional AWS resources, and creating those resources dependent on some other
 * resource value would mean not being able to create and present a preview plan because the actual
 * resources created would depend on previous resources.
 *
 * So `additionalRoutes` serves as a way to bridge both approaches.  `Routes` is used when the
 * values are known up-front (or when it would cause Resources to be created).  `additionalRoutes`
 * is used when values are not a-priori known, and when they will not create additional Resources
 * themselves.
 */
export type AdditionalRoute = IntegrationRoute | RawDataRoute;

export interface BaseRoute {
    /**
     * Required Parameters to validate. If the request validator is set to ALL or PARAMS_ONLY, api
     * gateway will validate these before sending traffic to the event handler.
     */
    requiredParameters?: reqvalidation.Parameter[];

    /**
    * Request Validator specifies the validator to use at the method level. This will override anything
    * defined at the API level.
    */
    requestValidator?: RequestValidator;

    /**
     * If true, an API key will be required for this route. The source for the API Key can be set at
     * the API level and by default, the source will be the HEADER.
     */
    apiKeyRequired?: boolean;

    /**
     * Authorizers allows you to define Lambda authorizers be applied for authorization when the
     * the route is called.
     */
    authorizers?: Authorizer[] | Authorizer;
}

export interface EventHandlerRoute extends BaseRoute {
    /**
     * The path on the API that will invoke the provided [eventHandler].  If not prefixed with `/`,
     * then a `/` will be added automatically to the beginning.
     */
    path: string;
    method: Method;
    eventHandler: aws.lambda.EventHandler<Request, Response>;
}

type Authorizer = lambdaAuthorizer.LambdaAuthorizer | cognitoAuthorizer.CognitoAuthorizer;

function isEventHandler(route: Route): route is EventHandlerRoute {
    return (<EventHandlerRoute>route).eventHandler !== undefined;
}

/**
 * StaticRoute is a route that will map from an incoming path to the files/directories specified by
 * [localPath].
 */
export interface StaticRoute extends BaseRoute {
    /**
     * The path on the API that will map to files in [localPath].  If not prefixed with `/`, then a
     * `/` will be added automatically to the beginning.
     */
    path: string;
    /**
     * The local path on disk to create static S3 resources for.  Files will be uploaded into S3
     * objects, and directories will be recursively walked into.
     */
    localPath: string;

    /**
     * The `content-type` to serve the file as.  Only valid when localPath points to a file.  If
     * localPath points to a directory, the content types for all files will be inferred.
     */
    contentType?: string;

    /**
     * By default API.static will also serve 'index.html' in response to a request on a directory.
     * To disable this set false or to supply a new index pass an appropriate name.
     */
    index?: boolean | string;
}

function isStaticRoute(route: Route): route is StaticRoute {
    return (<StaticRoute>route).localPath !== undefined;
}

/**
 * An apigateway route for an integration.
 * https://docs.aws.amazon.com/apigateway/api-reference/resource/integration/ for more details.
 */
export interface IntegrationRoute extends BaseRoute {
    /**
     * The path on the API that will invoke the provided [target].  If not prefixed with `/`, then a
     * `/` will be added automatically to the beginning.
     */
    path: string;
    target: pulumi.Input<IntegrationTarget> | IntegrationRouteTargetProvider;
}

/**
 * See https://docs.aws.amazon.com/apigateway/api-reference/resource/integration/ for more details.
 */
export interface IntegrationTarget {
    /**
     * Specifies an API method integration type. The valid value is one of the following:
     *
     * aws: for integrating the API method request with an AWS service action, including the Lambda
     * function-invoking action. With the Lambda function-invoking action, this is referred to as
     * the Lambda custom integration. With any other AWS service action, this is known as AWS
     * integration.
     *
     * aws_proxy: for integrating the API method request with the Lambda function-invoking action
     * with the client request passed through as-is. This integration is also referred to as the
     * Lambda proxy integration.
     *
     * http: for integrating the API method request with an HTTP endpoint, including a private HTTP
     * endpoint within a VPC. This integration is also referred to as the HTTP custom integration.
     *
     * http_proxy: for integrating the API method request with an HTTP endpoint, including a private
     * HTTP endpoint within a VPC, with the client request passed through as-is. This is also
     * referred to as the HTTP proxy integration.
     *
     * mock: for integrating the API method request with API Gateway as a "loop-back" endpoint
     * without invoking any backend.
     */
    type: pulumi.Input<IntegrationType>;

    /**
     * Specifies the integration's HTTP method type.  Currently, the only supported type is 'ANY'.
     */
    httpMethod?: "ANY";

    /**
     * Specifies Uniform Resource Identifier (URI) of the integration endpoint.
     *
     * For HTTP or HTTP_PROXY integrations, the URI must be a fully formed, encoded HTTP(S) URL
     * according to the RFC-3986 specification, for either standard integration, where
     * connectionType is not VPC_LINK, or private integration, where connectionType is VPC_LINK. For
     * a private HTTP integration, the URI is not used for routing.
     *
     * For AWS or AWS_PROXY integrations, the URI is of the form
     * arn:aws:apigateway:{region}:{subdomain.service|service}:path|action/{service_api}. Here,
     * {Region} is the API Gateway region (e.g., us-east-1); {service} is the name of the integrated
     * AWS service (e.g., s3); and {subdomain} is a designated subdomain supported by certain AWS
     * service for fast host-name lookup. action can be used for an AWS service action-based API,
     * using an Action={name}&{p1}={v1}&p2={v2}... query string. The ensuing {service_api} refers to
     * a supported action {name} plus any required input parameters. Alternatively, path can be used
     * for an AWS service path-based API. The ensuing service_api refers to the path to an AWS
     * service resource, including the region of the integrated AWS service, if applicable. For
     * example, for integration with the S3 API of GetObject, the uri can be either
     * arn:aws:apigateway:us-west-2:s3:action/GetObject&Bucket={bucket}&Key={key} or
     * arn:aws:apigateway:us-west-2:s3:path/{bucket}/{key}
     */
    uri: pulumi.Input<string>;

    /**
     * The type of the network connection to the integration endpoint. The valid value is INTERNET
     * for connections through the public routable internet or VPC_LINK for private connections
     * between API Gateway and a network load balancer in a VPC. The default value is INTERNET.
     */
    connectionType?: pulumi.Input<IntegrationConnectionType>;

    /**
     * The (id) of the VpcLink used for the integration when connectionType=VPC_LINK and undefined,
     * otherwise.
     */
    connectionId?: pulumi.Input<string>;

    /**
     * Specifies how the method request body of an unmapped content type will be passed through the
     * integration request to the back end without transformation.
     *
     * The valid value is one of the following:
     *
     * WHEN_NO_MATCH: passes the method request body through the integration request to the back end
     * without transformation when the method request content type does not match any content type
     * associated with the mapping templates defined in the integration request.
     *
     * WHEN_NO_TEMPLATES: passes the method request body through the integration request to the back
     * end without transformation when no mapping template is defined in the integration request. If
     * a template is defined when this option is selected, the method request of an unmapped
     * content-type will be rejected with an HTTP 415 Unsupported Media Type response.
     *
     * NEVER: rejects the method request with an HTTP 415 Unsupported Media Type response when
     * either the method request content type does not match any content type associated with the
     * mapping templates defined in the integration request or no mapping template is defined in the
     * integration request.
     *
     * Defaults to 'WHEN_NO_MATCH' if unspecified.
     */
    passthroughBehavior?: pulumi.Input<IntegrationPassthroughBehavior>;
}

export interface IntegrationRouteTargetProvider {
    target(name: string, parent: pulumi.Resource): pulumi.Input<IntegrationTarget>;
}

function isIntegrationRouteTargetProvider(obj: any): obj is IntegrationRouteTargetProvider {
    return (<IntegrationRouteTargetProvider>obj).target instanceof Function;
}

function isIntegrationRoute(route: Route): route is IntegrationRoute {
    return (<IntegrationRoute>route).target !== undefined;
}

/**
 * Fallback route for when raw swagger control is desired.  The [data] field should be a javascript
 * object that will be then included in the final swagger specification like so:
 *
 * `"paths": { [path]: { [method]: data } }`
 *
 * This value will be JSON.stringify'd as part of normal processing.  It should not be passed as
 * string here.
 */
export type RawDataRoute = {
    /**
     * The path on the API that will return the provided [data].  If not prefixed with `/`, then a
     * `/` will be added automatically to the beginning.
     */
    path: string;
    method: Method;
    data: any;
};

function isRawDataRoute(route: Route): route is RawDataRoute {
    return (<RawDataRoute>route).data !== undefined;
}

export interface Endpoint {
    hostname: string;
    port: number;
    loadBalancer: aws.lb.LoadBalancer;
}

export interface APIArgs {
    /**
     * Routes to use to initialize the APIGateway.  These will be used to create the Swagger
     * specification for the API.
     *
     * Either [swaggerString] or [routes] or [additionalRoutes] must be specified.  [routes] can be
     * provided along with [additionalRoutes].
     */
    routes?: Route[];

    /**
     * Routes to use to initialize the APIGateway.  These will be used to create the Swagger
     * specification for the API.
     *
     * Either [swaggerString] or [routes] or [additionalRoutes] must be specified.  [routes] can be
     * provided along with [additionalRoutes].
     */
    additionalRoutes?: pulumi.Input<pulumi.Input<AdditionalRoute>[]>;

    /**
     * A Swagger specification already in string form to use to initialize the APIGateway.  Note
     * that you must manually provide permission for any route targets to be invoked by API Gateway
     * when using [swaggerString].
     *
     * Either [swaggerString] or [routes] must be specified.
     */
    swaggerString?: pulumi.Input<string>;

    /**
     * The stage name for your API. This will get added as a base path to your API url.
     */
    stageName?: pulumi.Input<string>;

    /**
    * Request Validator specifies the validator to use at the API level. Note method level validators
    * override this.
    */
    requestValidator?: RequestValidator;

    /**
     * The source for the apikey. This can either be a HEADER or AUTHORIZER. If [apiKeyRequired] is
     * set to true on a route, and this is not defined the value will default to HEADER.
     */
    apiKeySource?: APIKeySource;

    /**
     * Bucket to use for placing resources for static resources.  If not provided a default one will
     * be created on your behalf if any [StaticRoute]s are provided.
     */
    staticRoutesBucket?: aws.s3.Bucket | aws.s3.BucketArgs;

    /**
     * Define custom gateway responses for the API. This can be used to properly enable
     * CORS for Lambda Authorizers.
     */
    gatewayResponses?: Record<string, SwaggerGatewayResponse>;

    /**
     * Additional optional args that can be passed along to the aws.apigateway.RestApi created by the
     * awsx.apigateway.API.
     */
    restApiArgs?: RestApiArgs;

    /**
     * Additional optional args that can be passed along to the aws.apigateway.Stage created by the
     * awsx.apigateway.API.
     */
    stageArgs?: StageArgs;

    /**
     * Additional optional args that can be passed along to the aws.apigateway.Deployment created by
     * the awsx.apigateway.API.
     */
    deploymentArgs?: DeploymentArgs;
}

/**
 * Additional optional args that can be passed along to the RestApi created by the
 * awsx.apigateway.API.
 */
export interface RestApiArgs {
    /**
     * The name of the REST API.  Defaults to the name of the awsx.apigateway.Api if unspecified.
     */
    name?: pulumi.Input<string>;

    /**
     * The list of binary media types supported by the RestApi. Defaults to `* / *` if unspecified.
     */
    binaryMediaTypes?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The source of the API key for requests. Valid values are HEADER (default) and AUTHORIZER.
     */
    apiKeySource?: pulumi.Input<string>;
    /**
     * The description of the REST API
     */
    description?: pulumi.Input<string>;
    /**
     * Nested argument defining API endpoint configuration including endpoint type. Defined below.
     */
    endpointConfiguration?: pulumi.Input<aws.types.input.apigateway.RestApiEndpointConfiguration>;
    /**
     * Minimum response size to compress for the REST API. Integer between -1 and 10485760 (10MB). Setting a value greater than -1 will enable compression, -1 disables compression (default).
     */
    minimumCompressionSize?: pulumi.Input<number>;
    /**
     * JSON formatted policy document that controls access to the API Gateway.
     */
    policy?: pulumi.Input<string>;
}

/**
 * Additional optional args that can be passed along to the Stage created by the
 * awsx.apigateway.API.
 */
export interface StageArgs {
    /**
     * Enables access logs for the API stage. Detailed below.
     */
    accessLogSettings?: pulumi.Input<aws.types.input.apigateway.StageAccessLogSettings>;
    /**
     * Specifies whether a cache cluster is enabled for the stage
     */
    cacheClusterEnabled?: pulumi.Input<boolean>;
    /**
     * The size of the cache cluster for the stage, if enabled.
     * Allowed values include `0.5`, `1.6`, `6.1`, `13.5`, `28.4`, `58.2`, `118` and `237`.
     */
    cacheClusterSize?: pulumi.Input<string>;
    /**
     * The identifier of a client certificate for the stage.
     */
    clientCertificateId?: pulumi.Input<string>;
    /**
     * The description of the stage
     */
    description?: pulumi.Input<string>;
    /**
     * The version of the associated API documentation
     */
    documentationVersion?: pulumi.Input<string>;
    /**
     * A mapping of tags to assign to the resource.
     */
    tags?: pulumi.Input<{ [key: string]: any; }>;
    /**
     * A map that defines the stage variables
     */
    variables?: pulumi.Input<{ [key: string]: any; }>;
    /**
     * Whether active tracing with X-ray is enabled. Defaults to `false`.
     */
    xrayTracingEnabled?: pulumi.Input<boolean>;
}

/**
 * Additional optional args that can be passed along to the Deployment created by the
 * awsx.apigateway.API.
 */
export interface DeploymentArgs {
    /**
     * The description of the deployment
     */
    description?: pulumi.Input<string>;
    /**
     * The description of the stage
     */
    stageDescription?: pulumi.Input<string>;
}

export class API extends pulumi.ComponentResource {
    public readonly restAPI: aws.apigateway.RestApi;
    public readonly deployment: aws.apigateway.Deployment;
    public readonly stage: aws.apigateway.Stage;

    /**
     * Bucket where static resources were placed.  Only set if a Bucket was provided to the API at
     * construction time, or if there were any [StaticRoute]s passed to the API.
     */
    public readonly staticRoutesBucket?: aws.s3.Bucket;

    public readonly url: pulumi.Output<string>;

    private readonly swaggerLambdas: SwaggerLambdas;

    constructor(name: string, args: APIArgs, opts: pulumi.ComponentResourceOptions = {}) {
        super("aws:apigateway:x:API", name, {}, opts);

        let swaggerString: pulumi.Output<string>;
        let swaggerLambdas: SwaggerLambdas | undefined;
        let title: pulumi.Output<string>;
        if (args.swaggerString) {
            const swaggerSpec = pulumi.output(args.swaggerString).apply(s => {
                const spec = JSON.parse(s);
                if (spec.info === undefined) {
                    spec.info = {};
                }
                if (spec.info.title === undefined) {
                    spec.info.title = name;
                }
                return <SwaggerSpec>spec;
            });
            title = swaggerSpec.info.title;
            swaggerString = swaggerSpec.apply(s => JSON.stringify(s));
        }
        else if (args.routes || args.additionalRoutes) {
            const result = createSwaggerSpec(
                this, name, args.routes || [], pulumi.output(args.additionalRoutes || []),
                args.gatewayResponses, args.requestValidator, args.apiKeySource, args.staticRoutesBucket);

            title = pulumi.output(name);
            swaggerString = result.swagger;
            swaggerLambdas = result.swaggerLambdas;
            this.staticRoutesBucket = result.staticRoutesBucket;
        }
        else {
            throw new pulumi.ResourceError(
                "API must specify either [swaggerString] or as least one of the [route] options.", opts.parent);
        }

        const stageName = args.stageName || "stage";

        const restApiArgs = args.restApiArgs || {};
        // Create the API Gateway Rest API, using a swagger spec.
        this.restAPI = new aws.apigateway.RestApi(name, {
            ...args.restApiArgs,
            name: ifUndefined(restApiArgs.name, title),
            binaryMediaTypes: ifUndefined(restApiArgs.binaryMediaTypes, ["*/*"]),
            body: swaggerString,
        }, { parent: this });

        // Account for all potential REST API Args that should trigger a redeployment
        const version =
            pulumi.all([this.restAPI.apiKeySource, this.restAPI.binaryMediaTypes, this.restAPI.endpointConfiguration, this.restAPI.minimumCompressionSize, this.restAPI.policy, swaggerString ])
                  .apply(([apiKey, binaryMediaTypes, endpointConfig, minimumCompression, policy, swagger ]) =>
                        sha1hash(JSON.stringify({apiKey, binaryMediaTypes, endpointConfig, minimumCompression, policy, swagger })));

        // Create a deployment of the Rest API.
        this.deployment = new aws.apigateway.Deployment(name, {
            ...args.deploymentArgs,
            restApi: this.restAPI,
            // Note: Set to empty to avoid creating an implicit stage, we'll create it explicitly below instead.
            stageName: "",
            // Note: We set `variables` here because it forces recreation of the Deployment object
            // whenever the body hash changes.  Because we use a blank stage name above, there will
            // not actually be any stage created in AWS, and thus these variables will not actually
            // end up anywhere.  But this will still cause the right replacement of the Deployment
            // when needed.  The Stage allocated below will be the stable stage that always points
            // to the latest deployment of the API.
            variables: { version },
        }, { parent: this });

        this.swaggerLambdas = swaggerLambdas || new Map();
        const permissions = createLambdaPermissions(this, name, this.swaggerLambdas);

        // Expose the URL that the API is served at.
        this.url = pulumi.interpolate`${this.deployment.invokeUrl}${stageName}/`;

        // Create a stage, which is an addressable instance of the Rest API. Set it to point at the latest deployment.
        this.stage = new aws.apigateway.Stage(name, {
            ...args.stageArgs,
            restApi: this.restAPI,
            deployment: this.deployment,
            stageName: stageName,
        }, { parent: this, dependsOn: permissions });


        this.registerOutputs();
    }

    /**
     * Returns the [aws.lambda.Function] an [EventHandlerRoute] points to.  This will either be for
     * the aws.lambda.Function created on your behalf if the route was passed a normal
     * JavaScript/Typescript function, or it will be the [aws.lambda.Function] that was explicitly
     * passed in.
     *
     * [route] and [method] can both be elided if this API only has a single [EventHandlerRoute]
     * assigned to it.
     *
     * [method] can be elided if [route] only has a single [EventHandlerRoute] assigned to it.
     *
     * This method will throw if the provided [route] and [method] do not resolve to a single
     * [aws.lambda.Function]
     */
    public getFunction(route?: string, method?: Method): aws.lambda.Function {
        const methods = this.getMethods(route);
        if (!methods || methods.size === 0) {
            throw new pulumi.ResourceError(`Route '${route}' has no methods defined for it`, this);
        }

        if (!method) {
            if (methods.size === 1) {
                for (const m of methods.values()) {
                    return m;
                }
            }

            throw new pulumi.ResourceError(`Route '${route}' has multiple methods defined for it.  Please provide [method].`, this);
        }

        const result = methods.get(method);
        if (!result) {
            throw new pulumi.ResourceError(`Route '${route}' does not have method '${method}' defined for it`, this);
        }

        return result;
    }

    private getMethods(route: string | undefined) {
        if (route === undefined) {
            if (this.swaggerLambdas.size === 0) {
                throw new pulumi.ResourceError(`This Api has no routes to any Functions.`, this);
            }

            if (this.swaggerLambdas.size === 1) {
                for (const map of this.swaggerLambdas.values()) {
                    return map;
                }
            }

            throw new pulumi.ResourceError(`[route] must be provided as this Api defines multiple routes with Functions.`, this);
        }

        return this.swaggerLambdas.get(route);
    }
}

function createLambdaPermissions(api: API, name: string, swaggerLambdas: SwaggerLambdas) {
    const permissions: aws.lambda.Permission[] = [];
    for (const [path, lambdas] of swaggerLambdas) {
        for (const [method, lambda] of lambdas) {
            const methodAndPath = `${method === "ANY" ? "*" : method}${path}`;

            permissions.push(new aws.lambda.Permission(name + "-" + sha1hash(methodAndPath), {
                action: "lambda:invokeFunction",
                function: lambda,
                principal: "apigateway.amazonaws.com",
                // We give permission for this function to be invoked by any stage at the given method and
                // path on the API. We allow any stage instead of encoding the one known stage that will be
                // deployed by Pulumi because the API Gateway console "Test" feature invokes the route
                // handler with the fake stage `test-invoke-stage`.
                sourceArn: pulumi.interpolate`${api.deployment.executionArn}*/${methodAndPath}`,
            }, { parent: api }));
        }
    }

    return permissions;
}

type SwaggerLambdas = Map<string, Map<Method, aws.lambda.Function>>;

function createSwaggerSpec(
    api: API,
    name: string,
    routes: Route[],
    additionalRoutes: pulumi.Input<pulumi.Input<AdditionalRoute>[]>,
    gatewayResponses: Record<string, SwaggerGatewayResponse> | undefined,
    requestValidator: RequestValidator | undefined,
    apikeySource: APIKeySource | undefined,
    bucketOrArgs: aws.s3.Bucket | aws.s3.BucketArgs | undefined) {

    // Default API Key source to "HEADER"
    apikeySource = apikeySource || "HEADER";

    // Set up the initial swagger spec.
    const swagger: SwaggerSpec = {
        swagger: "2.0",
        info: { title: name, version: "1.0" },
        paths: {},
        "x-amazon-apigateway-binary-media-types": ["*/*"],
        // Map paths the user doesn't have access to as 404.
        // http://docs.aws.amazon.com/apigateway/latest/developerguide/supported-gateway-response-types.html
        "x-amazon-apigateway-gateway-responses": generateGatewayResponses(gatewayResponses),
        "x-amazon-apigateway-api-key-source": apikeySource,
    };

    if (requestValidator) {
        swagger["x-amazon-apigateway-request-validators"] = {
            ALL: {
                validateRequestBody: true,
                validateRequestParameters: true,
            },
            BODY_ONLY: {
                validateRequestBody: true,
                validateRequestParameters: false,
            },
            PARAMS_ONLY: {
                validateRequestBody: false,
                validateRequestParameters: true,
            },
        };
        swagger["x-amazon-apigateway-request-validator"] = requestValidator;
    }

    const swaggerLambdas: SwaggerLambdas = new Map();

    // Now add all the routes to it.

    // Use this to track the API's authorizers and ensure any authorizers with the same name
    // reference the same authorizer.
    const apiAuthorizers: Record<string, Authorizer> = {};

    let staticRoutesBucket: aws.s3.Bucket | undefined;

    // First, process the routes that create contingent resources.
    for (const route of routes) {
        checkRoute(api, route, "path");

        // We allow paths to be provided that don't start with / just for convenience. But we always
        // normalize them internally to start with / as that it what swagger requires.
        if (!route.path.startsWith("/")) {
            route.path = "/" + route.path;
        }

        if (isEventHandler(route)) {
            addEventHandlerRouteToSwaggerSpec(api, name, swagger, swaggerLambdas, route, apiAuthorizers);
        }
        else if (isStaticRoute(route)) {
            if (!staticRoutesBucket) {
                staticRoutesBucket = pulumi.Resource.isInstance(bucketOrArgs)
                    ? bucketOrArgs
                    : new aws.s3.Bucket(safeS3BucketName(name), bucketOrArgs, { parent: api });
            }

            addStaticRouteToSwaggerSpec(api, name, swagger, route, staticRoutesBucket, apiAuthorizers);
        }
        else if (isIntegrationRoute(route) || isRawDataRoute(route)) {
            addIntegrationOrRawDataRouteToSwaggerSpec(route);
        }
        else {
            const exhaustiveMatch: never = route;
            throw new Error("Non-exhaustive match for route");
        }
    }

    const swaggerText = pulumi.all([swagger, additionalRoutes]).apply(
        ([_, routes]) => {
            for (const route of routes) {
                addIntegrationOrRawDataRouteToSwaggerSpec(route);
            }

            return pulumi.output(swagger).apply(s => JSON.stringify(s));
        });

    return { swagger: swaggerText, swaggerLambdas, staticRoutesBucket };

    function addIntegrationOrRawDataRouteToSwaggerSpec(route: IntegrationRoute | RawDataRoute): void {
        if (isIntegrationRoute(route)) {
            addIntegrationRouteToSwaggerSpec(api, name, swagger, route, apiAuthorizers);
        } else {
            addRawDataRouteToSwaggerSpec(api, name, swagger, route);
        }
    }
}

function generateGatewayResponses(responses: Record<string, SwaggerGatewayResponse> | undefined): Record<string, SwaggerGatewayResponse> {
    responses = responses || {};
    if (!responses["MISSING_AUTHENTICATION_TOKEN"]) {
        responses["MISSING_AUTHENTICATION_TOKEN"] = {
            "statusCode": 404,
            "responseTemplates": {
                "application/json": "{\"message\": \"404 Not found\" }",
            },
        };
    }
    if (!responses["ACCESS_DENIED"]) {
        responses["ACCESS_DENIED"] = {
            "statusCode": 404,
            "responseTemplates": {
                "application/json": "{\"message\": \"404 Not found\" }",
            },
        };
    }
    return responses;
}

function addSwaggerOperation(swagger: SwaggerSpec, path: string, method: string, operation: SwaggerOperation) {
    if (!swagger.paths[path]) {
        swagger.paths[path] = {};
    }

    swagger.paths[path][method] = operation;
}

function checkRoute<TRoute>(api: API, route: TRoute, propName: keyof TRoute) {
    if (route[propName] === undefined) {
        throw new pulumi.ResourceError(`Route missing required [${propName}] property`, api);
    }
}

function addEventHandlerRouteToSwaggerSpec(
    api: API, name: string,
    swagger: SwaggerSpec,
    swaggerLambdas: SwaggerLambdas,
    route: EventHandlerRoute,
    apiAuthorizers: Record<string, Authorizer>) {

    checkRoute(api, route, "eventHandler");
    checkRoute(api, route, "method");

    const method = swaggerMethod(route.method);
    const lambda = aws.lambda.createFunctionFromEventHandler(
        name + sha1hash(method + ":" + route.path), route.eventHandler, { parent: api });

    const swaggerOperation = createSwaggerOperationForLambda();
    addBasePathOptionsToSwagger(api, swagger, swaggerOperation, route, apiAuthorizers);
    addSwaggerOperation(swagger, route.path, method, swaggerOperation);

    let lambdas = swaggerLambdas.get(route.path);
    if (!lambdas) {
        lambdas = new Map();
        swaggerLambdas.set(route.path, lambdas);
    }

    lambdas.set(route.method, lambda);
    return;

    function createSwaggerOperationForLambda(): SwaggerOperation {
        const region = getRegion(api);
        const uri = pulumi.interpolate
            `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambda.arn}/invocations`;

        return {
            "x-amazon-apigateway-integration": {
                uri,
                passthroughBehavior: "when_no_match",
                httpMethod: "POST",
                type: "aws_proxy",
            },
        };
    }
}

function addBasePathOptionsToSwagger(
    api: API,
    swagger: SwaggerSpec,
    swaggerOperation: SwaggerOperation,
    route: BaseRoute,
    apiAuthorizers: Record<string, Authorizer>) {

    if (route.authorizers) {
        const authRecords = addAuthorizersToSwagger(api, swagger, route.authorizers, apiAuthorizers);
        addAuthorizersToSwaggerOperation(swaggerOperation, authRecords);
    }
    if (route.requiredParameters) {
        addRequiredParametersToSwaggerOperation(swaggerOperation, route.requiredParameters);
    }
    if (route.requestValidator) {
        swaggerOperation["x-amazon-apigateway-request-validator"] = route.requestValidator;
    }
    if (route.apiKeyRequired) {
        addAPIkeyToSecurityDefinitions(swagger);
        addAPIKeyToSwaggerOperation(swaggerOperation);
    }
}

function addAPIkeyToSecurityDefinitions(swagger: SwaggerSpec) {
    swagger.securityDefinitions = swagger.securityDefinitions || {};

    if (swagger.securityDefinitions["api_key"] && swagger.securityDefinitions["api_key"] !== apiKeySecurityDefinition) {
        throw new Error("Defined a non-apikey security definition with the name api_key");
    }
    swagger.securityDefinitions["api_key"] = apiKeySecurityDefinition;
}

function addAPIKeyToSwaggerOperation(swaggerOperation: SwaggerOperation) {
    swaggerOperation.security = swaggerOperation.security || [];
    swaggerOperation.security.push({
        ["api_key"]: [],
    });
}

function addAuthorizersToSwagger(
    api: API,
    swagger: SwaggerSpec,
    authorizers: Authorizer[] | Authorizer,
    apiAuthorizers: Record<string, Authorizer>): Record<string, string[]>[] {

    const authRecords: Record<string, string[]>[] = [];
    swagger.securityDefinitions = swagger.securityDefinitions || {};

    authorizers = Array.isArray(authorizers) ? authorizers : [authorizers];

    for (const auth of authorizers) {
        const suffix = Object.keys(swagger.securityDefinitions).length;
        const authName = auth.authorizerName || `${swagger.info.title}-authorizer-${suffix}`;
        auth.authorizerName = authName;

        // Check API authorizers - if its a new authorizer add it to the apiAuthorizers
        // if the name already exists, we check that the authorizer references the same authorizer
        if (!apiAuthorizers[authName]) {
            apiAuthorizers[authName] = auth;
        } else if (apiAuthorizers[authName] !== auth) {
            throw new Error("Two different authorizers using the same name: " + authName);
        }

        // Add security definition if it's a new authorizer
        if (!swagger.securityDefinitions[auth.authorizerName]) {

            swagger.securityDefinitions[authName] = {
                type: "apiKey",
                name: auth.parameterName,
                in: lambdaAuthorizer.isLambdaAuthorizer(auth) ? auth.parameterLocation : "header",
                "x-amazon-apigateway-authtype": lambdaAuthorizer.isLambdaAuthorizer(auth) ? auth.authType : "cognito_user_pools",
                "x-amazon-apigateway-authorizer": lambdaAuthorizer.isLambdaAuthorizer(auth)
                    ? getLambdaAuthorizer(api, authName, auth)
                    : getCognitoAuthorizer(auth.identitySource, auth.providerARNs),
            };
        }

        const methods = lambdaAuthorizer.isLambdaAuthorizer(auth) || !auth.methodsToAuthorize
            ? []
            : auth.methodsToAuthorize;

        authRecords.push({ [authName]: methods });
    }
    return authRecords;
}

function getCognitoPoolARNs(pools: (pulumi.Input<string> | aws.cognito.UserPool)[]): pulumi.Input<string>[] {
    const arns: pulumi.Input<string>[] = [];

    for (const pool of pools) {
        if (pulumi.CustomResource.isInstance(pool)) {
            arns.push(pool.arn);
        } else {
            arns.push(pool);
        }
    }
    return arns;
}

function getCognitoAuthorizer(identitySource: string[] | undefined, providerARNs: (pulumi.Input<string> | aws.cognito.UserPool)[]): SwaggerCognitoAuthorizer {
    return {
        type: "cognito_user_pools",
        identitySource: lambdaAuthorizer.getIdentitySource(identitySource),
        providerARNs: getCognitoPoolARNs(providerARNs),
    };
}

function getLambdaAuthorizer(api: API, authorizerName: string, authorizer: lambdaAuthorizer.LambdaAuthorizer): SwaggerLambdaAuthorizer {
    if (lambdaAuthorizer.isLambdaAuthorizerInfo(authorizer.handler)) {
        const identitySource = lambdaAuthorizer.getIdentitySource(authorizer.identitySource);

        let uri: pulumi.Input<string>;
        if (pulumi.CustomResource.isInstance(authorizer.handler.uri)) {
            uri = authorizer.handler.uri.invokeArn;
        } else {
            uri = authorizer.handler.uri;
        }

        let credentials: pulumi.Input<string>;
        if (pulumi.CustomResource.isInstance(authorizer.handler.credentials)) {
            credentials = authorizer.handler.credentials.arn;
        } else {
            credentials = authorizer.handler.credentials;
        }

        return {
            type: authorizer.type,
            authorizerUri: uri,
            authorizerCredentials: credentials,
            identitySource: identitySource,
            identityValidationExpression: authorizer.identityValidationExpression,
            authorizerResultTtlInSeconds: authorizer.authorizerResultTtlInSeconds,
        };
    }

    // We used to create the lambda and role in an unparented fashion.  Pass along an appropriate
    // alias to make sure that they can be parented to the api without causing replacements.
    const authorizerLambda = aws.lambda.createFunctionFromEventHandler(authorizerName, authorizer.handler, {
        parent: api,
        aliases: [{ parent: pulumi.rootStackResource }],
    });
    const role = lambdaAuthorizer.createRoleWithAuthorizerInvocationPolicy(authorizerName, authorizerLambda, {
        parent: api,
        aliases: [{ parent: pulumi.rootStackResource }],
    });

    const identitySource = lambdaAuthorizer.getIdentitySource(authorizer.identitySource);
    return {
        type: authorizer.type,
        authorizerUri: authorizerLambda.invokeArn,
        authorizerCredentials: role.arn,
        identitySource: identitySource,
        identityValidationExpression: authorizer.identityValidationExpression,
        authorizerResultTtlInSeconds: authorizer.authorizerResultTtlInSeconds,
    };
}

function addAuthorizersToSwaggerOperation(swaggerOperation: SwaggerOperation, authRecords: Record<string, string[]>[]) {
    swaggerOperation.security = swaggerOperation.security || [];
    for (const record of authRecords) {
        swaggerOperation.security.push(record);
    }
}

function addRequiredParametersToSwaggerOperation(swaggerOperation: SwaggerOperation, requiredParameters: reqvalidation.Parameter[]) {
    for (const requiredParam of requiredParameters) {
        const param = {
            name: requiredParam.name,
            in: requiredParam.in,
            required: true,
        };

        swaggerOperation["parameters"] = swaggerOperation["parameters"] || [];
        swaggerOperation["parameters"].push(param);
    }
}

function addStaticRouteToSwaggerSpec(
    api: API, name: string, swagger: SwaggerSpec, route: StaticRoute,
    bucket: aws.s3.Bucket,
    apiAuthorizers: Record<string, Authorizer>) {

    checkRoute(api, route, "localPath");

    const method = swaggerMethod("GET");

    // For each static file, just make a simple bucket object to hold it, and create a swagger path
    // that routes from the file path to the arn for the bucket object.
    //
    // For static directories, use greedy api-gateway path matching so that we can map a single api
    // gateway route to all the s3 bucket objects we create for the files in these directories.
    const stat = fs.statSync(route.localPath);
    if (stat.isFile()) {
        processFile(route);
    }
    else if (stat.isDirectory()) {
        processDirectory(route);
    }

    function createRole(key: string) {
        // Create a role and attach it so that this route can access the AWS bucket.
        const role = new aws.iam.Role(key, {
            assumeRolePolicy: JSON.stringify(apigatewayAssumeRolePolicyDocument),
        }, { parent: api });
        const attachment = new aws.iam.RolePolicyAttachment(key, {
            role: role,
            policyArn: aws.iam.AmazonS3FullAccess,
        }, { parent: api });

        return role;
    }

    function createBucketObject(key: string, localPath: string, contentType?: string) {
        return new aws.s3.BucketObject(key, {
            bucket,
            key,
            source: new pulumi.asset.FileAsset(localPath),
            contentType: contentType || mime.getType(localPath) || undefined,
        }, { parent: api });
    }

    function processFile(route: StaticRoute) {
        const key = name + sha1hash(method + ":" + route.path);
        const role = createRole(key);

        createBucketObject(key, route.localPath, route.contentType);

        const swaggerOperation = createSwaggerOperationForObjectKey(key, role);
        addBasePathOptionsToSwagger(api, swagger, swaggerOperation, route, apiAuthorizers);
        addSwaggerOperation(swagger, route.path, method, swaggerOperation);
    }

    function processDirectory(directory: StaticRoute) {
        const directoryServerPath = route.path.endsWith("/") ? route.path : route.path + "/";

        const directoryKey = name + sha1hash(method + ":" + directoryServerPath);
        const role = createRole(directoryKey);

        let startDir = directory.localPath.startsWith("/")
            ? directory.localPath
            : fspath.join(process.cwd(), directory.localPath);

        if (!startDir.endsWith(fspath.sep)) {
            startDir = fspath.join(startDir, fspath.sep);
        }

        // If the user has supplied 'false' for options.index, then no speciam index file served
        // at the root. Otherwise if they've supplied an actual filename to serve as the index
        // file then use what they've provided.  Otherwise attempt to serve "index.html" at the
        // root (if it exists).
        const indexFile = directory.index === false
            ? undefined
            : typeof directory.index === "string"
                ? directory.index
                : "index.html";

        const indexPath = indexFile === undefined ? undefined : fspath.join(startDir, indexFile);

        // Recursively walk the directory provided, creating bucket objects for all the files we
        // encounter.
        function walk(dir: string) {
            const children = fs.readdirSync(dir);

            for (const childName of children) {
                const childPath = fspath.join(dir, childName);
                const stats = fs.statSync(childPath);

                if (stats.isDirectory()) {
                    walk(childPath);
                }
                else if (stats.isFile()) {
                    const childRelativePath = childPath.substr(startDir.length);
                    const childUrn = directoryKey + "/" + childRelativePath;

                    createBucketObject(childUrn, childPath);

                    if (childPath === indexPath) {
                        // We hit the file that we also want to serve as the index file. Create
                        // a specific swagger path from the server root path to it.
                        const swaggerOperation = createSwaggerOperationForObjectKey(childUrn, role);
                        addBasePathOptionsToSwagger(api, swagger, swaggerOperation, directory, apiAuthorizers);
                        swagger.paths[directoryServerPath] = {
                            [method]: swaggerOperation,
                        };
                    }
                }
            }
        }

        walk(startDir);

        // Take whatever path the client wants to host this folder at, and add the
        // greedy matching predicate to the end.
        const proxyPath = directoryServerPath + "{proxy+}";
        const swaggerOperation = createSwaggerOperationForObjectKey(directoryKey, role, "proxy");
        addBasePathOptionsToSwagger(api, swagger, swaggerOperation, directory, apiAuthorizers);
        addSwaggerOperation(swagger, proxyPath, swaggerMethod("ANY"), swaggerOperation);
    }

    function createSwaggerOperationForObjectKey(
        objectKey: string,
        role: aws.iam.Role,
        pathParameter?: string): SwaggerOperation {

        const region = getRegion(bucket);

        const uri = pulumi.interpolate
            `arn:aws:apigateway:${region}:s3:path/${bucket.bucket}/${objectKey}${(pathParameter ? `/{${pathParameter}}` : ``)}`;

        const result: SwaggerOperation = {
            responses: {
                "200": {
                    description: "200 response",
                    schema: { type: "object" },
                    headers: {
                        "Content-Type": { type: "string" },
                        "content-type": { type: "string" },
                    },
                },
                "400": {
                    description: "400 response",
                },
                "500": {
                    description: "500 response",
                },
            },
            "x-amazon-apigateway-integration": {
                credentials: role.arn,
                uri: uri,
                passthroughBehavior: "when_no_match",
                httpMethod: "GET",
                type: "aws",
                responses: {
                    "4\\d{2}": {
                        statusCode: "400",
                    },
                    "default": {
                        statusCode: "200",
                        responseParameters: {
                            "method.response.header.Content-Type": "integration.response.header.Content-Type",
                            "method.response.header.content-type": "integration.response.header.content-type",
                        },
                    },
                    "5\\d{2}": {
                        statusCode: "500",
                    },
                },
            },
        };

        if (pathParameter) {
            result.parameters = [{
                name: pathParameter,
                in: "path",
                required: true,
                type: "string",
            }];

            result["x-amazon-apigateway-integration"].requestParameters = {
                [`integration.request.path.${pathParameter}`]: `method.request.path.${pathParameter}`,
            };
        }

        return result;
    }
}

function addIntegrationRouteToSwaggerSpec(
    api: API, name: string, swagger: SwaggerSpec, route: IntegrationRoute, apiAuthorizers: Record<string, Authorizer>) {

    checkRoute(api, route, "target");

    const target = isIntegrationRouteTargetProvider(route.target)
        ? pulumi.output(route.target.target(name + sha1hash(route.path), api))
        : pulumi.output(route.target);

    // Register two paths in the Swagger spec, for the root and for a catch all under the root
    const method = swaggerMethod("ANY");
    const swaggerPath = route.path.endsWith("/") ? route.path : route.path + "/";
    const swaggerPathProxy = swaggerPath + "{proxy+}";

    const swaggerOpWithoutProxyPathParam = createSwaggerOperationForProxy(target, /*useProxyPathParameter:*/ false);
    addBasePathOptionsToSwagger(api, swagger, swaggerOpWithoutProxyPathParam, route, apiAuthorizers);
    addSwaggerOperation(swagger, swaggerPath, method, swaggerOpWithoutProxyPathParam);

    const swaggerOpWithProxyPathParam = createSwaggerOperationForProxy(target, /*useProxyPathParameter:*/ true);
    addBasePathOptionsToSwagger(api, swagger, swaggerOpWithProxyPathParam, route, apiAuthorizers);
    addSwaggerOperation(swagger, swaggerPathProxy, method, swaggerOpWithProxyPathParam);

    return;

    function createSwaggerOperationForProxy(
        target: pulumi.Output<pulumi.Unwrap<IntegrationTarget>>,
        useProxyPathParameter: boolean): SwaggerOperation {

        const uri = target.apply(t => {
            let result = t.uri;
            // ensure there is a trailing `/`
            if (!result.endsWith("/")) {
                result += "/";
            }

            if (useProxyPathParameter) {
                result += "{proxy}";
            }

            return result;
        });

        const connectionType = target.connectionType;
        const connectionId = target.connectionId;
        const type = ifUndefined(target.type, <IntegrationType>"http_proxy");
        const passthroughBehavior = ifUndefined(target.passthroughBehavior, "when_no_match");

        const result: SwaggerOperation = {
            "x-amazon-apigateway-integration": {
                responses: {
                    default: {
                        statusCode: "200",
                    },
                },
                uri,
                type,
                connectionType,
                connectionId,
                passthroughBehavior,
                httpMethod: "ANY",
            },
        };
        if (useProxyPathParameter) {
            result.parameters = [{
                name: "proxy",
                in: "path",
                required: true,
                type: "string",
            }];
            result["x-amazon-apigateway-integration"].requestParameters = {
                "integration.request.path.proxy": "method.request.path.proxy",
            };
        }
        return result;
    }
}

function addRawDataRouteToSwaggerSpec(
    api: API, name: string, swagger: SwaggerSpec, route: RawDataRoute) {

    checkRoute(api, route, "data");
    checkRoute(api, route, "method");

    // Simply take the [data] part of the route and place it into the correct place in the
    // swagger spec "paths" location.
    addSwaggerOperation(swagger, route.path, swaggerMethod(route.method), route.data);
}

function swaggerMethod(method: Method): string {
    switch (method.toLowerCase()) {
        case "get":
        case "put":
        case "post":
        case "delete":
        case "options":
        case "head":
        case "patch":
            return method.toLowerCase();
        case "any":
            return "x-amazon-apigateway-any-method";
        default:
            throw new Error("Method not supported: " + method);
    }
}

const apigatewayAssumeRolePolicyDocument = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
                "Service": "apigateway.amazonaws.com",
            },
            "Action": "sts:AssumeRole",
        },
    ],
};

function safeS3BucketName(apiName: string): string {
    return apiName.toLowerCase().replace(/[^a-z0-9\-]/g, "");
}
