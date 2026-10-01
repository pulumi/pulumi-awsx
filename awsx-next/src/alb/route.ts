import * as pulumi from '@pulumi/pulumi';
import { ComponentIdentity } from '../componentIdentity';
import * as aws from '@pulumi/aws';

/**
 * Load-balancer routing used to attach an ECS Service to a Load Balancer
 *
 * Pass an AlbServiceRoute to use its target groups and routing configuration.
 */
export interface ServiceRoute {
  /**
   * ARN of the target group to associate with the service's selected container. Its targets must
   * use the IP target type for Fargate tasks.
   *
   * For blue/green, canary, or linear deployments, this identifies the target group that initially
   * receives production traffic. ECS manages routing between this group and alternateTargetGroupArn
   * during deployment.
   */
  readonly targetGroupArn: pulumi.Input<string>;

  /**
   * ARN of the second target group used to register tasks and shift traffic during blue/green,
   * canary, or linear deployments.
   *
   * Required for those deployment strategies. Configure it with the same backend settings as
   * targetGroupArn and provide productionListenerRuleArn and trafficShiftRoleArn alongside it.
   */
  readonly alternateTargetGroupArn?: pulumi.Input<string>;

  /**
   * ARN of the ALB listener rule that ECS manages when shifting production traffic between the two
   * target groups.
   *
   * Required for blue/green, canary, or linear deployments. The rule must initially forward to both
   * target groups, with weights of 1 for targetGroupArn and 0 for alternateTargetGroupArn.
   *
   * For rolling deployments, this field is not needed by ECS.
   */
  readonly productionListenerRuleArn?: pulumi.Input<string>;

  /**
   * ARN of the ALB listener rule that ECS manages to route test requests to the new revision before
   * shifting production traffic.
   *
   * Optional for blue/green, canary, or linear deployments. The rule must initially forward to both
   * target groups, with weights of 1 for targetGroupArn and 0 for alternateTargetGroupArn.
   *
   * On the production listener, the test rule must be evaluated before any production rule that
   * also matches its requests. Configuring this field does not run tests or pause deployment for
   * approval.
   */
  readonly testListenerRuleArn?: pulumi.Input<string>;

  /**
   * ARN of the IAM infrastructure role that ECS assumes to manage target registration and
   * load-balancer routing during traffic shifting.
   *
   * Required for blue/green, canary, or linear deployments. The role must trust ecs.amazonaws.com
   * and grant the load-balancer permissions needed for the supplied target groups and listener
   * rules.
   *
   * The identity creating or updating the service must have iam:PassRole permission for this role.
   */
  readonly trafficShiftRoleArn?: pulumi.Input<string>;

  /**
   * Container port to associate with the target group in the ECS service's load-balancer
   * configuration.
   *
   * Must be exposed by a port mapping on the selected container. This is independent of the
   * listener's client-facing port.
   */
  readonly targetPort: pulumi.Input<number>;

  /**
   * The name of the container that this route will route traffic to. Must match the name of a
   * container in the container definitions of the taskDefinition used by the service
   */
  readonly targetContainerName?: pulumi.Input<string>;
}

export const serviceRouteStandaloneIdentity: ComponentIdentity = {
  type: 'awsx-next:index:AlbServiceRoute',
  aliases: [],
};

/**
 * TLS security policies for HTTPS listeners.
 *
 * Use `RECOMMENDED` for general use. Select another policy when your application requires
 * FIPS-validated cryptography, TLS 1.3-only connections, or RFC 9151 compliance. See each member's
 * documentation for its requirements and supported protocols.
 *
 * @see https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html
 */
export enum SslPolicy {
  /**
   * Recommended for general use. Supports TLS 1.3 and TLS 1.2, forward secrecy, and hybrid
   * post-quantum key exchange when supported by the client.
   */
  RECOMMENDED = 'ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09',

  /**
   * Use when FIPS-validated cryptography is required. Supports TLS 1.3 and TLS 1.2 and hybrid
   * post-quantum key exchange.
   */
  FIPS = 'ELBSecurityPolicy-TLS13-1-2-Res-FIPS-PQ-2025-09',

  /**
   * Use only when every client supports TLS 1.3.
   */
  TLS13_ONLY = 'ELBSecurityPolicy-TLS13-1-3-PQ-2025-09',

