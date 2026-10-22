import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

export enum DeploymentStrategy {
  ROLLING = 'ROLLING',
  BLUE_GREEN = 'BLUE_GREEN',
  CANARY = 'CANARY',
  LINEAR = 'LINEAR',
}

/**
 * Settings for a Lambda function that validates or controls a service deployment.
 */
export interface LambdaHookSettings {
  /**
   * ARN of the Lambda function to invoke. A version or alias ARN can be used to select the function
   * revision that handles the hook.
   *
   * The function must return a JSON object with a hookStatus of SUCCEEDED, FAILED, or IN_PROGRESS.
   * If IN_PROGRESS is returned then ECS will invoke the hook again until either FAILED or SUCCEEDED
   * are returned.
   */
  readonly functionArn: pulumi.Input<string>;

  /**
   * ARN of the IAM role ECS assumes to invoke this function. The role must trust ecs.amazonaws.com
   * and allow lambda:InvokeFunction on functionArn, including any version or alias qualifier.
   *
   * If omitted, the service creates one shared invocation role for all Lambda hooks that omit this
   * property, scoped to their function ARNs.
   *
   * Default - A shared invocation role is created when needed.
   */
  readonly invocationRoleArn?: pulumi.Input<string>;

  /**
   * Custom JSON-compatible configuration passed to the Lambda function as event.hookDetails. Values
   * can include nested objects, arrays, numbers, booleans, null, and Pulumi outputs. The component
   * resolves outputs and serializes the object as JSON for ECS.
   *
   * A function returning IN_PROGRESS can also return hookDetails to persist state between its
   * invocations within the same deployment. That state is not shared with other hooks or later
   * deployments. Pass secret identifiers rather than secret values and let the function retrieve
   * secrets using its execution role.
   *
   * Default - No custom configuration is passed.
   */
  readonly hookDetails?: pulumi.Input<Record<string, pulumi.Input<any>>>;
}

/**
 * Action ECS takes when a pause hook reaches its timeout without an external decision.
 */
export enum PauseTimeoutAction {
  /**
   * Rolls back the deployment to the previous service revision.
   */
  ROLLBACK = 'ROLLBACK',

  /**
   * Releases this pause hook. Other hooks at the same stage must still complete before the
   * deployment proceeds.
   */
  CONTINUE = 'CONTINUE',
}

/**
 * Settings for a deployment pause that waits for an external approval or validation workflow.
 */
export interface PauseHookSettings {
  /**
   * Number of minutes ECS waits for ContinueServiceDeployment before applying timeoutAction.
   *
   * Valid range: 1-20160 minutes (14 days).
   *
   * Default - AWS default of 1440 minutes (24 hours).
   */
  readonly timeoutMinutes?: number;

  /**
   * Action ECS takes when this pause hook times out. ROLLBACK reverts the deployment, CONTINUE
   * releases this hook while leaving any other unfinished hooks at the stage in effect.
   *
   * Default - AWS default of PauseTimeoutAction.ROLLBACK.
   */
  readonly timeoutAction?: PauseTimeoutAction;
}

/**
 * Stages that support Lambda hooks during blue/green, canary, and linear deployments.
 *
 * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/lambda-lifecycle-hooks.html
 */
export enum ProgressiveLambdaLifecycleStage {
  /**
   * Reconciles the service before a deployment when more than one service revision is active.
   */
  RECONCILE_SERVICE = 'RECONCILE_SERVICE',

  /**
   * Runs before ECS starts tasks for the new service revision.
   */
  PRE_SCALE_UP = 'PRE_SCALE_UP',

  /**
   * Runs after tasks for the new service revision have started and become healthy, before they
   * receive traffic.
   */
  POST_SCALE_UP = 'POST_SCALE_UP',

  /**
   * Runs while ECS shifts test traffic to the new service revision. This hook can also run during
   * rollback, so the function must handle traffic moving back to the previous revision.
   */
  TEST_TRAFFIC_SHIFT = 'TEST_TRAFFIC_SHIFT',

  /**
   * Runs after the test traffic shift completes and the new service revision receives all test
   * traffic. Use with a test route to validate the revision before production traffic shifts.
   */
  POST_TEST_TRAFFIC_SHIFT = 'POST_TEST_TRAFFIC_SHIFT',

  /**
   * Runs before production traffic shifts to the new service revision. For canary and linear
   * deployments, runs before each traffic shift step.
   */
  PRE_PRODUCTION_TRAFFIC_SHIFT = 'PRE_PRODUCTION_TRAFFIC_SHIFT',

