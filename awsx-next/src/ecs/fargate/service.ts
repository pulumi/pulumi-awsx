import * as pulumi from '@pulumi/pulumi';
import { ComponentIdentity } from '../../componentIdentity';
import * as aws from '@pulumi/aws';
import {
  createApplicationServiceAttachment,
  CreatedApplicationServiceAttachment,
  DeploymentStrategy,
  RequiredIngress,
  ServiceLoadBalancer,
} from './serviceLoadBalancer';

export const fargateServiceStandaloneIdentity: ComponentIdentity = {
  type: 'awsx-next:index:FargateServiceV2',
  aliases: [],
};
export enum FargateCapacityProvider {
  FARGATE = 'FARGATE',
  FARGATE_SPOT = 'FARGATE_SPOT',
}

/**
 * A Capacity Provider strategy to use for the service.
 */
export interface FargateCapacityProviderStrategy {
  /**
   * The name of the capacity provider.
   */
  readonly capacityProvider: FargateCapacityProvider;

  /**
   * The base value designates how many tasks, at a minimum, to run on the specified capacity
   * provider. Only one capacity provider in a capacity provider strategy can have a base defined.
   * If no value is specified, the default value of 0 is used.
   *
   * Default - none
   */
  readonly base?: number;

  /**
   * The weight value designates the relative percentage of the total number of tasks launched that
   * should use the specified capacity provider. The weight value is taken into consideration after
   * the base value, if defined, is satisfied.
   *
   * Default - 1
   */
  readonly weight?: number;
}

/**
 * The platform version on which to run your service.
 *
 * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/platform_versions.html
 */
export enum FargatePlatformVersion {
  /**
   * The latest, recommended platform version.
   */
  LATEST = 'LATEST',

  /**
   * Version 1.4.0
   *
   * Supports EFS endpoints, CAP_SYS_PTRACE Linux capability, network performance metrics in
   * CloudWatch Container Insights, consolidated 20 GB ephemeral volume.
   */
  VERSION1_4 = '1.4.0',

  /**
   * Version 1.3.0
   *
   * Supports secrets, task recycling.
   */
  VERSION1_3 = '1.3.0',

  /**
   * Version 1.2.0
   *
   * Supports private registries.
   */
  VERSION1_2 = '1.2.0',

  /**
   * Version 1.1.0
   *
   * Supports task metadata, health checks, service discovery.
   */
  VERSION1_1 = '1.1.0',

  /**
   * Initial release
   *
   * Based on Amazon Linux 2017.09.
   */
  VERSION1_0 = '1.0.0',
}

/**
 * Indicates whether to use Availability Zone rebalancing for an ECS service.
 *
 * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-rebalancing.html
 */
export enum AvailabilityZoneRebalancing {
  /**
   * Availability zone rebalancing is enabled.
   */
  ENABLED = 'ENABLED',

  /**
   * Availability zone rebalancing is disabled.
   */
  DISABLED = 'DISABLED',
}

export enum PropagateTags {
  SERVICE = 'SERVICE',
  TASK_DEFINITION = 'TASK_DEFINITION',
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
 * traffic after an observation period.
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
 * increments.
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

export interface FargateServiceV2Args {
  /**
   * The ARN of the cluster that hosts the service.
   */
  readonly clusterArn: pulumi.Input<string>;

  /**
   * Family and revision (`family:revision`) or full ARN of the task definition that you want to run
   * in your service. If a revision is not specified, the latest `ACTIVE` revision is used.
   */
  readonly taskDefinition: pulumi.Input<string>;

  /**
   * The subnets where the service will be deployed in
   */
  readonly vpcSubnetIds: pulumi.Input<pulumi.Input<string>[]>;

  /**
   * Attach the ECS Service to a Load Balancer.
   *
   * Default - The ECS service is not attached to a load balancer
   */
  readonly loadBalancer?: Record<string, ServiceLoadBalancer>;

  /**
   * Specifies whether the task's elastic network interface receives a public IP address.
   *
   * If true, each task will receive a public IP address.
   *
   * Default - false
   */
  readonly assignPublicIp?: boolean;

  /**
   * The deployment strategy to use for the Service.
   *
   * Default - Rolling deployment strategy
   */
  readonly deploymentStrategy?: ServiceDeploymentStrategy;

