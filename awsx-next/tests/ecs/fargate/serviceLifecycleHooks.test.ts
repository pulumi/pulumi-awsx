import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import {
  DeploymentFailureAction,
  PauseTimeoutAction,
  ProgressiveLambdaLifecycleStage,
  ProgressivePauseLifecycleStage,
  ServiceDeploymentStrategy,
} from '../../../src/ecs/fargate/serviceDeployment';
import { FargateServiceV2 } from '../../../src/ecs/fargate/service';

const registrations: pulumi.runtime.MockResourceArgs[] = [];
const constructions: pulumi.ResourceTransformationArgs[] = [];
const validationArn = 'arn:aws:lambda:us-west-2:123456789012:function:validate:production';
const testArn = 'arn:aws:lambda:us-west-2:123456789012:function:tests:42';
const suppliedRoleArn = 'arn:aws:iam::123456789012:role/supplied-hook';
let provider: aws.Provider;
let sequence = 0;

beforeAll(async () => {
  await pulumi.runtime.setMocks({
    newResource(args) {
      registrations.push(args);
      return {
        id: args.id || `${args.name}_id`,
        state: {
          ...args.inputs,
          name: args.inputs.name ?? args.name,
          arn: `arn:mock:${args.name}`,
        },
      };
    },
    call(args) {
      if (args.token === 'aws:lb/getListener:getListener') {
        return { ...args.inputs, loadBalancerArn: 'arn:mock:alb', protocol: 'HTTP' };
      }
      return { ...args.inputs, vpcId: 'vpc-service', securityGroups: ['sg-alb'] };
    },
  });
  provider = new aws.Provider('service-provider', { region: 'us-west-2' });
  await resolve(provider.urn);
});

beforeEach(() => {
  registrations.length = 0;
  constructions.length = 0;
});

/**
 * Resolves a Pulumi output for resource assertions.
 *
 * @param value The output to resolve.
 * @returns The resolved value.
 */
function resolve<T>(value: pulumi.Output<T>): Promise<T> {
  return new Promise((done) => value.apply(done));
}

/**
 * Constructs a service with minimal networking and an explicit AWS provider.
 *
 * @param deploymentStrategy The requested deployment configuration.
 * @param deploymentTimeout An explicit service wait timeout.
 * @returns The service under test.
 */
function create(
  deploymentStrategy?: ServiceDeploymentStrategy,
  deploymentTimeout?: string,
): FargateServiceV2 {
  return new FargateServiceV2(
    `service-${sequence++}`,
    {
      clusterArn: 'arn:mock:cluster',
      taskDefinition: 'arn:mock:task',
      vpcSubnetIds: ['subnet-private'],
      securityGroupIds: ['sg-service'],
      deploymentStrategy,
      deploymentTimeout,
      manageIngress: false,
      loadBalancerAttachments:
        deploymentStrategy?.canary || deploymentStrategy?.linear
          ? {
              app: {
                application: {
                  containerName: 'app',
                  containerPort: 3000,
                  listenerArn: 'arn:mock:listener',
                  priority: 25,
                },
              },
            }
          : undefined,
    },
    {
      providers: { aws: provider },
      transformations: [
        (args): undefined => {
          constructions.push(args);
          return undefined;
        },
      ],
    },
  );
}

/**
 * Waits for service and supporting resource registrations.
 *
 * @param service The constructed component.
 * @returns The ECS service registration.
 */
async function settle(service: FargateServiceV2): Promise<pulumi.runtime.MockResourceArgs> {
  await resolve(service.service.deploymentConfiguration);
  await Promise.all(constructions.map((args) => resolve(args.resource.urn)));
  return registrations.find((args) => args.type === 'aws:ecs/service:Service')!;
}