  /**
   * Runs while production traffic shifts to the new service revision, at each step for canary and
   * linear deployments. This hook also runs during rollback; inspect the traffic weights to
   * determine the direction of the shift.
   */
  PRODUCTION_TRAFFIC_SHIFT = 'PRODUCTION_TRAFFIC_SHIFT',

  /**
   * Runs after all production traffic has shifted to the new service revision.
   */
  POST_PRODUCTION_TRAFFIC_SHIFT = 'POST_PRODUCTION_TRAFFIC_SHIFT',
}

/**
 * Stages that support pause hooks during blue/green, canary, and linear deployments.
 *
 * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/pause-lifecycle-hooks.html
 */
export enum ProgressivePauseLifecycleStage {
  /**
   * Pauses during service reconciliation when more than one service revision is active.
   */
  RECONCILE_SERVICE = 'RECONCILE_SERVICE',

  /**
   * Pauses before ECS starts tasks for the new service revision.
   */
  PRE_SCALE_UP = 'PRE_SCALE_UP',

  /**
   * Pauses after tasks for the new service revision have started and become healthy, before they
   * receive traffic.
   */
  POST_SCALE_UP = 'POST_SCALE_UP',

  /**
   * Pauses after the test traffic shift completes and before production traffic shifts. Use with a
   * test route to inspect or validate the new revision.
   */
  POST_TEST_TRAFFIC_SHIFT = 'POST_TEST_TRAFFIC_SHIFT',

  /**
   * Pauses before production traffic shifts to the new service revision. Canary and linear
   * deployments pause before each traffic shift step, with a new hookId to continue each time.
   */
  PRE_PRODUCTION_TRAFFIC_SHIFT = 'PRE_PRODUCTION_TRAFFIC_SHIFT',

  /**
   * Pauses after all production traffic has shifted to the new service revision.
   */
  POST_PRODUCTION_TRAFFIC_SHIFT = 'POST_PRODUCTION_TRAFFIC_SHIFT',
}

/**
 * Invokes a Lambda function at PRE_SCALE_UP before rolling replacement tasks start.
 */
export interface RollingLambdaHook extends LambdaHookSettings {}

/**
 * Pauses at PRE_SCALE_UP before rolling replacement tasks start.
 */
export interface RollingPauseHook extends PauseHookSettings {}

/**
 * Invokes a Lambda function at selected stages of a blue/green, canary, or linear deployment.
 */
export interface ProgressiveLambdaHook extends LambdaHookSettings {
  /**
   * Stages at which ECS invokes this function. Hooks at the same stage run in parallel, and all
   * must complete before the deployment proceeds. Array order does not define execution order.
   *
   * PRE_PRODUCTION_TRAFFIC_SHIFT and PRODUCTION_TRAFFIC_SHIFT run at every traffic shift step for
   * canary and linear deployments. ECS can also reinvoke a function that returns IN_PROGRESS.
   */
  readonly lifecycleStages: ProgressiveLambdaLifecycleStage[];
}

/**
 * Pauses at selected stages of a blue/green, canary, or linear deployment.
 */
export interface ProgressivePauseHook extends PauseHookSettings {
  /**
   * Stages at which ECS waits for an external decision. Hooks at the same stage run in parallel.
   * Each pause must be continued and each Lambda hook must succeed before the deployment proceeds.
   * A pause can also be released by its timeout action. Array order does not define execution
   * order.
   *
   * PRE_PRODUCTION_TRAFFIC_SHIFT pauses before every traffic shift step for canary and linear
   * deployments, requiring a separate ContinueServiceDeployment call for each new hookId.
   */
  readonly lifecycleStages: ProgressivePauseLifecycleStage[];
}

export enum DeploymentFailureAction {
  /**
   * On failure restore the last completed deployment
   */
  ROLLBACK = 'Rollback',

  /**
   * On failure stop the failed deployment and require manual remediation
   */
  STOP = 'Stop',
}

export interface RollingStrategy {
  /**
   * Lambda functions invoked at PRE_SCALE_UP before rolling replacement tasks start.
   *
   * Lambda and pause hooks run in parallel at this stage, and all must complete before tasks start.
   *
   * Default - No Lambda hooks.
   */
  readonly lambdaHooks?: RollingLambdaHook[];

