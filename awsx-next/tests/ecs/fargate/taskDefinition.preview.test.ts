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
  const taskResource = resources.find(({ type }) => type === 'aws-native:ecs:TaskDefinition');
  expect(taskResource?.inputs.containerDefinitions).toEqual([
    { name: 'app', essential: true, readonlyRootFilesystem: true, image: expect.anything() },
    { name: 'sidecar', essential: true, image: 'busybox' },
  ]);
  expect(pulumi.isUnknown(taskResource?.inputs.containerDefinitions[0].image)).toBe(true);
});
