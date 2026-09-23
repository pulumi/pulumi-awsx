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
import * as pulumi from '@pulumi/pulumi';
import { AwsLogDriverMode, FargateTaskDefinitionV2 } from '../../../src/ecs';
import { CredentialSpecAuthenticationMode } from '../../../src/ecs/credentialSpec';
import {
  CpuArchitecture,
  OperatingSystemFamily,
  renderPortMappings,
} from '../../../src/ecs/fargate/taskDefinition';
import {
  PortMappingAppProtocol,
  PortMappingProtocol,
} from '../../../src/ecs/fargate/containerDefinition';

const resources: pulumi.runtime.MockResourceArgs[] = [];
const calls: pulumi.runtime.MockCallArgs[] = [];
const providerRegion = 'us-west-2';
const accountId = '123456789012';

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
        case 'aws:cloudwatch/logGroup:LogGroup': {
          const imported = splitRegionalId(args.id || args.inputs.name || args.name);
          state.name = imported.id;
          state.region = args.inputs.region ?? imported.region;
          state.arn = `arn:aws:logs:${state.region}:${accountId}:log-group:${imported.id}`;
          break;
        }
        case 'aws:ecs/taskDefinition:TaskDefinition':
          state.arn = `arn:aws:ecs:${args.inputs.region ?? providerRegion}:${accountId}:task-definition/${args.name}`;
          break;
        case 'awsx-next:index:ContainerDefinition': {
          const {
            definition: _definition,
            definitionJSON: _definitionJSON,
            ...container
          } = args.inputs;
          state.definition = container;
          state.definitionJSON = JSON.stringify(container);
          break;
        }
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
        case 'aws:index/arnParse:arnParse':
          return parseArn(args.inputs.arn);
        case 'aws:index/getRegion:getRegion':
          return {
            description: 'US West (Oregon)',
            endpoint: 'ec2.us-west-2.amazonaws.com',
            id: providerRegion,
            name: providerRegion,
            region: providerRegion,
          };
        case 'aws:kms/getKey:getKey':
          return {
            arn: `arn:aws:kms:${args.inputs.region}:${accountId}:key/customer-key`,
            keyId: args.inputs.keyId,
            keyManager: args.inputs.keyId === 'alias/customer-key' ? 'CUSTOMER' : 'AWS',
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
    (resource) =>
      resource.type === 'aws:ecs/taskDefinition:TaskDefinition' && resource.name === name,
  );
}

/**
 * Resolves a task and returns its serialized container definitions.
 *
 * @param task The task to resolve.
 * @param resourceName The task definition child name.
 * @returns The serialized container definitions.
 */
