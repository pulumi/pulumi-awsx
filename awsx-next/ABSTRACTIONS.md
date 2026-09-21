# Abstraction Rules

## 1. Accept domain inputs and derive API encoding

An abstraction must remove work from the user. Do not wrap an API field while
still requiring the user to understand its wire format.

### Bad: the user constructs the ECS value

```ts
interface CredentialSpec {
  /**
   * A value such as:
   * `credentialspec:arn:aws:ssm:us-west-2:123456789012:parameter/gmsa`
   */
  location: pulumi.Input<string>;
}
```

This type gives the API field a new name, but it does not hide the API format.
The user must still know:

- Which ARN ECS requires.
- How to construct an S3 object ARN.
- Which prefix matches the authentication mode.
- Where to put the `:` separator.

### Good: the user supplies resource identifiers and intent

```ts
interface S3BucketCredentialSpec {
  bucketArn: pulumi.Input<string>;
  key: pulumi.Input<string>;
}

enum CredentialSpecAuthenticationMode {
  DOMAIN_JOINED = 'DomainJoined',
  DOMAINLESS = 'Domainless',
}

interface CredentialSpec {
  authenticationMode: CredentialSpecAuthenticationMode;
  s3Bucket?: S3BucketCredentialSpec;
  ssmParameterArn?: pulumi.Input<string>;
}
```

The user selects a source and an authentication mode:

```ts
const bucketSpec: CredentialSpec = {
  authenticationMode: CredentialSpecAuthenticationMode.DOMAIN_JOINED,
  s3Bucket: {
    bucketArn: bucket.arn,
    key: 'credentials/gmsa.json',
  },
};

const parameterSpec: CredentialSpec = {
  authenticationMode: CredentialSpecAuthenticationMode.DOMAINLESS,
  ssmParameterArn: ssmParameter.arn,
};
```

The implementation owns the ECS encoding:

```ts
function renderCredentialSpec(spec: CredentialSpec): pulumi.Output<string> {
  if (spec.s3Bucket && spec.ssmParameterArn) {
    throw new Error('Only one credential specification source can be set');
  }

  if (!spec.s3Bucket && !spec.ssmParameterArn) {
    throw new Error('A credential specification source is required');
  }

  const prefix =
    spec.authenticationMode === CredentialSpecAuthenticationMode.DOMAIN_JOINED
      ? 'credentialspec'
      : 'credentialspecdomainless';

  if (spec.s3Bucket) {
    return pulumi.interpolate`${prefix}:${spec.s3Bucket.bucketArn}/${spec.s3Bucket.key}`;
  }

  return pulumi.interpolate`${prefix}:${spec.ssmParameterArn!}`;
}
```

This abstraction adds value because it:

- Accepts an ARN without requiring a specific resource class.
- Constructs an S3 object ARN.
- Selects the ECS prefix.
- Preserves Pulumi dependencies.
- Rejects missing or conflicting sources.

### Do not wrap direct API properties

If AWSX does not derive or validate anything, use the API shape directly.

Bad:

```ts
interface ContainerCpuOptions {
  cpuUnits?: number;
}

function renderCpu(options: ContainerCpuOptions): number | undefined {
  return options.cpuUnits;
}
```

Good:

```ts
interface ContainerDefinitionCommonProperties {
  cpu?: number;
  command?: string[];
  hostname?: string;
  readonlyRootFilesystem?: boolean;
}
```

These fields can pass directly to ECS:

```ts
const definition: ContainerDefinitionApi = {
  cpu: options.cpu,
  command: options.command,
  hostname: options.hostname,
  readonlyRootFilesystem: options.readonlyRootFilesystem,
};
```

Create a new abstraction only when its implementation does at least one of the
following:

```ts
// Derives an API value from resource identifiers or user intent.
const value = pulumi.interpolate`${prefix}:${parameterArn}`;

// Preserves a dependency between resources.
const objectArn = pulumi.interpolate`${bucketArn}/${key}`;

// Enforces a relationship between fields.
if (s3Bucket && ssmParameterArn) {
  throw new Error('Only one source can be set');
}

// Provides a simpler domain shape than the API wire format.
const environment = Object.entries(values).map(([name, value]) => ({ name, value }));
```

If the implementation only copies or renames a field, pass the API field
through unchanged.

## 2. Accept explicit resource identifiers

Accept the identifier the component needs, not a concrete resource class. Name
the property after the identifier so the user knows which value to pass.

