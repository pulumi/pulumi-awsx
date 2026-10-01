import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

export enum DeploymentStrategy {
  ROLLING = 'ROLLING',
  BLUE_GREEN = 'BLUE_GREEN',
  CANARY = 'CANARY',
  LINEAR = 'LINEAR',
}
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
   * A rule is created on the production listener at priority 100 for a dedicated listener, or one
   * priority below existingListener.priority for an existing listener. Both priorities must be
   * available. The test rule is evaluated before the production rule.
   */
  readonly match: ListenerConditions;
}
export interface ApplicationServiceLoadBalancer {
  /**
   * The port that the ECS Service receives traffic from the load balancer. This should be the same
   * port used as the containerPort.
   *
   * Valid values between 1 and 65535
   */
  readonly containerPort: number;

  /**
   * The name of the container to route traffic to.
   */
  readonly containerName: string;

  /**
   * Creates a dedicated listener. Exactly one of listener or existingListener is required.
   */
  readonly listener?: ServiceApplicationListener;

  /**
   * Creates a forwarding rule on an existing listener without changing its default action or TLS
   * configuration. Exactly one of listener or existingListener is required.
   */
  readonly existingListener?: ExistingServiceApplicationListener;

  /**
   * Health checks used by the Load Balancer to determine whether the ECS Service target can receive
   * traffic.
   *
   * Default - Health checks use the target group's service/provider defaults.
   */
  readonly targetHealthCheck?: TargetGroupHealthCheck;

  /**
   * Protocol version used for requests from the load balancer to the ECS Service target. HTTP_2 and
   * GRPC require an HTTPS listener.
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
   * Routing for validating the new service revision before production traffic shifts to it.
   * Requires a blue/green, canary, or linear deployment strategy on the service.
   *
   * If omitted, no test route is created.
   */
  readonly testTraffic?: TestTraffic;
}

export interface ExistingServiceApplicationListener {
  /**
   * The ARN of the application listener to read and attach a forwarding rule to.
   */
  readonly listenerArn: pulumi.Input<string>;

  /**
   * The available priority for the production rule, from 1 to 50000. When testTraffic is provided,
   * this must be greater than 1 and the preceding priority must also be available for the test
   * rule.
   */
  readonly priority: number;

  /**
   * Conditions selecting production requests. At least one condition is required.
   */
  readonly match: ListenerConditions;
}
export interface ServiceApplicationListener {
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
   * If this is set to true then a rule will be added to the Load Balancer SecurityGroup that allows
   * public access on the listenerPort.
   *
   * Default - false
   */
  readonly open?: boolean;

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
}
export interface ServiceLoadBalancer {
  readonly application?: ApplicationServiceLoadBalancer;
}

export interface ApplicationServiceAttachmentContext {
  /**
   * The service component that owns all attachment resources and lookups.
   */
  readonly parent: pulumi.Resource;
  /**
   * The AWS deployment strategy already resolved by the service.
   */
  readonly strategy: DeploymentStrategy;

  /**
   * The security group that is attached to the ESC service. An ingress rule will be added allowing
   * traffic from the ABL
   *
   * If no securityGroupId is provided then no rules will be added. This should be used in the case
   * where the user supplied their own Security Group
   */
  readonly serviceSecurityGroupId?: pulumi.Input<string>;
}

export interface RequiredIngress {
  sourceGroupId: string;
  port: number;
}

/**
 * Internal construction result consumed by the service.
 */
export interface CreatedApplicationServiceAttachment {
  readonly serviceBinding: aws.types.input.ecs.ServiceLoadBalancer;
  readonly readyDependencies: pulumi.Resource[];
  readonly requiredIngress: pulumi.Output<RequiredIngress[]>;
}

/**
 * Creates the routing resources for one named application load-balancer attachment. The caller owns
 * task-port validation, service networking, and service registration.
 *
 * @param name The service component's logical name.
 * @param attachmentName The stable key of the attachment in loadBalancer.
 * @param args The attachment's public configuration.
 * @param context The owning component and resolved deployment strategy.
 * @returns The ECS binding, routing resources, and dependencies required before service creation.
 */
