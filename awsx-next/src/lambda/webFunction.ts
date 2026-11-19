import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as native from '@pulumi/aws-native';
import type { ComponentIdentity } from '../componentIdentity';

/**
 * Code and execution configuration for a Lambda Web Function.
 */
export interface WebFunctionArgs {
  /**
   * Runnable application files, including dependencies. FileArchive accepts a directory or an
   * existing archive.
   *
   * The runtime loads index.js at the package root unless AWS_LAMBDA_NODEJS_ENTRYPOINT names
   * another file. The application must start an HTTP server at the host and port supplied in
   * AWS_LAMBDA_HTTP_ENDPOINT.
   */
  code: pulumi.Input<pulumi.asset.Archive>;

  /**
   * Physical function name.
   *
   * Default - Automatically named by the AWS Native provider.
   */
  functionName?: pulumi.Input<string>;

  /**
   * Tags applied to the function and AWSX-created supporting resources that accept tags.
   *
   * Default - No additional tags.
   */
  tags?: Record<string, pulumi.Input<string>>;

  /**
   * Environment values included in each immutable revision. Pulumi secrets retain their Pulumi
   * secret tracking, but AWS receives the resolved values. This is not runtime secret retrieval and
   * does not prevent authorized AWS users from reading the configuration.
   *
   * Default - No application environment variables.
   */
  environmentVariables?: Record<string, pulumi.Input<string>>;

  /**
   * Maximum duration of an HTTP request, in seconds. Must be an integer from 3 through 900.
   *
   * Default - AWS default of 30 seconds.
   */
  timeoutSeconds?: pulumi.Input<number>;

  /**
   * Maximum concurrent requests per execution environment. Must be an integer from 1 through 128.
   *
   * Default - AWS default of 64.
   */
  maxConcurrencyPerEnvironment?: pulumi.Input<number>;

  /**
   * Execution role assumed by the application. A supplied role must be in the function's account,
   * trust lambda.amazonaws.com, and grant any AWS API access the application needs. AWSX adds
   * scoped permissions for the central log group and its .local companions.
   *
   * Default - AWSX creates a role with scoped CloudWatch Logs permissions. Add application
   * permissions separately.
   */
  executionRoleArn?: pulumi.Input<string>;

  /**
   * Version-qualified ARN of an existing network connector for VPC egress. Revisions using a
   * connector support only HomeRegion endpoints. Keep the connector available for as long as any
   * retained revision uses it.
   *
   * Default - No network connector.
   */
  egressNetworkConnectorVersionArn?: pulumi.Input<string>;
}

/**
 * A Node.js 24 Lambda Web Function and its current immutable revision.
 */
export class WebFunction extends pulumi.ComponentResource {
  /**
   * ARN of the function.
   */
  public readonly functionArn!: pulumi.Output<string>;

  /**
   * Name of the function.
   */
  public readonly functionName!: pulumi.Output<string>;

  /**
   * Identifier of the current revision. Pass it to an endpoint to route traffic explicitly.
   */
  public readonly revisionId!: pulumi.Output<string>;

  /**
   * ARN of the current revision.
   */
  public readonly revisionArn!: pulumi.Output<string>;

  /**
   * Execution role used by the current revision.
   */
  public readonly executionRoleArn!: pulumi.Output<string>;

  /**
   * Central log group created in the home Region.
   */
  public readonly logGroup!: aws.cloudwatch.LogGroup;

