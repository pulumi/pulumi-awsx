// Copyright 2016-2023, Pulumi Corporation.
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

package gen

import "github.com/pulumi/pulumi/pkg/v3/codegen/schema"

func generateApiGatewayV2(awsSpec schema.PackageSpec) schema.PackageSpec {
	return schema.PackageSpec{
		Resources: map[string]schema.ResourceSpec{
			"awsx:apigatewayv2:HttpApi": httpApi(awsSpec),
		},
		Types: map[string]schema.ComplexTypeSpec{
			"awsx:apigatewayv2:HttpRoute":           httpRoute(awsSpec),
			"awsx:apigatewayv2:HttpIntegration":     httpIntegration(awsSpec),
			"awsx:apigatewayv2:HttpAuthorizer":      httpAuthorizer(awsSpec),
			"awsx:apigatewayv2:HttpStage":           httpStage(awsSpec),
			"awsx:apigatewayv2:DomainMapping":       domainMapping(awsSpec),
			"awsx:apigatewayv2:DomainConfiguration": domainConfiguration(awsSpec),
		},
	}
}

func httpApi(awsSpec schema.PackageSpec) schema.ResourceSpec {
	awsApiSpec := awsSpec.Resources["aws:apigatewayv2/api:Api"]
	inputProperties := map[string]schema.PropertySpec{
		"routes": {
			Description: "The routes for the HTTP API.",
			TypeSpec:    plainStringMapOfLocalRefs("apigatewayv2", "HttpRoute"),
		},
		"integrations": {
			Description: "A map of integrations keyed by name for the HTTP API routes.",
			TypeSpec:    plainStringMapOfLocalRefs("apigatewayv2", "HttpIntegration"),
		},
		"authorizers": {
			Description: "The authorizers for the HTTP API routes.",
			TypeSpec:    plainStringMapOfLocalRefs("apigatewayv2", "HttpAuthorizer"),
		},
		"stages": {
			Description: "The deployment stages for the HTTP API.",
			TypeSpec:    plainStringMapOfLocalRefs("apigatewayv2", "HttpStage"),
		},
		"domainMappings": {
			Description: "The domain names for the HTTP API.",
			TypeSpec:    plainStringMapOfLocalRefs("apigatewayv2", "DomainMapping"),
		},
	}
	for k, v := range awsApiSpec.InputProperties {
		// Protocol type is hard coded to HTTP.
		// Target, route key and credentials ARN are part of "quick create" which isn't a helpful abstraction to present in the component.
		if k == "protocolType" || k == "target" || k == "routeKey" || k == "credentialsArn" {
			continue
		}
		// Skip conflicting properties.
		if _, ok := inputProperties[k]; ok {
			continue
		}
		inputProperties[k] = renameAwsPropertyRefs(awsSpec, v)
	}
	return schema.ResourceSpec{
		IsComponent: true,
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Description: "Creates an HTTP API with associated sub-resources.",
			Type:        "awsx:apigatewayv2:httpApi",
			Properties: map[string]schema.PropertySpec{
				"api": {
					Description: "The underlying API resource.",
					TypeSpec:    awsType(awsSpec, "apigatewayv2", "api"),
				},
				"routes": {
					Description: "The routes for the HTTP API. This is a map from route key (for example `GET /pets`) to route arguments.",
					TypeSpec:    arrayOfAwsType(awsSpec, "apigatewayv2", "route"),
				},
				"integrations": {
					Description: "The integrations for the HTTP API routes. This is a map from integration name to the integration arguments.",
					TypeSpec:    arrayOfAwsType(awsSpec, "apigatewayv2", "integration"),
				},
				"authorizers": {
					Description: "The authorizers for the HTTP API routes.",
					TypeSpec:    arrayOfAwsType(awsSpec, "apigatewayv2", "authorizer"),
				},
				"stages": {
					Description: "The deployment stages for the HTTP API.",
					TypeSpec:    arrayOfAwsType(awsSpec, "apigatewayv2", "stage"),
				},
				"deployment": {
					Description: "The deployment for the HTTP API.",
					TypeSpec:    awsType(awsSpec, "apigatewayv2", "deployment"),
				},
				"domainNames": {
					Description: "The domain names for the HTTP API.",
					TypeSpec:    arrayOfAwsType(awsSpec, "apigatewayv2", "domainName"),
				},
				"apiMappings": {
					Description: "The API mappings for the HTTP API.",
					TypeSpec:    arrayOfAwsType(awsSpec, "apigatewayv2", "apiMapping"),
				},
			},
			Required: []string{"api", "routes", "integrations", "authorizers", "stages", "deployment", "domainNames"},
		},
		InputProperties: inputProperties,
		RequiredInputs:  []string{"routes"},
	}
}

