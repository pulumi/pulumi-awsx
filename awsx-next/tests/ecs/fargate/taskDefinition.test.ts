// Copyright 2016-2026, Pulumi Corporation.
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

import * as aws from '@pulumi/aws';
import * as native from '@pulumi/aws-native';
import * as pulumi from '@pulumi/pulumi';
import { AwsLogDriverMode, FargateTaskDefinitionV2 } from '../../../src/ecs';
import {
  credentialsSecretArnFromSpec,
  renderCredentialSpecConfig,
  type FargateCredentialSpecConfig,
} from '../../../src/ecs/credentialSpec';
import {
  CpuArchitecture,
  OperatingSystemFamily,
  renderPortMappings,
  fargateTaskDefinitionAwsxIdentity,
  validateTaskProviders,
} from '../../../src/ecs/fargate/taskDefinition';
import {
  PortMappingAppProtocol,
  PortMappingProtocol,
} from '../../../src/ecs/fargate/containerDefinition';

const resources: pulumi.runtime.MockResourceArgs[] = [];
const calls: pulumi.runtime.MockCallArgs[] = [];
const providerRegion = 'us-west-2';
let nativeProviderRegion = providerRegion;
const accountId = '123456789012';
const credentialsSecretArn = `arn:aws:secretsmanager:${providerRegion}:${accountId}:secret:ad-credentials`;
const credentialConfig: FargateCredentialSpecConfig = {
  domainSid: 'S-1-5-21-2554468230-2647958158-2204241789',
  domainGuid: '8665abd4-e947-4dd0-9a51-f8254943c90b',
  domainName: 'example.com',
  netBiosName: 'EXAMPLE',
  gmsaAccountName: 'WebApp01',
  credentialsSecretArn,
};
const existingCredSpec = {
  CmsPlugins: ['ActiveDirectory'],
  DomainJoinConfig: {
    Sid: 'S-1-5-21-2554468230-2647958158-2204241789',
    MachineAccountName: 'WebApp01',
    Guid: '8665abd4-e947-4dd0-9a51-f8254943c90b',
    DnsTreeName: 'example.com',
    DnsName: 'example.com',
    NetBiosName: 'EXAMPLE',
  },
  ActiveDirectoryConfig: {
    GroupManagedServiceAccounts: [{ Name: 'WebApp01', Scope: 'example.com' }],
    HostAccountConfig: {
      PortableCcgVersion: '1',
      PluginGUID: '{859E1386-BDB4-49E8-85C7-3070B13920E1}',
      PluginInput: { CredentialArn: credentialsSecretArn },
    },
  },
};
const existingObjects = new Map<string, { body: string; kmsKeyId?: string }>();

/**
 * Parses the ARN fields returned by the AWS ARN parser invoke.
 *
 * @param arn The ARN to parse.
 * @returns The parsed ARN fields.
 */
function parseArn(arn: string): Record<string, string> {
  const match = /^arn:([^:]+):([^:]*):([^:]*):([^:]*):(.*)$/.exec(arn);
  if (!match) {
    throw new Error(`Invalid test ARN: ${arn}`);
  }
  return {
    partition: match[1]!,
    service: match[2]!,
    region: match[3]!,
    accountId: match[4]!,
    resource: match[5]!,
  };
}

/**
 * Splits an enhanced-region import ID.
 *
 * @param id The import ID.
 * @returns The base ID and selected region.
 */
function splitRegionalId(id: string): { id: string; region: string } {
  const separator = id.lastIndexOf('@');
  if (separator === -1) {
    return { id, region: providerRegion };
  }
  return { id: id.slice(0, separator), region: id.slice(separator + 1) };
}

/**
 * Resolves a region from an explicit provider reference, or the configured default.
 *
 * @param reference The provider reference recorded by Pulumi mocks.
 * @param providerPackage The provider package whose configuration to inspect.
 * @param defaultRegion The default provider's region.
 * @returns The selected provider's configured region.
 */
function mockProviderRegion(
  reference: string | undefined,
  providerPackage: string,
  defaultRegion: string,
): string {
  const name = reference?.split('::')[3];
  return (
    resources.find(
      (resource) =>
        resource.type === `pulumi:providers:${providerPackage}` && resource.name === name,
    )?.inputs.region ?? defaultRegion
  );
}

beforeAll(async () => {
  await pulumi.runtime.setMocks({
    newResource(args) {
      resources.push(args);
      const state: Record<string, unknown> = { ...args.inputs };

      switch (args.type) {
        case 'aws:iam/role:Role': {
          const roleName = args.id || args.inputs.name || args.name;
          state.name = roleName;
          state.arn = `arn:aws:iam::${accountId}:role/${roleName}`;
          break;
        }
        case 'aws:ssm/parameter:Parameter': {
          const imported = splitRegionalId(args.id || args.name);
          const parameterName = imported.id.startsWith('/') ? imported.id : `/${imported.id}`;
          state.name = parameterName;
          state.region = args.inputs.region ?? imported.region;
          state.arn = `arn:aws:ssm:${state.region}:${accountId}:parameter${parameterName}`;
          state.keyId = imported.id.includes('customer-key') ? 'alias/customer-key' : undefined;
          break;
        }
        case 'aws:secretsmanager/secret:Secret': {
          const arn =
            args.id || `arn:aws:secretsmanager:${providerRegion}:${accountId}:secret:test`;
          state.arn = arn;
          state.name = arn.split(':secret:')[1];
          state.region = args.inputs.region ?? parseArn(arn).region;
          state.kmsKeyId = arn.includes('customer-key') ? 'alias/customer-key' : undefined;
          break;
        }
        case 'aws:secretsmanager/secretVersion:SecretVersion': {
          state.versionId = `${args.name}-version`;
          break;
        }
        case 'aws:cloudwatch/logGroup:LogGroup': {
          const imported = splitRegionalId(args.id || args.inputs.name || args.name);
          state.name = imported.id;
          state.region = args.inputs.region ?? imported.region;
          state.arn = `arn:aws:logs:${state.region}:${accountId}:log-group:${imported.id}`;
          break;
        }
        case 'aws:s3/bucketObjectv2:BucketObjectv2': {
          state.key = args.inputs.key ?? `${args.name}-autonamed`;
          state.arn = `arn:aws:s3:::${args.inputs.bucket}/${state.key}`;
          // Simulate S3 returning the actual encryption key after applying bucket defaults.
          state.kmsKeyId = args.inputs.bucket.includes('kms')
            ? `arn:aws:kms:${args.inputs.region}:${accountId}:key/object-key`
            : '';
          break;
        }
        case 'aws-native:ecs:TaskDefinition':
          state.taskDefinitionArn = `arn:aws:ecs:${mockProviderRegion(args.provider, 'aws-native', nativeProviderRegion)}:${accountId}:task-definition/${args.inputs.family}:7`;
          break;
        default:
          state.arn = state.arn ?? `arn:aws:mock:::${args.name}`;
          state.name = state.name ?? args.name;
      }

      return {
        id: args.id || `${args.name}_id`,
        state,
      };
    },
    call(args) {
      calls.push(args);
      switch (args.token) {
        case 'aws:index/getCallerIdentity:getCallerIdentity':
        case 'aws-native:index:getAccountId':
          return { accountId };
        case 'aws-native:index:getRegion':
          return { region: mockProviderRegion(args.provider, 'aws-native', nativeProviderRegion) };
        case 'aws:index/arnParse:arnParse':
          return parseArn(args.inputs.arn);
        case 'aws:index/getRegion:getRegion':
          return {
            description: 'US West (Oregon)',
            endpoint: 'ec2.us-west-2.amazonaws.com',
            id: providerRegion,
            name: args.inputs.region ?? mockProviderRegion(args.provider, 'aws', providerRegion),
            region: args.inputs.region ?? mockProviderRegion(args.provider, 'aws', providerRegion),
          };
        case 'aws:s3/getBucket:getBucket':
          return {
            ...args.inputs,
            bucketRegion: args.inputs.bucket.includes('regional') ? 'eu-west-1' : providerRegion,
          };
        case 'aws:s3/getObject:getObject': {
          const object = existingObjects.get(args.inputs.key) ?? {
            body: JSON.stringify(existingCredSpec),
          };
          return {
            ...args.inputs,
            bodyBase64: Buffer.from(object.body).toString('base64'),
            sseKmsKeyId: object.kmsKeyId ?? '',
          };
        }
        case 'aws:kms/getKey:getKey':
          return {
            arn: args.inputs.keyId.startsWith('arn:')
              ? args.inputs.keyId
              : `arn:aws:kms:${args.inputs.region}:${accountId}:key/${args.inputs.keyId.replace('alias/', '')}`,
            keyId: args.inputs.keyId,
            keyManager: /(?:alias\/|:key\/)(?:customer-key|object-key)$/.test(args.inputs.keyId)
              ? 'CUSTOMER'
              : 'AWS',
          };
        default:
          return args.inputs;
      }
    },
  });
});