### Bad: the input requires one resource implementation

```ts
interface S3EnvironmentFile {
  bucket: aws.s3.Bucket;
  key: pulumi.Input<string>;
}
```

The component only needs to identify a bucket, but this type requires an
`aws.s3.Bucket`. A user with an `aws.s3.BucketV2`, an AWS Native bucket, or a
custom bucket component must adapt their resource to that class.

### Good: the input identifies the required property

```ts
interface S3EnvironmentFile {
  bucketArn: pulumi.Input<string>;
  key: pulumi.Input<string>;
}

const environmentFile: S3EnvironmentFile = {
  bucketArn: bucket.arn,
  key: 'config/app.env',
};
```

The input accepts the same identifier from different resource implementations.
The property name tells the user to supply the ARN, not the bucket name or ID.
Passing a resource Output preserves its Pulumi dependencies.

### Prefer identifiers that remain unknown until creation

When an identifier will be used for a lookup, prefer a resource output such as
its ARN or ID that remains unknown until the resource is created. Do not select
an input only because it matches the lookup's required format.

### Bad: a preview-known name triggers a read

```ts
interface LogDriverOptions {
  logGroupName: pulumi.Input<string>;
}

const options: LogDriverOptions = {
  logGroupName: logGroup.name,
};
```

The `name` property is a Pulumi Output, but its value can already be known during
preview. Pulumi can determine an auto-generated name before AWS creates the
resource. A `.get()` call using that name can therefore try to read a log group
that does not exist yet.

### Good: derive the lookup name from the resource ARN

```ts
interface LogDriverOptions {
  logGroupArn: pulumi.Input<string>;
}

const options: LogDriverOptions = {
  logGroupArn: logGroup.arn,
};
```

The implementation derives the name required by `.get()` from the ARN. When the
ARN is unknown during preview, the derived name must remain unknown too. Pulumi
can then defer the AWS read until the identifier is known.

This is a property of the value, not just its TypeScript type. Wrapping a known
name in `pulumi.output()` does not make it unknown. An ARN constructed from known
values can also be known before creation.

For resources created in the same program, pass their ARN or ID Output directly
rather than reconstructing it. Choose the property based on its preview behavior
and verify it with a fresh-stack preview test. Continue to accept literal
identifiers for resources that already exist.

### Read additional properties only when needed

If the component needs properties that are not in the identifier, use the
resource's `.get()` method internally:

```ts
const secret = aws.secretsmanager.Secret.get(`${name}-secret`, args.secretArn, undefined, {
  parent: this,
});

const keyId = secret.kmsKeyId;
```

The user supplies one identifier. The implementation owns the lookup and can
access the additional properties without requiring a resource object as input.

A lookup is a resource read, not a type conversion. The implementation must:

- Pass the identifier expected by `.get()`. An ARN is not always the lookup ID.
- Use the correct provider and region for the referenced resource.
- Give each lookup a stable, distinct Pulumi resource name.
- Account for the permissions required to read the resource.
- Test references to resources created in the same program. A known identifier
  can trigger a read during preview before the resource exists.

Do not read a resource when the supplied identifier is sufficient:

```ts
const objectArn = pulumi.interpolate`${args.bucketArn}/${args.key}`;
```

This needs no bucket lookup.

## 3. Use enums for a fixed set of choices

Use a string-valued enum when a property accepts a defined set of values. The
user should be able to discover the supported choices without knowing their
exact spelling.

### Bad: the user must know the accepted strings

```ts
interface CredentialSpec {
  authenticationMode: string;
}
```

This type accepts misspelled and unsupported modes. A string union restricts
TypeScript callers, but does not provide named enum members for users to select.

### Good: the input exposes named choices

```ts
export enum CredentialSpecAuthenticationMode {
  DOMAIN_JOINED = 'DomainJoined',
  DOMAINLESS = 'Domainless',
}

interface CredentialSpec {
  authenticationMode: CredentialSpecAuthenticationMode;
}

const mode = CredentialSpecAuthenticationMode.DOMAINLESS;
```

Use explicit string values so the schema and generated SDKs expose the same
choices. Do not use numeric TypeScript enums for string-valued API properties.

Keep open-ended values as strings:

```ts
interface ContainerOptions {
  image: pulumi.Input<string>;
  command?: string[];
}
```

An image URI or command is user-provided text, not a fixed set of choices. Do
not create an enum merely because an example uses only a few values.
