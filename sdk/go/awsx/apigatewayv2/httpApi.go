// Code generated by pulumi-gen-awsx DO NOT EDIT.
// *** WARNING: Do not edit by hand unless you're certain you know what you are doing! ***

package apigatewayv2

import (
	"context"
	"reflect"

	"errors"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/apigatewayv2"
	"github.com/pulumi/pulumi-awsx/sdk/v2/go/awsx/internal"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumix"
)

// Creates an HTTP API with associated sub-resources.
type HttpApi struct {
	pulumi.ResourceState

	// The underlying API resource.
	Api apigatewayv2.ApiOutput `pulumi:"api"`
	// The API mappings for the HTTP API.
	ApiMappings apigatewayv2.ApiMappingArrayOutput `pulumi:"apiMappings"`
	// The authorizers for the HTTP API routes. This is a map from authorizer name to the authorizer arguments.
	Authorizers apigatewayv2.AuthorizerArrayOutput `pulumi:"authorizers"`
	// The deployment for the HTTP API.
	Deployment apigatewayv2.DeploymentOutput `pulumi:"deployment"`
	// The domain names for the HTTP API.
	DomainNames apigatewayv2.DomainNameArrayOutput `pulumi:"domainNames"`
	// The integrations for the HTTP API routes. This is a map from integration name to the integration arguments.
	Integrations apigatewayv2.IntegrationArrayOutput `pulumi:"integrations"`
	// The routes for the HTTP API. This is a map from route key (for example `GET /pets`) to route arguments.
	Routes apigatewayv2.RouteArrayOutput `pulumi:"routes"`
	// The deployment stages for the HTTP API.
	Stages apigatewayv2.StageArrayOutput `pulumi:"stages"`
}

