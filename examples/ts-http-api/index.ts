import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const apiLambda = new aws.lambda.CallbackFunction("root-lambda", {
  callback: async () => {
    return {
      statusCode: 200,
      body: "Hello, world!",
    };
  },
});

const authLambda = new aws.lambda.CallbackFunction("auth-lambda", {
  callback: async () => {
    return {
      isAuthorized: true,
      context: {
        exampleKey: "exampleValue",
      },
    };
  },
});

const userPool = new aws.cognito.UserPool("user-pool", {});

const userPoolClient = new aws.cognito.UserPoolClient("user-pool-client", {
  userPoolId: userPool.id,
  preventUserExistenceErrors: "ENABLED",
});

const api = new awsx.apigatewayv2.HttpApi("api", {
  routes: {
    "GET /inline-integration": {
      integration: {
        lambdaArn: apiLambda.arn,
      },
    },
    "GET /inline-lambda-auth": {
      integrationName: "reusable-integration",
      authorizer: {
        authorizerType: "REQUEST",
        authorizerUri: authLambda.invokeArn,
        authorizerPayloadFormatVersion: "2.0",
        enableSimpleResponses: true,
      },
    },
    "GET /cognito-auth": {
      integrationName: "reusable-integration",
      authorizerName: "cognito",
    },
  },
  integrations: {
    "reusable-integration": {
      lambdaArn: apiLambda.arn,
    },
  },
  authorizers: {
    cognito: {
      authorizerType: "JWT",
      identitySources: ["$request.header.Authorization"],
      jwtConfiguration: {
        audiences: [userPoolClient.id],
        issuer: pulumi.interpolate`https://${userPool.endpoint}`,
      },
    },
  },
});

new aws.lambda.Permission("auth-lambda-permission", {
  function: authLambda.arn,
  principal: "apigateway.amazonaws.com",
  sourceArn: pulumi.interpolate`${api.api.executionArn}/*/*`,
  action: "lambda:InvokeFunction",
});

export const url = api.api.apiEndpoint;