  /**
   * Use when strict RFC 9151/CNSA 1.0 compliance is required and every client supports its
   * restricted algorithms.
   */
  RFC9151 = 'ELBSecurityPolicy-TLS13-1-2-RFC9151-FIPS-2023-07',

  /**
   * Use while migrating clients toward RFC 9151/CNSA 1.0.
   */
  RFC9151_INTEROP = 'ELBSecurityPolicy-TLS13-1-2-RFC9151-INTEROP4-FIPS-2023-07',
}

export interface StringMatch {
  /**
   * AWS value matching, including supported wildcards. Conflicts with `regexValues`
   */
  readonly values?: pulumi.Input<string>[];

  /**
   * Regular-expression matching. Conflicts with `values`
   */
  readonly regexValues?: pulumi.Input<string>[];
}

export interface HeaderCondition extends StringMatch {
  /**
   * The name of the HTTP request header to match, such as "X-Deployment". Header names are matched
   * case-insensitively
   */
  readonly name: pulumi.Input<string>;
}

export interface QueryStringCondition {
  /**
   * Query string key pattern to match.
   */
  key?: pulumi.Input<string>;

  /**
   * Query string value pattern to match.
   */
  value: pulumi.Input<string>;
}

/**
 * Conditions used to select requests for a listener rule
 *
 * Different conditions are combined with AND. Alternatives within an individual condition are
 * combined with OR.
 */
export interface ListenerConditions {
  /**
   * Hostname patterns or regular expressions matched against the request's Host header. Matching is
   * case-insensitive
   */
  readonly hostnames?: StringMatch;
  /**
   * Path patterns or regular expressions matched against the request URL path. Matching is
   * case-sensitive and excludes the query string.
   */
  readonly pathPatterns?: StringMatch;
  /**
   * HTTP request headers to match. Every configured header condition must match (AND). Within an
   * individual condition, any configured value may match (OR).
   */
  readonly headers?: HeaderCondition[];
  /**
   * HTTP request methods to match, such as "GET" or "POST". Matching is case-sensitive and requires
   * an exact match
   */
  readonly methods?: pulumi.Input<string>[];
  /**
   * Query-string key/value patterns to match.
   */
  readonly queryStrings?: QueryStringCondition[];
}

export enum ApplicationProtocol {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
}

export interface TargetGroupHealthCheck {
  /**
   * Number of consecutive health check successes required before considering a target healthy. The
   * range is 2-10.
   *
   * Default - 3
   */
  healthyThreshold?: number;

  /**
   * Approximate amount of time, in seconds, between health checks of an individual target. The
   * range is 5-300.
   *
   * Default - 30.
   */
  intervalSeconds?: number;

  /**
   * The HTTP codes to use when checking for a successful response from a target. Values can be
   * comma-separated individual values (e.g., "200,202") or a range of values (e.g., "200-299").
   * Once the value has been set, removing it has no effect. To unset it, set it to an empty string
   * `""`. Values can be between `200` and `499`
   *
   * Default - 200
   */
  readonly healthyHttpCodes?: string;

  /**
   * The gRPC codes to use when checking for a response from a target. Values can be comma-separated
   * individual values (e.g., "12,13") or a range of values (e.g., "12-15"). Once the value has been
   * set, removing it has no effect. To unset it, set it to an empty string `""`.
   *
   * Values can be between `0` and `99`.
   *
   * Default - `12`.
   */
  readonly healthGrpcCodes?: string;

  /**
   * Destination for the health check request. Once the value has been set, removing it has no
   * effect. To unset it, set it to an empty string `""`.
   *
   * Default - `/`.
   */
  path?: string;

  /**
   * The port the load balancer uses when performing health checks on targets. Valid values are a
   * valid port number between `1` and `65535`.
   *
   * Default - By default (when this is undefined) it uses the same port as the target group
   */
  port?: number;

  /**
   * Protocol the load balancer uses when performing health checks on targets. Must be one of
   * `HTTP`, or `HTTPS`.
   *
   * Default - HealthCheckProtocol.HTTP.
   */
  protocol?: ApplicationProtocol;

  /**
   * Amount of time in seconds to wait before a health check times out. Range: 2-120 seconds.
   *
   * Default - AWS default of 5 seconds
   */
  timeoutSeconds?: number;

  /**
   * Number of consecutive health check failures required before considering a target unhealthy. The
   * range is 2-10.
   *
   * Default - 3.
   */
  unhealthyThreshold?: number;
}

