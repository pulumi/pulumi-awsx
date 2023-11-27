// *** WARNING: this file was generated by pulumi-gen-awsx. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as inputs from "../types/input";
import * as outputs from "../types/output";
import * as enums from "../types/enums";
import * as utilities from "../utilities";

import * as pulumiAws from "@pulumi/aws";

/**
 * Creates an HTTP API with associated sub-resources.
 */
export class HttpApi extends pulumi.ComponentResource {
    /** @internal */
    public static readonly __pulumiType = 'awsx:apigatewayv2:HttpApi';

    /**
     * Returns true if the given object is an instance of HttpApi.  This is designed to work even
     * when multiple copies of the Pulumi SDK have been loaded into the same process.
     */
    public static isInstance(obj: any): obj is HttpApi {
        if (obj === undefined || obj === null) {
            return false;
        }
        return obj['__pulumiType'] === HttpApi.__pulumiType;
    }

    /**
     * The underlying API resource.
     */
    public /*out*/ readonly api!: pulumi.Output<pulumiAws.apigatewayv2.Api>;
    /**
     * The API mappings for the HTTP API.
     */
    public /*out*/ readonly apiMappings!: pulumi.Output<pulumiAws.apigatewayv2.ApiMapping[] | undefined>;
    /**
     * The authorizers for the HTTP API routes. This is a map from authorizer name to the authorizer arguments.
     */
    public readonly authorizers!: pulumi.Output<pulumiAws.apigatewayv2.Authorizer[]>;
    /**
     * The deployment for the HTTP API.
     */
    public /*out*/ readonly deployment!: pulumi.Output<pulumiAws.apigatewayv2.Deployment>;
    /**
     * The domain names for the HTTP API.
     */
    public /*out*/ readonly domainNames!: pulumi.Output<pulumiAws.apigatewayv2.DomainName[]>;
    /**
     * The integrations for the HTTP API routes. This is a map from integration name to the integration arguments.
     */
    public readonly integrations!: pulumi.Output<pulumiAws.apigatewayv2.Integration[]>;
    /**
     * The routes for the HTTP API. This is a map from route key (for example `GET /pets`) to route arguments.
     */
    public readonly routes!: pulumi.Output<pulumiAws.apigatewayv2.Route[]>;
    /**
     * The deployment stages for the HTTP API.
     */
    public readonly stages!: pulumi.Output<pulumiAws.apigatewayv2.Stage[]>;

    /**
     * Create a HttpApi resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args: HttpApiArgs, opts?: pulumi.ComponentResourceOptions) {
        let resourceInputs: pulumi.Inputs = {};
        opts = opts || {};
        if (!opts.id) {
            if ((!args || args.routes === undefined) && !opts.urn) {
                throw new Error("Missing required property 'routes'");
            }
            resourceInputs["apiKeySelectionExpression"] = args ? args.apiKeySelectionExpression : undefined;
            resourceInputs["authorizers"] = args ? args.authorizers : undefined;
            resourceInputs["body"] = args ? args.body : undefined;
            resourceInputs["corsConfiguration"] = args ? args.corsConfiguration : undefined;
            resourceInputs["description"] = args ? args.description : undefined;
            resourceInputs["disableExecuteApiEndpoint"] = args ? args.disableExecuteApiEndpoint : undefined;
            resourceInputs["domainMappings"] = args ? args.domainMappings : undefined;
            resourceInputs["failOnWarnings"] = args ? args.failOnWarnings : undefined;
            resourceInputs["integrations"] = args ? args.integrations : undefined;
            resourceInputs["name"] = args ? args.name : undefined;
            resourceInputs["routeSelectionExpression"] = args ? args.routeSelectionExpression : undefined;
            resourceInputs["routes"] = args ? args.routes : undefined;
            resourceInputs["stages"] = args ? args.stages : undefined;
            resourceInputs["tags"] = args ? args.tags : undefined;
            resourceInputs["version"] = args ? args.version : undefined;
            resourceInputs["api"] = undefined /*out*/;
            resourceInputs["apiMappings"] = undefined /*out*/;
            resourceInputs["deployment"] = undefined /*out*/;
            resourceInputs["domainNames"] = undefined /*out*/;
        } else {
            resourceInputs["api"] = undefined /*out*/;
            resourceInputs["apiMappings"] = undefined /*out*/;
            resourceInputs["authorizers"] = undefined /*out*/;
            resourceInputs["deployment"] = undefined /*out*/;
            resourceInputs["domainNames"] = undefined /*out*/;
            resourceInputs["integrations"] = undefined /*out*/;
            resourceInputs["routes"] = undefined /*out*/;
            resourceInputs["stages"] = undefined /*out*/;
        }
        opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
        super(HttpApi.__pulumiType, name, resourceInputs, opts, true /*remote*/);
    }
}

