# Pulumi API Gateway Components

Pulumi's API for simplifying working with [API Gateway](https://aws.amazon.com/api-gateway/). The API currently provides ways to define routes that accepts and forwards traffic to a specified destination. A route is a publicly accessible URI that supports the defined HTTP methods and responds according to the route definition.

## Defining an Endpoint

To define an endpoint you will need to specify a route. You can also define the stage name (else it will default to "stage"). A `stage` is an addressable instance of the Rest API.

### Routes

The destination is determined by the route, which can be an [Event Handler Route](#Event-Handler-Route), a [Static Route](#Static-Route), an [Integration Route](#Integration-Route) or a [Raw Data Route](#Raw-Data-Route).

#### Event Handler Route

An Event Handler Route is a route that will map to a [Lambda](https://aws.amazon.com/lambda/). You will need to specify the path, method and the Lambda. Pulumi allows you to define the Lambda inline with your application code and provisions the appropriate permissions on your behalf so that API Gateway can communicate with your Lambda.

```ts
import * as awsx from "@pulumi/awsx";

let endpoint = new awsx.apigateway.API("example", {
    routes: [{
        path: "/",
        method: "GET",
        eventHandler: async (event) => {
            // This code runs in an AWS Lambda and will be invoked any time `/` is hit.
            return {
                statusCode: 200,
                body: "hello",
            };
        },
    }],
})
```

A complete example can be found [here](https://github.com/pulumi/pulumi-awsx/blob/master/nodejs/awsx/examples/api/index.ts).

You can also link a route to an existing Lambda using `aws.lambda.Function.get`.

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

let endpoint = new awsx.apigateway.API("example", {
    routes: [{
        path: "/",
        method: "GET",
        eventHandler: aws.lambda.Function.get("example", "your_lambda_id"),
    }],
})
```

Additionally, you can control the Lambda that is created by calling `new aws.lambda.CallbackFunction`.

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

let endpoint = new awsx.apigateway.API("example", {
    routes: [{
        path: "/",
        method: "GET",
        eventHandler: new aws.lambda.CallbackFunction("test", {
            memorySize: 256,
            callback: async (event) => {
                return {
                    statusCode: 200,
                    body: "<h1>Hello world!</h1>",
                };
            },
        }),
    }],
})
```

#### Static Route

A Static Route is a route that will map to static content in files/directories. You will need to define the local path and then the files (and subdirectories) will be uploaded into S3 objects. If the local path points to a file, you can specify the content-type. Else, the content types for all files in a directory are inferred.

By default, any request on directory will serve index.html. This behavior can be disabled by setting the `index` field to false.

```ts
import * as awsx from "@pulumi/awsx";

let endpoint = new awsx.apigateway.API("example", {
    routes: [{
        path: "/www",
        localPath: "www",
        index: false,
    }],
})
```

A complete example can be found [here](https://github.com/pulumi/pulumi-awsx/blob/master/nodejs/awsx/examples/api/index.ts).

#### Integration Route

An Integration Route is a route that will map an endpoint to a specified backend. The supported types are:

    * `http` or `http_proxy`: integration with an HTTP backend
    * `aws_proxy`: integration with AWS Lambda functions
    * `aws`: integration with AWS Lambda functions or other AWS services, such as Amazon DynamoDB, Amazon Simple Notification Service or Amazon Simple Queue Service
    * `mock`: integration with API Gateway without invoking any backend

```ts
import * as awsx from "@pulumi/awsx";

let endpoint = new awsx.apigateway.API("example", {
    routes: [{
        path: "/integration",
        target: {
            uri: "https://www.google.com",
            type: "http_proxy",
        },
    }],
})
```

For more information API Integrations, visit the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-integration-types.html).

#### Raw Data Route

A Raw Data Route is a fallback route for when raw swagger control is desired.  The `data` field should be an object that will be then included in the final swagger specification. For more information on the `x-amazon-apigateway-integration` swagger object, visit the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-integration.html).

```ts
import * as awsx from "@pulumi/awsx";

let endpoint = new awsx.apigateway.API("example", {
    routes: [{
        path: "/rawdata",
        method: "GET",
        data: {
            "x-amazon-apigateway-integration": {
                "uri": "https://www.google.com/",
                "responses": {
                    "default": {
                        "statusCode": "200",
                    },
                },
                "passthroughBehavior": "when_no_match",
                "httpMethod": "GET",
                "type": "http_proxy",
            },
        },
    }],
})
```

### Request Validation

API Gateway can perform basic validations against request parameters, a request payload or both. When a validation fails, a 400 error is returned immediately.

#### Validators

Validators can be assigned at the API level or at the method level. The validators defined at a method level override any validator set at the API level.

You must specify one of the following validators:

* "ALL" - validate both the request body and request parameters
* "BODY_ONLY" - validate only the request body
* "PARAMS_ONLY" - validate only the request parameters

```ts
import * as awsx from "@pulumi/awsx";

let endpoint = new awsx.apigateway.API("example", {
    routes: [{
        path: "/www",
        localPath: "www",
        index: false,
        requestValidator: "PARAMS_ONLY",
    }],
    requestValidator: "ALL",
})
```

#### Request Parameters

For each required request parameter, you must define the name and where the parameter is expected (i.e. "path", "query", or "header").

```ts
import * as awsx from "@pulumi/awsx";

let endpoint = new awsx.apigateway.API("example", {
    routes: [{
        path: "/www",
        localPath: "www",
        index: false,
        requestValidator: "PARAMS_ONLY",
        requiredParams: [{
            name: "key",
            in: "query",
        }]
    }],
})
```

#### Request Body

Request body validation is currently not supported. If you have a strong use case, please comment on this [open issue](https://github.com/pulumi/pulumi-awsx/issues/198).

### API Keys

To require an API Key for an API Gateway route you set the `requiredAPIKey` property equal to `true`. You will also need to create a usage plan (`new aws.apigateway.UsagePlan`) and an API key (`new aws.apigateway.ApiKey`) and then associate the key with the usage plan (`new aws.apigateway.UsagePlanKey`).

TODO - add example

### Lambda Authorizers

[Lambda Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html) are AWS Lambda functions that provide control access to an API. You can define a Lambda Authorizer for an Event Handler Route or a Static Route. API Gateway supports `request` or `token` type Lambda authorizers. A `token` Lambda Authorizer uses an authorization token (i.e. a header in the form `Authorization: Token <token>`) to authorize the user, whereas a `request` Lambda Authorizer uses the request parameters (i.e. headers, path parameter or query parameters).

To define an Authorizer, you provide a Lambda that fulfills `aws.lambda.EventHandler<AuthorizerEvent, AuthorizerResponse>` or you provide information on a pre-existing Lambda authorizer. The example below shows defining the Authorizer Lambda directly inline. See the [Event Handler Route](#Event-Handler-Route) section for other ways you can define a Lambda for the Authorizer.

#### Token Authorizer

Below is an example of a custom `request` Lambda Authorizer that uses `awsx.apigateway.getRequestLambdaAuthorizer` to simplify defining the authorizer.

```ts
import * as awsx from "@pulumi/awsx";

const api = new awsx.apigateway.API("myapi", {
    routes: [{
        path: "/b",
        method: "GET",
        eventHandler: async () => {
            return {
                statusCode: 200,
                body: "<h1>Hello world!</h1>",
            };
        },
        authorizers: [awsx.apigateway.getRequestLambdaAuthorizer({
            queryParameters: ["auth"],
            handler: async (event: awsx.apigateway.AuthorizerEvent) => {
                // Add your own custom authorization logic here.
                // Access the headers using event.headers, the query parameters using
                // event.queryStringParameters or path parameters using event.pathParameters
                return awsx.apigateway.authorizerResponse("user", "Allow", event.methodArn);
            },
        })],
    }],
});
```

You may also define the authorizer by specifying all the values. As seen below:

```ts
import * as awsx from "@pulumi/awsx";

const api = new awsx.apigateway.API("myapi", {
    routes: [{
        ...
        authorizers: [{
            authorizerName: "prettyAuthorizer",
            parameterName: "auth",
            parameterLocation: "query",
            authType: "custom",
            type: "request",
            handler: async (event: awsx.apigateway.AuthorizerEvent) => {
                // Add your own custom authorization logic here.
                return awsx.apigateway.authorizerResponse(
                    "user",
                    "Allow",
                    event.methodArn);
            },
            identitySource: ["method.request.querystring.auth"],
        }],
    }],
});
```

#### Request Authorizer

Below is an example of a custom `token` Lambda Authorizer that uses `awsx.apigateway.` to simplify the creation of the authorizer.

```ts
import * as awsx from "@pulumi/awsx";

const api = new awsx.apigateway.API("myapi", {
    routes: [{
        path: "/b",
        method: "GET",
        eventHandler: async () => {
            return {
                statusCode: 200,
                body: "<h1>Hello world!</h1>",
            };
        },
        authorizers: [awsx.apigateway.getTokenLambdaAuthorizer({
            handler: async (event: awsx.apigateway.AuthorizerEvent) => {
                // Add your own custom authorization logic here.
                const token = event.authorizationToken;
                if (token === "Allow") {
                    return awsx.apigateway.authorizerResponse("user","Allow", event.methodArn);
                }
                return awsx.apigateway.authorizerResponse("user", "Deny", event.methodArn);
            },
        })],
    }],
});
```

You may also define the authorizer by specifying all the values. As seen below:

```ts
import * as awsx from "@pulumi/awsx";

const api = new awsx.apigateway.API("myapi", {
    routes: [{
        path: "/b",
        method: "GET",
        eventHandler: async () => {
            return {
                statusCode: 200,
                body: "<h1>Hello world!</h1>",
            };
        },
        authorizers: [{
            parameterName: "Authorization",
            parameterLocation: "header",
            authType: "oauth2",
            type: "request",
            handler: async (event: awsx.apigateway.AuthorizerEvent) => {
                // Add your own custom authorization logic here.
                 return awsx.apigateway.authorizerResponse("user", "Allow", event.methodArn);
            },
        }],
    }],
});
```

#### Specifying the Role

If your Authorizer requires access to other AWS resources, you will need to provision the appropriate role. You can do so by using `new aws.lambda.CallbackFunction`.

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const callbackFxn = new aws.lambda.CallbackFunction("callbackFxn", {
    callback: async (event: awsx.apigateway.AuthorizerEvent) => {
        // Add custom authorization logic here
        return awsx.apigateway.authorizerResponse("user", "Allow", event.methodArn);
    },
    role: role, // Specify role with appropriate AWS permissions.
});

const api = new awsx.apigateway.API("myapi", {
    routes: [{
        path: "/b",
        method: "GET",
        eventHandler: async () => {
            return {
                statusCode: 200,
                body: "<h1>Hello world!</h1>",
            };
        },
        authorizers: [{
            parameterName: "Authorization",
            parameterLocation: "header",
            authType: "oauth2",
            type: "request",
            handler: callbackFxn,
        }],
    }],
});
```

#### Using a Pre-existing AWS Lambda

You can also define the Lambda Authorizer elsewhere and then reference the required values.

```ts
import * as awsx from "@pulumi/awsx";

const apiWithAuthorizer = new awsx.apigateway.API("authorizer-api", {
    routes: [{
        ...
        authorizers: [{
            authorizerName: "testing",
            parameterName: "auth",
            parameterLocation: "query",
            authType: "custom",
            type: "request",
            handler: {
                // Either specify the aws.lambda.Function or provide the invoke URI
                uri: authorizerLambda,
                credentials: gatewayRole.arn,
            },
            identitySource: ["method.request.querystring.auth"],
        }],
    }],
});
```

A complete example of defining the Lambda Authorizer elsewhere can be found [here](https://github.com/pulumi/pulumi-awsx/blob/61d2996b8bdb20ea625e66e17ebbaa7b62f9c163/nodejs/awsx/examples/api/index.ts#L94-L152).

#### Authorizer Response

A helper function `awsx.apigateway.authorizerResponse` has been created to simplify generating the authorizer response. This can be used when defining the authorizer handler as follows:

```ts
import * as awsx from "@pulumi/awsx";

const api = new awsx.apigateway.API("myapi", {
    routes: [{
        ...
        authorizers: [{
            header: "Authorization",
            handler: async (event: awsx.apigateway.AuthorizerEvent) => {
                // Add your own custom authorization logic here.
                const token = event.authorizationToken;
                if (token === "Allow") {
                    return awsx.apigateway.authorizerResponse("user", "Allow", event.methodArn);
                }
                return awsx.apigateway.authorizerResponse("user", "Deny", event.methodArn);
            },
        }],
    }],
});
```

### Swagger String

You can use a OpenAPI specification that is in string form to initialize the API Gateway. This in a way is an escape hatch for implementing featured not yet supported by Pulumi. You must manually provide permission for any route targets to be invoked by API Gateway when using this option.

```ts
import * as awsx from "@pulumi/awsx";

const swaggerSpec = {
    swagger: "2.0",
    info: { title: "api", version: "1.0" },
    ...
};

let endpoint = new awsx.apigateway.API("example", {
    swaggerString: JSON.stringify(swaggerSpec),
    stageName: "dev",
})
```
