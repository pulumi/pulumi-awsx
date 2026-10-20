import * as pulumi from '@pulumi/pulumi';
import { ComponentIdentity } from '../../componentIdentity';
import * as aws from '@pulumi/aws';
import {
  createApplicationServiceAttachment,
  validateListenerRulePriorities,
  resolveIngressSourceGroup,
  ServiceLoadBalancer,
} from './serviceLoadBalancer';

import {
  DeploymentStrategy,
  DeploymentFailureAction,
  ServiceDeploymentStrategy,
  resolveDeploymentStrategy,
  renderStrategySettings,
  estimateDeploymentTimeout,
} from './serviceDeployment';

export const fargateServiceStandaloneIdentity: ComponentIdentity = {
  type: 'awsx-next:index:FargateServiceV2',
  aliases: [],
};

/**
 * Fargate capacity provider used to run the service's tasks.
 */
export enum FargateCapacityProvider {
  /**
   * Runs tasks on standard Fargate capacity.
   */
  FARGATE = 'FARGATE',

  /**
   * Runs tasks on Fargate Spot capacity. Use for workloads that tolerate interruptions.
   */
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
   * Default - AWS value of 0
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

/**
 * Determines how tags are propagated to the tasks that are launched
 */
export enum PropagateTags {
  /**
   * Copies tags from the ECS service to newly launched tasks. This is the default
   */
  SERVICE = 'SERVICE',

  /**
   * Copies tags from the task definition to newly launched tasks.
   */
  TASK_DEFINITION = 'TASK_DEFINITION',
}

export interface FargateServiceV2Args {
  /**
   * The deployment strategy to use for the Service.
   *
   * Default - Rolling deployment strategy
   */
  readonly deploymentStrategy?: ServiceDeploymentStrategy;

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
   * Attach a load balancer to a specific container running in the service.
   *
   * - Use one attachment when a single rule can express all routing to a backend, including multiple
   *   hostnames or path patterns.
   * - Use multiple attachments for different containers or ports, separate listeners or
   *   public/private load balancers, or hostname/path pairings that must be evaluated
   *   independently.
   *
   * Each attachment creates its own target group and forwarding rule.
   *
   * Default - The ECS service is not attached to a load balancer
   */
  readonly loadBalancerAttachments?: Record<string, ServiceLoadBalancer>;

  /**
   * Specifies whether the task's elastic network interface receives a public IP address.
   *
   * If true, each task will receive a public IP address.
   *
   * Default - false
   */
  readonly assignPublicIp?: boolean;

  /**
   * Total time Pulumi allows for ECS service creation or an update while waiting for steady state.
   * Uses Pulumi duration syntax, for example "90m" or "2h". Overrides the AWS provider timeout for
   * both operations.
   *
   * Default - The AWS provider's ECS service timeout for rolling updates. Progressive deployments
   * use that baseline, currently 20 minutes, plus configured bake times.
   *
   * Set this explicitly when the service needs more time to stabilize. This only applies to the
   * Pulumi resource create/update timeout. If that timeout is reached the Pulumi deployment fails,
   * but the ECS deployment is unaffected.
   */
  readonly deploymentTimeout?: string;

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
  readonly deploymentMaximumPercent?: number;

  /**
   * Security groups to attach to the service's tasks, in order. If provided, the list must not be
   * empty.
   *
   * When manageIngress is true (the default), AWSX adds standalone application and health-check
   * ingress rules to ONLY the first supplied group.
   *
   * Set manageIngress to false to manage ingress yourself or if you are using inline ingress rules.
   *
   * Default - AWSX creates one group with standalone IPv4 allow-all egress.
   */
  readonly securityGroupIds?: pulumi.Input<string>[];

  /**
   * When manageIngress is true, awsx will automatically add ingress rules to the service security
   * group allowing ingress from any attached load balancers.
   *
   * Set this to false in order to manage the ingress rules yourself
   *
   * Without load-balancer attachments, AWSX can still create a group when securityGroupIds is
   * omitted. Its standalone IPv4 allow-all egress is unaffected by this setting.
   *
   * Default - true.
   */
  readonly manageIngress?: boolean;

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
   * If enabled, `deploymentMaximumPercent` must be greater than 100.
   *
   * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-rebalancing.html
   * Default - AWS service default.
   */
  readonly availabilityZoneRebalancing?: AvailabilityZoneRebalancing;

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

