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
>;

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

type Stage = Omit<aws.apigatewayv2.StageArgs, "apiId">;

interface HttpApiArgs {
  routes: Record<string, Route>;
  integrations: Record<string, Integration>;
  stages?: Record<string, Stage>;
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
  const integrations: aws.apigatewayv2.Integration[] = [];
  for (const [integrationKey, integrationInput] of Object.entries(args.integrations)) {
    const integrationName = `${name}-${integrationKey}`;
    if ("lambda" in integrationInput) {
      const { lambda, ...integrationArgs } = integrationInput;
      functions.push(lambda);
      integrations.push(
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
      integrations.push(
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

  const routes: aws.apigatewayv2.Route[] = [];
  for (const [routeKey, routeInput] of Object.entries(args.routes)) {
    const routeName = routeKey.replace(/\W+/g, "-");
    routes.push(
      new aws.apigatewayv2.Route(
        `${name}-${routeName}`,
        {
          apiId: api.id,
          routeKey,
          ...routeInput,
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

  return { api, routes, integrations, stages, deployment };
}

function defaultStages(): Record<string, Stage> {
  return {
    default: { autoDeploy: true },
  };
}