// NewHttpApi registers a new resource with the given unique name, arguments, and options.
func NewHttpApi(ctx *pulumi.Context,
	name string, args *HttpApiArgs, opts ...pulumi.ResourceOption) (*HttpApi, error) {
	if args == nil {
		return nil, errors.New("missing one or more required arguments")
	}

	if args.Routes == nil {
		return nil, errors.New("invalid value for required argument 'Routes'")
	}
	opts = internal.PkgResourceDefaultOpts(opts)
	var resource HttpApi
	err := ctx.RegisterRemoteComponentResource("awsx:apigatewayv2:HttpApi", name, args, &resource, opts...)
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

type httpApiArgs struct {
	// An [API key selection expression](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-selection-expressions.html#apigateway-websocket-api-apikey-selection-expressions).
	// Valid values: `$context.authorizer.usageIdentifierKey`, `$request.header.x-api-key`. Defaults to `$request.header.x-api-key`.
	// Applicable for WebSocket APIs.
	ApiKeySelectionExpression *string `pulumi:"apiKeySelectionExpression"`
	// The authorizers for the HTTP API routes.
	Authorizers map[string]HttpAuthorizer `pulumi:"authorizers"`
	// An OpenAPI specification that defines the set of routes and integrations to create as part of the HTTP APIs. Supported only for HTTP APIs.
	Body *string `pulumi:"body"`
	// Cross-origin resource sharing (CORS) [configuration](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html). Applicable for HTTP APIs.
	CorsConfiguration *apigatewayv2.ApiCorsConfiguration `pulumi:"corsConfiguration"`
	// Description of the API. Must be less than or equal to 1024 characters in length.
	Description *string `pulumi:"description"`
	// Whether clients can invoke the API by using the default `execute-api` endpoint.
	// By default, clients can invoke the API with the default `{api_id}.execute-api.{region}.amazonaws.com endpoint`.
	// To require that clients use a custom domain name to invoke the API, disable the default endpoint.
	DisableExecuteApiEndpoint *bool `pulumi:"disableExecuteApiEndpoint"`
	// The domain names for the HTTP API.
	DomainMappings map[string]DomainMapping `pulumi:"domainMappings"`
	// Whether warnings should return an error while API Gateway is creating or updating the resource using an OpenAPI specification. Defaults to `false`. Applicable for HTTP APIs.
	FailOnWarnings *bool `pulumi:"failOnWarnings"`
	// A map of integrations keyed by name for the HTTP API routes.
	Integrations map[string]HttpIntegration `pulumi:"integrations"`
	// Name of the API. Must be less than or equal to 128 characters in length.
	Name *string `pulumi:"name"`
	// The [route selection expression](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-selection-expressions.html#apigateway-websocket-api-route-selection-expressions) for the API.
	// Defaults to `$request.method $request.path`.
	RouteSelectionExpression *string `pulumi:"routeSelectionExpression"`
	// The routes for the HTTP API.
	Routes map[string]HttpRoute `pulumi:"routes"`
	// The deployment stages for the HTTP API.
	Stages map[string]HttpStage `pulumi:"stages"`
	// Map of tags to assign to the API. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
	Tags map[string]string `pulumi:"tags"`
	// Version identifier for the API. Must be between 1 and 64 characters in length.
	Version *string `pulumi:"version"`
}

// The set of arguments for constructing a HttpApi resource.
type HttpApiArgs struct {
	// An [API key selection expression](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-selection-expressions.html#apigateway-websocket-api-apikey-selection-expressions).
	// Valid values: `$context.authorizer.usageIdentifierKey`, `$request.header.x-api-key`. Defaults to `$request.header.x-api-key`.
	// Applicable for WebSocket APIs.
	ApiKeySelectionExpression pulumi.StringPtrInput
	// The authorizers for the HTTP API routes.
	Authorizers map[string]HttpAuthorizerInput
	// An OpenAPI specification that defines the set of routes and integrations to create as part of the HTTP APIs. Supported only for HTTP APIs.
	Body pulumi.StringPtrInput
	// Cross-origin resource sharing (CORS) [configuration](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html). Applicable for HTTP APIs.
	CorsConfiguration apigatewayv2.ApiCorsConfigurationPtrInput
	// Description of the API. Must be less than or equal to 1024 characters in length.
	Description pulumi.StringPtrInput
	// Whether clients can invoke the API by using the default `execute-api` endpoint.
	// By default, clients can invoke the API with the default `{api_id}.execute-api.{region}.amazonaws.com endpoint`.
	// To require that clients use a custom domain name to invoke the API, disable the default endpoint.
	DisableExecuteApiEndpoint pulumi.BoolPtrInput
	// The domain names for the HTTP API.
	DomainMappings map[string]DomainMappingInput
	// Whether warnings should return an error while API Gateway is creating or updating the resource using an OpenAPI specification. Defaults to `false`. Applicable for HTTP APIs.
	FailOnWarnings pulumi.BoolPtrInput
	// A map of integrations keyed by name for the HTTP API routes.
	Integrations map[string]HttpIntegrationInput
	// Name of the API. Must be less than or equal to 128 characters in length.
	Name pulumi.StringPtrInput
	// The [route selection expression](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-selection-expressions.html#apigateway-websocket-api-route-selection-expressions) for the API.
	// Defaults to `$request.method $request.path`.
	RouteSelectionExpression pulumi.StringPtrInput
	// The routes for the HTTP API.
	Routes map[string]HttpRouteInput
	// The deployment stages for the HTTP API.
	Stages map[string]HttpStageInput
	// Map of tags to assign to the API. If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.
	Tags pulumi.StringMapInput
	// Version identifier for the API. Must be between 1 and 64 characters in length.
	Version pulumi.StringPtrInput
}

func (HttpApiArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*httpApiArgs)(nil)).Elem()
}

type HttpApiInput interface {
	pulumi.Input

	ToHttpApiOutput() HttpApiOutput
	ToHttpApiOutputWithContext(ctx context.Context) HttpApiOutput
}

func (*HttpApi) ElementType() reflect.Type {
	return reflect.TypeOf((**HttpApi)(nil)).Elem()
}

func (i *HttpApi) ToHttpApiOutput() HttpApiOutput {
	return i.ToHttpApiOutputWithContext(context.Background())
}

func (i *HttpApi) ToHttpApiOutputWithContext(ctx context.Context) HttpApiOutput {
	return pulumi.ToOutputWithContext(ctx, i).(HttpApiOutput)
}