beforeEach(() => {
  resources.length = 0;
  calls.length = 0;
  existingObjects.clear();
  nativeProviderRegion = providerRegion;
});

/**
 * Resolves a Pulumi output for test assertions.
 *
 * @param value The output to resolve.
 * @returns The resolved output value.
 */
function unwrap<T>(value: pulumi.Output<T>): Promise<T> {
  return new Promise((resolve) => value.apply(resolve));
}

/**
 * Gets resources with the selected Pulumi type.
 *
 * @param type The Pulumi resource type.
 * @returns Matching resources.
 */
function resourcesOfType(type: string): pulumi.runtime.MockResourceArgs[] {
  return resources.filter((resource) => resource.type === type);
}

/**
 * Finds a recorded ECS task definition resource.
 *
 * @param name The Pulumi resource name.
 * @returns The recorded resource, if it exists.
 */
function taskDefinitionResource(name: string): pulumi.runtime.MockResourceArgs | undefined {
  return resources.find(
    (resource) => resource.type === 'aws-native:ecs:TaskDefinition' && resource.name === name,
  );
}

/**
 * Resolves a task and returns its structured Native container inputs.
 *
 * @param task The task to resolve.
 * @param resourceName The task definition child name.
 * @returns The structured container definitions.
 */
async function resolveContainers(
  task: FargateTaskDefinitionV2,
  resourceName: string,
): Promise<Array<Record<string, any>>> {
  await unwrap(task.taskDefinitionArn);
  const resource = taskDefinitionResource(resourceName);
  expect(resource).toBeDefined();
  return resource!.inputs.containerDefinitions;
}

/**
 * Returns the parsed inline execution-role policy for a task.
 *
 * @param name The task component name.
 * @returns The parsed policy document.
 */
function executionRolePolicy(name: string): Record<string, any> {
  const policies = resourcesOfType('aws:iam/rolePolicy:RolePolicy');
  const policy = policies.find((resource) => resource.name === `${name}-execution-role-policy`);
  expect(policy).toBeDefined();
  return JSON.parse(policy!.inputs.policy);
}

describe('Fargate container rendering', () => {
  test.each([
    { nativeAccount: '999999999999', nativeRegion: providerRegion },
    { nativeAccount: accountId, nativeRegion: 'eu-west-1' },
  ])('rejects mismatched Native destinations %j', (nativeDestination) => {
    expect(() =>
      validateTaskProviders({
        awsAccount: accountId,
        awsRegion: providerRegion,
        ...nativeDestination,
      }),
    ).toThrow('require matching AWS and AWS Native accounts and regions');
  });

  test('stores secret-marked values and keeps only references on the Native task', async () => {
    let version: aws.secretsmanager.SecretVersion | undefined;
    const retained: pulumi.ResourceTransformationArgs[] = [];
    const task = new FargateTaskDefinitionV2(
      'secret-environment',
      {
        containers: {
          app: {
            image: 'nginx',
            environment: {
              MODE: { value: 'production' },
              EMPTY: { value: '' },
              TOKEN: { value: pulumi.secret('token').apply((value) => `${value}-derived`) },
            },
          },
        },
      },
      {
        transformations: [
          (args): undefined => {
            if (args.opts.retainOnDelete) retained.push(args);
            if (aws.secretsmanager.SecretVersion.isInstance(args.resource)) {
              version = args.resource;
            }
            return undefined;
          },
        ],
      },
    );
    const containers = await resolveContainers(task, 'secret-environment');
    expect(containers[0]!.environment).toEqual([
      { name: 'MODE', value: 'production' },
      { name: 'EMPTY', value: '' },
    ]);
    expect(containers[0]!.secrets).toEqual([
      {
        name: 'TOKEN',
        valueFrom: `arn:aws:secretsmanager:${providerRegion}:${accountId}:secret:test:::secret-environment-app-TOKEN-environment-version`,
      },
    ]);
    expect(JSON.stringify(taskDefinitionResource('secret-environment')!.inputs)).not.toContain(
      'token-derived',
    );
    expect(await pulumi.isSecret(version!.secretString)).toBe(true);
    expect(await unwrap(version!.secretString)).toBe('token-derived');
    expect(resourcesOfType('aws:secretsmanager/secret:Secret')).toHaveLength(1);
    expect(resourcesOfType('aws:secretsmanager/secretVersion:SecretVersion')).toHaveLength(1);
    expect(retained.map(({ type, name, opts }) => ({ type, name, parent: opts.parent }))).toEqual([
      {
        type: 'aws:secretsmanager/secret:Secret',
        name: 'secret-environment-app-TOKEN-environment',
        parent: task,
      },
      {
        type: 'aws:secretsmanager/secretVersion:SecretVersion',
        name: 'secret-environment-app-TOKEN-environment',
        parent: task,
      },
      {
        type: 'aws:iam/rolePolicy:RolePolicy',
        name: 'secret-environment-app-TOKEN-environment-policy',
        parent: task,
      },
    ]);
    const policy = resourcesOfType('aws:iam/rolePolicy:RolePolicy').find(
      ({ name }) => name === 'secret-environment-app-TOKEN-environment-policy',
    )!;
    expect(policy.inputs.role).toBe('secret-environment-execution-role');
    expect(JSON.parse(policy.inputs.policy)).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: 'secretsmanager:GetSecretValue',
          Resource: `arn:aws:secretsmanager:${providerRegion}:${accountId}:secret:test`,
        },
      ],
    });
  });

  test.each([
    {},
    { value: 'plain', ssmParameterArn: 'arn:aws:ssm:us-west-2:123456789012:parameter/app' },
    { value: '', secretsManager: { secretArn: credentialsSecretArn } },
  ])('rejects missing or conflicting environment sources %j', (source) => {
    expect(
      () =>
        new FargateTaskDefinitionV2('invalid-environment', {
          containers: { app: { image: 'nginx', environment: { TOKEN: source } } },
        }),
    ).toThrow('Specify exactly one of value, ssmParameterArn or secretsManager');
  });

  test('validates AWSX container options before rendering Native inputs', () => {
    expect(
      () =>
        new FargateTaskDefinitionV2('invalid-health', {
          containers: { app: { image: 'nginx', healthCheck: { command: ['invalid'] } } },
        }),
    ).toThrow('must start with CMD or CMD-SHELL');
  });
  test('renders exact port mapping fields', () => {
    expect(
      renderPortMappings([
        {
          containerPort: 8080,
          protocol: PortMappingProtocol.UDP,
          appProtocol: PortMappingAppProtocol.GRPC,
        },
        {
          containerPortRange: { start: 8000, end: 8010 },
        },
      ]),
    ).toEqual([
      {
        containerPort: 8080,
        containerPortRange: undefined,
        protocol: 'udp',
        appProtocol: 'grpc',
      },
      {
        containerPortRange: '8000-8010',
        protocol: undefined,
        appProtocol: undefined,
      },
    ]);
  });

  test.each([
    { start: 0, end: 2 },
    { start: 2, end: 2 },
    { start: 3, end: 2 },
    { start: 65534, end: 65536 },
  ])('rejects invalid port range $start-$end', ({ start, end }) => {
    expect(
      () =>
        new FargateTaskDefinitionV2(`ports-${start}-${end}`, {
          containers: {
            app: {
              image: 'nginx',
              portMappings: [{ containerPortRange: { start, end } }],
            },
          },
        }),
    ).toThrow('containerPortRange must contain values between 1 and 65535');
  });
});