  /**
   * A list of Capacity Provider strategies used to place a service.
   *
   * Default - No capacity providers are used
   */
  readonly capacityProviderStrategies?: FargateCapacityProviderStrategy[];

  /**
   * Uses the cluster's default capacity provider strategy.
   *
   * Cannot be combined with `capacityProviderStrategies`. When neither option is provided, the
   * service uses the `FARGATE` launch type.
   *
   * The cluster's default strategy must use Fargate-compatible capacity providers.
   *
   * Default - false
   */
  readonly useClusterDefaultCapacityProviderStrategy?: boolean;

  /**
   * Number of instances of the task definition to place and keep running on the service.
   *
   * Default - 1
   */
  readonly desiredCount?: number;

  /**
   * Lower limit (as a percentage of the service's desiredCount) of the number of running tasks that
   * must remain running and healthy in a service during a deployment.
   *
   * Default - 100
   */
  readonly deploymentMinHealthyPercent?: number;

  /**
   * Upper limit (as a percentage of the service's desiredCount) of the number of running tasks that
   * can be running in a service during a deployment.
   *
   * Default - 200
   */
  readonly deploymentMaxHealthyPercent?: number;

  /**
   * The security groups to associate with the service. If you do not specify a security group, a
   * new security group is created and this component manages its ingress and egress rules.
   *
   * If you provide your own security groups, those groups must permit application and health-check
   * traffic from the load balancers.
   *
   * Default - A new security group is created.
   */
  readonly securityGroupIds?: pulumi.Input<string>[];

  /**
   * The platform version on which to run your service.
   *
   * If one is not specified, the LATEST platform version is used by default. For more information,
   * see [AWS Fargate Platform
   * Versions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/platform_versions.html)
   * in the Amazon Elastic Container Service Developer Guide.
   *
   * Default - Latest
   */
  readonly platformVersion?: FargatePlatformVersion;

  /**
   * Whether to use Availability Zone rebalancing for the service.
   *
   * If enabled, `maxHealthyPercent` must be greater than 100
   *
   * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-rebalancing.html
   * Default -  AvailabilityZoneRebalancing.ENABLED
   */
  readonly availabilityZoneRebalancing?: AvailabilityZoneRebalancing;

  /**
   * The period of time, in seconds, that the Amazon ECS service scheduler ignores unhealthy Elastic
   * Load Balancing target health checks after a task has first started.
   *
   * Default - defaults to 60 seconds if at least one load balancer is in-use and it is not already
   * set
   */
  // TODO: requires LB setup
  // readonly healthCheckGracePeriodSeconds?: number;

  /**
   * Enables Amazon ECS-managed tags on tasks launched by this service.
   *
   * Default - true
   */
  readonly enableEcsManagedTags?: boolean;

  /**
   * Selects the resource whose tags are copied to newly launched tasks.
   *
   * Default - PropagateTags.SERVICE
   */
  readonly propagateTags?: PropagateTags;

  /**
   * Tags assigned to the ECS service. These are propagated to newly launched tasks when
   * propagateTags is SERVICE.
   */
  readonly tags?: Record<string, pulumi.Input<string>>;
}

export class FargateServiceV2 extends pulumi.ComponentResource {
  public readonly service: aws.ecs.Service;