func (i *HttpApi) ToOutput(ctx context.Context) pulumix.Output[*HttpApi] {
	return pulumix.Output[*HttpApi]{
		OutputState: i.ToHttpApiOutputWithContext(ctx).OutputState,
	}
}

// HttpApiArrayInput is an input type that accepts HttpApiArray and HttpApiArrayOutput values.
// You can construct a concrete instance of `HttpApiArrayInput` via:
//
//	HttpApiArray{ HttpApiArgs{...} }
type HttpApiArrayInput interface {
	pulumi.Input

	ToHttpApiArrayOutput() HttpApiArrayOutput
	ToHttpApiArrayOutputWithContext(context.Context) HttpApiArrayOutput
}

type HttpApiArray []HttpApiInput

func (HttpApiArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*HttpApi)(nil)).Elem()
}

func (i HttpApiArray) ToHttpApiArrayOutput() HttpApiArrayOutput {
	return i.ToHttpApiArrayOutputWithContext(context.Background())
}

func (i HttpApiArray) ToHttpApiArrayOutputWithContext(ctx context.Context) HttpApiArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(HttpApiArrayOutput)
}

func (i HttpApiArray) ToOutput(ctx context.Context) pulumix.Output[[]*HttpApi] {
	return pulumix.Output[[]*HttpApi]{
		OutputState: i.ToHttpApiArrayOutputWithContext(ctx).OutputState,
	}
}

// HttpApiMapInput is an input type that accepts HttpApiMap and HttpApiMapOutput values.
// You can construct a concrete instance of `HttpApiMapInput` via:
//
//	HttpApiMap{ "key": HttpApiArgs{...} }
type HttpApiMapInput interface {
	pulumi.Input

	ToHttpApiMapOutput() HttpApiMapOutput
	ToHttpApiMapOutputWithContext(context.Context) HttpApiMapOutput
}

type HttpApiMap map[string]HttpApiInput

func (HttpApiMap) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*HttpApi)(nil)).Elem()
}

func (i HttpApiMap) ToHttpApiMapOutput() HttpApiMapOutput {
	return i.ToHttpApiMapOutputWithContext(context.Background())
}

func (i HttpApiMap) ToHttpApiMapOutputWithContext(ctx context.Context) HttpApiMapOutput {
	return pulumi.ToOutputWithContext(ctx, i).(HttpApiMapOutput)
}

func (i HttpApiMap) ToOutput(ctx context.Context) pulumix.Output[map[string]*HttpApi] {
	return pulumix.Output[map[string]*HttpApi]{
		OutputState: i.ToHttpApiMapOutputWithContext(ctx).OutputState,
	}
}

type HttpApiOutput struct{ *pulumi.OutputState }

func (HttpApiOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**HttpApi)(nil)).Elem()
}

func (o HttpApiOutput) ToHttpApiOutput() HttpApiOutput {
	return o
}

func (o HttpApiOutput) ToHttpApiOutputWithContext(ctx context.Context) HttpApiOutput {
	return o
}

func (o HttpApiOutput) ToOutput(ctx context.Context) pulumix.Output[*HttpApi] {
	return pulumix.Output[*HttpApi]{
		OutputState: o.OutputState,
	}
}

// The underlying API resource.
func (o HttpApiOutput) Api() apigatewayv2.ApiOutput {
	return o.ApplyT(func(v *HttpApi) apigatewayv2.ApiOutput { return v.Api }).(apigatewayv2.ApiOutput)
}

// The API mappings for the HTTP API.
func (o HttpApiOutput) ApiMappings() apigatewayv2.ApiMappingArrayOutput {
	return o.ApplyT(func(v *HttpApi) apigatewayv2.ApiMappingArrayOutput { return v.ApiMappings }).(apigatewayv2.ApiMappingArrayOutput)
}

// The authorizers for the HTTP API routes. This is a map from authorizer name to the authorizer arguments.
func (o HttpApiOutput) Authorizers() apigatewayv2.AuthorizerArrayOutput {
	return o.ApplyT(func(v *HttpApi) apigatewayv2.AuthorizerArrayOutput { return v.Authorizers }).(apigatewayv2.AuthorizerArrayOutput)
}