it.each<{ strategy?: ServiceDeploymentStrategy; timeout: string }>([
  { strategy: { rolling: { pauseHooks: [{}] } }, timeout: '1460m' },
  {
    strategy: { rolling: { pauseHooks: [{ timeoutMinutes: 10 }, { timeoutMinutes: 30 }] } },
    timeout: '50m',
  },
  { strategy: { blueGreen: { bakeTimeMinutes: 15 } }, timeout: '35m' },
  { strategy: { linear: { bakeTimeMinutes: 5 } }, timeout: '79m' },
  {
    strategy: {
      linear: {
        bakeTimeMinutes: 5,
        stepPercent: 30,
        stepBakeTimeMinutes: 2,
        pauseHooks: [
          {
            lifecycleStages: [
              ProgressivePauseLifecycleStage.POST_SCALE_UP,
              ProgressivePauseLifecycleStage.PRE_PRODUCTION_TRAFFIC_SHIFT,
            ],
            timeoutMinutes: 10,
          },
          {
            lifecycleStages: [ProgressivePauseLifecycleStage.PRE_PRODUCTION_TRAFFIC_SHIFT],
            timeoutMinutes: 20,
          },
        ],
      },
    },
    timeout: '121m',
  },
  { strategy: { canary: { bakeTimeMinutes: 5 } }, timeout: '35m' },
  {
    strategy: {
      canary: {
        bakeTimeMinutes: 0,
        canaryBakeTimeMinutes: 0,
        pauseHooks: [
          {
            lifecycleStages: [ProgressivePauseLifecycleStage.PRE_PRODUCTION_TRAFFIC_SHIFT],
            timeoutMinutes: 15,
          },
        ],
      },
    },
    timeout: '50m',
  },
  {
    strategy: { linear: { bakeTimeMinutes: 0, stepPercent: 100, stepBakeTimeMinutes: 10 } },
    timeout: '20m',
  },
  {
    strategy: { canary: { bakeTimeMinutes: 0, canaryPercent: 100 } },
    timeout: '30m',
  },
])('budgets service waits for $strategy as $timeout', async ({ strategy, timeout }) => {
  const registered = await settle(create(strategy));
  const ecs = constructions.find((args) => args.type === 'aws:ecs/service:Service')!;
  expect(ecs.opts.customTimeouts).toEqual({ create: timeout, update: timeout });
  expect(registered.inputs.waitForSteadyState).toBe(true);
  expect(
    constructions.filter(
      (args) => args.type !== 'aws:ecs/service:Service' && args.opts.customTimeouts !== undefined,
    ),
  ).toHaveLength(0);
});

it('uses an explicit deployment timeout instead of the calculated pause and bake budget', async () => {
  await settle(create({ rolling: { pauseHooks: [{}] } }, '2h'));
  const ecs = constructions.find((args) => args.type === 'aws:ecs/service:Service')!;
  expect(ecs.opts.customTimeouts).toEqual({ create: '2h', update: '2h' });
});

it.each([undefined, '2h'])('rejects a zero linear step even with timeout %s', (timeout) => {
  expect(() => create({ linear: { bakeTimeMinutes: 0, stepPercent: 0 } }, timeout)).toThrow(
    'Must be between 3 and 100',
  );
});

it('registers Lambda and pause hooks together for rolling deployments', async () => {
  const service = create({
    rolling: {
      lambdaHooks: [{ functionArn: validationArn, invocationRoleArn: suppliedRoleArn }],
      pauseHooks: [{ timeoutMinutes: 60, timeoutAction: PauseTimeoutAction.ROLLBACK }],
    },
  });
  const registered = await settle(service);

  expect(registered.inputs.deploymentConfiguration).toEqual({
    strategy: 'ROLLING',
    lifecycleHooks: [
      {
        targetType: 'AWS_LAMBDA',
        hookTargetArn: validationArn,
        roleArn: suppliedRoleArn,
        lifecycleStages: ['PRE_SCALE_UP'],
      },
      {
        targetType: 'PAUSE',
        lifecycleStages: ['PRE_SCALE_UP'],
        timeoutConfiguration: { action: 'ROLLBACK', timeoutInMinutes: '60' },
      },
    ],
  });
});

it.each([PauseTimeoutAction.ROLLBACK, PauseTimeoutAction.CONTINUE])(
  'renders the ECS pause timeout action %s',
  async (action) => {
    const service = create({ rolling: { pauseHooks: [{ timeoutAction: action }] } });
    const registered = await settle(service);
    expect(registered.inputs.deploymentConfiguration.lifecycleHooks).toEqual([
      {
        targetType: 'PAUSE',
        lifecycleStages: ['PRE_SCALE_UP'],
        timeoutConfiguration: { action },
      },
    ]);
  },
);

it('preserves pause hooks when the Lambda hook list is empty and uses AWS timeout defaults', async () => {
  const service = create({ rolling: { lambdaHooks: [], pauseHooks: [{}] } });
  const registered = await settle(service);

  expect(registered.inputs.deploymentConfiguration.lifecycleHooks).toEqual([
    { targetType: 'PAUSE', lifecycleStages: ['PRE_SCALE_UP'] },
  ]);
  expect(registrations.filter((args) => args.type.startsWith('aws:iam/'))).toHaveLength(0);
});