  /**
   * Pauses at PRE_SCALE_UP before rolling replacement tasks start. To continue the deployment an
   * external workflow has to call ContinueServiceDeployment with the deployment ARN, the pause
   * hookId, and CONTINUE or ROLLBACK.
   *
   * If no ContinueServiceDeployment is received before the timeout then the timeoutAction is
   * performed.
   *
   * Default - No pause hooks.
   */
  readonly pauseHooks?: RollingPauseHook[];

  /**
   * Action taken when the deployment circuit breaker detects a failed deployment. The circuit
   * breaker is always enabled.
   *
   * ROLLBACK restores the last successful completed deployment when one is available. STOP marks
   * the deployment as failed without automatic rollback.
   *
   * Default - DeploymentFailureAction.ROLLBACK
   */
  readonly failureAction?: DeploymentFailureAction;
}

/**
 * Settings shared by blue/green, canary, and linear deployments.
 */
export interface ProgressiveDeploymentSettings {
  /**
   * Lambda functions invoked at selected deployment stages.
   *
   * Lambda and pause hooks at the same stage run in parallel. All must complete before the
   * deployment proceeds.
   *
   * Default - No Lambda hooks.
   */
  readonly lambdaHooks?: ProgressiveLambdaHook[];

  /**
   * Pauses at selected deployment stages for external approval or validation. To continue the
   * deployment an external workflow has to call ContinueServiceDeployment with the deployment ARN,
   * the pause hookId, and CONTINUE or ROLLBACK.
   *
   * If no ContinueServiceDeployment is received before the timeout then the timeoutAction is
   * performed.
   *
   * Default - No pause hooks.
   */
  readonly pauseHooks?: ProgressivePauseHook[];

  /**
   * Number of minutes to keep the previous service revision running after all production traffic
   * has shifted to the new revision. This is separate from the canary observation period or the
   * waits between linear traffic increments.
   *
   * Valid range: 0-1440 minutes.
   */
  readonly bakeTimeMinutes: number;

  /**
   * Action taken when the deployment circuit breaker detects a failed deployment. The circuit
   * breaker is always enabled.
   *
   * ROLLBACK restores the last successful completed deployment when one is available. STOP marks
   * the deployment as failed without automatic rollback.
   *
   * Default - DeploymentFailureAction.ROLLBACK
   */
  readonly failureAction?: DeploymentFailureAction;
}

/**
 * Shifts all production traffic to the new revision once it is ready.
 */
export interface BlueGreenStrategy extends ProgressiveDeploymentSettings {}

/**
 * Shifts an initial percentage of production traffic to the new revision, then shifts the remaining
 * traffic after an observation period. Requires at least one load-balancer attachment.
 */
export interface CanaryStrategy extends ProgressiveDeploymentSettings {
  /**
   * Initial percentage of production traffic sent to the new service revision during the canary
   * phase. Valid values are multiples of 0.1 from 0.1 to 100.0.
   *
   * Default - AWS default of 5.0
   */
  readonly canaryPercent?: number;

  /**
   * Number of minutes to observe the canary before shifting the remaining production traffic to the
   * new revision. Valid range: 0-1440 minutes (24 hours).
   *
   * Default - AWS default of 10 minutes
   */
  readonly canaryBakeTimeMinutes?: number;
}

/**
 * Shifts production traffic to the new revision in equal increments, with a wait between
 * increments. Requires at least one load-balancer attachment.
 */
export interface LinearStrategy extends ProgressiveDeploymentSettings {
  /**
   * Percentage of production traffic shifted to the new service revision in each increment. Valid
   * values are multiples of 0.1 from 3.0 to 100.0.
   *
   * Default - AWS default of 10.0
   */
  readonly stepPercent?: number;

  /**
   * Number of minutes to wait between traffic increments. Valid range: 0-1440 minutes (24 hours).
   *
   * Default - AWS default of 6 minutes
   */
  readonly stepBakeTimeMinutes?: number;
}

/**
 * Selects a deployment strategy. At most one strategy can be provided. If no strategy is provided,
 * including when this object is empty, the service uses rolling updates.
 */
export interface ServiceDeploymentStrategy {
  /**
   * Configuration for the rolling update strategy. This is the default.
   */
  readonly rolling?: RollingStrategy;

  /**
   * Configuration for shifting all production traffic to the new revision once it is ready.
   */
  readonly blueGreen?: BlueGreenStrategy;

  /**
   * Configuration for shifting production traffic in equal increments.
   *
   * Default - no linear configuration
   */
  readonly linear?: LinearStrategy;

  /**
   * Configuration for testing an initial percentage of production traffic before shifting the rest.
   *
   * Default - no canary configuration
   */
  readonly canary?: CanaryStrategy;
}