  /**
   * Security groups attached to the service. Do not add standalone rules to an AWSX-managed group,
   * because they will conflict with inline rules. Provide your own groups when custom rule
   * management is required.
   */
  public readonly securityGroups: aws.ec2.SecurityGroup[];
  constructor(
    name: string,
    args: FargateServiceV2Args,
    opts: pulumi.ComponentResourceOptions = {},
    /**
     * @internal
     */
    identity: ComponentIdentity = fargateServiceStandaloneIdentity,
  ) {
    const inputs = opts.urn ? {} : args;
    super(identity.type, name, inputs, pulumi.mergeOptions(opts, { aliases: identity.aliases }));

    const firstSubnetId = pulumi.output(args.vpcSubnetIds).apply((subnets) => {
      const id = subnets[0];
      if (id === undefined) {
        throw new pulumi.InputPropertyError({
          propertyPath: 'vpcSubnets',
          reason: 'At least one subnet must be provided',
        });
      }
      return id;
    });

    const subnet = aws.ec2.getSubnetOutput({ id: firstSubnetId }, { parent: this });
    const vpcId = subnet.vpcId;
    const { deploymentCircuitBreaker, waitForSteadyState, deploymentConfiguration, strategy } =
      this.renderDeploymentConfiguration(args);

    if (args.capacityProviderStrategies && args.useClusterDefaultCapacityProviderStrategy) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'capacityProviderStrategies',
        reason:
          'Only one of `capacityProviderStrategies` or `useClusterDefaultCapacityProviderStrategy` can be provided.',
      });
    }

    // ECS uses the cluster default capacity provider strategy only when neither
    // a launch type nor a service-level capacity provider strategy is provided.
    const launchType =
      args.capacityProviderStrategies || args.useClusterDefaultCapacityProviderStrategy
        ? undefined
        : 'FARGATE';

    const capacityProviderStrategies:
      | aws.types.input.ecs.ServiceCapacityProviderStrategy[]
      | undefined = args.capacityProviderStrategies?.flatMap((providerStrategy) => ({
      capacityProvider: providerStrategy.capacityProvider,
      base: providerStrategy.base,
      // API defaults this to 0, but the console defaults it to 1 so 1 is the better default
      weight: providerStrategy.weight ?? 1,
    }));

    const loadBalancers: aws.types.input.ecs.ServiceLoadBalancer[] = [];
    const readyDependencies: pulumi.Resource[] = [];
    const attachments: CreatedApplicationServiceAttachment[] = [];
    for (const [attachmentName, attachmentArgs] of Object.entries(args.loadBalancer ?? {})) {
      if (!attachmentArgs.application) {
        throw new pulumi.InputPropertyError({
          propertyPath: `loadBalancer.${attachmentName}.application`,
          reason: 'application configuration must be provided',
        });
      }
      const attachment = createApplicationServiceAttachment(
        name,
        attachmentName,
        attachmentArgs.application,
        {
          parent: this,
          strategy,
        },
      );
      attachments.push(attachment);
      loadBalancers.push(attachment.serviceBinding);
      readyDependencies.push(...attachment.readyDependencies);
    }

    // We can have multiple attachments to the same load balancer and multiple attachments to multiple load balancer.
    // We need to ensure that all rules are unique to a given security group, and due to outputs the only way to
    // accomplish this is to use inline rules
    const ingress = pulumi.all(attachments.map((a) => a.requiredIngress)).apply((requirements) => {
      const unique = new Map<string, RequiredIngress>();
      for (const permission of requirements.flat()) {
        unique.set(`${permission.sourceGroupId}:${permission.port}`, permission);
      }
      return [...unique.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, { sourceGroupId, port }]) => ({
          protocol: 'tcp',
          fromPort: port,
          toPort: port,
          securityGroups: [sourceGroupId],
        }));
    });

    if (args.securityGroupIds) {
      this.securityGroups = args.securityGroupIds.flatMap((id, idx) => {
        return aws.ec2.SecurityGroup.get(`${name}-security-group-${idx}`, id, undefined, {
          parent: this,
        });
      });
    } else {
      const securityGroup = new aws.ec2.SecurityGroup(
        `${name}-security-group`,
        {
          vpcId,
          // By default AWS always creates an egress all rule when a security group is created.
          // The Terraform provider removes that egress-all rule and make you add it yourself
          egress: [
            {
              protocol: '-1',
              cidrBlocks: ['0.0.0.0/0'],
              fromPort: 0,
              toPort: 0,
            },
          ],
          ingress,
        },
        { parent: this },
      );
      this.securityGroups = [securityGroup];
    }

    this.service = new aws.ecs.Service(
      name,
      {
        desiredCount: args.desiredCount ?? 1,
        launchType,
        deploymentMaximumPercent: args.deploymentMaxHealthyPercent ?? 200,
        deploymentMinimumHealthyPercent: args.deploymentMinHealthyPercent ?? 100,
        taskDefinition: args.taskDefinition,
        propagateTags: args.propagateTags ?? PropagateTags.SERVICE,
        capacityProviderStrategies,
        enableEcsManagedTags: args.enableEcsManagedTags ?? true,
        deploymentCircuitBreaker,
        waitForSteadyState,
        deploymentConfiguration,
        tags: args.tags,
        cluster: args.clusterArn,
        networkConfiguration: {
          assignPublicIp: args.assignPublicIp,
          subnets: args.vpcSubnetIds,
          securityGroups: this.securityGroups.flatMap((sg) => sg.id),
        },
        platformVersion: args.platformVersion,
        loadBalancers: loadBalancers.length > 0 ? loadBalancers : undefined,
        // TODO: these are the remaining configs
        // deploymentController,
        // healthCheckGracePeriodSeconds: args.healthCheckGracePeriodSeconds,
        // alarms,
        // serviceConnectConfiguration,
        // serviceRegistries,
        // volumeConfiguration,
        // vpcLatticeConfigurations,
      },
      { parent: this, dependsOn: readyDependencies },
    );

    this.registerOutputs({
      service: this.service,
      securityGroups: this.securityGroups,
    });
  }

  /**
   * Render the low level aws.ecs.Service configuration related to deployments
   *
   * @param args The args passed of the component
   * @returns The low level aws.ecs.Service input properties needed to configure the deployment
   */
  private renderDeploymentConfiguration(args: FargateServiceV2Args): {
    deploymentCircuitBreaker?: aws.types.input.ecs.ServiceDeploymentCircuitBreaker;
    waitForSteadyState?: boolean;
    deploymentConfiguration: aws.types.input.ecs.ServiceDeploymentConfiguration;
    strategy: DeploymentStrategy;
  } {
    const configuredStrategies = Object.entries(args.deploymentStrategy ?? {})
      .filter(([, config]) => config !== undefined)
      .map(([strategy]) => strategy);

    if (configuredStrategies.length > 1) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'deploymentStrategy',
        reason:
          'Only one deployment strategy can be provided; received: ' +
          configuredStrategies.join(', '),
      });
    }
    let strategy: DeploymentStrategy = DeploymentStrategy.ROLLING;
    let failureAction: DeploymentFailureAction =
      args.deploymentStrategy?.rolling?.failureAction ?? DeploymentFailureAction.ROLLBACK;
    let bakeTimeInMinutes: number | undefined = undefined;
    if (args.deploymentStrategy?.blueGreen) {
      strategy = DeploymentStrategy.BLUE_GREEN;
      bakeTimeInMinutes = args.deploymentStrategy.blueGreen.bakeTimeMinutes;
      if (args.deploymentStrategy.blueGreen.failureAction) {
        failureAction = args.deploymentStrategy.blueGreen.failureAction;
      }
    }
    if (args.deploymentStrategy?.canary) {
      strategy = DeploymentStrategy.CANARY;
      bakeTimeInMinutes = args.deploymentStrategy.canary.bakeTimeMinutes;
      if (args.deploymentStrategy.canary.failureAction) {
        failureAction = args.deploymentStrategy.canary.failureAction;
      }
    }
    if (args.deploymentStrategy?.linear) {
      strategy = DeploymentStrategy.LINEAR;
      bakeTimeInMinutes = args.deploymentStrategy.linear?.bakeTimeMinutes;
      if (args.deploymentStrategy.linear.failureAction) {
        failureAction = args.deploymentStrategy.linear.failureAction;
      }
    }

    return {
      strategy,
      deploymentCircuitBreaker: {
        enable: true,
        rollback: failureAction === DeploymentFailureAction.ROLLBACK,
      },
      waitForSteadyState: true,
      deploymentConfiguration: {
        strategy,
        bakeTimeInMinutes: bakeTimeInMinutes === undefined ? undefined : `${bakeTimeInMinutes}`,
        canaryConfiguration: args.deploymentStrategy?.canary
          ? {
              canaryBakeTimeInMinutes:
                args.deploymentStrategy.canary.canaryBakeTimeMinutes === undefined
                  ? undefined
                  : `${args.deploymentStrategy.canary.canaryBakeTimeMinutes}`,
              canaryPercent: args.deploymentStrategy.canary.canaryPercent,
            }
          : undefined,
        linearConfiguration: args.deploymentStrategy?.linear
          ? {
              stepBakeTimeInMinutes:
                args.deploymentStrategy.linear.stepBakeTimeMinutes === undefined
                  ? undefined
                  : `${args.deploymentStrategy.linear.stepBakeTimeMinutes}`,
              stepPercent: args.deploymentStrategy.linear.stepPercent,
            }
          : undefined,
      },
    };
  }
}