it.each<ServiceDeploymentStrategy | undefined>([
  undefined,
  {},
  { canary: undefined, linear: undefined, blueGreen: undefined },
  { rolling: { lambdaHooks: [], pauseHooks: [] } },
])('defaults to rolling without registering empty hooks or IAM resources: %j', async (strategy) => {
  const service = create(strategy);
  const registered = await settle(service);

  expect(registered.inputs.deploymentConfiguration).toEqual({ strategy: 'ROLLING' });
  expect(registered.inputs.deploymentCircuitBreaker).toEqual({ enable: true, rollback: true });
  expect(registrations.filter((args) => args.type.startsWith('aws:iam/'))).toHaveLength(0);
  expect(
    constructions.find((args) => args.type === 'aws:ecs/service:Service')!.opts.customTimeouts,
  ).toBeUndefined();
});

it.each<{
  strategy: ServiceDeploymentStrategy;
  expected: Record<string, unknown>;
}>([
  {
    strategy: { blueGreen: { bakeTimeMinutes: 5 } },
    expected: { strategy: 'BLUE_GREEN', bakeTimeInMinutes: '5' },
  },
  {
    strategy: {
      canary: {
        bakeTimeMinutes: 0,
        canaryPercent: 5,
        canaryBakeTimeMinutes: 0,
        failureAction: DeploymentFailureAction.STOP,
      },
    },
    expected: {
      strategy: 'CANARY',
      bakeTimeInMinutes: '0',
      canaryConfiguration: { canaryPercent: 5, canaryBakeTimeInMinutes: '0' },
    },
  },
  {
    strategy: {
      canary: undefined,
      linear: { bakeTimeMinutes: 10, stepPercent: 25, stepBakeTimeMinutes: 2 },
    },
    expected: {
      strategy: 'LINEAR',
      bakeTimeInMinutes: '10',
      linearConfiguration: { stepPercent: 25, stepBakeTimeInMinutes: '2' },
    },
  },
])(
  'renders strategy settings without losing zero values: $expected.strategy',
  async ({ strategy, expected }) => {
    const service = create(strategy);
    const registered = await settle(service);
    expect(registered.inputs.deploymentConfiguration).toEqual(expected);
    expect(registered.inputs.deploymentCircuitBreaker).toEqual({
      enable: true,
      rollback: expected.strategy !== 'CANARY',
    });
  },
);

it.each(['blueGreen', 'canary', 'linear'] as const)(
  'preserves progressive hook stages for %s',
  async (strategy) => {
    const service = create({
      [strategy]: {
        bakeTimeMinutes: 5,
        lambdaHooks: [
          {
            functionArn: validationArn,
            invocationRoleArn: suppliedRoleArn,
            lifecycleStages: [
              ProgressiveLambdaLifecycleStage.POST_TEST_TRAFFIC_SHIFT,
              ProgressiveLambdaLifecycleStage.PRODUCTION_TRAFFIC_SHIFT,
            ],
          },
        ],
        pauseHooks: [
          {
            lifecycleStages: [ProgressivePauseLifecycleStage.PRE_PRODUCTION_TRAFFIC_SHIFT],
            timeoutMinutes: 120,
            timeoutAction: PauseTimeoutAction.CONTINUE,
          },
        ],
      },
    });
    const registered = await settle(service);
    expect(registered.inputs.deploymentConfiguration.lifecycleHooks).toEqual([
      {
        targetType: 'AWS_LAMBDA',
        hookTargetArn: validationArn,
        roleArn: suppliedRoleArn,
        lifecycleStages: ['POST_TEST_TRAFFIC_SHIFT', 'PRODUCTION_TRAFFIC_SHIFT'],
      },
      {
        targetType: 'PAUSE',
        lifecycleStages: ['PRE_PRODUCTION_TRAFFIC_SHIFT'],
        timeoutConfiguration: { action: 'CONTINUE', timeoutInMinutes: '120' },
      },
    ]);
  },
);

it('serializes nested hook details and resolves outputs within the entire input map', async () => {
  const service = create({
    rolling: {
      lambdaHooks: [
        {
          functionArn: validationArn,
          invocationRoleArn: suppliedRoleArn,
          hookDetails: pulumi.output({
            retries: 3,
            required: true,
            suites: ['checkout', 'payments'],
            options: { endpoint: pulumi.output('https://example.com'), optional: null },
          }),
        },
      ],
    },
  });
  const registered = await settle(service);
  expect(
    JSON.parse(registered.inputs.deploymentConfiguration.lifecycleHooks[0].hookDetails),
  ).toEqual({
    retries: 3,
    required: true,
    suites: ['checkout', 'payments'],
    options: { endpoint: 'https://example.com', optional: null },
  });
});

