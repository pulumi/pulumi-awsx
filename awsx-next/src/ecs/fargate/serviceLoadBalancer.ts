import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

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
   * Default - `/` for HTTP/1 and HTTP/2, or `/AWS.ALB/healthcheck` for gRPC.
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
   * Default - ApplicationProtocol.HTTP.
   */
  protocol?: ApplicationProtocol;

  /**
   * Amount of time in seconds to wait before a health check times out. Range: 2-120 seconds.
   *
   * Default - 5 seconds
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
   * The ARN of the application listener to attach a production forwarding rule to. The listener's
   * frontend access, certificates, and default action are not modified.
   */
  readonly listenerArn: pulumi.Input<string>;

  /**
   * The available priority for the production rule, from 1 to 50000.
   *
   * If you add multiple load balancer attachments you must ensure the priorities are unique
   */
  readonly priority: number;

  /**
   * Conditions selecting production requests. When omitted, a path rule matches all requests. An
   * explicitly empty configuration is not allowed.
   *
   * Default - Match the path pattern `/*`.
   */
  readonly match?: ListenerConditions;

  /**
   * Health checks used by the Load Balancer to determine whether the ECS Service target can receive
   * traffic.
   *
   * Default - HTTP on the target's traffic port, every 30 seconds with a 5-second timeout. Healthy
   * and unhealthy thresholds are both 3. The default path is `/` with success code `200`, or
   * `/AWS.ALB/healthcheck` with success code `12` for gRPC.
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

export interface ServiceLoadBalancer {
  /**
   * Application Load Balancer attachment for a named service endpoint. Creates target groups and
   * forwarding rules on a caller-managed listener.
   *
   * An application configuration must be provided for each entry in the service's
   * loadBalancerAttachments map.
   */
  readonly application: ApplicationServiceLoadBalancer;
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
  /**
   * Optional service-wide validation that must finish before forwarding rules can be created.
   */
  readonly listenerRuleValidation?: pulumi.Input<void>;
}

export interface RequiredIngress {
  sourceGroupId: pulumi.Input<string>;
  port: number;
}

/**
 * Internal construction result consumed by the service.
 */
export interface CreatedApplicationServiceAttachment {
  readonly serviceBinding: aws.types.input.ecs.ServiceLoadBalancer;
  readonly readyDependencies: pulumi.Resource[];
  readonly requiredIngress: RequiredIngress[];
}

/**
 * Creates the routing resources for one named application load-balancer attachment. The caller owns
 * task-port validation, service networking, and service registration.
 *
 * @param name The service component's logical name.
 * @param attachmentName The stable key of the attachment in loadBalancerAttachments.
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
  const propertyPath = `loadBalancerAttachments.${attachmentName}.application`;
  const opts = { parent: context.parent };
  const fail: (property: string, reason: string) => never = (property, reason) => {
    throw new pulumi.InputPropertyError({
      propertyPath: property ? `${propertyPath}.${property}` : propertyPath,
      reason,
    });
  };

  if (!args.listenerArn) {
    fail('listenerArn', 'A listener ARN must be provided');
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

  if (!Number.isInteger(args.priority) || args.priority < 1 || args.priority > 50000) {
    fail('priority', 'The rule priority must be an integer between 1 and 50000');
  }
  const conditions = renderConditions(
    args.match ?? { pathPatterns: { values: ['/*'] } },
    `${propertyPath}.match`,
  );
  if (conditions.length === 0) {
    fail('match', 'At least one condition is required for a listener rule');
  }

  const listener = aws.lb.getListenerOutput(
    { arn: args.listenerArn, region: context.region },
    opts,
  );
  const loadBalancer = aws.lb.getLoadBalancerOutput(
    { arn: listener.loadBalancerArn, region: context.region },
    opts,
  );
  const vpcId = pulumi
    .all([loadBalancer.vpcId, listener.protocol])
    .apply(([id, listenerProtocol]) => {
      validateTargetProtocolVersion(
        args.targetProtocolVersion,
        listenerProtocol,
        `${propertyPath}.targetProtocolVersion`,
      );
      return id;
    });

  const targetGroupArgs: aws.lb.TargetGroupArgs = {
    namePrefix: 'tg-',
    tags: { Name: `${resourceName}-target-main` },
    region: context.region,
    vpcId,
    targetType: 'ip',
    port: args.containerPort,
    protocol: args.targetProtocol ?? ApplicationProtocol.HTTP,
    protocolVersion: args.targetProtocolVersion,
    // Always supply the block so provider defaults apply consistently, including 3/3 thresholds.
    healthCheck: {
      protocol: healthCheck?.protocol,
      healthyThreshold: healthCheck?.healthyThreshold,
      unhealthyThreshold: healthCheck?.unhealthyThreshold,
      interval: healthCheck?.intervalSeconds,
      timeout: healthCheck?.timeoutSeconds,
      matcher: healthCheck?.healthyHttpCodes ?? healthCheck?.healthGrpcCodes,
      path: healthCheck?.path,
      port: healthCheck?.port === undefined ? undefined : `${healthCheck.port}`,
    },
  };
  const targetGroup = new aws.lb.TargetGroup(`${resourceName}-target-main`, targetGroupArgs, opts);
  const targets: aws.types.input.lb.ListenerRuleActionForwardTargetGroup[] = [
    { arn: targetGroup.arn },
  ];
  const ports = [
    ...new Set([args.containerPort, args.targetHealthCheck?.port ?? args.containerPort]),
  ];
  const sourceGroupId = loadBalancer.securityGroups.apply((groups) => groups[0]!);
  const requiredIngress = ports.map((port) => ({ sourceGroupId, port }));

  const productionRule = new aws.lb.ListenerRule(
    `${resourceName}-listener-rule`,
    {
      region: context.region,
      listenerArn: pulumi
        .output({ arn: listener.arn, validation: context.listenerRuleValidation })
        .apply(({ arn }) => arn),
      priority: args.priority,
      conditions,
      actions: [{ type: 'forward', forward: { targetGroups: targets } }],
    },
    opts,
  );

  return {
    serviceBinding: {
      containerName: args.containerName,
      containerPort: args.containerPort,
      targetGroupArn: targetGroup.arn,
    },
    readyDependencies: [productionRule],
    requiredIngress,
  };
}

interface NamedIngressSource {
  readonly attachmentName: string;
  readonly sourceGroupId: string;
}

/**
 * Resolves the single ALB source group supported by automatic ingress on a task port.
 *
 * @param port The application or health-check port.
 * @param sources The resolved ingress sources requested by attachments on this port.
 * @returns The shared source security-group ID.
 */
