import * as pulumi from '@pulumi/pulumi';
import * as native from '@pulumi/aws-native';
import type { ComponentIdentity } from '../componentIdentity';

/**
 * Who authorizes requests to the endpoint.
 */
export enum WebFunctionAuthType {
  /**
   * Lambda checks that the caller has permission to invoke this endpoint using AWS credentials.
   */
  IAM = 'IamAuth',
  /**
   * Anyone can reach the app at this URL. The app decides whether to require a login or token.
   */
  APPLICATION_MANAGED = 'ApplicationManaged',
}

/**
 * How the endpoint serves traffic across AWS Regions.
 */
export enum WebFunctionEndpointType {
  /**
   * Serve traffic from the function's home Region only.
   */
  HOME_REGION = 'HomeRegion',
  /**
   * Serve traffic at one global URL. Lambda routes callers by latency, without health-based
   * failover.
   */
  MULTI_REGION = 'MultiRegion',
  /**
   * Get a URL for each serving Region and decide how to route callers yourself.
   */
  PER_REGION = 'PerRegion',
}

/**
 * A revision to receive traffic on the endpoint.
 */
export interface WebFunctionRevisionWeight {
  /**
   * ID of a published revision of the endpoint's function.
   */
  revisionId: pulumi.Input<string>;

  /**
   * Integer percentage of traffic to send to this revision.
   *
   * Default - 100 for a single revision. Required for each entry when splitting traffic.
   */
  weight?: pulumi.Input<number>;
}

/**
 * HTTPS access and routing configuration for a Lambda Web Function.
 */
export interface WebFunctionEndpointArgs {
  /**
   * Name of the Web Function to serve.
   */
  functionName: pulumi.Input<string>;

  /**
   * Choose `IamAuth` to let Lambda check whether the caller has permission. Choose
   * `ApplicationManaged` to let anyone reach your app and handle access in your own code.
   */
  authType: pulumi.Input<WebFunctionAuthType>;

  /**
   * Choose which revisions receive traffic.
   *
   * To send all traffic to the app's current revision:
   *
   * ```ts
   * [{ revisionId: app.revisionId }];
   * ```
   *
   * To send 10% of traffic to a candidate revision:
   *
   * ```ts
   * [
   *   { revisionId: stableId, weight: 90 },
   *   { revisionId: candidateId, weight: 10 },
   * ];
   * ```
   *
   * When splitting traffic, use positive whole-number percentages that add up to 100.
   */
  revisions: pulumi.Input<pulumi.Input<WebFunctionRevisionWeight>[]>;

  /**
   * Physical endpoint name.
   *
   * Default - Automatically named by the AWS Native provider.
   */
  endpointName?: pulumi.Input<string>;

  /**
   * HomeRegion serves only the function's home Region. MultiRegion uses a single global URL with
   * latency-based routing. PerRegion exposes a separate URL for each serving Region. Changing the
   * endpoint type replaces the endpoint and can change its URLs.
   *
   * Default - HomeRegion.
   */
  endpointType?: pulumi.Input<WebFunctionEndpointType>;

  /**
   * For `MultiRegion` or `PerRegion`, list at least one AWS Region besides the function's home
   * Region. Lambda includes the home Region automatically.
   *
   * Adding or removing a serving Region requires a new endpoint with new URLs. The Web Function and
   * its revisions stay in place. To keep serving traffic during the move, create a second endpoint
   * and switch clients to it before removing the first one.
   *
   * Default - No additional Regions.
   */
  regions?: pulumi.Input<pulumi.Input<string>[]>;

  /**
   * Maximum concurrent execution environments for the endpoint, from 2 through 10,000.
   *
   * Default - No endpoint-specific cap; your account's vCPU quota applies.
   */
  maxEnvironments?: pulumi.Input<number>;

  /**
   * Maximum requests per second for the endpoint. Use zero to reject all new requests. Otherwise
   * use 100 through 1,000 in steps of 100 or 2,000 through 10,000 in steps of 1,000, subject to
   * availability in your serving Regions.
   *
   * Default - No endpoint-specific cap; your account's rate limit quota applies.
   */
  requestsPerSecond?: pulumi.Input<number>;
}

/**
 * An HTTPS endpoint with explicit routing to published Lambda Web Function revisions.
 */
export class WebFunctionEndpoint extends pulumi.ComponentResource {
  /**
   * ARN of the endpoint. Use it to scope IAM invocation permissions.
   */
  public readonly endpointArn!: pulumi.Output<string>;

  /**
   * Hostname for a HomeRegion or MultiRegion endpoint, without `https://`. For PerRegion use
   * regionalDomainNames.
   */
  public readonly domainName!: pulumi.Output<string | undefined>;

  /**
   * Hostnames without `https://` for individual serving Regions, keyed by Region code.
   */
  public readonly regionalDomainNames!: pulumi.Output<Record<string, string>>;

