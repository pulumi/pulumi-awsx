import * as pulumi from '@pulumi/pulumi';
import { FargateTaskDefinitionV2 } from '../../../src/ecs/fargate/taskDefinition';

const resources: pulumi.runtime.MockResourceArgs[] = [];

beforeAll(async () => {
  await pulumi.runtime.setMocks(
    {
      newResource(args) {
        resources.push(args);
        return {
          id: args.name,
          state: {
            ...args.inputs,
            arn: `arn:aws:mock:::${args.name}`,
            ...(args.type === 'aws:secretsmanager/secretVersion:SecretVersion'
              ? { versionId: pulumi.runtime.unknownValue }
              : {}),
            taskDefinitionArn: `arn:aws:ecs:us-west-2:123456789012:task-definition/${args.name}:1`,
          },
        };
      },
      call(args) {
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

test('declares version-pinned storage for an unknown secret during preview', async () => {
  const options: pulumi.ResourceTransformationArgs[] = [];
  const task = new FargateTaskDefinitionV2(
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
  const task = new FargateTaskDefinitionV2('preview-task', {
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
    { name: 'app', essential: true, readonlyRootFilesystem: true, image: expect.anything() },
    { name: 'sidecar', essential: true, image: 'busybox' },
  ]);
  expect(pulumi.isUnknown(taskResource?.inputs.containerDefinitions[0].image)).toBe(true);
});
