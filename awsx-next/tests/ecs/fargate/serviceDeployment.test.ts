import * as pulumi from '@pulumi/pulumi';
import {
  DeploymentStrategy,
  resolveDeploymentStrategy,
  estimateDeploymentTimeout,
} from '../../../src/ecs/fargate/serviceDeployment';

it('rejects multiple strategies instead of picking one silently', () => {
  expect(() => resolveDeploymentStrategy({ rolling: {}, canary: { bakeTimeMinutes: 5 } })).toThrow(
    expect.objectContaining({ propertyPath: 'deploymentStrategy' }),
  );
});

it.each([0, 2.9, 101, NaN, Infinity])(
  'rejects unsafe linear percentages %s before estimating waits',
  (stepPercent) => {
    expect(() =>
      resolveDeploymentStrategy({ linear: { bakeTimeMinutes: 1, stepPercent } }),
    ).toThrow(pulumi.InputPropertyError);
  },
);

it('uses rolling when all strategy options are absent or undefined', () => {
  expect(resolveDeploymentStrategy({ canary: undefined, linear: undefined })).toEqual({
    strategy: DeploymentStrategy.ROLLING,
    config: {},
  });
});

it.each([
  { settings: { blueGreen: { bakeTimeMinutes: 7 } }, expected: '27m' },
  { settings: { canary: { bakeTimeMinutes: 5 } }, expected: '35m' },
  { settings: { canary: { bakeTimeMinutes: 5, canaryPercent: 100 } }, expected: '25m' },
  {
    settings: { canary: { bakeTimeMinutes: 0, canaryPercent: 10, canaryBakeTimeMinutes: 0 } },
    expected: '20m',
  },
  { settings: { linear: { bakeTimeMinutes: 5 } }, expected: '79m' },
  {
    settings: { linear: { bakeTimeMinutes: 5, stepPercent: 30, stepBakeTimeMinutes: 2 } },
    expected: '31m',
  },
  {
    settings: { linear: { bakeTimeMinutes: 5, stepPercent: 100, stepBakeTimeMinutes: 100 } },
    expected: '25m',
  },
])(
  'budgets traffic-shift waits without baking after the final shift: $expected',
  ({ settings, expected }) => {
    expect(estimateDeploymentTimeout(resolveDeploymentStrategy(settings))).toBe(expected);
  },
);
