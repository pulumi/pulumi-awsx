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

export class HttpApi extends schema.HttpApi {
  constructor(name: string, args: schema.HttpApiArgs, opts?: pulumi.ComponentResourceOptions) {
    super(name, args, opts);

    const result = buildHttpApi(this, name, args);
    this.api = result.api;
    this.routes = result.routes;
    this.integrations = result.integrations;
    this.authorizers = result.authorizers;
    this.stages = result.stages;
    this.deployment = result.deployment;
    this.domainNames = result.domainNames;
    this.apiMappings = result.apiMappings;
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

  const integrationsMap = new Map<string, aws.apigatewayv2.Integration>();
  for (const [integrationKey, integrationInput] of Object.entries(integrations ?? {})) {
    function errOnlyOneArg() {
      return `Exactly one of lambda, lambdaInvokeArn or integrationUri must be specified for integration ${integrationKey}`;
    }
    /* tslint:disable-next-line */
    let { integrationType, integrationUri, lambda, lambdaInvokeArn, ...integrationArgs } =
      integrationInput;
    if (lambda !== undefined) {
      if (lambdaInvokeArn !== undefined) {
        throw new Error(errOnlyOneArg());
      }
      integrationType = "AWS_PROXY";
      lambdaInvokeArn = lambda.invokeArn;
    }
    if (lambdaInvokeArn !== undefined) {
      if (integrationUri !== undefined) {
        throw new Error(errOnlyOneArg());
      }
      if (integrationType !== undefined && integrationType !== "AWS_PROXY") {
        throw new Error(
          `integrationType must be AWS_PROXY for lambda integration ${integrationKey}`,
        );
      }
      integrationType = "AWS_PROXY";
      integrationUri = lambdaInvokeArn;
    }
    const integrationName = `${name}-${integrationKey}`;

    if (integrationType === undefined) {
      throw new Error(`integrationType must be specified for custom integration ${integrationKey}`);
    }
    integrationsMap.set(
      integrationKey,
      new aws.apigatewayv2.Integration(
        integrationName,
        {
          apiId: api.id,
          integrationType,
          integrationUri,
          ...integrationArgs,
        },
        { parent },
      ),
    );
  }
  const integrationResources = Array.from(integrationsMap.values());

  const authorizersMap = new Map<string, aws.apigatewayv2.Authorizer>();
  for (const [authorizerKey, authorizerInput] of Object.entries(authorizers ?? {})) {
    const authorizerName = authorizerKey.replace(/\W+/g, "-");
    authorizersMap.set(
      authorizerKey,
      new aws.apigatewayv2.Authorizer(
        `${name}-${authorizerName}`,
        {
          apiId: api.id,
          ...authorizerInput,
        },
        { parent },
      ),
    );
  }
  const authorizerResources = Array.from(authorizersMap.values());

  const routeResources: aws.apigatewayv2.Route[] = [];
  for (const [routeKey, routeInput] of Object.entries(routes)) {
    const routeName = routeKey.replace(/\W+/g, "-");
    const { integration, authorizer, ...routeArgs } = routeInput;
    let target = routeInput.target;
    if (integration !== undefined) {
      target = pulumi.output(integration).apply((id) => {
        const integration = integrationsMap.get(id);
        if (integration === undefined) {
          throw new Error(`Could not find integration with key ${id}`);
        }
        return pulumi.interpolate`integrations/${integration.id}`;
      });
    }
    let authorizerId = routeInput.authorizerId;
    if (authorizer !== undefined) {
      authorizerId = pulumi.output(authorizer).apply((id) => {
        const authorizer = authorizersMap.get(id);
        if (authorizer === undefined) {
          throw new Error(`Could not find authorizer with key ${id}`);
        }
        return authorizer.id;
      });
    }
    routeResources.push(
      new aws.apigatewayv2.Route(
        `${name}-${routeName}`,
        {
          apiId: api.id,
          routeKey,
          ...routeArgs,
          target,
          authorizerId,
        },
        {
          parent,
          dependsOn: integrationResources,
        },
      ),
    );
  }

  const stageResources: aws.apigatewayv2.Stage[] = [];
  for (const [stageKey, stageInput] of Object.entries(stages ?? defaultStages())) {
    stageResources.push(
      new aws.apigatewayv2.Stage(
        `${name}-${stageKey}`,
        {
          apiId: api.id,
          ...stageInput,
        },
        { parent },
      ),
    );
  }

  const deploymentResource = new aws.apigatewayv2.Deployment(
    `${name}-deployment`,
    {
      apiId: api.id,
    },
    { parent, dependsOn: [...routeResources, ...stageResources] },
  );

  const domainResources: aws.apigatewayv2.DomainName[] = [];
  const apiMappingResources: aws.apigatewayv2.ApiMapping[] = [];
  for (const [domainName, domainInput] of Object.entries(domainMappings ?? {})) {
    const { domainConfiguration, domainId, ...apiMappingArgs } = domainInput;
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
    if (domainConfiguration !== undefined) {
      const domain = new aws.apigatewayv2.DomainName(
        `${name}-${domainResourceName}`,
        {
          domainName: domainName,
          ...domainConfiguration,
        },
        { parent },
      );
      domainResources.push(domain);
      resolvedDomainId = domain.id;
    }
    apiMappingResources.push(
      new aws.apigatewayv2.ApiMapping(
        `${name}-${domainResourceName}`,
        {
          apiId: api.id,
          domainName: resolvedDomainId!,
          ...apiMappingArgs,
        },
        { parent, dependsOn: domainResources },
      ),
    );
  }

  return {
    api,
    routes: routeResources,
    integrations: integrationResources,
    authorizers: authorizerResources,
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
