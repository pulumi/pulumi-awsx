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

### Good: the user supplies resources and intent

```ts
interface S3BucketCredentialSpec {
  bucket: aws.s3.Bucket;
  key: pulumi.Input<string>;
}

type CredentialSpecAuthenticationMode = 'DomainJoined' | 'Domainless';

interface CredentialSpec {
  authenticationMode: CredentialSpecAuthenticationMode;
  s3Bucket?: S3BucketCredentialSpec;
  ssmParameter?: aws.ssm.Parameter;
}
```

The user selects a source and an authentication mode:

```ts
const bucketSpec: CredentialSpec = {
  authenticationMode: 'DomainJoined',
  s3Bucket: {
    bucket,
    key: 'credentials/gmsa.json',
  },
};

const parameterSpec: CredentialSpec = {
  authenticationMode: 'Domainless',
  ssmParameter,
};
```

The implementation owns the ECS encoding:

```ts
function renderCredentialSpec(spec: CredentialSpec): pulumi.Output<string> {
  if (spec.s3Bucket && spec.ssmParameter) {
    throw new Error('Only one credential specification source can be set');
  }

  if (!spec.s3Bucket && !spec.ssmParameter) {
    throw new Error('A credential specification source is required');
  }

  const prefix =
    spec.authenticationMode === 'DomainJoined' ? 'credentialspec' : 'credentialspecdomainless';

  if (spec.s3Bucket) {
    return pulumi.interpolate`${prefix}:${spec.s3Bucket.bucket.arn}/${spec.s3Bucket.key}`;
  }

  return pulumi.interpolate`${prefix}:${spec.ssmParameter!.arn}`;
}
```

This abstraction adds value because it:

- Gets the ARN from the selected resource.
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
// Derives an API value from resources or user intent.
const value = pulumi.interpolate`${prefix}:${parameter.arn}`;

// Preserves a dependency between resources.
const objectArn = pulumi.interpolate`${bucket.arn}/${key}`;

// Enforces a relationship between fields.
if (s3Bucket && ssmParameter) {
  throw new Error('Only one source can be set');
}

// Provides a simpler domain shape than the API wire format.
const environment = Object.entries(values).map(([name, value]) => ({ name, value }));
```

If the implementation only copies or renames a field, pass the API field
through unchanged.