export enum ApplicationProtocolVersion {
  HTTP_1 = 'HTTP1',
  HTTP_2 = 'HTTP2',
  GRPC = 'GRPC',
}

export interface TestTraffic {
  /**
   * This is only applicable when using blue/green, canary, or linear deployments. When those
   * deployment strategies are used you can provide these match conditions to route certain requests
   * to the new version immediately.
   *
   * When a new version is deployed using blue/green, canary, or linear deployments ECS starts by
   * first shifting 100% of traffic matching these conditions to the new version. Once that shift is
   * complete ECS then begins the production traffic shift. Using this `testTraffic` configuration
   * can allow you to accomplish things like:
   *
   * - Automated smoke tests before shifting production traffic
   * - Manual inspection before shifting production traffic
   * - Targeted checks during a canary/linear deployment.
   *
   * A rule is created on the production listener at priority 100 which means it is evaluated
   * _before_ the production rule (priority 200).
   */
  readonly match: ListenerConditions;
}

export interface AlbServiceRouteArgs {
  /**
   * The ARN of the Application Load Balancer
   */
  readonly loadBalancerArn: pulumi.Input<string>;

  /**
   * The port that the Load Balancer accepts client connections on.
   *
   * Default - 443 when `certificateArns` is non-empty, otherwise 80
   */
  readonly listenerPort?: number;

  /**
   * ACM Certificate ARNs to use for HTTPS connections. This is _required_ in order to use HTTPS.
   * The first certificate provided is the default certificate. Any additional certificates are
   * associated with the Load Balancer through Server Name Indication (SNI)
   *
   * Certificates must be available in the same AWS Region as the Load Balancer
   *
   * Default - No certificates. The listener uses HTTP.
   */
  readonly certificateArns?: pulumi.Input<string>[];

  /**
   * TLS security policy used for HTTPS client connections. Can only be provided alongside
   * certificateArns.
   *
   * Default - SslPolicy.RECOMMENDED
   */
  readonly sslPolicy?: SslPolicy;

  /**
   * Optional conditions to use when routing requests to the ECS Service target. All configured
   * conditions must match. Any requests that don't match will receive a 404 default response.
   *
   * If conditions are provided a listener rule is created with a priority of 200
   *
   * Default - All requests go to the target
   */
  readonly match?: ListenerConditions;

  /**
   * Health checks used by the Load Balancer to determine whether the ECS Service target can receive
   * traffic.
   *
   * Default - Health checks use the target group's service/provider defaults.
   */
  readonly targetHealthCheck?: TargetGroupHealthCheck;

  /**
   * Protocol version used for requests from the load balancer to the ECS Service target. HTTP_2 and
   * GRPC require HTTPS and `certificateArns`.
   *
   * Default - ApplicationProtocolVersion.HTTP_1
   */
  readonly targetProtocolVersion?: ApplicationProtocolVersion;

  /**
   * Protocol used for requests from the Load Balancer to the ECS Service target.
   *
   * Default - ApplicationProtocol.HTTP
   */
  readonly targetProtocol?: ApplicationProtocol;

  /**
   * The port that the ECS Service receives traffic from the load balancer. This should be the same
   * port used as the containerPort.
   *
   * Valid values between 1 and 65535
   */
  readonly targetPort: number;

  /**
   * The name of the container to route traffic to.
   *
   * Default - The first essential container on the taskDefinition used by the service will be used
   */
  readonly targetContainerName?: string;
  /**
   * Prepare routing for ECS blue/green, canary, or linear deployments.
   *
   * Creates two target groups with the same configuration and a production listener rule whose
   * forwarding weights ECS manages. The ECS Service selects the deployment strategy and timing.
   *
   * Default - false unless `testTraffic` is provided
   */
  readonly trafficShifting?: boolean;

  /**
   * Routing for validating the new service revision before production traffic shifts to it. If this
   * is configured then `trafficShifting` is automatically set to true.
   *
   * If omitted, no test route is created.
   */
  readonly testTraffic?: TestTraffic;
}

export class AlbServiceRoute extends pulumi.ComponentResource implements ServiceRoute {
  /**
   * The ARN of the primary target group. When using blue/green, canary, or linear deployments, this
   * is the target group that initially receives production traffic.
   *
   * When traffic shifting is enabled, ECS manages which target group receives production traffic.
   * In that case, this ARN does not necessarily identify the group serving the current production
   * version
   */
  public readonly targetGroupArn: pulumi.Output<string>;