export function resolveIngressSourceGroup(
  port: number,
  sources: readonly NamedIngressSource[],
): string {
  const sourceGroupId = sources[0]!.sourceGroupId;
  if (sources.some((source) => source.sourceGroupId !== sourceGroupId)) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'manageIngress',
      reason:
        `Cannot automatically configure ingress for port ${port} from multiple ALB security groups ` +
        `(attachments: ${sources.map((source) => source.attachmentName).join(', ')}). ` +
        'Set manageIngress: false, supply securityGroupIds, and create the required standalone ' +
        'ingress rules independently of this component.',
    });
  }
  return sourceGroupId;
}

interface ListenerRulePriority {
  readonly attachmentName: string;
  readonly listenerArn: string;
  readonly priority: number;
}

/**
 * Validates production priorities after listener ARNs have resolved.
 *
 * @param rules The resolved listener rules requested by this service.
 */
export function validateListenerRulePriorities(rules: readonly ListenerRulePriority[]): void {
  const prioritiesByListener = new Map<string, Map<number, string>>();
  for (const { attachmentName, listenerArn, priority } of rules) {
    const priorities = prioritiesByListener.get(listenerArn) ?? new Map<number, string>();
    const owner = priorities.get(priority);
    if (owner !== undefined) {
      throw new pulumi.InputPropertyError({
        propertyPath: `loadBalancerAttachments.${attachmentName}.application.priority`,
        reason:
          `Attachments "${owner}" and "${attachmentName}" both use priority ${priority} ` +
          `on listener ${listenerArn}. Choose a different priority for each rule on the same listener.`,
      });
    }
    priorities.set(priority, attachmentName);
    prioritiesByListener.set(listenerArn, priorities);
  }
}

/**
 * Checks the listener requirement for HTTP/2 and gRPC backend connections.
 *
 * @param version The requested backend protocol version.
 * @param listenerProtocol The resolved frontend listener protocol.
 * @param propertyPath The public input path used in the diagnostic.
 */
export function validateTargetProtocolVersion(
  version: ApplicationProtocolVersion | undefined,
  listenerProtocol: string,
  propertyPath: string,
): void {
  if ((version === 'HTTP2' || version === 'GRPC') && listenerProtocol !== 'HTTPS') {
    throw new pulumi.InputPropertyError({
      propertyPath,
      reason: 'HTTP_2 and GRPC require an HTTPS listener',
    });
  }
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