async function resolveContainers(
  task: FargateTaskDefinitionV2,
  resourceName: string,
): Promise<Array<Record<string, any>>> {
  await unwrap(task.taskDefinition.arn);
  const resource = taskDefinitionResource(resourceName);
  expect(resource).toBeDefined();
  return JSON.parse(resource!.inputs.containerDefinitions);
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

describe('FargateTaskDefinitionV2', () => {
  test('uses map keys as container names and derives task resources', async () => {
    const task = new FargateTaskDefinitionV2('derived', {
      containers: {
        app: {
          image: 'nginx',
          cpu: 300,
          memoryMiB: 700,
        },
        sidecar: {
          image: 'busybox',
          cpu: 100,
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
            API_URL: pulumi.output('https://api.example.com'),
            MODE: 'production',
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

  test.each([20, 201, 0, 21.5])('rejects invalid ephemeral storage %s', (ephemeralStorage) => {
    expect(
      () =>
        new FargateTaskDefinitionV2('invalid-storage', {
          ephemeralStorage,
          containers: { app: { image: 'nginx' } },
        }),
    ).toThrow('ephemeralStorage must be an integer between 21 and 200');
  });

  test.each([21, 200])('accepts ephemeral storage boundary %s', async (ephemeralStorage) => {
    const task = new FargateTaskDefinitionV2(`storage-${ephemeralStorage}`, {
      ephemeralStorage,
      containers: { app: { image: 'nginx' } },
    });

    await unwrap(task.taskDefinition.arn);
    expect(taskDefinitionResource(`storage-${ephemeralStorage}`)!.inputs.ephemeralStorage).toEqual({
      sizeInGib: ephemeralStorage,
    });
  });

  test('preserves an explicit valid task configuration and runtime platform', async () => {
    const task = new FargateTaskDefinitionV2('explicit', {
      cpu: 2048,
      memory: 8192,
      runtimePlatform: {
        cpuArchitecture: CpuArchitecture.ARM64,
        operatingSystemFamily: OperatingSystemFamily.LINUX,
      },
      containers: {
        app: {
          image: 'nginx',
          cpu: 256,
          memoryMiB: 512,
        },
      },
    });

    await unwrap(task.taskDefinition.arn);
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
    await unwrap(task.taskDefinition.arn);

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
    await unwrap(task.taskDefinition.arn);

    const roles = resourcesOfType('aws:iam/role:Role');
    expect(roles.map(({ name, id }) => ({ name, id }))).toEqual([
      { name: 'imported-roles-execution-role', id: 'execution' },
      { name: 'imported-roles-task-role', id: 'task' },
    ]);
  });

  test('creates distinct SSM children for credential specs and secrets', async () => {
    const task = new FargateTaskDefinitionV2('identity', {
      containers: {
        app: {
          image: 'nginx',
          credentialSpecs: [
            {
              authenticationMode: CredentialSpecAuthenticationMode.DOMAIN_JOINED,
              ssmParameterArn: `arn:aws:ssm:${providerRegion}:${accountId}:parameter/credentials`,
            },
          ],
          secrets: {
            '0': {
              ssmParameterArn: `arn:aws:ssm:${providerRegion}:${accountId}:parameter/application`,
            },
          },
        },
      },
    });
    await unwrap(task.taskDefinition.arn);

    const parameters = resourcesOfType('aws:ssm/parameter:Parameter');
    expect(parameters.map(({ name, id }) => ({ name, id }))).toEqual([
      {
        name: 'identity-app-credential-spec-0-param',
        id: 'credentials',
      },
      {
        name: 'identity-app-secret-0-param',
        id: 'application',
      },
    ]);
    expect(new Set(parameters.map((parameter) => parameter.name)).size).toBe(2);
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
          secrets: {
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

  test('rejects simultaneous Secrets Manager version selectors', () => {
    expect(
      () =>
        new FargateTaskDefinitionV2('invalid-secret-version', {
          containers: {
            app: {
              image: 'nginx',
              secrets: {
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
    const task = new FargateTaskDefinitionV2('secret-region', {
      region: secretRegion,
      containers: {
        app: {
          image: 'nginx',
          secrets: {
            DATABASE_PASSWORD: {
              secretsManager: {
                secretArn: `arn:aws:secretsmanager:${secretRegion}:${accountId}:secret:application`,
              },
            },
          },
        },
      },
    });
    await unwrap(task.taskDefinition.arn);

    const secrets = resourcesOfType('aws:secretsmanager/secret:Secret');
    expect(secrets).toHaveLength(1);
    expect(secrets[0]!.inputs.region).toBe(secretRegion);
  });

  test('uses exact regional import IDs for SSM parameters and log groups', async () => {
    const task = new FargateTaskDefinitionV2('regional-imports', {
      containers: {
        app: {
          image: 'nginx',
          secrets: {
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
    await unwrap(task.taskDefinition.arn);

    expect(resourcesOfType('aws:ssm/parameter:Parameter')[0]!.id).toBe(
      '/team/application/config@us-east-1',
    );
    expect(resourcesOfType('aws:cloudwatch/logGroup:LogGroup')[0]!.id).toBe(
      '/service/application@eu-west-1',
    );
  });

  test('uses the inherited provider region for imports when the task selects another region', async () => {
    const task = new FargateTaskDefinitionV2('selected-region-imports', {
      region: 'us-east-2',
      containers: {
        app: {
          image: 'nginx',
          secrets: {
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
    await unwrap(task.taskDefinition.arn);

    expect(resourcesOfType('aws:ssm/parameter:Parameter')[0]!.id).toBe('/team/config@us-east-2');
    expect(resourcesOfType('aws:cloudwatch/logGroup:LogGroup')[0]!.id).toBe('/team/logs@us-east-2');
    expect(calls.filter(({ token }) => token === 'aws:index/getRegion:getRegion')).toHaveLength(1);
  });

  test('uses plain same-region import IDs', async () => {
    const task = new FargateTaskDefinitionV2('same-region-imports', {
      containers: {
        app: {
          image: 'nginx',
          secrets: {
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
    await unwrap(task.taskDefinition.arn);

    expect(resourcesOfType('aws:ssm/parameter:Parameter')[0]!.id).toBe('/team/application/config');
    expect(resourcesOfType('aws:cloudwatch/logGroup:LogGroup')[0]!.id).toBe('/service/application');
  });

  test('shares one default log group and renders exact log options', async () => {
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
    await unwrap(task.taskDefinition.arn);

    expect(
      resourcesOfType('aws:cloudwatch/logGroup:LogGroup').map(({ name, id }) => ({ name, id })),
    ).toEqual([{ name: 'existing-log-group-app-log-group', id: '/service/existing' }]);
    expect(task.logGroup).toBeUndefined();
  });

  test('renders the exact base and ECR execution policy', async () => {
    const task = new FargateTaskDefinitionV2('ecr-policy', {
      containers: {
        app: {
          image: `${accountId}.dkr.ecr.us-east-1.amazonaws.com/team/application:latest`,
        },
      },
    });
    await unwrap(task.taskDefinition.arn);

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
          credentialSpecs: [
            {
              authenticationMode: CredentialSpecAuthenticationMode.DOMAINLESS,
              s3Bucket: {
                bucketArn: 'arn:aws:s3:::credential-bucket',
                key: 'credentials/domainless.json',
              },
            },
          ],
        },
      },
    });
    await unwrap(task.taskDefinition.arn);

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
        Action: 's3:GetBucketLocation',
        Resource: 'arn:aws:s3:::environment-bucket',
      },
      {
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::environment-bucket/configs/app.env',
      },
    ]);
  });

  test('renders exact SSM and CloudWatch Logs policy statements', async () => {
    const task = new FargateTaskDefinitionV2('service-policy', {
      containers: {
        app: {
          image: 'nginx',
          secrets: {
            CONFIG: {
              ssmParameterArn: `arn:aws:ssm:${providerRegion}:${accountId}:parameter/application`,
            },
          },
          logging: { cloudwatch: { streamPrefix: 'app' } },
        },
      },
    });
    await unwrap(task.taskDefinition.arn);

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
          secrets: {
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
    await unwrap(task.taskDefinition.arn);

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
    ]);
  });

  test('propagates component region and provider to children and invokes', async () => {
    const provider = new aws.Provider('selected-provider', { region: 'us-east-1' });
    const task = new FargateTaskDefinitionV2(
      'provider-flow',
      {
        region: 'us-east-2',
        containers: {
          app: {
            image: 'nginx',
            logging: { cloudwatch: { streamPrefix: 'app' } },
            secrets: {
              CONFIG: {
                ssmParameterArn: `arn:aws:ssm:us-east-2:${accountId}:parameter/application`,
              },
            },
          },
        },
      },
      { provider },
    );
    await unwrap(task.taskDefinition.arn);

    const taskDefinition = taskDefinitionResource('provider-flow')!;
    const logGroup = resourcesOfType('aws:cloudwatch/logGroup:LogGroup')[0]!;
    const parameter = resourcesOfType('aws:ssm/parameter:Parameter')[0]!;
    expect(taskDefinition.inputs.region).toBe('us-east-2');
    expect(logGroup.inputs.region).toBe('us-east-2');
    expect(taskDefinition.provider).toBeDefined();
    expect(logGroup.provider).toBe(taskDefinition.provider);
    expect(parameter.provider).toBe(taskDefinition.provider);
    const regionalCalls = calls.filter(({ token }) =>
      ['aws:index/arnParse:arnParse', 'aws:index/getRegion:getRegion'].includes(token),
    );
    expect(new Set(regionalCalls.map(({ token }) => token))).toEqual(
      new Set(['aws:index/arnParse:arnParse', 'aws:index/getRegion:getRegion']),
    );
    expect(new Set(regionalCalls.map(({ provider: invokeProvider }) => invokeProvider))).toEqual(
      new Set([taskDefinition.provider]),
    );
  });

  test('inherits an explicit provider when region is omitted', async () => {
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
      { provider },
    );
    await unwrap(task.taskDefinition.arn);

    const taskDefinition = taskDefinitionResource('provider-default')!;
    const logGroup = resourcesOfType('aws:cloudwatch/logGroup:LogGroup')[0]!;
    expect(taskDefinition.inputs.region).toBeUndefined();
    expect(logGroup.inputs.region).toBeUndefined();
    expect(logGroup.provider).toBe(taskDefinition.provider);
  });

  test('exposes all component outputs', async () => {
    const task = new FargateTaskDefinitionV2('outputs', {
      region: 'us-east-2',
      containers: {
        app: {
          image: 'nginx',
          logging: { cloudwatch: { streamPrefix: 'app' } },
        },
      },
    });
    await unwrap(task.taskDefinition.arn);

    expect(task.name).toBe('outputs');
    expect(task.region).toBe('us-east-2');
    expect(task.executionRole).toBeDefined();
    expect(task.taskRole).toBeDefined();
    expect(task.taskDefinition).toBeDefined();
    expect(task.logGroup).toBeDefined();
  });
});