  constructor(
    name: string,
    args: WebFunctionArgs,
    opts: pulumi.ComponentResourceOptions = {},
    identity: ComponentIdentity = { type: 'awsx-next:index:WebFunction', aliases: [] },
  ) {
    // Resource-reference hydration must not register a second set of children.
    super(
      identity.type,
      name,
      opts.urn
        ? {
            functionArn: undefined,
            functionName: undefined,
            revisionId: undefined,
            revisionArn: undefined,
            executionRoleArn: undefined,
            logGroup: undefined,
          }
        : args,
      pulumi.mergeOptions(opts, { aliases: identity.aliases }),
    );
    if (opts.urn) {
      return;
    }

    // Native owns placement. Override the AWS children's Region without replacing either
    // provider's inherited credentials, and reject cross-account provider combinations.
    const destination = pulumi
      .output({
        awsAccount: aws.getCallerIdentityOutput({}, { parent: this }).accountId,
        nativeAccount: native.getAccountIdOutput({ parent: this }).accountId,
        region: native.getRegionOutput({ parent: this }).region,
        partition: native.getPartitionOutput({ parent: this }).partition,
      })
      .apply((value) => {
        validateWebFunctionAccounts(value.awsAccount, value.nativeAccount, this);
        return value;
      });
    const region = destination.apply((value) => value.region);
    const tags = pulumi
      .output(args.tags ?? {})
      .apply((values) => Object.entries(values).map(([key, value]) => ({ key, value })));
    const fn = new native.lambda.WebFunction(
      name,
      {
        functionName: args.functionName,
        tags: pulumi.all([destination, tags]).apply(([, values]) => values),
      },
      { parent: this },
    );

    const bucket = new aws.s3.Bucket(
      `${name}-code`,
      {
        region,
        tags: args.tags,
      },
      { parent: this },
    );
    // S3 enables Block Public Access on new buckets by default.
    const versioning = new aws.s3.BucketVersioning(
      `${name}-code`,
      { region, bucket: bucket.id, versioningConfiguration: { status: 'Enabled' } },
      { parent: this },
    );
    const encryption = new aws.s3.BucketServerSideEncryptionConfiguration(
      `${name}-code`,
      {
        region,
        bucket: bucket.id,
        rules: [{ applyServerSideEncryptionByDefault: { sseAlgorithm: 'AES256' } }],
      },
      { parent: this },
    );
    const bucketPolicy = new aws.s3.BucketPolicy(
      `${name}-code`,
      {
        region,
        bucket: bucket.id,
        policy: pulumi.jsonStringify({
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'DenyInsecureTransport',
              Effect: 'Deny',
              Principal: '*',
              Action: 's3:*',
              Resource: [bucket.arn, pulumi.interpolate`${bucket.arn}/*`],
              Condition: { Bool: { 'aws:SecureTransport': 'false' } },
            },
            {
              Sid: 'AllowLambdaWebFunctionCodeAccess',
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
              Action: ['s3:GetObject', 's3:GetObjectVersion'],
              Resource: pulumi.interpolate`${bucket.arn}/app.zip`,
              Condition: {
                StringEquals: {
                  'aws:SourceAccount': destination.apply((value) => value.awsAccount),
                },
                ArnLike: { 'aws:SourceArn': pulumi.interpolate`${fn.functionArn}/revision/*` },
              },
            },
          ],
        }),
      },
      { parent: this },
    );
    // Each upload adds a version of app.zip so older revisions can still reference their ZIPs.
    // On destroy, BucketObjectv2 deletes all versions and delete markers for app.zip only.
    const artifact = new aws.s3.BucketObjectv2(
      `${name}-code`,
      {
        region,
        bucket: bucket.id,
        key: 'app.zip',
        source: args.code,
        contentType: 'application/zip',
      },
      { parent: this, dependsOn: [versioning, encryption, bucketPolicy] },
    );

    this.logGroup = new aws.cloudwatch.LogGroup(
      `${name}-logs`,
      { region, tags: args.tags },
      { parent: this, retainOnDelete: true },
    );
    // Lambda creates .local companions in every serving Region, including the home Region.
    // Their settings and lifecycle remain service-managed rather than component-owned.
    let roleName: pulumi.Output<string>;
    if (args.executionRoleArn !== undefined) {
      this.executionRoleArn = pulumi.output(args.executionRoleArn);
      roleName = pulumi
        .all([destination, this.executionRoleArn])
        .apply(([value, arn]) => executionRoleName(arn, value.partition, value.nativeAccount));
    } else {
      const role = new native.iam.Role(
        `${name}-execution`,
        {
          tags,
          assumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { Service: 'lambda.amazonaws.com' },
                Action: 'sts:AssumeRole',
              },
            ],
          },
        },
        { parent: this, retainOnDelete: true },
      );
      this.executionRoleArn = role.arn;
      roleName = role.id;
    }
    const loggingPolicy = new native.iam.RolePolicy(
      `${name}-logging`,
      {
        roleName,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              Resource: [
                pulumi.interpolate`${this.logGroup.arn}:*`,
                pulumi
                  .all([destination, this.logGroup.name])
                  .apply(
                    ([value, logGroupName]) =>
                      `arn:${value.partition}:logs:*:${value.awsAccount}:log-group:${logGroupName}.local:*`,
                  ),
              ],
            },
          ],
        },
      },
      { parent: this, retainOnDelete: true },
    );

    const revision = new native.lambda.WebFunctionRevision(
      name,
      {
        functionName: fn.functionName,
        buildConfig: {
          codeConfig: {
            s3Object: { bucket: bucket.id, key: artifact.key, versionId: artifact.versionId },
          },
          runtimeConfig: { runtime: 'nodejs24.x' },
        },
        serviceConfig: {
          executionRoleArn: this.executionRoleArn,
          environmentVariables: args.environmentVariables,
          timeoutSeconds: validateInteger(args.timeoutSeconds, 'timeoutSeconds', 3, 900),
          maxConcurrencyPerEnvironment: validateInteger(
            args.maxConcurrencyPerEnvironment,
            'maxConcurrencyPerEnvironment',
            1,
            128,
          ),
          egressNetworkConnectorArn: args.egressNetworkConnectorVersionArn,
          telemetryConfig: { loggingConfig: { logGroup: this.logGroup.name } },
        },
      },
      { parent: this, retainOnDelete: true, dependsOn: [bucketPolicy, loggingPolicy] },
    );

    this.functionArn = fn.functionArn;
    this.functionName = fn.functionName;
    this.revisionId = revision.revisionId;
    this.revisionArn = revision.revisionArn;
    this.registerOutputs({
      functionArn: this.functionArn,
      functionName: this.functionName,
      revisionId: this.revisionId,
      revisionArn: this.revisionArn,
      executionRoleArn: this.executionRoleArn,
      logGroup: this.logGroup,
    });
  }
}

