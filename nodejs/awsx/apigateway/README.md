# Pulumi API Gateway Components

Pulumi's API for simplifying working with [API Gateway](https://aws.amazon.com/api-gateway/). The API currently provides ways to define a route that accepts and forwards traffic to a specified destination.

## Defining an Endpoint

To define an endpoint you will either need to specify the routes or a swagger string. You can also define the stage name (else it will default to "stage"). A `stage` is an addressable instance of the Rest API.

### Routes

The destination is determined by the route, which can be an Event Handler Route, a Static Route, an Integration Route or a Raw Data Route.

#### Event Handler Route

An Event Handler Route is a route that will map to a [Lambda](https://aws.amazon.com/lambda/). You will need to specify the path, method and the lambda. Pulumi allows you to define the lambda inline with your Pulumi code & provisions that appropriate permissions.

```ts
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

let endpoint = new awsx.apigateway.API("example", {
    routes: [{
        path: "/",
        method: "GET",
        eventHandler: async (event) => {
            return {
                statusCode: 200,
                body: "hello",
            };
        },
    }],
})
```

A complete example can be found [here](https://github.com/pulumi/pulumi-awsx/blob/master/nodejs/awsx/examples/api/index.ts).

#### Static Route

A Static Route is a route that will map to static content in files/directories. You will need to define the local path & then the files (and subdirectories) will be uploaded into S3 objects. If the local path points to a file, you can specify the content-type. Else, the content types for all files in a directory are inferred.

By default, any request on directory will serve index.html. This behavior can be disabled, by setting the index field to false.

```ts
import * as aws from "@pulumi/aws";
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

[TODO]

#### Raw Data Route

[TODO]

### Request Validation

API Gateway can perform basic validations against request parameters, a request payload or both. When a validation fails, a 400 error is returned immediately.

#### Validators

Validators can be assigned at the API level or at the method level. The validators defined at a method level override any validator set at the API level.

You must specify one of the following validators:

* "ALL" - validate both the request body and request parameters
* "BODY_ONLY" - validate only the request body
* "PARAMS_ONLY" - validate only the request parameters

```ts
import * as aws from "@pulumi/aws";
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
import * as aws from "@pulumi/aws";
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

[TODO]

### Swagger String

You can use a OpenAPI specification that is in string form to initialize the API Gateway. This in a way is an escape hatch for implementing featured not yet supported by Pulumi. You must manually provide permission for any route targets to be invoked by API Gateway when using this option.

```ts
import * as aws from "@pulumi/aws";
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