func httpRoute(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	original := awsSpec.Resources["aws:apigatewayv2/route:Route"]
	properties := renameAwsPropertiesRefs(awsSpec, original.InputProperties)
	delete(properties, "apiId")
	// Inferred from the map key
	delete(properties, "routeKey")
	// WebSocket specific properties
	delete(properties, "requestModels")
	delete(properties, "requestParameters")
	delete(properties, "routeResponseSelectionExpression")
	delete(properties, "modelSelectionExpression")
	properties["integration"] = schema.PropertySpec{
		Description: "Details of the integration to be created for this route. Only one of `integration`, `integrationName` or `target` can be specified.",
		TypeSpec: schema.TypeSpec{
			Ref:   localRef("apigatewayv2", "HttpIntegration"),
			Plain: true,
		},
	}
	properties["integrationName"] = schema.PropertySpec{
		Description: "The name of the target integration for the route specified in the `integrations` property. This is used to automatically calculate the `target` property of the route. Only one of `integration`, `integrationName` or `target` can be specified. This does not need to be prefixed with \"integrations/\".",
		TypeSpec: schema.TypeSpec{
			Type: "string",
		},
	}
	properties["authorizer"] = schema.PropertySpec{
		Description: "The key of the target authorizer for the route specified in the `authorizers` property. This is used to automatically calculate the `authorizerId` property of the route.",
		TypeSpec: schema.TypeSpec{
			Type: "string",
		},
	}
	target := properties["target"]
	target.Description += " Only one of `integration`, `integrationName` or `target` can be specified."
	properties["target"] = target
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: original.Description,
			Properties:  properties,
		},
	}
}

func httpIntegration(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	original := awsSpec.Resources["aws:apigatewayv2/integration:Integration"]
	properties := renameAwsPropertiesRefs(awsSpec, original.InputProperties)
	delete(properties, "apiId")
	// WebSocket specific properties
	delete(properties, "requestTemplates")
	delete(properties, "contentHandlingStrategy")
	delete(properties, "passthroughBehavior")
	delete(properties, "templateSelectionExpression")
	properties["lambdaArn"] = schema.PropertySpec{
		Description: "The ARN of a lambda function to invoke for the integration. This is used to automatically calculate the `integrationType` and `integrationUri` property of the integration and give permission for the API Gateway to execute the lambda. Exactly one of `lambdaArn` or `integrationUri` must be specified.",
		TypeSpec: schema.TypeSpec{
			Type: "string",
		},
	}
	integrationUri := properties["integrationUri"]
	integrationUri.Description += " Exactly one of `lambda`, `lambdaInvokeArn` or `integrationUri` must be specified."
	properties["integrationUri"] = integrationUri
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: original.Description,
			Properties:  properties,
		},
	}
}

func httpAuthorizer(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	original := awsSpec.Resources["aws:apigatewayv2/authorizer:Authorizer"]
	properties := renameAwsPropertiesRefs(awsSpec, original.InputProperties)
	delete(properties, "apiId")
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: original.Description,
			Properties:  properties,
			Required:    []string{"authorizerType"},
		},
	}
}

func httpStage(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	original := awsSpec.Resources["aws:apigatewayv2/stage:Stage"]
	properties := renameAwsPropertiesRefs(awsSpec, original.InputProperties)
	delete(properties, "apiId")
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: original.Description,
			Properties:  properties,
		},
	}
}

func domainMapping(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	original := awsSpec.Resources["aws:apigatewayv2/apiMapping:ApiMapping"]
	properties := renameAwsPropertiesRefs(awsSpec, original.InputProperties)
	delete(properties, "apiId")
	delete(properties, "domainName")
	properties["domainConfiguration"] = schema.PropertySpec{
		Description: "Configuration of the domain name to create. Cannot be specified together with `domainId`.",
		TypeSpec: schema.TypeSpec{
			Ref:   localRef("apigatewayv2", "DomainConfiguration"),
			Plain: true,
		},
	}
	properties["domainId"] = schema.PropertySpec{
		Description: "Identifier of an existing domain. Cannot be specified together with `domainConfiguration`.",
		TypeSpec: schema.TypeSpec{
			Type: "string",
		},
	}
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: original.Description,
			Properties:  properties,
			Required:    []string{"stage"},
		},
	}
}

func domainConfiguration(awsSpec schema.PackageSpec) schema.ComplexTypeSpec {
	original := awsSpec.Resources["aws:apigatewayv2/domainName:DomainName"]
	properties := renameAwsPropertiesRefs(awsSpec, original.InputProperties)
	delete(properties, "domainName")
	return schema.ComplexTypeSpec{
		ObjectTypeSpec: schema.ObjectTypeSpec{
			Type:        "object",
			Description: original.Description,
			Properties:  properties,
			Required:    []string{"domainNameConfiguration"},
		},
	}
}

func plainStringMapOfLocalRefs(module, name string) schema.TypeSpec {
	return schema.TypeSpec{
		Type: "object",
		AdditionalProperties: &schema.TypeSpec{
			Ref:   localRef(module, name),
			Plain: true,
		},
		Plain: true,
	}
}