interface CreatedDeploymentLifecycleHooks {
  readonly lifecycleHooks:
    | aws.types.input.ecs.ServiceDeploymentConfigurationLifecycleHook[]
    | undefined;
  readonly readyDependencies: pulumi.Resource[];
}

export type ResolvedDeploymentStrategy =
  | { strategy: DeploymentStrategy.ROLLING; config: RollingStrategy }
  | { strategy: DeploymentStrategy.BLUE_GREEN; config: BlueGreenStrategy }
  | { strategy: DeploymentStrategy.CANARY; config: CanaryStrategy }
  | { strategy: DeploymentStrategy.LINEAR; config: LinearStrategy };

/**
 * Selects the single deployment strategy requested by the service.
 *
 * @param strategy The public strategy configuration.
 * @returns The selected strategy and settings.
 */
export function resolveDeploymentStrategy(
  strategy: ServiceDeploymentStrategy,
): ResolvedDeploymentStrategy {
  const configuredStrategies = Object.entries(strategy)
    .filter(([, config]) => config !== undefined)
    .map(([key]) => key);
  if (configuredStrategies.length > 1) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'deploymentStrategy',
      reason:
        'Only one deployment strategy can be provided; received: ' +
        configuredStrategies.join(', '),
    });
  }
  if (strategy.canary !== undefined) {
    return { strategy: DeploymentStrategy.CANARY, config: strategy.canary };
  }
  if (strategy.linear !== undefined) {
    const percent = strategy.linear.stepPercent ?? 10;
    if (!Number.isFinite(percent) || percent < 3 || percent > 100) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'deploymentStrategy.linear.stepPercent',
        reason: 'Must be between 3 and 100.',
      });
    }
    return { strategy: DeploymentStrategy.LINEAR, config: strategy.linear };
  }
  if (strategy.blueGreen !== undefined) {
    return { strategy: DeploymentStrategy.BLUE_GREEN, config: strategy.blueGreen };
  }
  return {
    strategy: DeploymentStrategy.ROLLING,
    config: strategy.rolling ?? {},
  };
}

/**
 * Renders provider settings for a selected strategy.
 *
 * @param selected The selected strategy and settings.
 * @returns ECS deployment settings.
 */
export function renderStrategySettings(
  selected: ResolvedDeploymentStrategy,
): aws.types.input.ecs.ServiceDeploymentConfiguration {
  switch (selected.strategy) {
    case DeploymentStrategy.ROLLING:
      return {};
    case DeploymentStrategy.BLUE_GREEN:
      return {
        bakeTimeInMinutes: String(selected.config.bakeTimeMinutes),
      };
    case DeploymentStrategy.LINEAR:
      return {
        bakeTimeInMinutes: String(selected.config.bakeTimeMinutes),
        linearConfiguration: {
          stepBakeTimeInMinutes: selected.config.stepBakeTimeMinutes?.toString(),
          stepPercent: selected.config.stepPercent,
        },
      };
    case DeploymentStrategy.CANARY:
      return {
        bakeTimeInMinutes: String(selected.config.bakeTimeMinutes),
        canaryConfiguration: {
          canaryBakeTimeInMinutes: selected.config.canaryBakeTimeMinutes?.toString(),
          canaryPercent: selected.config.canaryPercent,
        },
      };
  }
}

/**
 * Supplies the fixed lifecycle stage shared by rolling Lambda and pause hooks.
 *
 * @param hooks The configured rolling hooks.
 * @returns Hooks with their ECS lifecycle stage.
 */
function withRollingLifecycleStage<T>(
  hooks: T[] | undefined,
): (T & { lifecycleStages: string[] })[] {
  return (hooks ?? []).map((hook) =>
    Object.assign({}, hook, { lifecycleStages: ['PRE_SCALE_UP'] }),
  );
}

/**
 * Renders lifecycle hooks and creates a shared invocation role for hooks without a supplied role.
 *
 * @param name The service name used for stable child resource names.
 * @param selected The selected strategy and hook settings.
 * @param parent The service that owns supporting resources and supplies the AWS provider.
 * @returns Rendered hooks and IAM policy dependencies required before the service starts.
 */