  /**
   * The ARN of the second target group used for ECS blue/green, canary, or linear deployments. ECS
   * registers the new revision's tasks with the appropriate group and manages traffic routing
   * during deployment. This group is not permanently reserved for test traffic
   *
   * Only defined when traffic shifting is enabled
   */
  public readonly alternateTargetGroupArn?: pulumi.Output<string>;

  /**
   * The ARN of the listener rule that selects and forwards production requests.
   *
   * The rule uses the production match conditions at priority 200. When traffic shifting is enabled
   * and no production conditions are supplied, it matches all paths. ECS manages its target-group
   * weights during deployment
   *
   * Only present when production match conditions are supplied or traffic shifting is enabled,
   * otherwise production forwarding uses the listener's default action
   */
  public readonly productionListenerRuleArn?: pulumi.Output<string>;

  /**
   * The ARN of the listener rule that selects test requests using testTraffic.match
   *
   * The rule is evaluated at priority 100, before the production rule. During deployment, ECS
   * directs test requests to the new revision before shifting production traffic.
   *
   * Only defined when the test traffic is configured
   */
  public readonly testListenerRuleArn?: pulumi.Output<string>;

  /**
   * The ARN of the IAM role that ECS uses to manage target registration and load balancer routing
   * during traffic shifting.
   *
   * Only defined when traffic shifting is enabled
   */
  public readonly trafficShiftRoleArn?: pulumi.Output<string>;

  /**
   * The container port on which the ECS Service receives traffic from the load balancer.
   */
  public readonly targetPort: number;

  /**
   * The name of the container that will receive the traffic from the load balancer
   */
  public readonly targetContainerName?: string;