it('shares a scoped invocation role and waits for its policy before creating the service', async () => {
  const service = create({
    rolling: {
      lambdaHooks: [
        { functionArn: pulumi.output(validationArn) },
        { functionArn: testArn },
        { functionArn: 'arn:mock:external-function', invocationRoleArn: suppliedRoleArn },
      ],
    },
  });
  const registered = await settle(service);
  const roles = registrations.filter((args) => args.type === 'aws:iam/role:Role');
  const policies = registrations.filter((args) => args.type === 'aws:iam/rolePolicy:RolePolicy');
  expect(roles).toHaveLength(1);
  expect(policies).toHaveLength(1);
  expect(roles[0]!.inputs.assumeRolePolicy).toEqual({
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowAssumeRole',
        Effect: 'Allow',
        Principal: { Service: 'ecs.amazonaws.com' },
        Action: 'sts:AssumeRole',
      },
    ],
  });
  expect(policies[0]!.inputs.policy).toEqual({
    Version: '2012-10-17',
    Statement: [
      { Effect: 'Allow', Action: 'lambda:InvokeFunction', Resource: [validationArn, testArn] },
    ],
  });
  expect(policies[0]!.inputs.role).toBe(roles[0]!.name);
  const hooks = registered.inputs.deploymentConfiguration.lifecycleHooks;
  expect(hooks.map((hook: { roleArn: string }) => hook.roleArn)).toEqual([
    `arn:mock:${roles[0]!.name}`,
    `arn:mock:${roles[0]!.name}`,
    suppliedRoleArn,
  ]);

  const policy = constructions.find((args) => args.type === 'aws:iam/rolePolicy:RolePolicy')!;
  const ecs = constructions.find((args) => args.type === 'aws:ecs/service:Service')!;
  expect(ecs.opts.dependsOn).toEqual([policy.resource]);
  expect(policies[0]!.provider).toBe(registered.provider);
  expect(roles[0]!.provider).toBe(registered.provider);
  expect(registered.provider).toContain('service-provider');
});

it('uses supplied invocation roles without generating or mutating IAM resources', async () => {
  const service = create({
    rolling: {
      lambdaHooks: [
        { functionArn: validationArn, invocationRoleArn: pulumi.output(suppliedRoleArn) },
      ],
    },
  });
  const registered = await settle(service);
  expect(registered.inputs.deploymentConfiguration.lifecycleHooks[0].roleArn).toBe(suppliedRoleArn);
  expect(registrations.filter((args) => args.type.startsWith('aws:iam/'))).toHaveLength(0);
});

it('keeps rolling Lambda-only timeout at the provider default', async () => {
  await settle(create({ rolling: { lambdaHooks: [{ functionArn: validationArn }] } }));
  expect(
    constructions.find((args) => args.type === 'aws:ecs/service:Service')!.opts.customTimeouts,
  ).toBeUndefined();
});

it('waits for hook IAM as well as progressive routing policies', async () => {
  const service = create({
    canary: {
      bakeTimeMinutes: 0,
      lambdaHooks: [
        {
          functionArn: validationArn,
          lifecycleStages: [ProgressiveLambdaLifecycleStage.PRE_SCALE_UP],
        },
      ],
    },
  });
  await settle(service);
  const policies = constructions.filter((args) => args.type === 'aws:iam/rolePolicy:RolePolicy');
  expect(policies).toHaveLength(2);
  const dependencies = constructions.find((args) => args.type === 'aws:ecs/service:Service')!.opts
    .dependsOn;
  for (const policy of policies) expect(dependencies).toContain(policy.resource);
});

it('does not create hooks or invocation roles when hydrating an existing component', async () => {
  const original = create({ rolling: { lambdaHooks: [{ functionArn: validationArn }] } });
  await settle(original);
  const urn = await resolve(original.urn);
  registrations.length = 0;
  constructions.length = 0;
  const service = new FargateServiceV2('hydrated', undefined!, { urn });
  await resolve(service.urn);
  expect(constructions).toHaveLength(0);
  expect(registrations.filter((args) => args.type.startsWith('aws:'))).toHaveLength(0);
});

it('rejects conflicting strategies before creating supporting IAM resources', () => {
  expect(() => create({ rolling: {}, canary: { bakeTimeMinutes: 5 } })).toThrow(
    'Only one deployment strategy can be provided; received: rolling, canary',
  );
  expect(constructions.filter((args) => args.type.startsWith('aws:iam/'))).toHaveLength(0);
});