export function createDeploymentLifecycleHooks(
  name: string,
  selected: ResolvedDeploymentStrategy,
  parent: pulumi.Resource,
): CreatedDeploymentLifecycleHooks {
  const lambdaHooks =
    selected.strategy === DeploymentStrategy.ROLLING
      ? withRollingLifecycleStage(selected.config.lambdaHooks)
      : (selected.config.lambdaHooks ?? []);
  const pauseHooks =
    selected.strategy === DeploymentStrategy.ROLLING
      ? withRollingLifecycleStage(selected.config.pauseHooks)
      : (selected.config.pauseHooks ?? []);
  const functionsWithoutRoles = lambdaHooks
    .filter((hook) => hook.invocationRoleArn === undefined)
    .map((hook) => hook.functionArn);
  const readyDependencies: pulumi.Resource[] = [];
  let invocationRoleArn: pulumi.Input<string> | undefined;
  if (functionsWithoutRoles.length > 0) {
    const invocationRole = new aws.iam.Role(
      `${name}-lambda-hook-invocation`,
      {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(aws.iam.Principals.EcsPrincipal),
      },
      { parent },
    );
    const invocationPolicy = new aws.iam.RolePolicy(
      `${name}-lambda-hook-invoke-policy`,
      {
        role: invocationRole.name,
        policy: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: 'lambda:InvokeFunction',
              Resource: functionsWithoutRoles,
            },
          ],
        },
      },
      { parent },
    );
    readyDependencies.push(invocationPolicy);
    invocationRoleArn = invocationRole.arn;
  }

  const lifecycleHooks: aws.types.input.ecs.ServiceDeploymentConfigurationLifecycleHook[] = [
    ...lambdaHooks.map((hook) => ({
      roleArn: hook.invocationRoleArn ?? invocationRoleArn,
      hookTargetArn: hook.functionArn,
      targetType: 'AWS_LAMBDA',
      lifecycleStages: hook.lifecycleStages,
      hookDetails:
        hook.hookDetails === undefined ? undefined : pulumi.jsonStringify(hook.hookDetails),
    })),
    ...pauseHooks.map((hook) => ({
      targetType: 'PAUSE',
      lifecycleStages: hook.lifecycleStages,
      timeoutConfiguration:
        hook.timeoutAction === undefined && hook.timeoutMinutes === undefined
          ? undefined
          : {
              action: hook.timeoutAction,
              timeoutInMinutes: hook.timeoutMinutes?.toString(),
            },
    })),
  ];
  return {
    lifecycleHooks: lifecycleHooks.length > 0 ? lifecycleHooks : undefined,
    readyDependencies,
  };
}

/**
 * Adds configured traffic-shift bake times and pauses to the provider's default service timeout.
 * Lambda hook execution time is unknown. Use deploymentTimeout when extra time is needed.
 *
 * @param selected The selected strategy and settings.
 * @returns A Pulumi duration including the provider baseline and configured bake times.
 */
export function estimateDeploymentTimeout(selected: ResolvedDeploymentStrategy): string {
  // Match the AWS provider's ECS service create/update timeout, without extra headroom.
  let minutes = 20;
  let trafficShifts = 1;
  if (selected.strategy !== DeploymentStrategy.ROLLING) {
    minutes += selected.config.bakeTimeMinutes;
  }
  if (selected.strategy === DeploymentStrategy.LINEAR) {
    const percent = selected.config.stepPercent ?? 10;
    trafficShifts = Math.ceil(100 / percent);
    // ECS does not apply the step bake after the final shift to 100%.
    // https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LinearConfiguration.html
    minutes += (trafficShifts - 1) * (selected.config.stepBakeTimeMinutes ?? 6);
  } else if (selected.strategy === DeploymentStrategy.CANARY) {
    minutes += selected.config.canaryBakeTimeMinutes ?? 10;
    trafficShifts = (selected.config.canaryPercent ?? 5) < 100 ? 2 : 1;
  }

  const pauseMinutesByStage = new Map<string, number>();
  const pauseHooks =
    selected.strategy === DeploymentStrategy.ROLLING
      ? withRollingLifecycleStage(selected.config.pauseHooks)
      : (selected.config.pauseHooks ?? []);
  for (const hook of pauseHooks) {
    for (const stage of hook.lifecycleStages) {
      // Hooks at the same stage run in parallel. The AWS default pause is 24 hours.
      // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/pause-lifecycle-hooks.html
      pauseMinutesByStage.set(
        stage,
        Math.max(pauseMinutesByStage.get(stage) ?? 0, hook.timeoutMinutes ?? 1440),
      );
    }
  }
  for (const [stage, pauseMinutes] of pauseMinutesByStage) {
    minutes += pauseMinutes * (stage === 'PRE_PRODUCTION_TRAFFIC_SHIFT' ? trafficShifts : 1);
  }

  return `${minutes}m`;
}