  /**
   * The Listener created on the Load Balancer for this route.
   */
  public readonly listener: aws.lb.Listener;
  constructor(
    name: string,
    args: AlbServiceRouteArgs,
    opts: pulumi.ComponentResourceOptions = {},
    /**
     * @internal
     */
    identity: ComponentIdentity = serviceRouteStandaloneIdentity,
  ) {
    const inputs = opts.urn ? {} : args;
    super(identity.type, name, inputs, pulumi.mergeOptions(opts, { aliases: identity.aliases }));
    this.targetPort = args.targetPort;
    this.targetContainerName = args.targetContainerName;

    const lb = aws.lb.getLoadBalancerOutput({ arn: args.loadBalancerArn }, { parent: this });
    const vpcId = lb.vpcId;

    const derivedListenerProtocol =
      args.certificateArns && args.certificateArns.length > 0
        ? ApplicationProtocol.HTTPS
        : ApplicationProtocol.HTTP;

    const [listenerProtocol, listenerPort] = determineProtocolAndPort(
      derivedListenerProtocol,
      args.listenerPort,
    );
    if (listenerProtocol === undefined || listenerPort === undefined) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'listenerPort',
        reason: "At least one of 'port' or 'protocol' is required",
      });
    }

    if (
      args.targetHealthCheck?.healthyHttpCodes !== undefined &&
      args.targetHealthCheck?.healthGrpcCodes !== undefined
    ) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'targetHealthCheck',
        reason: 'Only one of healthyHttpCodes and healthGrpcCodes can be provided',
      });
    }

    if (
      args.targetProtocolVersion === ApplicationProtocolVersion.GRPC &&
      args.targetHealthCheck?.healthyHttpCodes
    ) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'targetHealthCheck.healthyHttpCodes',
        reason:
          'healthyHttpCodes should not be used when protocolVersion is GRPC. Use healthGrpcCodes instead',
      });
    }
    if (
      args.targetProtocolVersion !== ApplicationProtocolVersion.GRPC &&
      args.targetHealthCheck?.healthGrpcCodes
    ) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'targetHealthCheck.healthGrpcCodes',
        reason:
          'healthGrpcCodes should not be used when protocolVersion is HTTP. Use healthyHttpCodes instead',
      });
    }
    if (args.trafficShifting === false && args.testTraffic) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'testTraffic',
        reason: 'testTraffic is only valid with trafficShifting is enabled',
      });
    }
    const trafficShifting = args.trafficShifting || args.testTraffic !== undefined;

    const mainTargetGroup = this.createTargetGroup(name, 'main', vpcId, args);
    this.targetGroupArn = mainTargetGroup.arn;
    let alternateTargetGroup: aws.lb.TargetGroup | undefined = undefined;
    let trafficShiftRole: aws.iam.Role | undefined = undefined;
    if (trafficShifting) {
      alternateTargetGroup = this.createTargetGroup(name, 'alternate', vpcId, args);
      this.alternateTargetGroupArn = alternateTargetGroup.arn;

      trafficShiftRole = new aws.iam.Role(
        `${name}-traffic-shift-role`,
        {
          assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(aws.iam.Principals.EcsPrincipal),
        },
        { parent: this },
      );
      this.trafficShiftRoleArn = trafficShiftRole.arn;
    }

    const conditions = this.renderConditions(args.match ?? {});
    const testConditions = this.renderConditions(args.testTraffic?.match ?? {}, 'testTraffic');
    const defaultActions: aws.types.input.lb.ListenerDefaultAction[] = [];
    if (conditions.length === 0 && !trafficShifting) {
      defaultActions.push({
        type: 'forward',
        order: 1,
        forward: {
          targetGroups: [
            {
              arn: mainTargetGroup.arn,
            },
          ],
        },
      });
    } else {
      defaultActions.push({
        type: 'fixed-response',
        fixedResponse: {
          statusCode: '404',
          contentType: 'text/plain',
          messageBody: 'Not found',
        },
      });
      if (conditions.length === 0) {
        // then we have testConditions, but not main conditions. Create the default main match all condition
        conditions.push({
          pathPattern: { values: ['/*'] },
        });
      }
    }

    if (args.sslPolicy && listenerProtocol !== ApplicationProtocol.HTTPS) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'sslPolicy',
        reason: 'sslPolicy should only be provided if the listenerProtocol is HTTPS',
      });
    }

    const mainCertificate =
      args.certificateArns && args.certificateArns.length > 0 ? args.certificateArns[0] : undefined;
    this.listener = new aws.lb.Listener(
      `${name}-listener`,
      {
        loadBalancerArn: args.loadBalancerArn,
        certificateArn: mainCertificate,
        protocol: listenerProtocol,
        port: listenerPort,
        // TODO: we need to track defaults like this. Because we want to be able to change "Recommanded"
        sslPolicy:
          listenerProtocol === ApplicationProtocol.HTTPS
            ? (args.sslPolicy ?? SslPolicy.RECOMMENDED)
            : undefined,
        defaultActions,
      },
      { parent: this },
    );

    if (args.certificateArns && args.certificateArns.length > 1) {
      args.certificateArns.slice(1).forEach((certificateArn, idx) => {
        new aws.lb.ListenerCertificate(
          `${name}-certificate-${idx}`,
          {
            listenerArn: this.listener.arn,
            certificateArn: certificateArn,
          },
          { parent: this },
        );
      });
    }

    let ruleIgnoreChanges: string[] | undefined = undefined;
    const initialTargets: aws.types.input.lb.ListenerRuleActionForwardTargetGroup[] = [
      {
        arn: mainTargetGroup.arn,
        weight: trafficShifting ? 1 : undefined,
      },
    ];
    if (alternateTargetGroup) {
      // see https://www.pulumi.com/docs/iac/concepts/resources/options/ignorechanges/#how-ignorechanges-works
      ruleIgnoreChanges = ['actions[*].forward.targetGroups[*].weight'];
      initialTargets.push({
        arn: alternateTargetGroup.arn,
        weight: 0,
      });
    }

    if (conditions.length > 0) {
      const productionListenerRule = new aws.lb.ListenerRule(
        `${name}-listener-rule`,
        {
          listenerArn: this.listener.arn,
          priority: 200,
          conditions,
          actions: [
            {
              type: 'forward',
              forward: {
                targetGroups: initialTargets,
              },
            },
          ],
        },
        {
          parent: this,
          ignoreChanges: ruleIgnoreChanges,
        },
      );
      this.productionListenerRuleArn = productionListenerRule.arn;
    }
    if (testConditions.length > 0) {
      const testListenerRule = new aws.lb.ListenerRule(
        `${name}-listener-rule-test`,
        {
          listenerArn: this.listener.arn,
          priority: 100,
          conditions: testConditions,
          actions: [
            {
              type: 'forward',
              forward: {
                targetGroups: initialTargets,
              },
            },
          ],
        },
        {
          parent: this,
          ignoreChanges: ruleIgnoreChanges,
        },
      );
      this.testListenerRuleArn = testListenerRule.arn;
    }

    if (trafficShiftRole) {
      new aws.iam.RolePolicy(
        `${name}-traffic-shift-role-policy`,
        {
          role: trafficShiftRole.name,
          policy: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: [
                  'elasticloadbalancing:DescribeListeners',
                  'elasticloadbalancing:DescribeRules',
                  'elasticloadbalancing:DescribeTargetGroups',
                  'elasticloadbalancing:DescribeTargetHealth',
                ],
                Resource: '*',
              },
              {
                Effect: 'Allow',
                Action: [
                  'elasticloadbalancing:RegisterTargets',
                  'elasticloadbalancing:DeregisterTargets',
                ],
                Resource: [
                  this.targetGroupArn,
                  ...(this.alternateTargetGroupArn ? [this.alternateTargetGroupArn] : []),
                ],
              },
              {
                Sid: 'ALBModifyListeners',
                Effect: 'Allow',
                Action: 'elasticloadbalancing:ModifyListener',
                Resource: [this.listener.arn],
              },
              {
                Sid: 'ALBModifyRules',
                Effect: 'Allow',
                Action: 'elasticloadbalancing:ModifyRule',
                Resource: [
                  // If we get here we will always have a productionListenerRuleArn
                  this.productionListenerRuleArn!,
                  ...(this.testListenerRuleArn ? [this.testListenerRuleArn] : []),
                ],
              },
            ],
          },
        },
        { parent: this },
      );
    }
    this.registerOutputs({
      targetPort: this.targetPort,
      targetGroupArn: this.targetGroupArn,
      alternateTargetGroupArn: this.alternateTargetGroupArn,
      testListenerRuleArn: this.testListenerRuleArn,
      productionListenerRuleArn: this.productionListenerRuleArn,
      trafficShiftRoleArn: this.trafficShiftRoleArn,
      listener: this.listener,
      targetContainerName: this.targetContainerName,
    });
  }

  /**
   * Create a target group
   *
   * @param componentName The `name` of the parent component
   * @param targetGroupName An identifier to append to the name argument to uniquely identify the
   *   group from other groups created by this method
   * @param vpcId The id of the VPC to create the target group in
   * @param args The Component args
   * @returns The target group
   */
  private createTargetGroup(
    componentName: string,
    targetGroupName: string,
    vpcId: pulumi.Output<string>,
    args: AlbServiceRouteArgs,
  ): aws.lb.TargetGroup {
    return new aws.lb.TargetGroup(
      `${componentName}-target-group-${targetGroupName}`,
      {
        protocol: args.targetProtocol ?? ApplicationProtocol.HTTP,
        protocolVersion: args.targetProtocolVersion,
        port: args.targetPort,
        vpcId: vpcId,
        healthCheck: args.targetHealthCheck
          ? {
              protocol: args.targetHealthCheck.protocol,
              healthyThreshold: args.targetHealthCheck.healthyThreshold,
              interval: args.targetHealthCheck.intervalSeconds,
              matcher:
                args.targetHealthCheck.healthyHttpCodes ?? args.targetHealthCheck.healthGrpcCodes,
              path: args.targetHealthCheck.path,
              port:
                args.targetHealthCheck.port === undefined
                  ? undefined
                  : pulumi.interpolate`${args.targetHealthCheck.port}`,
              timeout: args.targetHealthCheck.timeoutSeconds,
              unhealthyThreshold: args.targetHealthCheck.unhealthyThreshold,
            }
          : undefined,
        targetType: 'ip',
      },
      { parent: this },
    );
  }

  /**
   * Render and check string match conditions
   *
   * @param propertyPath Property Path to use in any error messages
   * @param condition The condition to render and check
   * @returns The rendered condition which can be used in the aws resource
   */
  private renderStringMatchCondition(
    propertyPath: string,
    condition: StringMatch,
  ): {
    regexValues?: pulumi.Input<pulumi.Input<string>[] | undefined>;
    values?: pulumi.Input<pulumi.Input<string>[] | undefined>;
  } {
    if ((condition.values ?? []).length !== 0 && (condition.regexValues ?? []).length !== 0) {
      throw new pulumi.InputPropertyError({
        propertyPath,
        reason: 'Only one of "values" or "regexValues" can be provided',
      });
    }
    if ((condition.values ?? []).length === 0 && (condition.regexValues ?? []).length === 0) {
      throw new pulumi.InputPropertyError({
        propertyPath,
        reason: 'One of "values" or "regexValues" must be provided',
      });
    }

    if (condition.values && condition.values.length === 0) {
      throw new pulumi.InputPropertyError({
        propertyPath: `${propertyPath}.values`,
        reason: 'values must be a non-empty list',
      });
    }

    if (condition.regexValues && condition.regexValues.length === 0) {
      throw new pulumi.InputPropertyError({
        propertyPath: `${propertyPath}.regexValues`,
        reason: 'regexValues must be a non-empty list',
      });
    }
    return {
      values: condition.values,
      regexValues: condition.regexValues,
    };
  }

  /**
   * Render listener rule conditions.
   *
   * @param match The conditions to render
   * @param propertyPathPrefix An optional prefix to provide with error message property paths
   * @returns Low level aws type that can be provided to the resource
   */
  private renderConditions(
    match: ListenerConditions,
    propertyPathPrefix?: string,
  ): aws.types.input.lb.ListenerRuleCondition[] {
    const prefix = propertyPathPrefix ? `${propertyPathPrefix}.` : '';
    const conditions: aws.types.input.lb.ListenerRuleCondition[] = [];
    if (match?.headers) {
      conditions.push(
        ...match.headers.flatMap((header, idx) => {
          return {
            httpHeader: {
              httpHeaderName: header.name,
              ...this.renderStringMatchCondition(`${prefix}match.headers[${idx}]`, {
                regexValues: header.regexValues,
                values: header.values,
              }),
            },
          };
        }),
      );
    }
    if (match?.hostnames) {
      conditions.push({
        hostHeader: this.renderStringMatchCondition('match.hostnames', {
          regexValues: match.hostnames.regexValues,
          values: match.hostnames.values,
        }),
      });
    }
    if (match?.methods) {
      conditions.push({
        httpRequestMethod: {
          values: match.methods,
        },
      });
    }
    if (match?.pathPatterns) {
      conditions.push({
        pathPattern: this.renderStringMatchCondition('match.pathPatterns', {
          values: match.pathPatterns.values,
          regexValues: match.pathPatterns.regexValues,
        }),
      });
    }
    if (match?.queryStrings) {
      conditions.push({
        queryStrings: match.queryStrings,
      });
    }
    return conditions;
  }
}

