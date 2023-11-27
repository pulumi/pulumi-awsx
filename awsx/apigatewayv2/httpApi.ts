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

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as schema from "../schema-types";
import { countDefined } from "../utils";
import { isPromise } from "util/types";

export class HttpApi extends schema.HttpApi {
  constructor(name: string, args: schema.HttpApiArgs, opts?: pulumi.ComponentResourceOptions) {
    super(name, args, opts);

    const result = buildHttpApi(this, name, args);
    this.api = result.api;
    this.routes = pulumi.output(result.routes);
    this.integrations = pulumi.output(result.integrations);
    this.authorizers = pulumi.output(result.authorizers);
    this.stages = pulumi.output(result.stages);
    this.deployment = result.deployment;
    this.domainNames = pulumi
      .output(result.domainNames)
      .apply((domains) => domains.filter((d) => d !== undefined)) as any;
    this.apiMappings = pulumi.output(result.apiMappings);
  }
}

export function buildHttpApi(parent: pulumi.Resource, name: string, args: schema.HttpApiArgs) {
  const { routes, integrations, authorizers, stages, domainMappings, ...apiArgs } = args;
  const api = new aws.apigatewayv2.Api(
    name,
    {
      protocolType: "HTTP",
      ...apiArgs,
    },
    { parent },
  );

  function makeIntegration(integrationKey: string, integrationInput: schema.HttpIntegrationInputs) {
    /* tslint:disable-next-line */
    let { integrationType, integrationUri, lambdaArn, ...integrationArgs } = integrationInput;
    if (lambdaArn !== undefined) {
      if (integrationUri !== undefined) {
        throw new Error(
          `Only one of lambdaArn or integrationUri must be specified for integration ${integrationKey}`,
        );
      }
      if (integrationType !== undefined && integrationType !== "AWS_PROXY") {
        throw new Error(
          `integrationType must be AWS_PROXY for lambda integration ${integrationKey}`,
        );
      }
      integrationType = "AWS_PROXY";
      const region = aws.getRegionOutput({}, { parent }).name;
      const lambdaInvokeArn = pulumi.interpolate`arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`;
      integrationUri = lambdaInvokeArn;
      /* tslint:disable-next-line */
      new aws.lambda.Permission(
        `${name}-${integrationKey}-lambda-permission`,
        {
          function: lambdaArn,
          principal: "apigateway.amazonaws.com",
          sourceArn: pulumi.interpolate`${api.executionArn}/*/*`,
          action: "lambda:InvokeFunction",
        },
        { parent },
      );
    }

    if (integrationType === undefined) {
      throw new Error(`integrationType must be specified for custom integration ${integrationKey}`);
    }
    const integrationResource = new aws.apigatewayv2.Integration(
      `${name}-${integrationKey}`,
      {
        apiId: api.id,
        integrationType,
        integrationUri,
        ...integrationArgs,
      },
      { parent },
    );
    return integrationResource;
  }
  const integrationsMap = new Map<string, pulumi.Output<aws.apigatewayv2.Integration>>();
  for (const [integrationKey, integrationInput] of Object.entries(integrations ?? {})) {
    if (!pulumi.Output.isInstance(integrationInput) && !isPromise(integrationInput)) {
      integrationsMap.set(
        integrationKey,
        pulumi.output(makeIntegration(integrationKey, integrationInput)),
      );
    } else {
      integrationsMap.set(
        integrationKey,
        pulumi
          .output(integrationInput)
          .apply((integration) => makeIntegration(integrationKey, integration)),
      );
    }
  }

  function makeAuthorizer(authorizerKey: string, authorizerInput: schema.HttpAuthorizerInputs) {
    const authorizerName = authorizerKey.replace(/\W+/g, "-");
    const authorizerResource = new aws.apigatewayv2.Authorizer(
      `${name}-${authorizerName}`,
      {
        apiId: api.id,
        ...authorizerInput,
      },
      { parent },
    );
    return authorizerResource;
  }
  const authorizersMap = new Map<string, pulumi.Output<aws.apigatewayv2.Authorizer>>();
  for (const [authorizerKey, authorizerInput] of Object.entries(authorizers ?? {})) {
    if (!pulumi.Output.isInstance(authorizerInput) && !isPromise(authorizerInput)) {
      authorizersMap.set(
        authorizerKey,
        pulumi.output(makeAuthorizer(authorizerKey, authorizerInput)),
      );
    } else {
      authorizersMap.set(
        authorizerKey,
        pulumi
          .output(authorizerInput)
          .apply((authorizer) => makeAuthorizer(authorizerKey, authorizer)),
      );
    }
  }

  function makeRoute(routeKey: string, routeInput: schema.HttpRouteInputs) {
    const routeName = routeKey.replace(/\W+/g, "-");
    const { integration, integrationName, authorizer, authorizerName, ...routeArgs } = routeInput;
    let target = routeInput.target;
    if (countDefined([integration, integrationName, target]) > 1) {
      throw new Error(
        `Exactly one of integration, integrationName, or target must be specified for route ${routeKey}`,
      );
    }
    if (integrationName !== undefined) {
      target = pulumi.output(integrationName).apply((id) => {
        const integration = integrationsMap.get(id);
        if (integration === undefined) {
          throw new Error(`Could not find integration with name ${id}`);
        }
        return pulumi.interpolate`integrations/${integration.id}`;
      });
    }
    if (integration !== undefined) {
      const integrationKey = `${routeName}-integration`;
      const integrationResource = makeIntegration(integrationKey, integration);
      integrationsMap.set(integrationKey, pulumi.output(integrationResource));
      target = pulumi.interpolate`integrations/${integrationResource.id}`;
    }
    let authorizerId = routeInput.authorizerId;
    let authorizationType = routeInput.authorizationType;
    if (countDefined([authorizer, authorizerName, authorizerId]) > 1) {
      throw new Error(
        `Exactly one of authorizer, authorizerName, or authorizerId must be specified for route ${routeKey}`,
      );
    }
    if (authorizer !== undefined) {
      const authorizerKey = `${routeName}-authorizer`;
      const authorizerResource = makeAuthorizer(authorizerKey, authorizer);
      authorizerId = authorizerResource.id;
      authorizationType = authorizerResource.authorizerType.apply(mapRouteAuthorizerType);
    }
    if (authorizerName !== undefined) {
      const authorizer = pulumi.output(authorizerName).apply((id) => {
        const authorizer = authorizersMap.get(id);
        if (authorizer === undefined) {
          throw new Error(`Could not find authorizer with name ${id}`);
        }
        return authorizer;
      });
      authorizerId = authorizer.id;
      authorizationType = authorizer.authorizerType.apply(mapRouteAuthorizerType);
    }
    return new aws.apigatewayv2.Route(
      `${name}-${routeName}`,
      {
        apiId: api.id,
        routeKey,
        ...routeArgs,
        target,
        authorizerId,
        authorizationType,
      },
      {
        parent,
        dependsOn: [
          ...Array.from(integrationsMap.values()),
          ...Array.from(authorizersMap.values()),
        ],
      },
    );
  }
  const routeResources: pulumi.Output<aws.apigatewayv2.Route>[] = [];
  for (const [routeKey, routeInput] of Object.entries(routes)) {
    if (!pulumi.Output.isInstance(routeInput) && !isPromise(routeInput)) {
      routeResources.push(pulumi.output(makeRoute(routeKey, routeInput)));
    } else {
      routeResources.push(pulumi.output(routeInput).apply((route) => makeRoute(routeKey, route)));
    }
  }

  function makeStage(stageKey: string, stageInput: schema.HttpStageInputs) {
    return new aws.apigatewayv2.Stage(
      `${name}-${stageKey}`,
      {
        apiId: api.id,
        name: stageKey,
        ...stageInput,
      },
      { parent },
    );
  }
  const stageResources: pulumi.Output<aws.apigatewayv2.Stage>[] = [];
  for (const [stageKey, stageInput] of Object.entries(stages ?? defaultStages())) {
    if (!pulumi.Output.isInstance(stageInput) && !isPromise(stageInput)) {
      stageResources.push(pulumi.output(makeStage(stageKey, stageInput)));
    } else {
      stageResources.push(pulumi.output(stageInput).apply((stage) => makeStage(stageKey, stage)));
    }
  }

  const deploymentResource = new aws.apigatewayv2.Deployment(
    `${name}-deployment`,
    {
      apiId: api.id,
    },
    { parent, dependsOn: [...routeResources, ...stageResources] },
  );

  function makeDomainMapping(domainName: string, domainMappingInput: schema.DomainMappingInputs) {
    const { domainConfiguration, domainId, ...apiMappingArgs } = domainMappingInput;
    if (
      (domainId === undefined && domainConfiguration === undefined) ||
      (domainId !== undefined && domainConfiguration !== undefined)
    ) {
      throw new Error(
        `Exactly one of domainId or domainConfiguration must be specified for domain ${domainName}`,
      );
    }
    let resolvedDomainId = domainId;
    const domainResourceName = domainName.replace(/\W+/g, "-");
    let domainResource: aws.apigatewayv2.DomainName | undefined;
    if (domainConfiguration !== undefined) {
      domainResource = new aws.apigatewayv2.DomainName(
        `${name}-${domainResourceName}`,
        {
          domainName: domainName,
          ...domainConfiguration,
        },
        { parent },
      );
      resolvedDomainId = domainResource.id;
    }
    const apiMappingResource = new aws.apigatewayv2.ApiMapping(
      `${name}-${domainResourceName}`,
      {
        apiId: api.id,
        domainName: resolvedDomainId!,
        ...apiMappingArgs,
      },
      {
        parent,
        dependsOn: pulumi
          .output(domainResources)
          .apply((r) => r.filter((d) => d !== undefined)) as any,
      },
    );
    return { apiMappingResource, domainResource };
  }
  const domainResources: pulumi.Output<aws.apigatewayv2.DomainName | undefined>[] = [];
  const apiMappingResources: pulumi.Output<aws.apigatewayv2.ApiMapping>[] = [];
  for (const [domainName, domainInput] of Object.entries(domainMappings ?? {})) {
    if (!pulumi.Output.isInstance(domainInput) && !isPromise(domainInput)) {
      const { apiMappingResource, domainResource } = makeDomainMapping(domainName, domainInput);
      if (domainResource !== undefined) {
        domainResources.push(pulumi.output(domainResource));
      }
      apiMappingResources.push(pulumi.output(apiMappingResource));
    } else {
      const createdResources = pulumi
        .output(domainInput)
        .apply((domain) => makeDomainMapping(domainName, domain));
      domainResources.push(createdResources.domainResource);
      apiMappingResources.push(createdResources.apiMappingResource);
    }
  }

  return {
    api,
    routes: routeResources,
    integrations: Array.from(integrationsMap.values()),
    authorizers: Array.from(authorizersMap.values()),
    stages: stageResources,
    deployment: deploymentResource,
    domainNames: domainResources,
    apiMappings: apiMappingResources,
  };
}

function defaultStages(): Record<string, schema.HttpStageInputs> {
  return {
    default: { autoDeploy: true },
  };
}

function mapRouteAuthorizerType(authorizerType: string) {
  switch (authorizerType) {
    case "JWT":
      return "JWT";
    case "REQUEST":
      return "CUSTOM";
    default:
      throw new Error(`Unknown authorizer type ${authorizerType}`);
  }
}