describe('Fargate credential specifications', () => {
  test('creates exact domainless JSON with bucket encryption and Output-valued inputs', async () => {
    nativeProviderRegion = 'us-east-2';
    const provider = new aws.Provider('generated-credential-provider', { region: 'us-east-1' });
    const task = new FargateTaskDefinitionV2(
      'generated-credentials',
      {
        region: 'us-east-2',
        containers: {
          app: {
            image: 'nginx',
            logging: { disabled: true },
            credentialSpec: {
              bucketArn: pulumi.output('arn:aws:s3:::regional-kms-credential-bucket'),
              config: {
                ...credentialConfig,
                credentialsSecretArn: pulumi.output(credentialsSecretArn),
              },
            },
          },
        },
      },
      { provider },
    );
    const containers = await resolveContainers(task, 'generated-credentials');
    const objects = resourcesOfType('aws:s3/bucketObjectv2:BucketObjectv2');
    expect(objects).toHaveLength(1);
    const object = objects[0]!;
    expect(object.name).toBe('generated-credentials-app-credential-spec');
    expect(object.inputs).toMatchObject({
      bucket: 'regional-kms-credential-bucket',
      region: 'eu-west-1',
      contentType: 'application/json',
    });
    expect(object.inputs.key).toBeUndefined();
    expect(object.inputs.serverSideEncryption).toBeUndefined();
    expect(object.inputs.kmsKeyId).toBeUndefined();
    expect(object.inputs.bucketKeyEnabled).toBeUndefined();
    expect(JSON.parse(object.inputs.content)).toEqual(existingCredSpec);
    const providerRef = object.provider;
    expect(providerRef).toContain('generated-credential-provider');
    expect(
      new Set(
        calls.filter(({ token }) => !token.startsWith('aws-native:')).map((call) => call.provider),
      ),
    ).toEqual(new Set([providerRef]));
    expect(containers[0]!.credentialSpecs).toEqual([
      'credentialspecdomainless:arn:aws:s3:::regional-kms-credential-bucket/generated-credentials-app-credential-spec-autonamed',
    ]);
    expect(calls.filter(({ token }) => token === 'aws:s3/getObject:getObject')).toEqual([]);
    expect(
      resourcesOfType(
        'aws:s3/bucketServerSideEncryptionConfiguration:BucketServerSideEncryptionConfiguration',
      ),
    ).toEqual([]);
    expect(executionRolePolicy('generated-credentials').Statement).toEqual([
      { Effect: 'Allow', Action: 'ecr:GetAuthorizationToken', Resource: '*' },
      {
        Effect: 'Allow',
        Action: ['s3:GetBucketLocation', 's3:ListBucket'],
        Resource: 'arn:aws:s3:::regional-kms-credential-bucket',
      },
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:GetObjectVersion'],
        Resource:
          'arn:aws:s3:::regional-kms-credential-bucket/generated-credentials-app-credential-spec-autonamed',
      },
      {
        Effect: 'Allow',
        Action: 'kms:Decrypt',
        Resource: `arn:aws:kms:eu-west-1:${accountId}:key/object-key`,
      },
      { Effect: 'Allow', Action: 'secretsmanager:GetSecretValue', Resource: credentialsSecretArn },
    ]);
  });

  test('discovers the actual existing-object key and credentials secret in their own regions', async () => {
    const secretArn = `arn:aws:secretsmanager:eu-central-1:${accountId}:secret:customer-key`;
    const body = JSON.parse(JSON.stringify(existingCredSpec));
    body.ActiveDirectoryConfig.HostAccountConfig.PluginInput.CredentialArn = secretArn;
    existingObjects.set('encrypted.json', {
      body: JSON.stringify(body),
      kmsKeyId: 'alias/object-key',
    });
    nativeProviderRegion = 'us-east-2';
    const provider = new aws.Provider('credential-provider', { region: 'us-east-1' });
    const task = new FargateTaskDefinitionV2(
      'existing-credentials',
      {
        region: 'us-east-2',
        containers: {
          app: {
            image: 'nginx',
            logging: { disabled: true },
            credentialSpec: {
              bucketArn: 'arn:aws:s3:::regional-credentials',
              key: pulumi.output('encrypted.json'),
            },
          },
        },
      },
      { provider },
    );
    const containers = await resolveContainers(task, 'existing-credentials');
    expect(containers[0]!.credentialSpecs).toEqual([
      'credentialspecdomainless:arn:aws:s3:::regional-credentials/encrypted.json',
    ]);
    expect(resourcesOfType('aws:s3/bucketObjectv2:BucketObjectv2')).toEqual([]);
    expect(
      resourcesOfType(
        'aws:s3/bucketServerSideEncryptionConfiguration:BucketServerSideEncryptionConfiguration',
      ),
    ).toEqual([]);
    expect(
      calls
        .filter(({ token }) => token === 'aws:s3/getObject:getObject')
        .map(({ inputs }) => inputs),
    ).toEqual([
      {
        bucket: 'regional-credentials',
        key: 'encrypted.json',
        region: 'eu-west-1',
        downloadBody: 'true',
      },
    ]);
    expect(
      resourcesOfType('aws:secretsmanager/secret:Secret').map(({ id, inputs }) => ({
        id,
        region: inputs.region,
      })),
    ).toEqual([{ id: secretArn, region: 'eu-central-1' }]);
    expect(executionRolePolicy('existing-credentials').Statement).toEqual([
      { Effect: 'Allow', Action: 'ecr:GetAuthorizationToken', Resource: '*' },
      {
        Effect: 'Allow',
        Action: ['s3:GetBucketLocation', 's3:ListBucket'],
        Resource: 'arn:aws:s3:::regional-credentials',
      },
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:GetObjectVersion'],
        Resource: 'arn:aws:s3:::regional-credentials/encrypted.json',
      },
      {
        Effect: 'Allow',
        Action: 'kms:Decrypt',
        Resource: `arn:aws:kms:eu-west-1:${accountId}:key/object-key`,
      },
      { Effect: 'Allow', Action: 'secretsmanager:GetSecretValue', Resource: secretArn },
      {
        Effect: 'Allow',
        Action: 'kms:Decrypt',
        Resource: `arn:aws:kms:eu-central-1:${accountId}:key/customer-key`,
      },
    ]);
    const providerRef = resourcesOfType('aws:secretsmanager/secret:Secret')[0]!.provider;
    expect(providerRef).toBeDefined();
    expect(
      new Set(
        calls.filter(({ token }) => !token.startsWith('aws-native:')).map((call) => call.provider),
      ),
    ).toEqual(new Set([providerRef]));
    expect(
      new Set(resourcesOfType('aws:secretsmanager/secret:Secret').map((r) => r.provider)),
    ).toEqual(new Set([providerRef]));
    expect(calls.some(({ token }) => token.includes('getSecretVersion'))).toBe(false);
  });

  test('uses SSE-S3 defaults without adding a KMS grant or creating a bucket', async () => {
    const task = new FargateTaskDefinitionV2('sse-s3-credentials', {
      containers: {
        app: {
          image: 'nginx',
          credentialSpec: { bucketArn: 'arn:aws:s3:::credentials', config: credentialConfig },
        },
      },
    });
    await unwrap(task.taskDefinitionArn);
    const object = resourcesOfType('aws:s3/bucketObjectv2:BucketObjectv2')[0]!;
    expect(object.inputs.serverSideEncryption).toBeUndefined();
    expect(object.inputs.bucketKeyEnabled).toBeUndefined();
    expect(object.inputs.kmsKeyId).toBeUndefined();
    expect(calls.filter(({ token }) => token === 'aws:kms/getKey:getKey')).toEqual([]);
    expect(
      resources.filter(
        (r) => r.type === 'aws:s3/bucket:Bucket' || r.type === 'aws:s3/bucketV2:BucketV2',
      ),
    ).toEqual([]);
  });

  test('supports a separate forest root when rendering domain metadata', async () => {
    const content = await unwrap(
      renderCredentialSpecConfig(
        { ...credentialConfig, dnsTreeName: 'root.example.com' },
        'config',
      ),
    );
    expect(JSON.parse(content).DomainJoinConfig).toEqual({
      ...existingCredSpec.DomainJoinConfig,
      DnsTreeName: 'root.example.com',
    });
  });

  test.each(['not json', '{"ActiveDirectoryConfig":{}}', 'null'])(
    'rejects unreadable or non-domainless files: %s',
    (body) => {
      expect(() => credentialsSecretArnFromSpec(body, 'containers.app.credentialSpec.key')).toThrow(
        pulumi.InputPropertyError,
      );
    },
  );
});