/**
 * Given a protocol and a port, try to guess the other one if it's undefined
 *
 * @param protocol The protocol if defined
 * @param port The port if defined
 * @returns The derived protocol and port
 */
export function determineProtocolAndPort(
  protocol: ApplicationProtocol | undefined,
  port: number | undefined,
): [ApplicationProtocol | undefined, number | undefined] {
  if (protocol === undefined && port === undefined) {
    return [undefined, undefined];
  }

  if (protocol === undefined) {
    protocol = defaultProtocolForPort(port!);
  }
  if (port === undefined) {
    port = defaultPortForProtocol(protocol!);
  }

  return [protocol, port];
}

/**
 * Return the appropriate default protocol for a given port
 *
 * @param port The port to derive a protocol from
 * @returns The derived protocol
 */
export function defaultProtocolForPort(port: number): ApplicationProtocol {
  switch (port) {
    case 80:
    case 8000:
    case 8008:
    case 8080:
      return ApplicationProtocol.HTTP;

    case 443:
    case 8443:
      return ApplicationProtocol.HTTPS;

    default:
      throw new pulumi.InputPropertyError({
        propertyPath: 'listenerPort',
        reason: `Don't know default protocol for port: ${port}; please supply a protocol`,
      });
  }
}

/**
 * Return the appropriate default port for a given protocol
 *
 * @param proto The protocol to derive a port from
 * @returns The derived port
 */
export function defaultPortForProtocol(proto: ApplicationProtocol): number {
  switch (proto) {
    case ApplicationProtocol.HTTP:
      return 80;
    case ApplicationProtocol.HTTPS:
      return 443;
    default:
      throw new pulumi.InputPropertyError({
        propertyPath: 'protocol',
        reason: `Unrecognized protocol: ${proto}`,
      });
  }
}
