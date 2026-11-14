import * as pulumi from '@pulumi/pulumi';
import { TaskDefinition } from '../../src/ecs/taskDefinition';

const resources: pulumi.runtime.MockResourceArgs[] = [];
const calls: pulumi.runtime.MockCallArgs[] = [];
const credentialSecretArn = 'arn:aws:secretsmanager:us-west-2:123456789012:secret:credentials';

class Pending extends pulumi.CustomResource {
  constructor(name: string) {
    super('test:index:Pending', name, {});
  }
}

beforeAll(async () => {
  await pulumi.runtime.setMocks(
    {
      newResource(args) {
        resources.push(args);
        return {
          id: args.type === 'test:index:Pending' ? undefined : args.name,
          state: {
            ...args.inputs,
            arn: `arn:aws:mock:::${args.name}`,
            ...(args.type === 'aws:secretsmanager/secret:Secret' ? { kmsKeyId: '' } : {}),
            ...(args.type === 'aws:secretsmanager/secretVersion:SecretVersion'
              ? { versionId: pulumi.runtime.unknownValue }
              : {}),
            taskDefinitionArn: `arn:aws:ecs:us-west-2:123456789012:task-definition/${args.name}:1`,
          },
        };
      },
      call(args) {
        calls.push(args);
        if (args.token === 'aws:index/arnParse:arnParse') {
          const [, partition, service, region, accountId, ...resource] = args.inputs.arn.split(':');
          return { partition, service, region, accountId, resource: resource.join(':') };
        }
        if (args.token === 'aws:s3/getBucket:getBucket') {
          return { ...args.inputs, bucketRegion: 'us-west-2' };
        }
        if (args.token === 'aws:s3/getObject:getObject') {
          return {
            ...args.inputs,
            bodyBase64: Buffer.from(
              JSON.stringify({
                ActiveDirectoryConfig: {
                  HostAccountConfig: { PluginInput: { CredentialArn: credentialSecretArn } },
                },
              }),
            ).toString('base64'),
          };
        }
        if (
          args.token === 'aws-native:index:getAccountId' ||
          args.token === 'aws:index/getCallerIdentity:getCallerIdentity'
        ) {
          return { accountId: '123456789012' };
        }
        if (
          args.token === 'aws-native:index:getRegion' ||
          args.token === 'aws:index/getRegion:getRegion'
        ) {
          return { region: 'us-west-2' };
        }
        return args.inputs;
      },
    },
    'project',
    'stack',
    true,
  );
});

test.each(['image', 'key', 'bucket'] as const)(
  'CredSpec lookup follows bucket/key readiness, not unrelated image readiness: %s',
  async (pendingInput) => {
    calls.length = 0;
    const name = `credential-readiness-${pendingInput}`;
    const pending = new Pending(`${name}-image`);
    const task = new TaskDefinition(
      name,
      {
        containers: {
          app: {
            image: pending.id,
            logging: { disabled: true },
            credentialSpec: {
              bucketArn:
                pendingInput === 'bucket'
                  ? pending.id.apply(() => 'arn:aws:s3:::credentials')
                  : 'arn:aws:s3:::credentials',
              key: pendingInput === 'key' ? pending.id.apply(() => 'spec.json') : 'spec.json',
            },
          },
        },
      },
      // Simulate Construct's union of input dependencies and explicit options.
      { dependsOn: [pending] },
    );
    await new Promise((resolve) => task.taskDefinitionArn.apply(resolve));
    expect(calls.filter(({ token }) => token === 'aws:s3/getBucket:getBucket')).toHaveLength(
      pendingInput === 'bucket' ? 0 : 1,
    );
    expect(calls.filter(({ token }) => token === 'aws:s3/getObject:getObject')).toHaveLength(
      pendingInput === 'image' ? 1 : 0,
    );
    const taskResource = resources.find(
      (resource) => resource.type === 'aws-native:ecs:TaskDefinition' && resource.name === name,
    )!;
    const credentialSpecs = taskResource.inputs.containerDefinitions[0].credentialSpecs;
    if (pendingInput === 'image') {
      expect(credentialSpecs).toEqual([
        'credentialspecdomainless:arn:aws:s3:::credentials/spec.json',
      ]);
    } else {
      expect(credentialSpecs).toEqual([pulumi.unknown]);
    }
  },
);

test('declares version-pinned storage for an unknown secret during preview', async () => {
  const options: pulumi.ResourceTransformationArgs[] = [];
  const task = new TaskDefinition(
    'preview-secret',
    {
      containers: {
        app: {
          image: 'nginx',
          logging: { disabled: true },
          environment: { TOKEN: { value: pulumi.secret(pulumi.runtime.unknownValue) } },
        },
      },
    },
    {
      transformations: [
        (args): undefined => {
          options.push(args);
          return undefined;
        },
      ],
    },
  );
  await new Promise((resolve) => task.taskDefinitionArn.apply(resolve));
  const secret = resources.find(
    ({ name, type }) =>
      name === 'preview-secret-app-TOKEN-environment' &&
      type === 'aws:secretsmanager/secret:Secret',
  );
  const version = resources.find(
    ({ name, type }) =>
      name === 'preview-secret-app-TOKEN-environment' &&
      type === 'aws:secretsmanager/secretVersion:SecretVersion',
  );
  expect(secret).toBeDefined();
  expect(version?.inputs.secretId).toBe('arn:aws:mock:::preview-secret-app-TOKEN-environment');
  const secretString = version!.inputs.secretString;
  expect(secretString).toEqual({
    '4dabf18193072939515e22adb298388d': '1b47061264138c4ac30d75fd1eb44270',
    value: expect.anything(),
  });
  expect(pulumi.isUnknown(secretString.value)).toBe(true);
  const taskResource = resources.find(
    ({ type, name }) => type === 'aws-native:ecs:TaskDefinition' && name === 'preview-secret',
  );
  expect(taskResource?.inputs.containerDefinitions[0].environment).toEqual([]);
  expect(pulumi.isUnknown(taskResource?.inputs.containerDefinitions[0].secrets)).toBe(true);
  expect(options.filter(({ opts }) => opts.retainOnDelete).map(({ type }) => type)).toEqual([
    'aws:secretsmanager/secret:Secret',
    'aws:secretsmanager/secretVersion:SecretVersion',
    'aws:iam/rolePolicy:RolePolicy',
  ]);
});

test('keeps container names and known properties structured when an image is unknown', async () => {
  const task = new TaskDefinition('preview-task', {
    containers: {
      app: {
        image: pulumi.output(pulumi.runtime.unknownValue),
        readonlyRootFilesystem: true,
        logging: { disabled: true },
      },
      sidecar: { image: 'busybox', logging: { disabled: true } },
    },
  });
  await new Promise((resolve) => task.taskDefinitionArn.apply(resolve));
  const taskResource = resources.find(
    ({ type, name }) => type === 'aws-native:ecs:TaskDefinition' && name === 'preview-task',
  );
  expect(taskResource?.inputs.containerDefinitions).toEqual([
    {
      name: 'app',
      essential: true,
      readonlyRootFilesystem: true,
      image: expect.anything(),
      versionConsistency: 'enabled',
    },
    { name: 'sidecar', essential: true, image: 'busybox', versionConsistency: 'enabled' },
  ]);
  expect(pulumi.isUnknown(taskResource?.inputs.containerDefinitions[0].image)).toBe(true);
});
