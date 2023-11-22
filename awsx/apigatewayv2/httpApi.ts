import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

type Route = Omit<
  aws.apigatewayv2.RouteArgs,
  | "apiId"
  | "routeKey"
  // Supported only for WebSocket APIs.
  | "requestModels"
  | "requestParameters"
  | "routeResponseSelectionExpression"
  | "modelSelectionExpression"
> & {
  integration?: pulumi.Input<string>;
  authorizer?: pulumi.Input<string>;
  target: pulumi.Input<string>;
};

type HttpIntegration = Omit<
  aws.apigatewayv2.IntegrationArgs,
  | "apiId"
  // Supported only for WebSocket APIs.
  | "requestTemplates"
  | "contentHandlingStrategy"
  | "passthroughBehavior"
  | "templateSelectionExpression"
>;

type LambdaIntegration = Omit<HttpIntegration, "integrationType" | "integrationUri"> & {
  lambda: aws.lambda.Function;
};

type Integration = HttpIntegration | LambdaIntegration;

type Authorizer = Omit<aws.apigatewayv2.AuthorizerArgs, "apiId">;

type Stage = Omit<aws.apigatewayv2.StageArgs, "apiId">;

type DomainName = Omit<aws.apigatewayv2.ApiMappingArgs, "apiId" | "domainName"> & {
  domainConfiguration?: Omit<aws.apigatewayv2.DomainNameArgs, "domainName">;
  domainId?: pulumi.Input<string>;
};

interface HttpApiArgs {
  routes: Record<string, Route>;
  integrations?: Record<string, Integration>;
  authorizers?: Record<string, Authorizer>;
  stages?: Record<string, Stage>;
  domainNames?: Record<string, DomainName>;
}

export async function buildHttpApi(parent: pulumi.Resource, name: string, args: HttpApiArgs) {
  const api = new aws.apigatewayv2.Api(
    name,
    {
      protocolType: "HTTP",
    },
    { parent },
  );

  const functions: aws.lambda.Function[] = [];
  const integrationsMap = new Map<string, aws.apigatewayv2.Integration>();
  for (const [integrationKey, integrationInput] of Object.entries(args.integrations ?? {})) {
    const integrationName = `${name}-${integrationKey}`;
    if ("lambda" in integrationInput) {
      const { lambda, ...integrationArgs } = integrationInput;
      functions.push(lambda);
      integrationsMap.set(
        integrationKey,
        new aws.apigatewayv2.Integration(
          integrationName,
          {
            apiId: api.id,
            integrationType: "AWS_PROXY",
            integrationUri: lambda.invokeArn,
            ...integrationArgs,
          },
          { parent },
        ),
      );
    } else {
      integrationsMap.set(
        integrationKey,
        new aws.apigatewayv2.Integration(
          integrationName,
          {
            apiId: api.id,
            ...integrationInput,
          },
          { parent },
        ),
      );
    }
  }
  const integrations = Array.from(integrationsMap.values());

  const authorizersMap = new Map<string, aws.apigatewayv2.Authorizer>();
  for (const [authorizerKey, authorizerInput] of Object.entries(args.authorizers ?? {})) {
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
  const authorizers = Array.from(authorizersMap.values());

  const routes: aws.apigatewayv2.Route[] = [];
  for (const [routeKey, routeInput] of Object.entries(args.routes)) {
    const routeName = routeKey.replace(/\W+/g, "-");
    const { integration, authorizer, ...routeArgs } = routeInput;
    let target = routeInput.target;
    if (integration !== undefined) {
      target = pulumi.output(integration).apply((id) => {
        const integration = integrationsMap.get(id);
        if (integration === undefined) {
          throw new Error(`Could not find integration with key ${id}`);
        }
        return `integrations/${integration.id}`;
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
    routes.push(
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
          dependsOn: integrations,
        },
      ),
    );
  }

  const stages: aws.apigatewayv2.Stage[] = [];
  for (const [stageKey, stageInput] of Object.entries(args.stages ?? defaultStages())) {
    stages.push(
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

  const deployment = new aws.apigatewayv2.Deployment(
    `${name}-deployment`,
    {
      apiId: api.id,
    },
    { parent, dependsOn: [...routes, ...stages] },
  );

  const domains: aws.apigatewayv2.DomainName[] = [];
  for (const [domainKey, domainInput] of Object.entries(args.domainNames ?? {})) {
    const { domainConfiguration, domainId, ...apiMappingArgs } = domainInput;
    if (
      (domainId === undefined && domainConfiguration === undefined) ||
      (domainId !== undefined && domainConfiguration !== undefined)
    ) {
      throw new Error(
        `Exactly one of domainId or domainConfiguration must be specified for domain ${domainKey}`,
      );
    }
    let resolvedDomainId = domainId;
    const domainResourceName = domainKey.replace(/\W+/g, "-");
    if (domainConfiguration !== undefined) {
      const domain = new aws.apigatewayv2.DomainName(
        `${name}-${domainResourceName}`,
        { ...domainConfiguration, domainName: domainKey },
        { parent },
      );
      domains.push(domain);
      resolvedDomainId = domain.id;
    }
    new aws.apigatewayv2.ApiMapping(
      `${name}-${domainResourceName}`,
      {
        apiId: api.id,
        domainName: resolvedDomainId!,
        ...apiMappingArgs,
      },
      { parent, dependsOn: domains },
    );
  }

  return { api, routes, integrations, authorizers, stages, deployment, domains };
}

function defaultStages(): Record<string, Stage> {
  return {
    default: { autoDeploy: true },
  };
}
