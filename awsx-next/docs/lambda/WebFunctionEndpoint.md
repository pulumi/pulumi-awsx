# Web function endpoints

A `WebFunctionEndpoint` provides HTTPS access to a Lambda Web Function. The endpoint selects which published revisions receive requests. You can create separate endpoints for production and testing.

## Example usage

### Route to the current revision

```yaml pulumi-example
name: lambda-web-endpoint
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

`ApplicationManaged` allows anyone to reach the application. The application must enforce its own access controls. Set `authType` to `IamAuth` to require AWS credentials and IAM permission to invoke the endpoint.

### Canary deployment

An endpoint can split traffic between two revisions. This example sends 90% of requests to a previous revision and 10% to the current revision. Set `stableRevisionId` to a published revision ID of the same function before the update.

```yaml pulumi-example
name: lambda-web-canary
runtime: yaml
configuration:
  stableRevisionId:
    type: string
resources:
  app:
    type: awsx:lambda:WebFunction
    properties:
      runtime: nodejs24.x
      code:
        archive:
          fn::fileArchive: ./app
  test:
    type: awsx:lambda:WebFunctionEndpoint
    properties:
      functionName: ${app.functionName}
      authType: ApplicationManaged
      revisions:
        - revisionId: ${app.revisionId}
  production:
    type: awsx:lambda:WebFunctionEndpoint
    properties:
      functionName: ${app.functionName}
      authType: ApplicationManaged
      revisions:
        - revisionId: ${stableRevisionId}
          weight: 90
        - revisionId: ${app.revisionId}
          weight: 10
outputs:
  testUrl: https://${test.domainName}
  productionUrl: https://${production.domainName}
```

The test endpoint sends all requests to the current revision. To promote the current revision, update `production.revisions` to contain only `app.revisionId`. To roll back, use only the stable revision ID. The endpoint does not advance or roll back the weights automatically.

When you split traffic, provide a positive whole-number weight for each revision. The weights must total 100. A single revision receives 100% by default.

### Serve multiple Regions

Set `endpointType` to `MultiRegion` to serve one global URL. Lambda routes requests by latency, without health-based failover. List at least one additional Region in `regions`. Lambda includes the home Region automatically.

```yaml pulumi-example
name: lambda-web-multi-region
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
      endpointType: MultiRegion
      regions:
        - us-west-2
      revisions:
        - revisionId: ${app.revisionId}
outputs:
  url: https://${endpoint.domainName}
```

Configure the AWS Cloud Control provider with a home Region other than `us-west-2` for this example. Use `PerRegion` and the `regionalDomainNames` output to route clients to individual Regions yourself. The `domainName` and `regionalDomainNames` outputs contain hostnames without the `https://` scheme. Revisions that use an egress network connector support only `HomeRegion` endpoints.

Changing the endpoint type or serving Regions replaces the endpoint and can change its URLs. To avoid interrupting clients, create a second endpoint and switch clients to its URLs before removing the first endpoint.
