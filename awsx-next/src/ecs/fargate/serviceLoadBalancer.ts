import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

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
}

export interface ExistingServiceApplicationListener {
  /**
   * The ARN of the application listener to read and attach a forwarding rule to.
   */
  readonly listenerArn: pulumi.Input<string>;

  /**
   * The available priority for the production rule, from 1 to 50000.
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
   * If true, adds rules to the Load Balancer SecurityGroup allowing public IPv4 (0.0.0.0/0) and
   * IPv6 (::/0) access on the listenerPort. Both rules are created regardless of the ALB's current
   * IP address type, so switching to dual-stack does not require changing this configuration.
   *
   * Creates standalone ingress rules on the ALB security group. Do not enable this when that
   * group's ingress is managed through inline SecurityGroup.ingress rules, because the two
   * ownership models conflict. In that case, configure public access where the security group is
   * managed and leave open false.
   *
   * Only one attachment may open a given security-group/port pair. If the security group already
   * permits public access on this port, leave this false; existing rules are not adopted.
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
  /**
   * Application Load Balancer attachment for a named service endpoint. Creates target groups and
   * listener routing for the service's deployment strategy, using a dedicated or existing
   * listener.
   *
   * An application configuration must be provided for each entry in the service's loadBalancer map.
   */
  readonly application?: ApplicationServiceLoadBalancer;
}

export interface ApplicationServiceAttachmentContext {
  /**
   * The service component that owns all attachment resources and lookups.
   */
  readonly parent: pulumi.Resource;
  /**
   * Region selected by the service, or the inherited provider region when omitted.
   */
  readonly region?: string;
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
  readonly publicIngress?: {
    readonly securityGroupId: pulumi.Output<string>;
    readonly port: number;
  };
}

/**
 * Creates the routing resources for one named application load-balancer attachment. The caller owns
 * task-port validation, service networking, and service registration.
 *
 * @param name The service component's logical name.
 * @param attachmentName The stable key of the attachment in loadBalancer.
 * @param args The attachment's public configuration.
 * @param context The owning component and selected region.
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

  const conditions = renderConditions(
    existing?.match ?? args.listener?.match ?? {},
    `${propertyPath}.${existing ? 'existingListener' : 'listener'}.match`,
  );
  if (existing && conditions.length === 0) {
    fail('existingListener.match', 'At least one condition is required for an existing listener');
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
        context.region
          ? pulumi.interpolate`${existing.listenerArn}@${context.region}`
          : existing.listenerArn,
        undefined,
        opts,
      )
    : undefined;
  const loadBalancer = aws.lb.getLoadBalancerOutput(
    {
      arn: existingListener ? existingListener.loadBalancerArn : dedicated!.loadBalancerArn,
      region: context.region,
    },
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
    region: context.region,
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
  const targets: aws.types.input.lb.ListenerRuleActionForwardTargetGroup[] = [
    { arn: targetGroup.arn },
  ];
  const listener =
    existingListener ??
    new aws.lb.Listener(
      `${resourceName}-listener`,
      {
        region: context.region,
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
        { listenerArn: listener.arn, certificateArn, region: context.region },
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

  const productionRule =
    conditions.length > 0
      ? new aws.lb.ListenerRule(
          `${resourceName}-listener-rule`,
          {
            region: context.region,
            listenerArn: listener.arn,
            priority: productionPriority,
            conditions,
            actions: [{ type: 'forward', forward: { targetGroups: targets } }],
          },
          opts,
        )
      : undefined;
  if (productionRule) {
    readyDependencies.push(productionRule);
  }

  return {
    serviceBinding: {
      containerName: args.containerName,
      containerPort: args.containerPort,
      targetGroupArn: targetGroup.arn,
    },
    readyDependencies,
    requiredIngress,
    publicIngress: dedicated?.open ? { securityGroupId: firstGroup, port } : undefined,
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
