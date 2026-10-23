import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

export enum DeploymentStrategy {
  ROLLING = 'ROLLING',
  BLUE_GREEN = 'BLUE_GREEN',
  CANARY = 'CANARY',
  LINEAR = 'LINEAR',
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
 * Adds configured traffic-shift bake times to the AWS provider's default service timeout.
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
  }

  return `${minutes}m`;
}