/**
 * Require both providers to target the same account.
 *
 * @param awsAccount The AWS provider account.
 * @param nativeAccount The AWS Native provider account.
 * @param resource The component reporting the error.
 */
export function validateWebFunctionAccounts(
  awsAccount: string,
  nativeAccount: string,
  resource?: pulumi.Resource,
): void {
  if (awsAccount !== nativeAccount) {
    throw new pulumi.ResourceError(
      'WebFunction requires AWS and AWS Native providers for the same account. ' +
        `AWS selects ${awsAccount}; AWS Native selects ${nativeAccount}.`,
      resource,
    );
  }
}

/**
 * Resolve the IAM name for the inline policy without targeting a same-named role in another
 * account.
 *
 * @param arn The supplied execution role ARN.
 * @param partition The function's AWS partition.
 * @param account The function's AWS account.
 * @returns The role name, without its IAM path.
 */
export function executionRoleName(arn: string, partition: string, account: string): string {
  const match = /^arn:([^:]+):iam::([0-9]{12}):role\/(?:[^:]+\/)?([\w+=,.@-]{1,64})$/.exec(arn);
  if (!match || match[1] !== partition || match[2] !== account) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'executionRoleArn',
      reason: 'Expected an IAM role ARN in the function’s account and partition.',
    });
  }
  return match[3]!;
}

/**
 * Validate an optional integer after Pulumi inputs resolve, preserving omitted AWS defaults.
 *
 * @param value The optional input value.
 * @param propertyPath The public property to identify in an error.
 * @param min The inclusive minimum.
 * @param max The inclusive maximum.
 * @returns The validated value, or undefined when omitted.
 */
function validateInteger(
  value: pulumi.Input<number> | undefined,
  propertyPath: string,
  min: number,
  max: number,
): pulumi.Output<number> | undefined {
  if (value === undefined) {
    return undefined;
  }
  return pulumi.output(value).apply((resolved) => {
    if (!Number.isInteger(resolved) || resolved < min || resolved > max) {
      throw new pulumi.InputPropertyError({
        propertyPath,
        reason: `Expected an integer from ${min} through ${max}, got ${resolved}.`,
      });
    }
    return resolved;
  });
}
