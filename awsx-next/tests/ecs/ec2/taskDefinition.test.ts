import * as pulumi from '@pulumi/pulumi';
import { EC2TaskDefinitionV2, FargateTaskDefinitionV2, CpuArchitecture } from '../../../src/ecs';

const resources: pulumi.runtime.MockResourceArgs[] = [];
const options: pulumi.ResourceTransformationArgs[] = [];

beforeAll(async () => {
  await pulumi.runtime.setMocks(
    {
      newResource(args) {
        resources.push(args);
        return {
          id: args.name,
          state: {
            ...args.inputs,
            name: args.inputs.name ?? args.name,
            region: args.inputs.region ?? 'us-west-2',
            arn: `arn:aws:mock:::${args.name}`,
            taskDefinitionArn: `arn:aws:ecs:us-west-2:123456789012:task-definition/${args.name}:7`,
            ...(args.type === 'aws:secretsmanager/secretVersion:SecretVersion'
              ? { versionId: 'secret-version' }
              : {}),
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
    false,
  );
});

/**
 * Waits for a Pulumi output to resolve.
 *
 * @param value The output to resolve.
 * @returns The resolved value.
 */
function resolve<T>(value: pulumi.Output<T>): Promise<T> {
  return new Promise((done) => value.apply(done));
}

/**
 * Finds a registered child by type and name.
 *
 * @param type The resource type.
 * @param name The logical resource name.
 * @returns The registered child.
 */
function resource(type: string, name: string): pulumi.runtime.MockResourceArgs {
  const matches = resources.filter((r) => r.type === type && r.name === name);
  expect(matches).toHaveLength(1);
  return matches[0]!;
}

test('uses container reservations without inventing a Fargate task size', async () => {
  const task = new EC2TaskDefinitionV2(
    'worker',
    {
      containers: {
        worker: {
          image: 'busybox',
          cpuUnits: 300,
          memoryReservationMiB: 700,
          logging: { disabled: true },
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
  expect(await resolve(task.taskDefinitionArn)).toBe(
    'arn:aws:ecs:us-west-2:123456789012:task-definition/worker:7',
  );
  expect(await resolve(task.family)).toBe('worker');
  expect(await resolve(task.revision)).toBe(7);
  const registration = resource('aws-native:ecs:TaskDefinition', 'worker');
  expect(registration.inputs).toEqual({
    family: 'worker',
    requiresCompatibilities: ['MANAGED_INSTANCES'],
    executionRoleArn: 'arn:aws:mock:::worker-execution-role',
    taskRoleArn: 'arn:aws:mock:::worker-task-role',
    networkMode: 'awsvpc',
    runtimePlatform: { operatingSystemFamily: 'LINUX' },
    containerDefinitions: [
      {
        name: 'worker',
        image: 'busybox',
        cpu: 300,
        memoryReservation: 700,
        essential: true,
        versionConsistency: 'enabled',
      },
    ],
  });
  const nativeOptions = options.find((r) => r.type === 'aws-native:ecs:TaskDefinition')!;
  expect(nativeOptions.opts.parent).toBe(task);
  expect(nativeOptions.opts.dependsOn).toHaveLength(1);
  expect(task.logGroup).toBeUndefined();
});

test('preserves explicit non-Fargate limits and renders GPU and Linux capabilities', async () => {
  const task = new EC2TaskDefinitionV2('gpu', {
    cpuUnits: 1536,
    memoryMiB: 3000,
    cpuArchitecture: CpuArchitecture.X86_64,
    containers: {
      worker: {
        image: 'gpu-image',
        gpuCount: 1,
        privileged: true,
        startTimeoutSeconds: 600,
        stopTimeoutSeconds: 3600,
        linuxParameters: { capabilities: { add: ['NET_ADMIN'] } },
        logging: { disabled: true },
      },
    },
  });
  await resolve(task.taskDefinitionArn);
  expect(resource('aws-native:ecs:TaskDefinition', 'gpu').inputs).toMatchObject({
    cpu: '1536',
    memory: '3000',
    runtimePlatform: { operatingSystemFamily: 'LINUX', cpuArchitecture: 'X86_64' },
    containerDefinitions: [
      {
        name: 'worker',
        privileged: true,
        startTimeout: 600,
        stopTimeout: 3600,
        resourceRequirements: [{ type: 'GPU', value: '1' }],
        linuxParameters: { capabilities: { add: ['NET_ADMIN'] } },
      },
    ],
  });
});

test('keeps secret version pinning and logging on the public task component', async () => {
  const task = new EC2TaskDefinitionV2('secrets', {
    memoryMiB: 1024,
    containers: {
      app: { image: 'nginx', environment: { TOKEN: { value: pulumi.secret('token') } } },
    },
  });
  await resolve(task.taskDefinitionArn);
  expect(resource('aws-native:ecs:TaskDefinition', 'secrets').inputs.containerDefinitions).toEqual([
    {
      name: 'app',
      image: 'nginx',
      essential: true,
      versionConsistency: 'enabled',
      environment: [],
      secrets: [
        {
          name: 'TOKEN',
          valueFrom: 'arn:aws:mock:::secrets-app-TOKEN-environment:::secret-version',
        },
      ],
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': 'secrets-log-group',
          'awslogs-region': 'us-west-2',
          'awslogs-stream-prefix': 'secrets',
        },
      },
    },
  ]);
  expect(task.logGroup).toBeDefined();
  const secretString = resource(
    'aws:secretsmanager/secretVersion:SecretVersion',
    'secrets-app-TOKEN-environment',
  ).inputs.secretString;
  expect(pulumi.runtime.isRpcSecret(secretString)).toBe(true);
  expect(pulumi.runtime.unwrapRpcSecret(secretString)).toBe('token');
});

test.each([FargateTaskDefinitionV2, EC2TaskDefinitionV2])(
  '%p allows disabling image digest consistency for a container',
  async (TaskDefinition) => {
    const name = `mutable-tag-${TaskDefinition.name}`;
    const task = new TaskDefinition(name, {
      memoryMiB: 512,
      containers: {
        app: {
          image: 'nginx:latest',
          versionConsistencyEnabled: false,
          logging: { disabled: true },
        },
      },
    });
    await resolve(task.taskDefinitionArn);
    expect(resource('aws-native:ecs:TaskDefinition', name).inputs.containerDefinitions).toEqual([
      { name: 'app', image: 'nginx:latest', essential: true, versionConsistency: 'disabled' },
    ]);
  },
);

test.each([FargateTaskDefinitionV2, EC2TaskDefinitionV2])(
  '%p rejects an empty container map',
  (TaskDefinition) => {
    expect(() => new TaskDefinition(`empty-${TaskDefinition.name}`, { containers: {} })).toThrow(
      expect.objectContaining({
        propertyPath: 'containers',
        message: 'At least one container must be provided',
      }),
    );
  },
);

test('requires a memory reservation for every container when no task limit is given', () => {
  expect(
    () =>
      new EC2TaskDefinitionV2('missing-memory', {
        containers: { app: { image: 'nginx', memoryMiB: 512 }, sidecar: { image: 'busybox' } },
      }),
  ).toThrow('Specify memoryMiB or memoryReservationMiB for each container');
});

test.each([0, -1, 1.5, Number.NaN])('rejects invalid task limits %s', (value) => {
  expect(
    () =>
      new EC2TaskDefinitionV2(`invalid-${value}`, {
        memoryMiB: value,
        containers: { app: { image: 'nginx' } },
      }),
  ).toThrow('must be a positive integer');
});