  constructor(
    name: string,
    args: WebFunctionEndpointArgs,
    opts: pulumi.ComponentResourceOptions = {},
    identity: ComponentIdentity = { type: 'awsx-next:index:WebFunctionEndpoint', aliases: [] },
  ) {
    super(
      identity.type,
      name,
      opts.urn
        ? { endpointArn: undefined, domainName: undefined, regionalDomainNames: undefined }
        : args,
      pulumi.mergeOptions(opts, { aliases: identity.aliases }),
    );
    if (opts.urn) {
      return;
    }

    const endpointType = args.endpointType ?? WebFunctionEndpointType.HOME_REGION;
    const homeRegion =
      args.regions === undefined ? undefined : native.getRegionOutput({ parent: this }).region;
    const endpoint = new native.lambda.WebFunctionEndpoint(
      name,
      {
        functionName: args.functionName,
        endpointName: args.endpointName,
        authType: args.authType,
        endpointType,
        regions: pulumi
          .output({ homeRegion, endpointType, regions: args.regions })
          .apply((values) =>
            resolveRegions(values.homeRegion, values.endpointType, values.regions),
          ),
        revisionWeights: pulumi.output(args.revisions).apply(resolveRevisionWeights),
        // Send an empty config when a limit is removed. Omitting the config would leave the
        // old limit in effect.
        scalingConfig:
          args.maxEnvironments === undefined
            ? {}
            : {
                maxEnvironments: pulumi.output(args.maxEnvironments).apply(validateMaxEnvironments),
              },
        throttleConfig:
          args.requestsPerSecond === undefined
            ? {}
            : { rateLimit: pulumi.output(args.requestsPerSecond).apply(validateRequestsPerSecond) },
      },
      { parent: this },
    );

    this.endpointArn = endpoint.endpointArn;
    this.domainName = pulumi
      .all([endpoint.endpointType, endpoint.domainName])
      .apply(([type, domain]) =>
        type !== WebFunctionEndpointType.PER_REGION && domain ? domain : undefined,
      );
    this.regionalDomainNames = endpoint.regionalEndpoints.apply((regionalEndpoints) =>
      Object.fromEntries(
        Object.entries(regionalEndpoints ?? {}).flatMap(([region, regionalEndpoint]) =>
          regionalEndpoint.domainName ? [[region, regionalEndpoint.domainName]] : [],
        ),
      ),
    );
    this.registerOutputs({
      endpointArn: this.endpointArn,
      domainName: this.domainName,
      regionalDomainNames: this.regionalDomainNames,
    });
  }
}

/**
 * Normalize the serving Regions to a stable list of replicas. Lambda adds the home Region.
 *
 * @param homeRegion The Region of the endpoint's AWS Native provider.
 * @param endpointType The requested endpoint type.
 * @param regions Requested serving Regions.
 * @returns The sorted replica Regions, or undefined for a home-only endpoint.
 */
export function resolveRegions(
  homeRegion: string | undefined,
  endpointType: WebFunctionEndpointType,
  regions: string[] | undefined,
): string[] | undefined {
  const replicas = [...new Set(regions ?? [])].filter((region) => region !== homeRegion);
  // eslint-disable-next-line unicorn/no-array-sort -- The component targets ES2022.
  replicas.sort();
  if (endpointType === WebFunctionEndpointType.HOME_REGION) {
    if (replicas.length !== 0) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'regions',
        reason:
          'HomeRegion endpoints cannot serve additional Regions. Use MultiRegion or PerRegion.',
      });
    }
    return undefined;
  }
  if (replicas.length === 0) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'regions',
      reason:
        'MultiRegion and PerRegion endpoints require at least one Region other than the home Region.',
    });
  }
  return replicas;
}

/**
 * Strictly validate resolved routing and make every weight explicit for AWS.
 *
 * @param revisions The resolved routing entries.
 * @returns The routing entries with explicit weights.
 */
export function resolveRevisionWeights(
  revisions: { revisionId: string; weight?: number }[],
): { revisionId: string; weight: number }[] {
  if (revisions.length < 1 || revisions.length > 2) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'revisions',
      reason: 'Specify one revision or split traffic between two revisions.',
    });
  }

  const seen = new Set<string>();
  const weights = revisions.map(({ revisionId, weight }, index) => {
    if (revisionId.trim() === '' || seen.has(revisionId)) {
      throw new pulumi.InputPropertyError({
        propertyPath: `revisions[${index}].revisionId`,
        reason: 'Each revision ID must be nonempty and unique.',
      });
    }
    seen.add(revisionId);

    const percentage = weight === undefined && revisions.length === 1 ? 100 : weight;
    if (
      percentage === undefined ||
      !Number.isInteger(percentage) ||
      percentage < 1 ||
      percentage > 100
    ) {
      throw new pulumi.InputPropertyError({
        propertyPath: `revisions[${index}].weight`,
        reason:
          'Specify an integer weight from 1 through 100. Both weights are required when splitting traffic.',
      });
    }
    return { revisionId, weight: percentage };
  });

  if (weights.reduce((total, entry) => total + entry.weight, 0) !== 100) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'revisions',
      reason: 'Revision weights must total 100.',
    });
  }
  return weights;
}

/**
 * Validate the endpoint scaling cap.
 *
 * @param value The resolved maximum concurrent environments.
 * @returns The validated cap.
 */
function validateMaxEnvironments(value: number): number {
  if (!Number.isInteger(value) || value < 2 || value > 10_000) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'maxEnvironments',
      reason: 'Expected an integer from 2 through 10,000.',
    });
  }
  return value;
}

/**
 * Validate the endpoint request rate cap without assuming availability in any particular Region.
 *
 * @param value The resolved requests per second.
 * @returns The validated cap.
 */
function validateRequestsPerSecond(value: number): number {
  const smallLimit = value >= 100 && value <= 1_000 && value % 100 === 0;
  const largeLimit = value >= 2_000 && value <= 10_000 && value % 1_000 === 0;
  if (value !== 0 && !smallLimit && !largeLimit) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'requestsPerSecond',
      reason:
        'Expected 0, 100 through 1,000 in steps of 100, or 2,000 through 10,000 in steps of 1,000.',
    });
  }
  return value;
}