export function createApplicationServiceAttachment(
  name: string,
  attachmentName: string,
  args: ApplicationServiceLoadBalancer,
  context: ApplicationServiceAttachmentContext,
): CreatedApplicationServiceAttachment {
  const resourceName = `${name}-${attachmentName}`;
  const propertyPath = `loadBalancer.${attachmentName}.application`;
  const opts = { parent: context.parent };
  const fail: (property: string, reason: string) => never = (property, reason) => {
    throw new pulumi.InputPropertyError({
      propertyPath: property ? `${propertyPath}.${property}` : propertyPath,
      reason,
    });
  };

  if (!args.listener && !args.existingListener) {
    fail('', 'One of listener or existingListener must be provided');
  }

  if (args.listener && args.existingListener) {
    fail('', 'listener and existingListener cannot both be provided');
  }

  if (
    !Number.isInteger(args.containerPort) ||
    args.containerPort < 1 ||
    args.containerPort > 65535
  ) {
    fail('containerPort', 'The container port must be an integer between 1 and 65535');
  }

  const trafficShifting = context.strategy !== 'ROLLING';
  if (args.testTraffic && !trafficShifting) {
    fail(
      'testTraffic',
      'Test traffic requires a blue/green, canary, or linear deployment strategy',
    );
  }

  const healthCheck = args.targetHealthCheck;
  const grpc = args.targetProtocolVersion === ApplicationProtocolVersion.GRPC;
  if (healthCheck?.healthyHttpCodes !== undefined && healthCheck.healthGrpcCodes !== undefined) {
    fail('targetHealthCheck', 'Only one of healthyHttpCodes or healthGrpcCodes can be provided');
  }
  if (grpc && healthCheck?.healthyHttpCodes !== undefined) {
    fail(
      'targetHealthCheck.healthyHttpCodes',
      'Use healthGrpcCodes with the GRPC protocol version',
    );
  }
  if (!grpc && healthCheck?.healthGrpcCodes !== undefined) {
    fail('targetHealthCheck.healthGrpcCodes', 'healthGrpcCodes requires the GRPC protocol version');
  }

  const existing = args.existingListener;
  const productionPriority = existing?.priority ?? 200;
  if (
    !Number.isInteger(productionPriority) ||
    productionPriority < 1 ||
    productionPriority > 50000
  ) {
    fail('existingListener.priority', 'The rule priority must be an integer between 1 and 50000');
  }

  if (existing && args.testTraffic && productionPriority === 1) {
    fail('existingListener.priority', 'Test traffic requires a production priority greater than 1');
  }
  const conditions = renderConditions(
    existing?.match ?? args.listener?.match ?? {},
    `${propertyPath}.${existing ? 'existingListener' : 'listener'}.match`,
  );
  if (existing && conditions.length === 0) {
    fail('existingListener.match', 'At least one condition is required for an existing listener');
  }
  const testConditions = args.testTraffic
    ? renderConditions(args.testTraffic.match, `${propertyPath}.testTraffic.match`)
    : [];
  if (args.testTraffic && testConditions.length === 0) {
    fail('testTraffic.match', 'At least one condition is required for test traffic');
  }

  // If trafficShifting is enabled then we have to create a listener rule.
  // Create a default one that forwards everything
  if (trafficShifting && conditions.length === 0) {
    conditions.push({ pathPattern: { values: ['/*'] } });
  }

  const dedicated = args.listener;
  const certificates = dedicated?.certificateArns ?? [];
  const protocol = certificates.length > 0 ? ApplicationProtocol.HTTPS : ApplicationProtocol.HTTP;
  const port = dedicated?.listenerPort ?? (protocol === ApplicationProtocol.HTTPS ? 443 : 80);
  if (dedicated && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    fail('listener.listenerPort', 'The listener port must be an integer between 1 and 65535');
  }
  if (dedicated?.sslPolicy && protocol !== ApplicationProtocol.HTTPS) {
    fail(
      'listener.sslPolicy',
      'A TLS security policy requires certificateArns and an HTTPS listener',
    );
  }
  const requiresHttps = args.targetProtocolVersion === ApplicationProtocolVersion.HTTP_2 || grpc;
  if (dedicated && requiresHttps && protocol !== ApplicationProtocol.HTTPS) {
    fail('targetProtocolVersion', 'HTTP_2 and GRPC require an HTTPS listener');
  }

  const existingListener = existing
    ? aws.lb.Listener.get(
        `${resourceName}-existing-listener`,
        existing.listenerArn,
        undefined,
        opts,
      )
    : undefined;
  const loadBalancer = aws.lb.getLoadBalancerOutput(
    { arn: existingListener ? existingListener.loadBalancerArn : dedicated!.loadBalancerArn },
    opts,
  );
  const vpcId = pulumi
    .all([loadBalancer.vpcId, existingListener?.protocol ?? protocol])
    .apply(([id, listenerProtocol]) => {
      if (requiresHttps && listenerProtocol !== ApplicationProtocol.HTTPS) {
        fail('targetProtocolVersion', 'HTTP_2 and GRPC require an HTTPS listener');
      }
      return id;
    });

  const targetGroupArgs: aws.lb.TargetGroupArgs = {
    vpcId,
    targetType: 'ip',
    port: args.containerPort,
    protocol: args.targetProtocol ?? ApplicationProtocol.HTTP,
    protocolVersion: args.targetProtocolVersion,
    healthCheck: healthCheck
      ? {
          protocol: healthCheck.protocol,
          healthyThreshold: healthCheck.healthyThreshold,
          unhealthyThreshold: healthCheck.unhealthyThreshold,
          interval: healthCheck.intervalSeconds,
          timeout: healthCheck.timeoutSeconds,
          matcher: healthCheck.healthyHttpCodes ?? healthCheck.healthGrpcCodes,
          path: healthCheck.path,
          port: healthCheck.port === undefined ? undefined : `${healthCheck.port}`,
        }
      : undefined,
  };
  const targetGroup = new aws.lb.TargetGroup(`${resourceName}-target-main`, targetGroupArgs, opts);
  const alternateTargetGroup = trafficShifting
    ? new aws.lb.TargetGroup(`${resourceName}-target-alt`, targetGroupArgs, opts)
    : undefined;
  const targets: aws.types.input.lb.ListenerRuleActionForwardTargetGroup[] = [
    { arn: targetGroup.arn, weight: trafficShifting ? 1 : undefined },
    ...(alternateTargetGroup ? [{ arn: alternateTargetGroup.arn, weight: 0 }] : []),
  ];
  const listener =
    existingListener ??
    new aws.lb.Listener(
      `${resourceName}-listener`,
      {
        loadBalancerArn: dedicated!.loadBalancerArn,
        port,
        protocol,
        certificateArn: certificates[0],
        sslPolicy:
          protocol === ApplicationProtocol.HTTPS
            ? (dedicated!.sslPolicy ?? SslPolicy.RECOMMENDED)
            : undefined,
        defaultActions:
          conditions.length === 0
            ? [{ type: 'forward', forward: { targetGroups: targets } }]
            : [
                {
                  type: 'fixed-response',
                  fixedResponse: {
                    statusCode: '404',
                    contentType: 'text/plain',
                    messageBody: 'Not found',
                  },
                },
              ],
      },
      opts,
    );
  const readyDependencies: pulumi.Resource[] = [listener];
  certificates.slice(1).forEach((certificateArn, index) => {
    readyDependencies.push(
      new aws.lb.ListenerCertificate(
        `${resourceName}-certificate-${index}`,
        { listenerArn: listener.arn, certificateArn },
        opts,
      ),
    );
  });

  const ports = [
    ...new Set([args.containerPort, args.targetHealthCheck?.port ?? args.containerPort]),
  ];
  const firstGroup = loadBalancer.securityGroups.apply((groups) => {
    return groups[0]!;
  });
  const requiredIngress = loadBalancer.securityGroups.apply((groups) => {
    const group = groups[0]!;
    return ports.flatMap((p) => ({ sourceGroupId: group, port: p }));
  });

  if (args.listener?.open) {
    new aws.vpc.SecurityGroupIngressRule(
      `${resourceName}-alb-ingress-all`,
      {
        ipProtocol: 'tcp',
        securityGroupId: firstGroup,
        fromPort: listener.port,
        toPort: listener.port,
        cidrIpv4: '0.0.0.0/0',
      },
      opts,
    );
  }
  // ECS owns allocation between the two target groups after creation. Refresh before
  // subsequent updates so ignoreChanges retains the current allocation from state.
  const ruleOpts = {
    ...opts,
    ignoreChanges: trafficShifting ? ['actions[*].forward.targetGroups[*].weight'] : undefined,
  };

  const productionRule =
    conditions.length > 0
      ? new aws.lb.ListenerRule(
          `${resourceName}-listener-rule`,
          {
            listenerArn: listener.arn,
            priority: productionPriority,
            conditions,
            actions: [{ type: 'forward', forward: { targetGroups: targets } }],
          },
          ruleOpts,
        )
      : undefined;
  const testRule =
    testConditions.length > 0
      ? new aws.lb.ListenerRule(
          `${resourceName}-listener-rule-test`,
          {
            listenerArn: listener.arn,
            priority: existing ? productionPriority - 1 : 100,
            conditions: testConditions,
            actions: [{ type: 'forward', forward: { targetGroups: targets } }],
          },
          ruleOpts,
        )
      : undefined;

  if (productionRule) {
    readyDependencies.push(productionRule);
  }

  if (testRule) {
    readyDependencies.push(testRule);
  }

  let trafficShiftRole: aws.iam.Role | undefined;
  let advancedConfiguration:
    | aws.types.input.ecs.ServiceLoadBalancerAdvancedConfiguration
    | undefined;
  if (alternateTargetGroup && productionRule) {
    trafficShiftRole = new aws.iam.Role(
      `${resourceName}-traffic-shift-role`,
      {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(aws.iam.Principals.EcsPrincipal),
      },
      opts,
    );
    const policy = new aws.iam.RolePolicy(
      `${resourceName}-traffic-shift-role-policy`,
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
              Resource: [targetGroup.arn, alternateTargetGroup.arn],
            },
            {
              Effect: 'Allow',
              Action: 'elasticloadbalancing:ModifyRule',
              Resource: [productionRule.arn, ...(testRule ? [testRule.arn] : [])],
            },
          ],
        },
      },
      opts,
    );
    readyDependencies.push(policy);
    advancedConfiguration = {
      alternateTargetGroupArn: alternateTargetGroup.arn,
      productionListenerRule: productionRule.arn,
      testListenerRule: testRule?.arn,
      roleArn: trafficShiftRole.arn,
    };
  }

  return {
    serviceBinding: {
      containerName: args.containerName,
      containerPort: args.containerPort,
      targetGroupArn: targetGroup.arn,
      advancedConfiguration,
    },
    readyDependencies,
    requiredIngress,
    // targetGroup,
    // alternateTargetGroup,
    // listener,
    // productionRule,
    // testRule,
    // trafficShiftRole,
  };
}

