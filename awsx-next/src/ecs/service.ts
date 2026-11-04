import * as pulumi from '@pulumi/pulumi';
import { ComponentIdentity } from '../componentIdentity';
import * as aws from '@pulumi/aws';
import { Arn, ArnFormat } from './arn';
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
  createDeploymentLifecycleHooks,
} from './serviceDeployment';
import {
  resolveClusterCapacity,
  ServiceCapacity,
  validateCapacityProviders,
  ResolvedServiceCapacity,
  validateServiceCapacity,
  validateTaskCapacity,
} from './serviceCapacity';

export const serviceStandaloneIdentity: ComponentIdentity = {
  type: 'awsx-next:index:Service',
  aliases: [],
};

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

export interface ServiceArgs {
  /**
   * The ARN of the cluster that hosts the service.
   */
  readonly clusterArn: pulumi.Input<string>;

  /**
   * The full ARN of the task definition that you want to run in your service. The task definition
   * must use awsvpc networking and be compatible with the selected capacity
   */
  readonly taskDefinitionArn: pulumi.Input<string>;

  /**
   * The subnets where the service will be deployed in
   */
  readonly vpcSubnetIds: pulumi.Input<pulumi.Input<string>[]>;

  /**
   * Select Fargate or existing capacity providers. When omitted, adopt a nonempty cluster default
   * and otherwise use Fargate.
   */
  readonly capacity?: ServiceCapacity;

  /**
   * Force a new task deployment on service updates. Enable when changing capacity-provider
   * strategies, as required by the AWS provider. Other service updates can also roll tasks.
   *
   * Default - Unset.
   */
  readonly forceNewDeployment?: boolean;

  /**
   * The deployment strategy to use for the Service.
   *
   * Default - Rolling deployment strategy
   */
  readonly deploymentStrategy?: ServiceDeploymentStrategy;

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
   * If true, each task will receive a public IP address. Supported only on Fargate.
   *
   * Default - false
   */
  readonly assignPublicIp?: boolean;

  /**
   * Total time Pulumi allows for ECS service creation or an update while waiting for steady state.
   * Uses Pulumi duration syntax, for example "90m" or "2h". Overrides the AWS provider timeout for
   * both operations.
   *
   * Default - The AWS provider's ECS service timeout, currently 20 minutes, plus configured
   * progressive bake times and pause budgets. Hooks at the same stage run in parallel, so only the
   * longest pause at each stage is counted. Recurring pauses are counted at every traffic shift.
   * Lambda execution time is unknown. Override this timeout when additional time is needed.
   *
   * Set this explicitly when the service needs more time to stabilize. This only applies to the
   * Pulumi resource create/update timeout. If that timeout is reached the Pulumi deployment fails,
   * but the ECS deployment is unaffected.
   */
  readonly deploymentTimeout?: string;

  /**
   * Seconds ECS ignores failing health checks for newly started tasks, allowing the application
   * time to start. This does not change the target group's health checks or Pulumi's deployment
   * timeout.
   *
   * Must be an integer from 0 through 2147483647.
   *
   * Default - Unset, using the AWS default of 0 seconds.
   */
  readonly healthCheckGracePeriodSeconds?: number;

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
   * Region where this service and its AWS child resources will be managed. Load-balancer forwarding
   * rules use the inherited AWS Native provider, which must target the same account and this
   * effective region. The component validates that both providers match; this input does not
   * override the AWS Native provider's region.
   *
   * Defaults to the Region set in the AWS provider configuration.
   */
  readonly region?: string;
}

export class Service extends pulumi.ComponentResource {
  /**
   * ARN of the ECS service, available after it reaches steady state.
   */
  public readonly serviceArn!: pulumi.Output<string>;

