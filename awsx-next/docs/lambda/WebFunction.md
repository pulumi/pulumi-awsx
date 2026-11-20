# Web functions

A Lambda Web Function runs a Node.js web application. `WebFunction` creates the function and its current immutable revision. Use a `WebFunctionEndpoint` to give the revision an HTTPS URL.

The component uses the [AWS](https://www.pulumi.com/registry/packages/aws/) and [AWS Cloud Control](https://www.pulumi.com/registry/packages/aws-native/) providers. Configure both providers to use the same AWS account. The AWS Cloud Control provider selects the function's home Region.

## Example usage

### Web application

The application must start an HTTP server at the host and port in `AWS_LAMBDA_HTTP_ENDPOINT`. Package the application and its dependencies in `./app`. The example selects the Node.js 24 runtime, which loads `index.js` from the package root by default.

```yaml pulumi-example
name: lambda-web-function
runtime: yaml
resources:
  app:
    type: awsx:lambda:WebFunction
    properties:
      runtime: nodejs24.x
      code:
        archive:
          fn::fileArchive: ./app
  endpoint:
    type: awsx:lambda:WebFunctionEndpoint
    properties:
      functionName: ${app.functionName}
      authType: ApplicationManaged
      revisions:
        - revisionId: ${app.revisionId}
outputs:
  url: https://${endpoint.domainName}
```

`ApplicationManaged` allows anyone to reach the application. The application must enforce its own access controls. For IAM authorization, set `authType` to `IamAuth` and grant callers permission to invoke the endpoint.

### Configure a revision

Use `environmentVariables`, `timeoutSeconds`, and `maxConcurrencyPerEnvironment` to configure the revision. Set `runtime` to `nodejs-latest` to use the latest Node.js runtime selected by AWSX. An AWSX upgrade can change that runtime and publish a new revision. Use `AWS_LAMBDA_NODEJS_ENTRYPOINT` if the application entry point is not `index.js`.

```yaml pulumi-example
name: lambda-web-configured
runtime: yaml
resources:
  app:
    type: awsx:lambda:WebFunction
    properties:
      runtime: nodejs24.x
      code:
        archive:
          fn::fileArchive: ./app
      environmentVariables:
        AWS_LAMBDA_NODEJS_ENTRYPOINT: server.js
        LOG_LEVEL: info
      timeoutSeconds: 60
      maxConcurrencyPerEnvironment: 32
```

Pulumi tracks secret environment values as secrets, but AWS receives their resolved values. Authorized AWS users can read the function configuration.

## Resources and revisions

AWSX stores the code archive in a versioned S3 bucket and creates a CloudWatch log group. By default, AWSX creates an execution role with permissions for the function's logs. Grant the role any permissions the application needs, or provide an existing role with `executionRoleArn`.

Changes to the code or revision configuration create a new revision. AWSX retains old revisions, the log group, and the execution role it creates when those resources are removed from the stack. The versioned code objects remain available until the code object is deleted. Plan for cleanup of retained resources when they are no longer needed.

The `revisionId` output identifies the current revision. An endpoint can route to that revision, an earlier revision, or both. See [WebFunctionEndpoint](../webfunctionendpoint/) for routing examples.