/**
 * Validates and renders one value or regular-expression match.
 *
 * @param match The requested matching mode and alternatives.
 * @param propertyPath The public input path used for validation errors.
 * @returns The provider's matching properties.
 */
function renderStringMatch(
  match: StringMatch,
  propertyPath: string,
): { values?: pulumi.Input<string>[]; regexValues?: pulumi.Input<string>[] } {
  if ((match.values === undefined) === (match.regexValues === undefined)) {
    throw new pulumi.InputPropertyError({
      propertyPath,
      reason: 'Exactly one of values or regexValues must be provided',
    });
  }
  if ((match.values ?? match.regexValues)!.length === 0) {
    throw new pulumi.InputPropertyError({
      propertyPath,
      reason: 'The match list must not be empty',
    });
  }
  return { values: match.values, regexValues: match.regexValues };
}

/**
 * Converts application request conditions into provider listener-rule conditions.
 *
 * @param match The request conditions.
 * @param propertyPath The public input path used for validation errors.
 * @returns The conditions for a forwarding rule.
 */
function renderConditions(
  match: ListenerConditions,
  propertyPath: string,
): aws.types.input.lb.ListenerRuleCondition[] {
  const conditions: aws.types.input.lb.ListenerRuleCondition[] = [];
  if (match.hostnames) {
    conditions.push({
      hostHeader: renderStringMatch(match.hostnames, `${propertyPath}.hostnames`),
    });
  }
  if (match.pathPatterns) {
    conditions.push({
      pathPattern: renderStringMatch(match.pathPatterns, `${propertyPath}.pathPatterns`),
    });
  }
  for (const [index, header] of (match.headers ?? []).entries()) {
    conditions.push({
      httpHeader: {
        httpHeaderName: header.name,
        ...renderStringMatch(header, `${propertyPath}.headers[${index}]`),
      },
    });
  }
  if (match.methods) {
    if (match.methods.length === 0) {
      throw new pulumi.InputPropertyError({
        propertyPath: `${propertyPath}.methods`,
        reason: 'The method list must not be empty',
      });
    }
    conditions.push({ httpRequestMethod: { values: match.methods } });
  }
  if (match.queryStrings) {
    if (match.queryStrings.length === 0) {
      throw new pulumi.InputPropertyError({
        propertyPath: `${propertyPath}.queryStrings`,
        reason: 'The query-string list must not be empty',
      });
    }
    conditions.push({ queryStrings: match.queryStrings });
  }
  return conditions;
}