  /**
   * Name of the ECS service within its cluster.
   */
  public readonly serviceName!: pulumi.Output<string>;

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
    args: ServiceArgs,
    opts: pulumi.ComponentResourceOptions = {},
    /**
     * @internal
     */
    identity: ComponentIdentity = serviceStandaloneIdentity,
  ) {
    // Resource references supply a URN without the original args. Declare outputs for hydration
    // and skip child construction, as their references are restored by the runtime.
    const inputs = opts.urn
      ? { serviceArn: undefined, serviceName: undefined, securityGroups: undefined }
      : args;
    super(identity.type, name, inputs, pulumi.mergeOptions(opts, { aliases: identity.aliases }));
    if (opts.urn) {
      return;
    }
    validateServiceCapacity(args.capacity);

    if (
      args.healthCheckGracePeriodSeconds !== undefined &&
      (!Number.isInteger(args.healthCheckGracePeriodSeconds) ||
        args.healthCheckGracePeriodSeconds < 0 ||
        args.healthCheckGracePeriodSeconds > 2147483647)
    ) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'healthCheckGracePeriodSeconds',
        reason: 'healthCheckGracePeriodSeconds must be an integer from 0 through 2147483647.',
      });
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
      args.deploymentTimeout ??
      (progressive || selected.config.pauseHooks?.length
        ? estimateDeploymentTimeout(selected)
        : undefined);
    const capacity = this.resolveCapacity(name, args, opts.dependsOn);
    const task = aws.ecs.getTaskDefinitionOutput(
      { taskDefinition: args.taskDefinitionArn, region: args.region },
      { parent: this, dependsOn: opts.dependsOn },
    );
    // Validation gates the ECS service inputs. Every child is declared outside applies, including
    // when task, cluster, and capacity identifiers are unknown during preview.
    const taskDefinitionArn = pulumi.all([capacity, task]).apply(([placement, definition]) => {
      validateTaskCapacity(placement, definition.requiresCompatibilities, definition.networkMode, {
        assignPublicIp: args.assignPublicIp,
        operatingSystemFamily: definition.runtimePlatforms?.[0]?.operatingSystemFamily,
      });
      return definition.arn;
    });

    const vpcId = this.getVpcFromSubnets(args.vpcSubnetIds, args.region);

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

    const loadBalancers: aws.types.input.ecs.ServiceLoadBalancer[] = [];
    const hooks = createDeploymentLifecycleHooks(name, selected, this);
    const readyDependencies: pulumi.Resource[] = [...hooks.readyDependencies];
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

    const service = new aws.ecs.Service(
      name,
      {
        desiredCount: args.desiredCount ?? 1,
        forceNewDeployment: args.forceNewDeployment,
        region: args.region,
        launchType: capacity.apply((s) => s.launchType),
        availabilityZoneRebalancing: args.availabilityZoneRebalancing,
        deploymentMaximumPercent: args.deploymentMaximumPercent ?? 200,
        deploymentMinimumHealthyPercent: args.deploymentMinHealthyPercent ?? 100,
        taskDefinition: taskDefinitionArn,
        propagateTags: args.propagateTags ?? PropagateTags.SERVICE,
        capacityProviderStrategies: capacity.apply((s) => s.strategies),
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
          lifecycleHooks: hooks.lifecycleHooks,
        },
        waitForSteadyState: true,
        tags: args.tags,
        cluster: args.clusterArn,
        networkConfiguration: {
          assignPublicIp: args.assignPublicIp,
          subnets: args.vpcSubnetIds,
          securityGroups: this.securityGroups.flatMap((sg) => sg.id),
        },
        platformVersion: capacity.apply((placement) =>
          placement.launchType === 'FARGATE' ||
          placement.strategies?.some((entry) =>
            ['FARGATE', 'FARGATE_SPOT'].includes(entry.capacityProvider),
          )
            ? '1.4.0'
            : undefined,
        ),
        loadBalancers: loadBalancers.length > 0 ? loadBalancers : undefined,
        healthCheckGracePeriodSeconds: args.healthCheckGracePeriodSeconds,
        // TODO: these are the remaining configs
        // deploymentController,
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

    this.serviceArn = service.arn;
    this.serviceName = service.name;
    this.registerOutputs({
      serviceArn: this.serviceArn,
      serviceName: this.serviceName,
      securityGroups: this.securityGroups,
    });
  }
  /**
   * Resolves the selected policy without taking ownership of any cluster-wide configuration.
   *
   * @param name The component name.
   * @param args The service settings.
   * @param dependsOn Dependencies that must finish before reading capacity configuration.
   * @returns The resolved launch type or provider strategy.
   */
  private resolveCapacity(
    name: string,
    args: ServiceArgs,
    dependsOn: pulumi.ResourceOptions['dependsOn'],
  ): pulumi.Output<ResolvedServiceCapacity> {
    if (args.capacity?.fargate) {
      const { onDemand, spot } = args.capacity.fargate;
      const strategies = [
        ...(onDemand
          ? [{ capacityProvider: 'FARGATE', base: onDemand.base, weight: onDemand.weight ?? 1 }]
          : []),
        ...(spot
          ? [{ capacityProvider: 'FARGATE_SPOT', base: spot.base, weight: spot.weight ?? 1 }]
          : []),
      ];
      return pulumi.output(strategies.length ? { strategies } : { launchType: 'FARGATE' });
    }

    const clusterName = Arn.split(args.clusterArn, ArnFormat.SLASH_RESOURCE_NAME, this).apply(
      (parsed) => {
        if (
          parsed.service !== 'ecs' ||
          parsed.resource !== 'cluster' ||
          !parsed.resourceName ||
          parsed.resourceName.includes('/')
        ) {
          throw new pulumi.InputPropertyError({
            propertyPath: 'clusterArn',
            reason: 'Provide the ARN of an ECS cluster, not its name.',
          });
        }
        return parsed.resourceName;
      },
    );

    if (args.capacity?.providers) {
      const allocations = args.capacity.providers;
      const providers = allocations.map((allocation, index) => {
        const id = args.region
          ? pulumi.interpolate`${allocation.capacityProviderArn}@${args.region}`
          : allocation.capacityProviderArn;
        const provider = aws.ecs.CapacityProvider.get(
          `${name}-capacity-provider-${index}`,
          id,
          undefined,
          { parent: this, dependsOn },
        );
        return {
          name: provider.name,
          cluster: provider.cluster,
          managedInstances: provider.managedInstancesProvider,
          autoScaling: provider.autoScalingGroupProvider,
        };
      });
      const clusterId = args.region
        ? pulumi.interpolate`${clusterName}@${args.region}`
        : clusterName;
      const clusterCapacity = aws.ecs.ClusterCapacityProviders.get(
        `${name}-cluster-capacity`,
        clusterId,
        undefined,
        { parent: this, dependsOn },
      );
      return pulumi
        .output({
          clusterArn: args.clusterArn,
          clusterName,
          providers,
          associatedProviders: clusterCapacity.capacityProviders,
        })
        .apply(
          ({
            clusterArn,
            clusterName: resolvedClusterName,
            providers: resolved,
            associatedProviders,
          }) => {
            const providerFamily = validateCapacityProviders(
              clusterArn,
              resolvedClusterName,
              resolved,
              associatedProviders,
            );
            const strategies = resolved.map((provider, index) => ({
              capacityProvider: provider.name,
              base: allocations[index]!.base,
              weight: allocations[index]!.weight ?? 1,
            }));
            return { strategies, providerFamily };
          },
        );
    }

    // getCluster does not expose the default strategy. Read the cluster-capacity-provider state
    // instead, using the cluster name as its documented import ID.
    const id = args.region ? pulumi.interpolate`${clusterName}@${args.region}` : clusterName;
    const clusterCapacity = aws.ecs.ClusterCapacityProviders.get(
      `${name}-cluster-capacity`,
      id,
      undefined,
      { parent: this, dependsOn },
    );
    return clusterCapacity.defaultCapacityProviderStrategies.apply(async (defaults) => {
      const capacity = resolveClusterCapacity(defaults);
      const customProviders =
        capacity.strategies?.filter(
          (entry) => !['FARGATE', 'FARGATE_SPOT'].includes(entry.capacityProvider),
        ) ?? [];
      if (!customProviders.length) return capacity;
      if (customProviders.length !== capacity.strategies!.length) {
        throw new pulumi.InputPropertyError({
          propertyPath: 'capacity',
          reason: 'The cluster default mixes Fargate and custom capacity providers.',
        });
      }
      // The inherited strategy length is only known after the cluster read. Invokes, unlike
      // resource declarations, can safely resolve that dynamic list without hiding children.
      const families = await Promise.all(
        customProviders.map(async (entry) => {
          const provider = await aws.cloudcontrol.getResource(
            {
              typeName: 'AWS::ECS::CapacityProvider',
              identifier: entry.capacityProvider,
              region: args.region,
            },
            { parent: this },
          );
          const properties = JSON.parse(provider.properties);
          const managed = properties.ManagedInstancesProvider != null;
          const autoScaling = properties.AutoScalingGroupProvider != null;
          if (managed === autoScaling) {
            throw new pulumi.InputPropertyError({
              propertyPath: 'capacity',
              reason: 'Expected a Managed Instances or ASG-backed capacity provider.',
            });
          }
          return managed ? ('MANAGED_INSTANCES' as const) : ('EC2' as const);
        }),
      );
      if (new Set(families).size !== 1) {
        throw new pulumi.InputPropertyError({
          propertyPath: 'capacity',
          reason: 'Managed Instances and ASG-backed providers cannot share a strategy.',
        });
      }
      return { ...capacity, providerFamily: families[0]! };
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