/**
 * The set of arguments for constructing a HttpApi resource.
 */
export interface HttpApiArgs {
    /**
     * An [API key selection expression](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-selection-expressions.html#apigateway-websocket-api-apikey-selection-expressions).
     * Valid values: `$context.authorizer.usageIdentifierKey`, `$request.header.x-api-key`. Defaults to `$request.header.x-api-key`.
     * Applicable for WebSocket APIs.
     */
    apiKeySelectionExpression?: pulumi.Input<string>;
    /**
     * The authorizers for the HTTP API routes.
     */
    authorizers?: {[key: string]: pulumi.Input<inputs.apigatewayv2.HttpAuthorizerArgs>};
    /**
     * An OpenAPI specification that defines the set of routes and integrations to create as part of the HTTP APIs. Supported only for HTTP APIs.
     */
    body?: pulumi.Input<string>;
    /**
     * Cross-origin resource sharing (CORS) [configuration](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html). Applicable for HTTP APIs.
     */
    corsConfiguration?: pulumi.Input<pulumiAws.types.input.apigatewayv2.ApiCorsConfiguration>;
    /**
     * Description of the API. Must be less than or equal to 1024 characters in length.
     */
    description?: pulumi.Input<string>;
    /**
     * Whether clients can invoke the API by using the default `execute-api` endpoint.
     * By default, clients can invoke the API with the default `{api_id}.execute-api.{region}.amazonaws.com endpoint`.
     * To require that clients use a custom domain name to invoke the API, disable the default endpoint.
     */
    disableExecuteApiEndpoint?: pulumi.Input<boolean>;
    /**
     * The domain names for the HTTP API.
     */
    domainMappings?: {[key: string]: pulumi.Input<inputs.apigatewayv2.DomainMappingArgs>};
    /**
     * Whether warnings should return an error while API Gateway is creating or updating the resource using an OpenAPI specification. Defaults to `false`. Applicable for HTTP APIs.
     */
    failOnWarnings?: pulumi.Input<boolean>;
    /**
     * A map of integrations keyed by name for the HTTP API routes.
     */
    integrations?: {[key: string]: pulumi.Input<inputs.apigatewayv2.HttpIntegrationArgs>};
    /**
     * Name of the API. Must be less than or equal to 128 characters in length.
     */
    name?: pulumi.Input<string>;
    /**
     * The [route selection expression](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-selection-expressions.html#apigateway-websocket-api-route-selection-expressions) for the API.
     * Defaults to `$request.method $request.path`.
     */
    routeSelectionExpression?: pulumi.Input<string>;
    /**
     * The routes for the HTTP API.
     */
    routes: {[key: string]: pulumi.Input<inputs.apigatewayv2.HttpRouteArgs>};
    /**
     * The deployment stages for the HTTP API.
     */
    stages?: {[key: string]: pulumi.Input<inputs.apigatewayv2.HttpStageArgs>};
    /**
     * Map of tags to assign to the API. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
     */
    tags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * Version identifier for the API. Must be between 1 and 64 characters in length.
     */
    version?: pulumi.Input<string>;
}
