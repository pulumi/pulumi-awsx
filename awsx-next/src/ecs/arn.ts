import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
/**
 * An enum representing the various ARN formats that different services use.
 */
export enum ArnFormat {
  /**
   * This represents a format where there is no 'resourceName' part. This format is used for S3
   * resources, like 'arn:aws:s3:::bucket'. Everything after the last colon is considered the
   * 'resource', even if it contains slashes, like in 'arn:aws:s3:::bucket/object.zip'.
   */
  NO_RESOURCE_NAME = 'arn:aws:service:region:account:resource',

  /**
   * This represents a format where the 'resource' and 'resourceName' parts are separated with a
   * colon. Like in: 'arn:aws:service:region:account:resource:resourceName'. Everything after the
   * last colon is considered the 'resourceName', even if it contains slashes, like in
   * 'arn:aws:apigateway:region:account:resource:/test/mydemoresource/*'.
   */
  COLON_RESOURCE_NAME = 'arn:aws:service:region:account:resource:resourceName',

  /**
   * This represents a format where the 'resource' and 'resourceName' parts are separated with a
   * slash. Like in: 'arn:aws:service:region:account:resource/resourceName'. Everything after the
   * separating slash is considered the 'resourceName', even if it contains colons, like in
   * 'arn:aws:cognito-sync:region:account:identitypool/us-east-1:1a1a1a1a-ffff-1111-9999-12345678:bla'.
   */
  SLASH_RESOURCE_NAME = 'arn:aws:service:region:account:resource/resourceName',

  /**
   * This represents a format where the 'resource' and 'resourceName' parts are separated with a
   * slash, but there is also an additional slash after the colon separating 'account' from
   * 'resource'. Like in: 'arn:aws:service:region:account:/resource/resourceName'. Note that the
   * leading slash is _not_ included in the parsed 'resource' part.
   */
  SLASH_RESOURCE_SLASH_RESOURCE_NAME = 'arn:aws:service:region:account:/resource/resourceName',
}

export interface ArnComponents {
  /**
   * The partition that the resource is in. For standard AWS regions, the partition is aws. If you
   * have resources in other partitions, the partition is aws-partitionname. For example, the
   * partition for resources in the China (Beijing) region is aws-cn.
   *
   * @default The AWS partition the resource is deployed to.
   */
  readonly partition?: string;

  /**
   * The service namespace that identifies the AWS product (for example, 's3', 'iam',
   * 'codepipeline').
   */
  readonly service: string;

  /**
   * The region the resource resides in. Note that the ARNs for some resources do not require a
   * region, so this component might be omitted.
   *
   * @default The region the resource is deployed to.
   */
  readonly region?: string;

  /**
   * The ID of the AWS account that owns the resource, without the hyphens. For example, 123456789012.
   * Note that the ARNs for some resources don't require an account number, so this component might
   * be omitted.
   *
   * @default The account the resource is deployed to.
   */
  readonly account?: string;

  /**
   * Resource type (e.g. "table", "autoScalingGroup", "certificate"). For some resource types, e.g.
   * S3 buckets, this field defines the bucket name.
   */
  readonly resource: string;

  /**
   * Resource name or path within the resource (i.e. S3 bucket object key) or a wildcard such as
   * `"*"`. This is service-dependent.
   */
  readonly resourceName?: string;

  /**
   * The specific ARN format to use for this ARN value.
   *
   * @default - uses value of `sep` as the separator for formatting,
   *   `ArnFormat.SLASH_RESOURCE_NAME` if that property was also not provided
   */
  readonly arnFormat?: ArnFormat;
}

/**
 * Utilities for working with ARNs. Adapted from
 * https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk-lib/core/lib/arn.ts
 */
export class Arn {
  /**
   * Splits the provided ARN into its components.
   *
   * @param arn The ARN to split into its components
   * @param arnFormat The expected format of 'arn' - depends on what format the service 'arn'
   *   represents uses
   * @param parent The resource to use as the parent in any any provider calls
   * @returns The components of the ARN
   */
  public static split(
    arn: pulumi.Input<string>,
    arnFormat: ArnFormat,
    parent?: pulumi.Resource,
  ): pulumi.Output<ArnComponents> {
    return aws.arnParseOutput(arn, { parent }).apply((parsed) => {
      const partition = parsed.partition;
      const service = parsed.service;
      const region = parsed.region;
      const account = parsed.accountId;
      const [resourceTypeOrName, ...rest] = parsed.resource.split(':');
      if (!resourceTypeOrName) {
        throw new Error('Expected ARN to have a resource');
      }

      let resource: string;
      let resourceName: string | undefined;
      let resourcePartStartIndex = 0;
      let detectedArnFormat: ArnFormat;

      let slashIndex = resourceTypeOrName.indexOf('/');
      if (slashIndex === 0) {
        // new-style ARNs are of the form 'arn:aws:s4:us-west-1:12345:/resource-type/resource-name'
        slashIndex = resourceTypeOrName.indexOf('/', 1);
        resourcePartStartIndex = 1;
        detectedArnFormat = ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME;
      }
      if (slashIndex !== -1) {
        // the slash is only a separator if ArnFormat is not NO_RESOURCE_NAME
        if (arnFormat === ArnFormat.NO_RESOURCE_NAME) {
          slashIndex = -1;
          detectedArnFormat = ArnFormat.NO_RESOURCE_NAME;
        } else {
          detectedArnFormat =
            resourcePartStartIndex === 0
              ? ArnFormat.SLASH_RESOURCE_NAME
              : // need to repeat this here, as otherwise the compiler thinks 'detectedArnFormat' is not initialized in all paths
                ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME;
        }
      } else if (rest.length > 0) {
        slashIndex = -1;
        detectedArnFormat = ArnFormat.COLON_RESOURCE_NAME;
      } else {
        detectedArnFormat = ArnFormat.NO_RESOURCE_NAME;
      }

      if (slashIndex !== -1) {
        resource = resourceTypeOrName.substring(resourcePartStartIndex, slashIndex);
        resourceName = resourceTypeOrName.substring(slashIndex + 1);
      } else {
        resource = resourceTypeOrName;
      }

      if (rest.length > 0) {
        if (!resourceName) {
          resourceName = '';
        } else {
          resourceName += ':';
        }

        resourceName += rest.join(':');
      }

      return {
        service: service,
        resource: resource,
        partition: partition,
        region,
        account,
        resourceName,
        arnFormat: detectedArnFormat,
      } satisfies ArnComponents;
    });
  }

  private constructor() {}
}