  /**
   * Region where this resource will be managed. This region will be set on all child resources
   * created in this component.
   *
   * Defaults to the Region set in the provider configuration.
   */
  readonly region?: string;
}

export class FargateServiceV2 extends pulumi.ComponentResource {
  /**
   * The underlying ECS service resource. Use its outputs to inspect the service ARN, name, and
   * deployment configuration.
   */
  public readonly service!: aws.ecs.Service;

  /**
   * Security groups attached to the service, preserving the order of securityGroupIds when
   * supplied. Automatic ingress rules are added ONLY to the first group, unless manageIngress is
   * false. Supplied-group egress is never modified.
   *
   * You can add non-duplicate standalone rules that are not required for initial service readiness.
   * Do not use this output for rules needed to make load-balancer targets healthy: the remote
   * component waits for steady state before returning its outputs. For manual ingress, supply your
   * own groups and create required rules from their original references before this service.
   *
   * Do not combine automatic ingress with inline or exclusive ingress management. AWSX-created
   * groups also have standalone IPv4 allow-all egress.
   */
  public readonly securityGroups!: aws.ec2.SecurityGroup[];
  constructor(
    name: string,
    args: FargateServiceV2Args,
    opts: pulumi.ComponentResourceOptions = {},
    /**
     * @internal
     */
    identity: ComponentIdentity = fargateServiceStandaloneIdentity,
  ) {
    // Resource references supply a URN without the original args. Declare outputs for hydration
    // and skip child construction, as their references are restored by the runtime.
    const inputs = opts.urn ? { service: undefined, securityGroups: undefined } : args;
    super(identity.type, name, inputs, pulumi.mergeOptions(opts, { aliases: identity.aliases }));
    if (opts.urn) {
      return;
    }

    if (args.securityGroupIds?.length === 0) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'securityGroupIds',
        reason:
          'securityGroupIds must contain at least one security group when provided. Omit it to create a security group automatically.',
      });
    }

    if (
      args.manageIngress === false &&
      Object.keys(args.loadBalancerAttachments ?? {}).length > 0 &&
      !args.securityGroupIds?.length
    ) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'securityGroupIds',
        reason:
          'When loadBalancerAttachments are provided and manageIngress is `false` you must provide at least one security group in securityGroupIds',
      });
    }

    const selected = resolveDeploymentStrategy(args.deploymentStrategy ?? {});
    const progressive = selected.strategy !== DeploymentStrategy.ROLLING;
    if (
      (selected.strategy === DeploymentStrategy.CANARY ||
        selected.strategy === DeploymentStrategy.LINEAR) &&
      Object.keys(args.loadBalancerAttachments ?? {}).length === 0
    ) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'loadBalancerAttachments',
        reason:
          'Canary and linear deployments require at least one load-balancer attachment for traffic shifting.',
      });
    }
    const deploymentTimeout =
      args.deploymentTimeout ?? (progressive ? estimateDeploymentTimeout(selected) : undefined);
    const vpcId = this.getVpcFromSubnets(args.vpcSubnetIds, args.region);

    if (args.capacityProviderStrategies && args.useClusterDefaultCapacityProviderStrategy) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'capacityProviderStrategies',
        reason:
          'Only one of `capacityProviderStrategies` or `useClusterDefaultCapacityProviderStrategy` can be provided.',
      });
    }

    if (args.region) {
      const providerRegion = aws.getRegionOutput(undefined, { parent: this }).region;
      providerRegion.apply((region) => {
        if (region === args.region) {
          pulumi.log.warn(
            `region input is only needed if the Fargate Service is being created in a different region than the provider. Provider region (${region}) matches region input (${args.region}).`,
            this,
          );
        }
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
    const ingressByPort = new Map<
      number,
      { attachmentName: string; sourceGroupId: pulumi.Input<string> }[]
    >();
    const attachmentEntries = Object.entries(args.loadBalancerAttachments ?? {});
    // Listener IDs may be Outputs. Validate collisions after resolution, but declare every
    // attachment synchronously and gate its forwarding rule on this shared validation.
    const listenerRuleValidation = pulumi
      .all(attachmentEntries.map(([, attachment]) => attachment.application.listenerArn))
      .apply((arns) => {
        const rules = attachmentEntries.map(([attachmentName, attachment], index) => ({
          attachmentName,
          listenerArn: arns[index]!,
          priority: attachment.application.priority,
          testTraffic: attachment.application.testTraffic !== undefined,
        }));
        validateListenerRulePriorities(rules);
      });
    for (const [attachmentName, attachmentArgs] of attachmentEntries) {
      const attachment = createApplicationServiceAttachment(
        name,
        attachmentName,
        attachmentArgs.application,
        {
          parent: this,
          region: args.region,
          listenerRuleValidation,
          strategy: selected.strategy,
        },
      );
      if (args.manageIngress !== false) {
        for (const { port, sourceGroupId } of attachment.requiredIngress) {
          const sources = ingressByPort.get(port) ?? [];
          sources.push({ attachmentName, sourceGroupId });
          ingressByPort.set(port, sources);
        }
      }
      loadBalancers.push(attachment.serviceBinding);
      readyDependencies.push(...attachment.readyDependencies);
    }

    if (args.securityGroupIds) {
      this.securityGroups = args.securityGroupIds.flatMap((id, idx) => {
        const importId = args.region ? pulumi.interpolate`${id}@${args.region}` : id;
        return aws.ec2.SecurityGroup.get(`${name}-security-group-${idx}`, importId, undefined, {
          parent: this,
        });
      });
    } else {
      const securityGroup = new aws.ec2.SecurityGroup(
        `${name}-security-group`,
        {
          vpcId,
          region: args.region,
        },
        { parent: this },
      );
      this.securityGroups = [securityGroup];
      readyDependencies.push(
        new aws.vpc.SecurityGroupEgressRule(
          `${name}-egress`,
          {
            region: args.region,
            securityGroupId: securityGroup.id,
            ipProtocol: '-1',
            cidrIpv4: '0.0.0.0/0',
          },
          { parent: this },
        ),
      );
    }

    // Ports and rule identities are known during construction. Resolve and validate source IDs
    // only as rule inputs, so rules remain visible even when ALB metadata is unknown in preview.
    for (const [port, sources] of ingressByPort) {
      const sourceGroupId = pulumi.all(sources.map((source) => source.sourceGroupId)).apply((ids) =>
        resolveIngressSourceGroup(
          port,
          sources.map((source, index) => ({
            attachmentName: source.attachmentName,
            sourceGroupId: ids[index]!,
          })),
        ),
      );
      readyDependencies.push(
        new aws.vpc.SecurityGroupIngressRule(
          `${name}-ingress-${port}`,
          {
            region: args.region,
            securityGroupId: this.securityGroups[0]!.id,
            referencedSecurityGroupId: sourceGroupId,
            ipProtocol: 'tcp',
            fromPort: port,
            toPort: port,
          },
          { parent: this },
        ),
      );
    }

    this.service = new aws.ecs.Service(
      name,
      {
        desiredCount: args.desiredCount ?? 1,
        region: args.region,
        launchType,
        availabilityZoneRebalancing: args.availabilityZoneRebalancing,
        deploymentMaximumPercent: args.deploymentMaximumPercent ?? 200,
        deploymentMinimumHealthyPercent: args.deploymentMinHealthyPercent ?? 100,
        taskDefinition: args.taskDefinition,
        propagateTags: args.propagateTags ?? PropagateTags.SERVICE,
        capacityProviderStrategies,
        enableEcsManagedTags: args.enableEcsManagedTags ?? true,
        // Verified with progressive strategies too, despite AWS API docs describing this as rolling-only.
        deploymentCircuitBreaker: {
          enable: true,
          rollback:
            (selected.config.failureAction ?? DeploymentFailureAction.ROLLBACK) ===
            DeploymentFailureAction.ROLLBACK,
        },
        deploymentConfiguration: {
          strategy: selected.strategy,
          ...renderStrategySettings(selected),
        },
        waitForSteadyState: true,
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
      {
        parent: this,
        dependsOn: readyDependencies,
        customTimeouts:
          deploymentTimeout !== undefined
            ? { create: deploymentTimeout, update: deploymentTimeout }
            : undefined,
      },
    );

    this.registerOutputs({
      service: this.service,
      securityGroups: this.securityGroups,
    });
  }

  /**
   * Get the VPC id from the supplied subnets. This will pick the first subnet in the list and
   * lookup the vpc it is associated with
   *
   * @param subnetIds A list of subnets ids
   * @param region The region containing the subnets, or the provider region when omitted.
   * @returns The VPC that contains the subnets
   */
  private getVpcFromSubnets(
    subnetIds: pulumi.Input<pulumi.Input<string>[]>,
    region?: string,
  ): pulumi.Output<string> {
    const firstSubnetId = pulumi.output(subnetIds).apply((subnets) => {
      const id = subnets[0];
      if (id === undefined) {
        throw new pulumi.InputPropertyError({
          propertyPath: 'vpcSubnetIds',
          reason: 'At least one subnet must be provided',
        });
      }
      return id;
    });
    const subnet = aws.ec2.getSubnetOutput({ id: firstSubnetId, region }, { parent: this });
    return subnet.vpcId;
  }
}