describe('FargateTaskDefinitionV2', () => {
  test('uses map keys as container names and derives task resources', async () => {
    const task = new FargateTaskDefinitionV2('derived', {
      containers: {
        app: {
          image: 'nginx',
          cpuUnits: 300,
          memoryMiB: 700,
        },
        sidecar: {
          image: 'busybox',
          cpuUnits: 100,
          memoryReservationMiB: 100,
        },
      },
    });

    const containers = await resolveContainers(task, 'derived');
    const resource = taskDefinitionResource('derived')!;
    expect(resource.inputs.cpu).toBe('512');
    expect(resource.inputs.memory).toBe('1024');
    expect(containers.map((container) => container.name)).toEqual(['app', 'sidecar']);
    expect(containers.map((container) => container.image)).toEqual(['nginx', 'busybox']);
  });

  test('resolves Pulumi outputs used as environment values', async () => {
    const task = new FargateTaskDefinitionV2('environment', {
      containers: {
        app: {
          image: 'nginx',
          environment: {
            API_URL: { value: pulumi.output('https://api.example.com') },
            MODE: { value: 'production' },
          },
        },
      },
    });

    const containers = await resolveContainers(task, 'environment');
    expect(containers[0]!.environment).toEqual([
      { name: 'API_URL', value: 'https://api.example.com' },
      { name: 'MODE', value: 'production' },
    ]);
  });

  test.each([20, 201, 0, 21.5])('rejects invalid ephemeral storage %s', (ephemeralStorageGiB) => {
    expect(
      () =>
        new FargateTaskDefinitionV2('invalid-storage', {
          ephemeralStorageGiB,
          containers: { app: { image: 'nginx' } },
        }),
    ).toThrow('ephemeralStorageGiB must be an integer between 21 and 200');
  });

  test.each([21, 200])('accepts ephemeral storage boundary %s', async (ephemeralStorageGiB) => {
    const task = new FargateTaskDefinitionV2(`storage-${ephemeralStorageGiB}`, {
      ephemeralStorageGiB,
      containers: { app: { image: 'nginx' } },
    });

    await unwrap(task.taskDefinitionArn);
    expect(
      taskDefinitionResource(`storage-${ephemeralStorageGiB}`)!.inputs.ephemeralStorage,
    ).toEqual({
      sizeInGiB: ephemeralStorageGiB,
    });
  });

  test('preserves an explicit valid task configuration and runtime platform', async () => {
    const task = new FargateTaskDefinitionV2('explicit', {
      cpuUnits: 2048,
      memoryMiB: 8192,
      runtimePlatform: {
        cpuArchitecture: CpuArchitecture.ARM64,
        operatingSystemFamily: OperatingSystemFamily.LINUX,
      },
      containers: {
        app: {
          image: 'nginx',
          cpuUnits: 256,
          memoryMiB: 512,
        },
      },
    });

    await unwrap(task.taskDefinitionArn);
    const resource = taskDefinitionResource('explicit')!;
    expect(resource.inputs.cpu).toBe('2048');
    expect(resource.inputs.memory).toBe('8192');
    expect(resource.inputs.runtimePlatform).toEqual({
      cpuArchitecture: 'ARM64',
      operatingSystemFamily: 'LINUX',
    });
  });

  test('creates default roles with stable names', async () => {
    const task = new FargateTaskDefinitionV2('roles', {
      containers: { app: { image: 'nginx' } },
    });
    await unwrap(task.taskDefinitionArn);

    const roles = resourcesOfType('aws:iam/role:Role');
    expect(roles.map(({ name, id }) => ({ name, id }))).toEqual([
      { name: 'roles-execution-role', id: '' },
      { name: 'roles-task-role', id: '' },
    ]);
    expect(taskDefinitionResource('roles')!.inputs).toMatchObject({
      executionRoleArn: `arn:aws:iam::${accountId}:role/roles-execution-role`,
      taskRoleArn: `arn:aws:iam::${accountId}:role/roles-task-role`,
    });
  });

  test('reads supplied roles without creating replacement roles', async () => {
    const task = new FargateTaskDefinitionV2('imported-roles', {
      executionRoleArn: `arn:aws:iam::${accountId}:role/service-role/execution`,
      taskRoleArn: `arn:aws:iam::${accountId}:role/application/task`,
      containers: { app: { image: 'nginx' } },
    });
    await unwrap(task.taskDefinitionArn);

    const roles = resourcesOfType('aws:iam/role:Role');
    expect(roles.map(({ name, id }) => ({ name, id }))).toEqual([
      { name: 'imported-roles-execution-role', id: 'execution' },
      { name: 'imported-roles-task-role', id: 'task' },
    ]);
  });

  test('keeps credential-secret and environment-secret children distinct', async () => {
    const task = new FargateTaskDefinitionV2('identity', {
      containers: {
        app: {
          image: 'nginx',
          credentialSpec: { bucketArn: 'arn:aws:s3:::credential-bucket', key: 'spec.json' },
          environment: {
            'credential-spec': { secretsManager: { secretArn: credentialsSecretArn } },
          },
        },
      },
    });
    await unwrap(task.taskDefinitionArn);
    const secrets = resourcesOfType('aws:secretsmanager/secret:Secret');
    expect(secrets).toHaveLength(2);
    expect(new Set(secrets.map(({ name }) => name))).toEqual(
      new Set(['identity-app-credential-spec-credentials', 'identity-app-credential-spec-secret']),
    );
  });

  test.each([
    {
      suffix: 'plain',
      source: {},
      expected: `arn:aws:secretsmanager:${providerRegion}:${accountId}:secret:application`,
    },
    {
      suffix: 'json-key',
      source: { jsonKey: 'password' },
      expected: `arn:aws:secretsmanager:${providerRegion}:${accountId}:secret:application:password::`,
    },
    {
      suffix: 'stage',
      source: { versionStage: 'AWSPREVIOUS' },
      expected: `arn:aws:secretsmanager:${providerRegion}:${accountId}:secret:application::AWSPREVIOUS:`,
    },
    {
      suffix: 'version',
      source: { versionId: 'version-123' },
      expected: `arn:aws:secretsmanager:${providerRegion}:${accountId}:secret:application:::version-123`,
    },
  ])('renders Secrets Manager selector $suffix', async ({ suffix, source, expected }) => {
    const secretArn = `arn:aws:secretsmanager:${providerRegion}:${accountId}:secret:application`;
    const task = new FargateTaskDefinitionV2(`secret-${suffix}`, {
      containers: {
        app: {
          image: 'nginx',
          environment: {
            DATABASE_PASSWORD: {
              secretsManager: { secretArn, ...source },
            },
          },
        },
      },
    });

    const containers = await resolveContainers(task, `secret-${suffix}`);
    expect(containers[0]!.secrets).toEqual([{ name: 'DATABASE_PASSWORD', valueFrom: expected }]);
  });

  test('rejects an empty container map', () => {
    expect(() => new FargateTaskDefinitionV2('empty-containers', { containers: {} })).toThrow(
      'At least one container must be provided',
    );
  });

  test.each([{}, { key: 'spec.json', config: credentialConfig }])(
    'rejects missing or conflicting credential-spec sources: %j',
    (source) => {
      expect(
        () =>
          new FargateTaskDefinitionV2('conflicting-credentials', {
            containers: {
              app: {
                image: 'nginx',
                credentialSpec: { bucketArn: 'arn:aws:s3:::credentials', ...source },
              },
            },
          }),
      ).toThrow('Specify exactly one of key or config');
    },
  );

  test('rejects credential specs for Windows Fargate tasks', () => {
    expect(
      () =>
        new FargateTaskDefinitionV2('windows-credentials', {
          runtimePlatform: {
            operatingSystemFamily: OperatingSystemFamily.WINDOWS_SERVER_2022_CORE,
          },
          containers: {
            app: {
              image: 'windows',
              credentialSpec: { bucketArn: 'arn:aws:s3:::credentials', key: 'spec.json' },
            },
          },
        }),
    ).toThrow('supported only for Linux containers on Fargate');
  });

  test('rejects conflicting secret sources', () => {
    expect(
      () =>
        new FargateTaskDefinitionV2('conflicting-secrets', {
          containers: {
            app: {
              image: 'nginx',
              environment: {
                CONFIG: {
                  secretsManager: {
                    secretArn: `arn:aws:secretsmanager:${providerRegion}:${accountId}:secret:config`,
                  },
                  ssmParameterArn: `arn:aws:ssm:${providerRegion}:${accountId}:parameter/config`,
                },
              },
            },
          },
        }),
    ).toThrow('Specify exactly one of value, ssmParameterArn or secretsManager');
  });

  test('rejects conflicting multiline log options', () => {
    expect(
      () =>
        new FargateTaskDefinitionV2('conflicting-logs', {
          containers: {
            app: {
              image: 'nginx',
              logging: {
                cloudwatch: {
                  streamPrefix: 'app',
                  datetimeFormat: '%Y',
                  multilinePattern: '^',
                },
              },
            },
          },
        }),
    ).toThrow('Only one of datetimeFormat and multilinePattern can be provided');
  });

  test('rejects simultaneous Secrets Manager version selectors', () => {
    expect(
      () =>
        new FargateTaskDefinitionV2('invalid-secret-version', {
          containers: {
            app: {
              image: 'nginx',
              environment: {
                DATABASE_PASSWORD: {
                  secretsManager: {
                    secretArn: `arn:aws:secretsmanager:${providerRegion}:${accountId}:secret:app`,
                    versionId: 'version-123',
                    versionStage: 'AWSPREVIOUS',
                  },
                },
              },
            },
          },
        }),
    ).toThrow('versionStage and versionId cannot be used together');
  });

  test('uses the secret ARN region for a Secrets Manager read', async () => {
    const secretRegion = 'us-east-1';
    nativeProviderRegion = secretRegion;
    const task = new FargateTaskDefinitionV2('secret-region', {
      region: secretRegion,
      containers: {
        app: {
          image: 'nginx',
          environment: {
            DATABASE_PASSWORD: {
              secretsManager: {
                secretArn: `arn:aws:secretsmanager:${secretRegion}:${accountId}:secret:application`,
              },
            },
          },
        },
      },
    });
    await unwrap(task.taskDefinitionArn);

    const secrets = resourcesOfType('aws:secretsmanager/secret:Secret');
    expect(secrets).toHaveLength(1);
    expect(secrets[0]!.inputs.region).toBe(secretRegion);
  });

  test('uses exact regional import IDs for SSM parameters and log groups', async () => {
    const task = new FargateTaskDefinitionV2('regional-imports', {
      containers: {
        app: {
          image: 'nginx',
          environment: {
            CONFIG: {
              ssmParameterArn: `arn:aws:ssm:us-east-1:${accountId}:parameter/team/application/config`,
            },
          },
          logging: {
            cloudwatch: {
              logGroupArn: `arn:aws:logs:eu-west-1:${accountId}:log-group:/service/application:*`,
              streamPrefix: 'app',
            },
          },
        },
      },
    });
    await unwrap(task.taskDefinitionArn);

    expect(resourcesOfType('aws:ssm/parameter:Parameter')[0]!.id).toBe(
      '/team/application/config@us-east-1',
    );
    expect(resourcesOfType('aws:cloudwatch/logGroup:LogGroup')[0]!.id).toBe(
      '/service/application@eu-west-1',
    );
  });

  test('uses the inherited provider region for imports when the task selects another region', async () => {
    nativeProviderRegion = 'us-east-2';
    const task = new FargateTaskDefinitionV2('selected-region-imports', {
      region: 'us-east-2',
      containers: {
        app: {
          image: 'nginx',
          environment: {
            CONFIG: {
              ssmParameterArn: `arn:aws:ssm:us-east-2:${accountId}:parameter/team/config`,
            },
          },
          logging: {
            cloudwatch: {
              logGroupArn: `arn:aws:logs:us-east-2:${accountId}:log-group:/team/logs:*`,
              streamPrefix: 'app',
            },
          },
        },
      },
    });
    await unwrap(task.taskDefinitionArn);

    expect(resourcesOfType('aws:ssm/parameter:Parameter')[0]!.id).toBe('/team/config@us-east-2');
    expect(resourcesOfType('aws:cloudwatch/logGroup:LogGroup')[0]!.id).toBe('/team/logs@us-east-2');
    expect(
      calls
        .filter(({ token }) => token === 'aws:index/getRegion:getRegion')
        .map(({ inputs }) => inputs.region),
    ).toEqual(expect.arrayContaining([undefined, 'us-east-2']));
  });

  test('uses plain same-region import IDs', async () => {
    const task = new FargateTaskDefinitionV2('same-region-imports', {
      containers: {
        app: {
          image: 'nginx',
          environment: {
            CONFIG: {
              ssmParameterArn: `arn:aws:ssm:${providerRegion}:${accountId}:parameter/team/application/config`,
            },
          },
          logging: {
            cloudwatch: {
              logGroupArn: `arn:aws:logs:${providerRegion}:${accountId}:log-group:/service/application:*`,
              streamPrefix: 'app',
            },
          },
        },
      },
    });
    await unwrap(task.taskDefinitionArn);

    expect(resourcesOfType('aws:ssm/parameter:Parameter')[0]!.id).toBe('/team/application/config');
    expect(resourcesOfType('aws:cloudwatch/logGroup:LogGroup')[0]!.id).toBe('/service/application');
  });

  test('enables CloudWatch by default with one shared group and scoped permissions', async () => {
    const task = new FargateTaskDefinitionV2('default-logging', {
      containers: {
        app: { image: 'nginx' },
        sidecar: { image: 'busybox', logging: { cloudwatch: {} } },
      },
    });
    const containers = await resolveContainers(task, 'default-logging');
    expect(resourcesOfType('aws:cloudwatch/logGroup:LogGroup').map((r) => r.name)).toEqual([
      'default-logging-log-group',
    ]);
    expect(containers.map((container) => container.logConfiguration)).toEqual([
      {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': 'default-logging-log-group',
          'awslogs-region': providerRegion,
          'awslogs-stream-prefix': 'default-logging',
        },
      },
      {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': 'default-logging-log-group',
          'awslogs-region': providerRegion,
          'awslogs-stream-prefix': 'default-logging',
        },
      },
    ]);
    expect(executionRolePolicy('default-logging').Statement).toEqual([
      { Effect: 'Allow', Action: 'ecr:GetAuthorizationToken', Resource: '*' },
      {
        Effect: 'Allow',
        Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        Resource: `arn:aws:logs:${providerRegion}:${accountId}:log-group:default-logging-log-group:*`,
      },
    ]);
  });

  test('omits logging resources and permissions when every container opts out', async () => {
    const task = new FargateTaskDefinitionV2('disabled-logging', {
      containers: { app: { image: 'nginx', logging: { disabled: true } } },
    });
    const containers = await resolveContainers(task, 'disabled-logging');
    expect(containers[0]!.logConfiguration).toBeUndefined();
    expect(resourcesOfType('aws:cloudwatch/logGroup:LogGroup')).toEqual([]);
    expect(task.logGroup).toBeUndefined();
    expect(executionRolePolicy('disabled-logging').Statement).toEqual([
      { Effect: 'Allow', Action: 'ecr:GetAuthorizationToken', Resource: '*' },
    ]);
  });

  test('allows individual containers to opt out while others use default logging', async () => {
    const task = new FargateTaskDefinitionV2('mixed-logging', {
      containers: {
        app: { image: 'nginx', logging: { disabled: false } },
        sidecar: { image: 'busybox', logging: { disabled: true } },
      },
    });
    const containers = await resolveContainers(task, 'mixed-logging');
    expect(containers.map((container) => container.logConfiguration)).toEqual([
      {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': 'mixed-logging-log-group',
          'awslogs-region': providerRegion,
          'awslogs-stream-prefix': 'mixed-logging',
        },
      },
      undefined,
    ]);
    expect(resourcesOfType('aws:cloudwatch/logGroup:LogGroup').map((r) => r.name)).toEqual([
      'mixed-logging-log-group',
    ]);
  });

  test('rejects CloudWatch settings combined with disabled logging', () => {
    expect(
      () =>
        new FargateTaskDefinitionV2('conflicting-logging', {
          containers: { app: { image: 'nginx', logging: { disabled: true, cloudwatch: {} } } },
        }),
    ).toThrow('Only one of disabled: true or cloudwatch can be provided');
  });

  test('shares one default log group and renders exact log options', async () => {
    nativeProviderRegion = 'us-east-2';
    const task = new FargateTaskDefinitionV2('logging', {
      region: 'us-east-2',
      containers: {
        app: {
          image: 'nginx',
          logging: {
            cloudwatch: {
              streamPrefix: 'application',
              mode: AwsLogDriverMode.NON_BLOCKING,
              maxBufferSizeBytes: 1048576,
            },
          },
        },
        sidecar: {
          image: 'busybox',
          logging: { cloudwatch: { streamPrefix: 'sidecar' } },
        },
      },
    });

    const containers = await resolveContainers(task, 'logging');
    const logGroups = resourcesOfType('aws:cloudwatch/logGroup:LogGroup');
    expect(logGroups.map(({ name, id, inputs }) => ({ name, id, region: inputs.region }))).toEqual([
      { name: 'logging-log-group', id: '', region: 'us-east-2' },
    ]);
    expect(containers.map((container) => container.logConfiguration)).toEqual([
      {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': 'logging-log-group',
          'awslogs-region': 'us-east-2',
          'awslogs-stream-prefix': 'application',
          mode: 'non-blocking',
          'max-buffer-size': '1048576b',
        },
      },
      {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': 'logging-log-group',
          'awslogs-region': 'us-east-2',
          'awslogs-stream-prefix': 'sidecar',
        },
      },
    ]);
  });

  test('does not create a default log group when an ARN is supplied', async () => {
    const task = new FargateTaskDefinitionV2('existing-log-group', {
      containers: {
        app: {
          image: 'nginx',
          logging: {
            cloudwatch: {
              logGroupArn: `arn:aws:logs:${providerRegion}:${accountId}:log-group:/service/existing:*`,
              streamPrefix: 'app',
            },
          },
        },
      },
    });
    await unwrap(task.taskDefinitionArn);

    expect(
      resourcesOfType('aws:cloudwatch/logGroup:LogGroup').map(({ name, id }) => ({ name, id })),
    ).toEqual([{ name: 'existing-log-group-app-log-group', id: '/service/existing' }]);
    expect(task.logGroup).toBeUndefined();
  });

  test.each([
    'my.repo:latest',
    `team/my.repo:tag@sha256:${'a'.repeat(64)}`,
    `team/repo@sha256:${'b'.repeat(64)}`,
  ])('grants pull access for ECR image %s', async (reference) => {
    const task = new FargateTaskDefinitionV2('image-reference', {
      containers: { app: { image: `${accountId}.dkr.ecr.us-east-1.amazonaws.com/${reference}` } },
    });
    await unwrap(task.taskDefinitionArn);
    expect(executionRolePolicy('image-reference').Statement).toEqual([
      { Effect: 'Allow', Action: 'ecr:GetAuthorizationToken', Resource: '*' },
      {
        Effect: 'Allow',
        Action: [
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
        ],
        Resource: [`arn:aws:ecr:us-east-1:${accountId}:repository/${reference.split(/[:@]/)[0]}`],
      },
      {
        Effect: 'Allow',
        Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        Resource: `arn:aws:logs:${providerRegion}:${accountId}:log-group:image-reference-log-group:*`,
      },
    ]);
  });

  test('renders directly into Native without nested container resources', async () => {
    const task = new FargateTaskDefinitionV2(
      'awsx-identity',
      {
        containers: { app: { image: 'nginx' } },
      },
      {},
      fargateTaskDefinitionAwsxIdentity,
    );
    expect(await resolveContainers(task, 'awsx-identity')).toEqual([
      {
        name: 'app',
        image: 'nginx',
        essential: true,
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': 'awsx-identity-log-group',
            'awslogs-region': providerRegion,
            'awslogs-stream-prefix': 'awsx-identity',
          },
        },
      },
    ]);
    expect(
      resourcesOfType('awsx:experimental/ecs:ContainerDefinition').map(({ name }) => name),
    ).toEqual([]);
    expect(resourcesOfType('awsx-next:index:ContainerDefinition')).toEqual([]);
    expect(resourcesOfType('aws:ecs/taskDefinition:TaskDefinition')).toEqual([]);
  });

  test('sizes Windows tasks using Windows configurations', async () => {
    const task = new FargateTaskDefinitionV2('windows-default', {
      runtimePlatform: { operatingSystemFamily: OperatingSystemFamily.WINDOWS_SERVER_2022_CORE },
      containers: { app: { image: 'windows-image' } },
    });
    await unwrap(task.taskDefinitionArn);
    expect(taskDefinitionResource('windows-default')!.inputs).toMatchObject({
      cpu: '1024',
      memory: '2048',
    });
  });

  test.each(['startTimeoutSeconds', 'stopTimeoutSeconds'] as const)(
    'preserves %s boundaries',
    async (property) => {
      const task = new FargateTaskDefinitionV2(`timeout-${property}`, {
        containers: {
          minimum: { image: 'nginx', [property]: 2 },
          maximum: { image: 'nginx', [property]: 120 },
          omitted: { image: 'nginx' },
        },
      });
      const containers = await resolveContainers(task, `timeout-${property}`);
      const apiProperty = property === 'startTimeoutSeconds' ? 'startTimeout' : 'stopTimeout';
      expect(containers.map((container) => container[apiProperty])).toEqual([2, 120, undefined]);
    },
  );

  test.each([
    ['startTimeoutSeconds', 1],
    ['startTimeoutSeconds', 121],
    ['stopTimeoutSeconds', 1],
    ['stopTimeoutSeconds', 121],
    ['stopTimeoutSeconds', 2.5],
  ])('rejects %s=%s at the Fargate boundary', (property, value) => {
    expect(
      () =>
        new FargateTaskDefinitionV2('invalid-timeout', {
          containers: { app: { image: 'nginx', [property]: value } },
        }),
    ).toThrow(`${property} must be an integer between 2 and 120; got ${value}`);
  });

  test('adds KMS decrypt for a customer-managed SSM parameter key in its region', async () => {
    const task = new FargateTaskDefinitionV2('ssm-kms', {
      containers: {
        app: {
          image: 'nginx',
          environment: {
            CONFIG: {
              ssmParameterArn: `arn:aws:ssm:us-east-2:${accountId}:parameter/customer-key`,
            },
          },
        },
      },
    });
    await unwrap(task.taskDefinitionArn);
    expect(executionRolePolicy('ssm-kms').Statement).toEqual([
      { Effect: 'Allow', Action: 'ecr:GetAuthorizationToken', Resource: '*' },
      {
        Effect: 'Allow',
        Action: ['ssm:GetParameters', 'ssm:GetParameter'],
        Resource: `arn:aws:ssm:us-east-2:${accountId}:parameter/customer-key`,
      },
      {
        Effect: 'Allow',
        Action: 'kms:Decrypt',
        Resource: `arn:aws:kms:us-east-2:${accountId}:key/customer-key`,
      },
      {
        Effect: 'Allow',
        Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        Resource: `arn:aws:logs:${providerRegion}:${accountId}:log-group:ssm-kms-log-group:*`,
      },
    ]);
    expect(
      calls.filter(({ token }) => token === 'aws:kms/getKey:getKey').map(({ inputs }) => inputs),
    ).toEqual([{ keyId: 'alias/customer-key', region: 'us-east-2' }]);
  });

  test('renders the exact base and ECR execution policy', async () => {
    const task = new FargateTaskDefinitionV2('ecr-policy', {
      containers: {
        app: {
          image: `${accountId}.dkr.ecr.us-east-1.amazonaws.com/team/application:latest`,
        },
      },
    });
    await unwrap(task.taskDefinitionArn);

    expect(executionRolePolicy('ecr-policy')).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: 'ecr:GetAuthorizationToken',
          Resource: '*',
        },
        {
          Effect: 'Allow',
          Action: [
            'ecr:BatchCheckLayerAvailability',
            'ecr:GetDownloadUrlForLayer',
            'ecr:BatchGetImage',
          ],
          Resource: [`arn:aws:ecr:us-east-1:${accountId}:repository/team/application`],
        },
        {
          Effect: 'Allow',
          Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
          Resource: `arn:aws:logs:${providerRegion}:${accountId}:log-group:ecr-policy-log-group:*`,
        },
      ],
    });
  });

  test('renders exact S3 environment and credential policy statements', async () => {
    const task = new FargateTaskDefinitionV2('s3-policy', {
      containers: {
        app: {
          image: 'nginx',
          environmentFiles: [
            { bucketArn: 'arn:aws:s3:::environment-bucket', key: 'configs/app.env' },
          ],
          credentialSpec: {
            bucketArn: 'arn:aws:s3:::credential-bucket',
            key: 'credentials/domainless.json',
          },
        },
      },
    });
    await unwrap(task.taskDefinitionArn);

    expect(executionRolePolicy('s3-policy').Statement).toEqual([
      { Effect: 'Allow', Action: 'ecr:GetAuthorizationToken', Resource: '*' },
      {
        Effect: 'Allow',
        Action: ['s3:GetBucketLocation', 's3:ListBucket'],
        Resource: 'arn:aws:s3:::credential-bucket',
      },
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:GetObjectVersion'],
        Resource: 'arn:aws:s3:::credential-bucket/credentials/domainless.json',
      },
      {
        Effect: 'Allow',
        Action: 'secretsmanager:GetSecretValue',
        Resource: credentialsSecretArn,
      },
      {
        Effect: 'Allow',
        Action: 's3:GetBucketLocation',
        Resource: 'arn:aws:s3:::environment-bucket',
      },
      {
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::environment-bucket/configs/app.env',
      },
      {
        Effect: 'Allow',
        Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        Resource: `arn:aws:logs:${providerRegion}:${accountId}:log-group:s3-policy-log-group:*`,
      },
    ]);
  });

  test('renders exact SSM and CloudWatch Logs policy statements', async () => {
    const task = new FargateTaskDefinitionV2('service-policy', {
      containers: {
        app: {
          image: 'nginx',
          environment: {
            CONFIG: {
              ssmParameterArn: `arn:aws:ssm:${providerRegion}:${accountId}:parameter/application`,
            },
          },
          logging: { cloudwatch: { streamPrefix: 'app' } },
        },
      },
    });
    await unwrap(task.taskDefinitionArn);

    expect(executionRolePolicy('service-policy').Statement).toEqual([
      { Effect: 'Allow', Action: 'ecr:GetAuthorizationToken', Resource: '*' },
      {
        Effect: 'Allow',
        Action: ['ssm:GetParameters', 'ssm:GetParameter'],
        Resource: `arn:aws:ssm:${providerRegion}:${accountId}:parameter/application`,
      },
      {
        Effect: 'Allow',
        Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        Resource: `arn:aws:logs:${providerRegion}:${accountId}:log-group:service-policy-log-group:*`,
      },
    ]);
  });

  test('adds KMS decrypt only for a customer-managed secret key', async () => {
    const task = new FargateTaskDefinitionV2('kms-policy', {
      containers: {
        app: {
          image: 'nginx',
          environment: {
            CUSTOMER: {
              secretsManager: {
                secretArn: `arn:aws:secretsmanager:us-east-1:${accountId}:secret:customer-key`,
              },
            },
            AWS_MANAGED: {
              secretsManager: {
                secretArn: `arn:aws:secretsmanager:us-east-1:${accountId}:secret:aws-managed`,
              },
            },
          },
        },
      },
    });
    await unwrap(task.taskDefinitionArn);

    expect(executionRolePolicy('kms-policy').Statement).toEqual([
      { Effect: 'Allow', Action: 'ecr:GetAuthorizationToken', Resource: '*' },
      {
        Effect: 'Allow',
        Action: 'secretsmanager:GetSecretValue',
        Resource: `arn:aws:secretsmanager:us-east-1:${accountId}:secret:customer-key`,
      },
      {
        Effect: 'Allow',
        Action: 'kms:Decrypt',
        Resource: `arn:aws:kms:us-east-1:${accountId}:key/customer-key`,
      },
      {
        Effect: 'Allow',
        Action: 'secretsmanager:GetSecretValue',
        Resource: `arn:aws:secretsmanager:us-east-1:${accountId}:secret:aws-managed`,
      },
      {
        Effect: 'Allow',
        Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        Resource: `arn:aws:logs:${providerRegion}:${accountId}:log-group:kms-policy-log-group:*`,
      },
    ]);
  });

  test('propagates component region and provider to children and invokes', async () => {
    nativeProviderRegion = 'us-east-2';
    const provider = new aws.Provider('selected-provider', { region: 'us-east-1' });
    const task = new FargateTaskDefinitionV2(
      'provider-flow',
      {
        region: 'us-east-2',
        containers: {
          app: {
            image: 'nginx',
            logging: { cloudwatch: { streamPrefix: 'app' } },
            environment: {
              CONFIG: {
                ssmParameterArn: `arn:aws:ssm:us-east-2:${accountId}:parameter/application`,
              },
              TOKEN: { value: pulumi.secret('regional-token') },
            },
          },
        },
      },
      { providers: [provider, new native.Provider('selected-native', { region: 'us-east-2' })] },
    );
    await unwrap(task.taskDefinitionArn);

    const taskDefinition = taskDefinitionResource('provider-flow')!;
    const logGroup = resourcesOfType('aws:cloudwatch/logGroup:LogGroup')[0]!;
    const parameter = resourcesOfType('aws:ssm/parameter:Parameter')[0]!;
    expect(taskDefinition.inputs.region).toBeUndefined();
    expect(taskDefinition.provider).toContain('selected-native');
    expect(logGroup.inputs.region).toBe('us-east-2');
    expect(logGroup.provider).toContain('selected-provider');
    expect(
      new Set(
        calls
          .filter(({ token }) => token.startsWith('aws-native:'))
          .map(({ provider: ref }) => ref),
      ),
    ).toEqual(new Set([taskDefinition.provider]));
    expect(logGroup.provider).not.toBe(taskDefinition.provider);
    expect(parameter.provider).toBe(logGroup.provider);
    for (const type of [
      'aws:secretsmanager/secret:Secret',
      'aws:secretsmanager/secretVersion:SecretVersion',
    ]) {
      const managed = resourcesOfType(type);
      expect(managed).toHaveLength(1);
      expect(managed[0]!.inputs.region).toBe('us-east-2');
      expect(managed[0]!.provider).toBe(logGroup.provider);
    }
    const regionalCalls = calls.filter(({ token }) =>
      ['aws:index/arnParse:arnParse', 'aws:index/getRegion:getRegion'].includes(token),
    );
    expect(new Set(regionalCalls.map(({ token }) => token))).toEqual(
      new Set(['aws:index/arnParse:arnParse', 'aws:index/getRegion:getRegion']),
    );
    expect(new Set(regionalCalls.map(({ provider: invokeProvider }) => invokeProvider))).toEqual(
      new Set([logGroup.provider]),
    );
  });

  test('inherits both explicit providers when region is omitted', async () => {
    const provider = new aws.Provider('provider-default-region', { region: 'us-east-1' });
    const task = new FargateTaskDefinitionV2(
      'provider-default',
      {
        containers: {
          app: {
            image: 'nginx',
            logging: { cloudwatch: { streamPrefix: 'app' } },
          },
        },
      },
      { providers: [provider, new native.Provider('default-native', { region: 'us-east-1' })] },
    );
    await unwrap(task.taskDefinitionArn);

    const taskDefinition = taskDefinitionResource('provider-default')!;
    const logGroup = resourcesOfType('aws:cloudwatch/logGroup:LogGroup')[0]!;
    expect(taskDefinition.inputs.region).toBeUndefined();
    expect(taskDefinition.provider).toContain('default-native');
    expect(mockProviderRegion(taskDefinition.provider, 'aws-native', '')).toBe('us-east-1');
    expect(logGroup.inputs.region).toBeUndefined();
    expect(logGroup.provider).toContain('provider-default-region');
    expect(logGroup.provider).not.toBe(taskDefinition.provider);
  });

  test('exposes the registered task identity rather than the original family input', async () => {
    nativeProviderRegion = 'us-east-2';
    const task = new FargateTaskDefinitionV2(
      'outputs',
      {
        region: 'us-east-2',
        family: 'requested-family',
        containers: {
          app: {
            image: 'nginx',
            logging: { cloudwatch: { streamPrefix: 'app' } },
          },
        },
      },
      {
        transformations: [
          (args): pulumi.ResourceTransformationResult | undefined =>
            args.type === 'aws-native:ecs:TaskDefinition'
              ? { props: { ...args.props, family: 'registered-family' }, opts: args.opts }
              : undefined,
        ],
      },
    );
    await unwrap(task.taskDefinitionArn);

    expect(task.name).toBe('outputs');
    expect(task.region).toBe('us-east-2');
    expect(task.executionRole).toBeDefined();
    expect(task.taskRole).toBeDefined();
    expect(await unwrap(task.taskDefinitionArn)).toBe(
      `arn:aws:ecs:us-east-2:${accountId}:task-definition/registered-family:7`,
    );
    expect(await unwrap(task.family)).toBe('registered-family');
    expect(await unwrap(task.revision)).toBe(7);
    expect(task).not.toHaveProperty('taskDefinition');
    expect(task.logGroup).toBeDefined();
  });
});