// The deployment for the HTTP API.
func (o HttpApiOutput) Deployment() apigatewayv2.DeploymentOutput {
	return o.ApplyT(func(v *HttpApi) apigatewayv2.DeploymentOutput { return v.Deployment }).(apigatewayv2.DeploymentOutput)
}

// The domain names for the HTTP API.
func (o HttpApiOutput) DomainNames() apigatewayv2.DomainNameArrayOutput {
	return o.ApplyT(func(v *HttpApi) apigatewayv2.DomainNameArrayOutput { return v.DomainNames }).(apigatewayv2.DomainNameArrayOutput)
}

// The integrations for the HTTP API routes. This is a map from integration name to the integration arguments.
func (o HttpApiOutput) Integrations() apigatewayv2.IntegrationArrayOutput {
	return o.ApplyT(func(v *HttpApi) apigatewayv2.IntegrationArrayOutput { return v.Integrations }).(apigatewayv2.IntegrationArrayOutput)
}

// The routes for the HTTP API. This is a map from route key (for example `GET /pets`) to route arguments.
func (o HttpApiOutput) Routes() apigatewayv2.RouteArrayOutput {
	return o.ApplyT(func(v *HttpApi) apigatewayv2.RouteArrayOutput { return v.Routes }).(apigatewayv2.RouteArrayOutput)
}

// The deployment stages for the HTTP API.
func (o HttpApiOutput) Stages() apigatewayv2.StageArrayOutput {
	return o.ApplyT(func(v *HttpApi) apigatewayv2.StageArrayOutput { return v.Stages }).(apigatewayv2.StageArrayOutput)
}

type HttpApiArrayOutput struct{ *pulumi.OutputState }

func (HttpApiArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*HttpApi)(nil)).Elem()
}

func (o HttpApiArrayOutput) ToHttpApiArrayOutput() HttpApiArrayOutput {
	return o
}

func (o HttpApiArrayOutput) ToHttpApiArrayOutputWithContext(ctx context.Context) HttpApiArrayOutput {
	return o
}

func (o HttpApiArrayOutput) ToOutput(ctx context.Context) pulumix.Output[[]*HttpApi] {
	return pulumix.Output[[]*HttpApi]{
		OutputState: o.OutputState,
	}
}

func (o HttpApiArrayOutput) Index(i pulumi.IntInput) HttpApiOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) *HttpApi {
		return vs[0].([]*HttpApi)[vs[1].(int)]
	}).(HttpApiOutput)
}

type HttpApiMapOutput struct{ *pulumi.OutputState }

func (HttpApiMapOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*HttpApi)(nil)).Elem()
}

func (o HttpApiMapOutput) ToHttpApiMapOutput() HttpApiMapOutput {
	return o
}

func (o HttpApiMapOutput) ToHttpApiMapOutputWithContext(ctx context.Context) HttpApiMapOutput {
	return o
}

func (o HttpApiMapOutput) ToOutput(ctx context.Context) pulumix.Output[map[string]*HttpApi] {
	return pulumix.Output[map[string]*HttpApi]{
		OutputState: o.OutputState,
	}
}

func (o HttpApiMapOutput) MapIndex(k pulumi.StringInput) HttpApiOutput {
	return pulumi.All(o, k).ApplyT(func(vs []interface{}) *HttpApi {
		return vs[0].(map[string]*HttpApi)[vs[1].(string)]
	}).(HttpApiOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*HttpApiInput)(nil)).Elem(), &HttpApi{})
	pulumi.RegisterInputType(reflect.TypeOf((*HttpApiArrayInput)(nil)).Elem(), HttpApiArray{})
	pulumi.RegisterInputType(reflect.TypeOf((*HttpApiMapInput)(nil)).Elem(), HttpApiMap{})
	pulumi.RegisterOutputType(HttpApiOutput{})
	pulumi.RegisterOutputType(HttpApiArrayOutput{})
	pulumi.RegisterOutputType(HttpApiMapOutput{})
}
