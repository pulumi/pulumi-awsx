import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as native from '@pulumi/aws-native';
import type { ecs } from '@pulumi/aws-native/types/input';
import type { input } from '@pulumi/aws/types';
import { validateContainerOptions } from './validateContainerOptions';
import type {
  EnvironmentFile,
  EnvironmentVariable,
  SecretsManagerSecret,
  AwsLogsLogDriver,
  ContainerDefinitionOptions,
  AwsvpcPortMapping,
} from './containerDefinition';
import type { CommonTaskDefinitionOptions } from './taskDefinitionOptions';

import {
  type FargateCredentialSpec,
  renderCredentialSpecConfig,
  credentialsSecretArnFromSpec,
} from '../credentialSpec';
import { Arn, ArnFormat } from '../arn';

interface RuntimePlatform {
  cpuArchitecture?: string;
  operatingSystemFamily?: string;
}

// Internal rendering contract. Public components select the supported subset and validate it.
interface TaskContainerDefinitionOptions extends ContainerDefinitionOptions {
  readonly privileged?: boolean;
  readonly gpuCount?: number;
  readonly credentialSpec?: FargateCredentialSpec;
}

export interface TaskDefinitionBuilderArgs extends CommonTaskDefinitionOptions {
  containers: Record<string, TaskContainerDefinitionOptions>;
  ephemeralStorageGiB?: number;
}

export interface TaskDefinitionConfiguration {
  compatibility: 'FARGATE' | 'MANAGED_INSTANCES';
  cpu?: number;
  memory?: number;
  runtimePlatform?: RuntimePlatform;
  getProviderRegion?: () => pulumi.Output<string>;
}

type ResolvedPolicyStatement = pulumi.Unwrap<input.iam.PolicyStatement>;

interface Rendered<T> {
  value: pulumi.Output<T>;
  executionRoleStatements: pulumi.Output<ResolvedPolicyStatement | undefined>[];
}

export class TaskDefinitionBuilder {
  /**
   * The Task Role of the task
   */
  public readonly taskRole!: aws.iam.Role;

  /**
   * The Execution Role of the task
   */
  public readonly executionRole!: aws.iam.Role;

  /**
   * The ARN of the registered task-definition revision. Pass this to an ECS service or task.
   */
  public readonly taskDefinitionArn!: pulumi.Output<string>;

  /**
   * The family of the registered task definition.
   */
  public readonly family!: pulumi.Output<string>;

  /**
   * The revision number assigned by ECS to the registered task definition.
   */
  public readonly revision!: pulumi.Output<number>;

  /**
   * The shared CloudWatch Logs log group created by the component for containers using CloudWatch
   * logging (enabled by default) without specifying `logGroupArn`. This output is undefined when
   * the component does not create a default log group
   */
  public logGroup?: aws.cloudwatch.LogGroup;

  public readonly name!: string;

  public readonly region?: string;
  private providerRegion?: pulumi.Output<string>;

  constructor(
    private readonly parent: pulumi.ComponentResource,
    name: string,
    args: TaskDefinitionBuilderArgs,
    private readonly configuration: TaskDefinitionConfiguration,
    opts: pulumi.ComponentResourceOptions,
  ) {
    this.region = args.region;

    this.name = name;
    const containerEntries = Object.entries(args.containers);
    if (containerEntries.length === 0) {
      throw new pulumi.InputPropertyError({
        reason: 'At least one container must be provided',
        propertyPath: 'containers',
      });
    }

    const family = args.family ?? name;
    if (args.executionRoleArn) {
      this.executionRole = aws.iam.Role.get(
        `${this.name}-execution-role`,
        roleNameFromArn(args.executionRoleArn, this.parent),
        undefined,
        {
          parent: this.parent,
        },
      );
    } else {
      this.executionRole = new aws.iam.Role(
        `${name}-execution-role`,
        {
          // Retained secret policies must not prevent this role from being deleted.
          forceDetachPolicies: true,
          assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
            aws.iam.Principals.EcsTasksPrincipal,
          ),
        },
        { parent: this.parent },
      );
    }

    if (args.taskRoleArn) {
      this.taskRole = aws.iam.Role.get(
        `${this.name}-task-role`,
        roleNameFromArn(args.taskRoleArn, this.parent),
        undefined,
        {
          parent: this.parent,
        },
      );
    } else {
      this.taskRole = new aws.iam.Role(
        `${name}-task-role`,
        {
          assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
            aws.iam.Principals.EcsTasksPrincipal,
          ),
        },
        { parent: this.parent },
      );
    }

    const executionRoleStatements: pulumi.Output<ResolvedPolicyStatement | undefined>[] = [];
    const ecrRepositories: pulumi.Output<string | undefined>[] = [];
    const containerDefinitionsApi = containerEntries.map(([containerName, container]) => {
      validateContainerOptions(container, `containers.${containerName}`);
      const ecrRepo = this.renderEcrPullStatementResource(container.image);
      ecrRepositories.push(ecrRepo);
      if (
        container.credentialSpec &&
        configuration.runtimePlatform?.operatingSystemFamily?.startsWith('WINDOWS')
      ) {
        throw new pulumi.InputPropertyError({
          propertyPath: `containers.${containerName}.credentialSpec`,
          reason:
            'gMSA credential specifications are supported only for Linux containers on Fargate',
        });
      }
      const credentialSpec = container.credentialSpec
        ? this.renderCredentialSpec(container.credentialSpec, containerName, opts.dependsOn)
        : undefined;
      const environmentFiles = container.environmentFiles?.map((file, i) =>
        this.renderEnvironmentFile(`containers.${containerName}.environmentFiles[${i}]`, file),
      );
      const environment = this.renderEnvironment(containerName, container.environment);
      if (container.logging?.disabled && container.logging.cloudwatch !== undefined) {
        throw new pulumi.InputPropertyError({
          propertyPath: `containers.${containerName}.logging`,
          reason: 'Only one of disabled: true or cloudwatch can be provided',
        });
      }
      const logs = container.logging?.disabled
        ? undefined
        : this.renderCloudWatchLogDriver(containerName, container.logging?.cloudwatch ?? {});

      executionRoleStatements.push(
        ...(credentialSpec?.executionRoleStatements ?? []),
        ...(environmentFiles?.flatMap((rendered) => rendered.executionRoleStatements) ?? []),
        ...(environment?.executionRoleStatements ?? []),
        ...(logs?.executionRoleStatements ?? []),
      );

      return this.toContainerDefinition(
        containerName,
        container,
        credentialSpec ? [credentialSpec.value] : undefined,
        environmentFiles?.map((rendered) => rendered.value),
        environment?.secrets,
        logs?.value,
        environment?.values,
      );
    });

    const rolePolicy = new aws.iam.RolePolicy(
      `${name}-execution-role-policy`,
      {
        role: this.executionRole.name,
        policy: this.renderContainerExecRolePolicy(executionRoleStatements, ecrRepositories),
      },
      { parent: this.parent },
    );

    // Native regions belong to providers. Preserve inherited credentials and check the
    // destination before registration. Gate a scalar so unknown images do not hide the
    // entire structured container array from preview transforms.
    const validatedFamily = pulumi
      .output({
        awsAccount: aws.getCallerIdentityOutput({}, { parent: this.parent }).accountId,
        awsRegion: aws.getRegionOutput({ region: args.region }, { parent: this.parent }).region,
        nativeAccount: native.getAccountIdOutput({ parent: this.parent }).accountId,
        nativeRegion: native.getRegionOutput({ parent: this.parent }).region,
      })
      .apply((destination) => {
        validateTaskProviders(destination);
        return family;
      });

    const taskDefinition = new native.ecs.TaskDefinition(
      name,
      {
        containerDefinitions: containerDefinitionsApi,
        family: validatedFamily,
        cpu: configuration.cpu !== undefined ? `${configuration.cpu}` : undefined,
        memory: configuration.memory !== undefined ? `${configuration.memory}` : undefined,
        requiresCompatibilities: [configuration.compatibility],
        executionRoleArn: this.executionRole.arn,
        taskRoleArn: this.taskRole.arn,
        networkMode: 'awsvpc',
        runtimePlatform: configuration.runtimePlatform,
        ephemeralStorage:
          args.ephemeralStorageGiB !== undefined
            ? {
                sizeInGiB: args.ephemeralStorageGiB,
              }
            : undefined,
      },
      {
        parent: this.parent,
        dependsOn: [rolePolicy],
      },
    );

    this.taskDefinitionArn = taskDefinition.taskDefinitionArn;
    // Native exposes the revision-qualified ARN rather than a separate revision output.
    // Read the registered identity instead of copying inputs that transforms can change.
    const taskIdentity = this.taskDefinitionArn.apply((arn) => {
      const separator = arn.lastIndexOf(':');
      return {
        family: arn.slice(arn.lastIndexOf('/') + 1, separator),
        revision: Number(arn.slice(separator + 1)),
      };
    });
    this.family = taskIdentity.apply((value) => value.family);
    this.revision = taskIdentity.apply((value) => value.revision);
  }

  /**
   * Resolve the inherited provider's region only when an ARN import needs it. Enhanced import IDs
   * are relative to that provider region, which can differ from the task's args.region.
   *
   * @returns The inherited provider region.
   */
  private getProviderRegion(): pulumi.Output<string> {
    return (
      this.configuration.getProviderRegion?.() ??
      (this.providerRegion ??= aws.getRegionOutput(undefined, { parent: this.parent }).region)
    );
  }

  /**
   * Gets or creates the default CloudWatch log group.
   *
   * @returns The default log group.
   */
  private obtainDefaultLogGroup(): aws.cloudwatch.LogGroup {
    if (!this.logGroup) {
      this.logGroup = new aws.cloudwatch.LogGroup(
        `${this.name}-log-group`,
        {
          region: this.region,
        },
        { parent: this.parent },
      );
    }

    return this.logGroup;
  }

  /**
   * Checks if the image URI matches a ECR repository format and if so returns a policy fragment
   * adding permissions to pull the image.
   *
   * @param imageUri The image URI for the container. Can be an Output
   * @returns The Repository ARN
   */
  private renderEcrPullStatementResource(
    imageUri: pulumi.Input<string>,
  ): pulumi.Output<string | undefined> {
    return pulumi.output(imageUri).apply((image) => {
      const match =
        /^(?<account>\d{12})\.dkr\.ecr\.(?<region>[a-z0-9-]+)\.(?<domain>amazonaws\.com(?:\.cn)?)\/(?<repo>[a-zA-Z0-9_.\-/]+)(?::(?<tag>[a-zA-Z0-9_.-]+))?(?:@(?<digest>sha256:[a-fA-F0-9]{64}))?$/.exec(
          image,
        );

      if (!match?.groups) {
        return;
      }

      const { account, region, _domain, repo, _tagOrDigest } = match.groups;

      let partition: string;
      if (region?.startsWith('cn-')) {
        partition = 'aws-cn';
      } else if (region?.startsWith('us-gov-')) {
        partition = 'aws-us-gov';
      } else {
        partition = 'aws';
      }
      return `arn:${partition}:ecr:${region}:${account}:repository/${repo}`;
    });
  }

  /**
   * Renders execution-role statements as an IAM policy document.
   *
   * @param statements The statements to include in the policy.
   * @param ecrRepositories A list of ECR repositories the task needs pull access to
   * @returns The JSON policy document.
   */
  private renderContainerExecRolePolicy(
    statements: pulumi.Output<ResolvedPolicyStatement | undefined>[],
    ecrRepositories: pulumi.Output<string | undefined>[],
  ): pulumi.Output<string> {
    return pulumi
      .all([statements, ecrRepositories])
      .apply(([resolvedStatements, resolvedRepos]) => {
        const uniqueStatements = new Map<string, ResolvedPolicyStatement>();
        const uniqueRepos = new Set<string>();
        for (const repo of resolvedRepos) {
          if (repo && !uniqueRepos.has(repo)) {
            uniqueRepos.add(repo);
          }
        }
        if (Array.from(uniqueRepos.keys()).length > 0) {
          uniqueStatements.set('ecrPolicy', {
            Action: [
              'ecr:BatchCheckLayerAvailability',
              'ecr:GetDownloadUrlForLayer',
              'ecr:BatchGetImage',
            ],
            Effect: 'Allow',
            Resource: Array.from(uniqueRepos.values()),
          });
        }
        for (const statement of resolvedStatements) {
          if (!statement) {
            continue;
          }
          const key = JSON.stringify(statement);
          uniqueStatements.set(key, statement);
        }
        return JSON.stringify({
          Version: '2012-10-17',
          // We have to have at least one statement otherwise we create a role policy with and empty statements which is not allowed
          // All execution roles will get this policy even if they don't need to pull from ECR
          Statement: [
            {
              Effect: 'Allow',
              Action: 'ecr:GetAuthorizationToken',
              Resource: '*',
            },
            ...uniqueStatements.values(),
          ],
        });
      });
  }

  /**
   * Converts an IAM policy statement to its resolved output form.
   *
   * @param statement The policy statement to convert.
   * @returns The resolved policy statement.
   */
  private executionRoleStatement(
    statement: input.iam.PolicyStatement,
  ): pulumi.Output<ResolvedPolicyStatement> {
    return pulumi.output(statement);
  }

  /**
   * Creates or reads a domainless S3 CredSpec and grants access to its referenced credentials.
   *
   * @param spec The S3 source or configuration.
   * @param containerName The container using the specification.
   * @param dependsOn Explicit component dependencies that must precede S3 lookups.
   * @returns The ECS reference and scoped execution-role statements.
   */
  private renderCredentialSpec(
    spec: FargateCredentialSpec,
    containerName: string,
    dependsOn: pulumi.ComponentResourceOptions['dependsOn'],
  ): Rendered<string> {
    const propertyPath = `containers.${containerName}.credentialSpec`;
    if ((spec.key !== undefined) === (spec.config !== undefined)) {
      throw new pulumi.InputPropertyError({
        propertyPath,
        reason: 'Specify exactly one of key or config for the credential specification',
      });
    }
    const name = `${this.name}-${containerName}-credential-spec`;
    const bucketName = Arn.split(spec.bucketArn, ArnFormat.NO_RESOURCE_NAME, this.parent).apply(
      (parts) => parts.resource,
    );
    const bucket = aws.s3.getBucketOutput(
      { bucket: bucketName, region: this.region },
      { parent: this.parent, dependsOn },
    );
    let objectArn: pulumi.Output<string>;
    let objectKeyId: pulumi.Output<string | undefined>;
    let credentialsSecretArn: pulumi.Output<string>;
    if (spec.config !== undefined) {
      const content = renderCredentialSpecConfig(spec.config, `${propertyPath}.config`);
      const object = new aws.s3.BucketObjectv2(
        name,
        {
          bucket: bucketName,
          region: bucket.bucketRegion,
          content,
          contentType: 'application/json',
        },
        // A new key on configuration changes also changes the task definition's CredSpec ARN.
        { parent: this.parent, replaceOnChanges: ['content'] },
      );
      // Depend on creation, not just the bucket name and predictable key.
      objectArn = object.arn;
      // S3 applies bucket-default encryption, the returned metadata identifies the actual key.
      objectKeyId = object.kmsKeyId;
      credentialsSecretArn = pulumi.output(spec.config.credentialsSecretArn);
    } else {
      const key = pulumi.output(spec.key!).apply((resolvedKey) => {
        if (!resolvedKey) {
          throw new pulumi.InputPropertyError({
            propertyPath: `${propertyPath}.key`,
            reason: 'The credential specification key must not be empty',
          });
        }
        return resolvedKey;
      });
      const object = aws.s3.getObjectOutput(
        { bucket: bucketName, key, region: bucket.bucketRegion, downloadBody: 'true' },
        { parent: this.parent, dependsOn },
      );
      // Force downloading the body, including application/octet-stream objects.
      credentialsSecretArn = object.bodyBase64.apply((body) =>
        credentialsSecretArnFromSpec(
          Buffer.from(body, 'base64').toString('utf8'),
          `${propertyPath}.key`,
        ),
      );
      objectArn = pulumi.interpolate`${spec.bucketArn}/${key}`;
      objectKeyId = object.sseKmsKeyId;
    }
    const secretRegion = Arn.split(
      credentialsSecretArn,
      ArnFormat.COLON_RESOURCE_NAME,
      this.parent,
    ).apply((parts) => {
      if (
        parts.service !== 'secretsmanager' ||
        parts.resource !== 'secret' ||
        !parts.resourceName ||
        !parts.region ||
        !parts.account ||
        parts.resourceName.includes(':')
      ) {
        throw new pulumi.InputPropertyError({
          propertyPath: spec.config
            ? `${propertyPath}.config.credentialsSecretArn`
            : `${propertyPath}.key`,
          reason: 'The credential specification must reference a Secrets Manager secret ARN',
        });
      }
      return parts.region;
    });
    const secret = aws.secretsmanager.Secret.get(
      `${name}-credentials`,
      credentialsSecretArn,
      { region: secretRegion },
      { parent: this.parent },
    );
    return {
      value: objectArn.apply((arn) => `credentialspecdomainless:${arn}`),
      executionRoleStatements: [
        this.executionRoleStatement({
          Effect: 'Allow',
          Action: ['s3:GetBucketLocation', 's3:ListBucket'],
          Resource: spec.bucketArn,
        }),
        this.executionRoleStatement({
          Effect: 'Allow',
          Action: ['s3:GetObject', 's3:GetObjectVersion'],
          Resource: objectArn,
        }),
        this.renderKmsDecryptStatement(objectKeyId, bucket.bucketRegion),
        this.executionRoleStatement({
          Effect: 'Allow',
          Action: 'secretsmanager:GetSecretValue',
          Resource: secret.arn,
        }),
        this.renderKmsDecryptStatement(secret.kmsKeyId, secret.region),
      ],
    };
  }

  /**
   * Splits the unified environment into direct values and ECS secret references.
   *
   * @param containerName The container using these variables.
   * @param environment The environment map.
   * @returns Rendered values, secret references and external-source permissions.
   */
  private renderEnvironment(
    containerName: string,
    environment?: Record<string, EnvironmentVariable>,
  ):
    | {
        values: pulumi.Output<ecs.TaskDefinitionKeyValuePairArgs[]>;
        secrets: pulumi.Output<ecs.TaskDefinitionSecretArgs[]>;
        executionRoleStatements: pulumi.Output<ResolvedPolicyStatement | undefined>[];
      }
    | undefined {
    if (!environment) {
      return;
    }
    const values: pulumi.Output<ecs.TaskDefinitionKeyValuePairArgs | undefined>[] = [];
    const secrets: pulumi.Output<ecs.TaskDefinitionSecretArgs | undefined>[] = [];
    const executionRoleStatements: pulumi.Output<ResolvedPolicyStatement | undefined>[] = [];
    for (const [name, source] of Object.entries(environment)) {
      const propertyPath = `containers.${containerName}.environment.${name}`;
      if (
        [source.value, source.ssmParameterArn, source.secretsManager].filter(
          (value) => value !== undefined,
        ).length !== 1
      ) {
        throw new pulumi.InputPropertyError({
          propertyPath,
          reason: 'Specify exactly one of value, ssmParameterArn or secretsManager',
        });
      }
      if (
        source.secretsManager?.versionId !== undefined &&
        source.secretsManager?.versionStage !== undefined
      ) {
        throw new pulumi.InputPropertyError({
          propertyPath: `${propertyPath}.secretsManager`,
          reason: 'versionStage and versionId cannot be used together',
        });
      }

      if (source.value !== undefined) {
        const value = pulumi.output(source.value);
        // Inspect secrecy metadata without resolving the value in an apply. This also
        // declares storage when the secret value is unknown during preview.
        const classified = pulumi.isSecret(value).then(
          (
            isSecret,
          ): {
            environment?: ecs.TaskDefinitionKeyValuePairArgs;
            secret?: pulumi.Output<ecs.TaskDefinitionSecretArgs>;
          } =>
            isSecret
              ? { secret: this.renderManagedEnvironmentSecret(containerName, name, value) }
              : { environment: { name, value } },
        );
        values.push(pulumi.output(classified.then((entry) => entry.environment)));
        secrets.push(pulumi.output(classified.then((entry) => entry.secret)));
      } else {
        const rendered = source.secretsManager
          ? this.renderSecretsManagerSecret(containerName, name, source.secretsManager)
          : this.renderSsmSecret(containerName, name, source.ssmParameterArn!);
        secrets.push(rendered.value);
        executionRoleStatements.push(...rendered.executionRoleStatements);
      }
    }
    return {
      values: pulumi.all(values).apply((entries) => entries.filter((entry) => entry !== undefined)),
      secrets: pulumi
        .all(secrets)
        .apply((entries) => entries.filter((entry) => entry !== undefined)),
      executionRoleStatements,
    };
  }

  /**
   * Stores a Pulumi secret and pins ECS to the resulting Secrets Manager version.
   *
   * @param containerName The container using the value.
   * @param name The environment variable name.
   * @param value The secret-marked value.
   * @returns The version-pinned ECS reference, ordered after retrieval permissions.
   */
  private renderManagedEnvironmentSecret(
    containerName: string,
    name: string,
    value: pulumi.Output<string>,
  ): pulumi.Output<ecs.TaskDefinitionSecretArgs> {
    const resourceName = `${this.name}-${containerName}-${name}-environment`;
    const opts = { parent: this.parent, retainOnDelete: true };
    const secret = new aws.secretsmanager.Secret(resourceName, { region: this.region }, opts);
    const version = new aws.secretsmanager.SecretVersion(
      resourceName,
      {
        region: this.region,
        secretId: secret.arn,
        secretString: value,
      },
      opts,
    );
    // Keep permissions with retained storage. Removing a variable must not revoke
    // access needed by older task definitions using the same execution role.
    const policy = new aws.iam.RolePolicy(
      `${resourceName}-policy`,
      {
        role: this.executionRole.name,
        policy: pulumi.jsonStringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: 'secretsmanager:GetSecretValue',
              Resource: secret.arn,
            },
          ],
        }),
      },
      opts,
    );
    return pulumi
      .all([secret.arn, version.versionId, policy.id])
      .apply(([arn, versionId]) => ({ name, valueFrom: `${arn}:::${versionId}` }));
  }

  /**
   * Renders an AWS Secrets Manager secret reference.
   *
   * @param containerName The name of the container this is associated with
   * @param name The environment variable name.
   * @param source The Secrets Manager source configuration.
   * @returns The rendered secret and its execution-role statements.
   */
  private renderSecretsManagerSecret(
    containerName: string,
    name: string,
    source: SecretsManagerSecret,
  ): Rendered<ecs.TaskDefinitionSecretArgs> {
    const propertyPath = `containers.${containerName}.environment.${name}.secretsManager.secretArn`;
    const secretRegion = Arn.split(
      source.secretArn,
      ArnFormat.COLON_RESOURCE_NAME,
      this.parent,
    ).apply((parts) => {
      if (!parts.region) {
        throw new pulumi.InputPropertyError({
          propertyPath,
          reason: 'The Secrets Manager ARN must contain a region',
        });
      }
      return parts.region;
    });
    const secret = aws.secretsmanager.Secret.get(
      `${this.name}-${containerName}-${name}-secret`,
      source.secretArn,
      { region: secretRegion },
      { parent: this.parent },
    );
    const value = pulumi
      .all([secret.arn, source.jsonKey, source.versionStage, source.versionId])
      .apply(([arn, jsonKey, versionStage, versionId]) => {
        const usesSuffix =
          jsonKey !== undefined || versionStage !== undefined || versionId !== undefined;
        return {
          name,
          valueFrom: usesSuffix
            ? `${arn}:${jsonKey ?? ''}:${versionStage ?? ''}:${versionId ?? ''}`
            : arn,
        };
      });

    return {
      value,
      executionRoleStatements: [
        this.executionRoleStatement({
          Effect: 'Allow',
          Action: 'secretsmanager:GetSecretValue',
          Resource: secret.arn,
        }),
        this.renderKmsDecryptStatement(secret.kmsKeyId, secret.region),
      ],
    };
  }

  /**
   * Renders an AWS Systems Manager Parameter Store secret reference.
   *
   * @param containerName The name of the container this is associated with
   * @param name The environment variable name.
   * @param parameterArn The ARN of the Parameter Store parameter.
   * @returns The rendered secret and its execution-role statements.
   */
  private renderSsmSecret(
    containerName: string,
    name: string,
    parameterArn: pulumi.Input<string>,
  ): Rendered<ecs.TaskDefinitionSecretArgs> {
    const parameter = aws.ssm.Parameter.get(
      `${this.name}-${containerName}-secret-${name}-param`,
      parameterNameFromArn(parameterArn, this.getProviderRegion(), this.parent),
      undefined,
      { parent: this.parent },
    );
    return {
      value: parameter.arn.apply((arn) => ({ name, valueFrom: arn })),
      executionRoleStatements: [
        this.executionRoleStatement({
          Effect: 'Allow',
          Action: ['ssm:GetParameters', 'ssm:GetParameter'],
          Resource: parameter.arn,
        }),
        this.renderKmsDecryptStatement(parameter.keyId, parameter.region),
      ],
    };
  }

  /**
   * Creates a KMS decrypt statement for a customer-managed key.
   *
   * @param keyId The optional KMS key identifier.
   * @param region The AWS Region that contains the key.
   * @returns The decrypt statement, or undefined for an AWS-managed key.
   */
  private renderKmsDecryptStatement(
    keyId: pulumi.Output<string | undefined>,
    region: pulumi.Input<string>,
  ): pulumi.Output<ResolvedPolicyStatement | undefined> {
    return pulumi
      .all([keyId, region])
      .apply(
        async ([resolvedKeyId, resolvedRegion]): Promise<ResolvedPolicyStatement | undefined> => {
          if (!resolvedKeyId) {
            return undefined;
          }
          const key = await aws.kms.getKey(
            {
              keyId: resolvedKeyId,
              region: resolvedRegion,
            },
            { parent: this.parent },
          );
          if (key.keyManager !== 'CUSTOMER') {
            return undefined;
          }
          return {
            Effect: 'Allow',
            Action: 'kms:Decrypt',
            Resource: key.arn,
          };
        },
      );
  }

  /**
   * Renders an Amazon S3 environment file reference.
   *
   * @param propertyPath The input property path used in validation errors.
   * @param file The environment file to render.
   * @returns The rendered file and its execution-role statements.
   */
  private renderEnvironmentFile(
    propertyPath: string,
    file: EnvironmentFile,
  ): Rendered<ecs.TaskDefinitionEnvironmentFileArgs> {
    const key = pulumi.output(file.key).apply((resolvedKey) => {
      if (!resolvedKey.endsWith('.env')) {
        throw new pulumi.InputPropertyError({
          propertyPath: `${propertyPath}.key`,
          reason: `environmentFile key must end in '.env', got ${resolvedKey}`,
        });
      }
      return resolvedKey;
    });
    const objectArn = pulumi.interpolate`${file.bucketArn}/${key}`;
    return {
      value: objectArn.apply((value): ecs.TaskDefinitionEnvironmentFileArgs => ({
        value,
        type: 's3',
      })),
      executionRoleStatements: [
        this.executionRoleStatement({
          Effect: 'Allow',
          Action: 's3:GetBucketLocation',
          Resource: file.bucketArn,
        }),
        this.executionRoleStatement({
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: objectArn,
        }),
      ],
    };
  }

  /**
   * Renders a CloudWatch Logs driver configuration.
   *
   * @param containerName The name of the container this is associated with
   * @param driver The log driver options.
   * @returns The log configuration, or undefined when logging is not configured.
   */
  private renderCloudWatchLogDriver(
    containerName: string,
    driver?: AwsLogsLogDriver,
  ): Rendered<ecs.TaskDefinitionLogConfigurationArgs> | undefined {
    if (!driver) {
      return;
    }
    const propertyPath = `containers.${containerName}.logging.cloudwatch`;
    if (driver.datetimeFormat && driver.multilinePattern) {
      throw new pulumi.InputPropertyError({
        propertyPath,
        reason: 'Only one of datetimeFormat and multilinePattern can be provided',
      });
    }
    let logGroup: aws.cloudwatch.LogGroup | undefined = undefined;
    if (driver.logGroupArn) {
      logGroup = aws.cloudwatch.LogGroup.get(
        `${this.name}-${containerName}-log-group`,
        logGroupNameFromArn(driver.logGroupArn, this.getProviderRegion(), this.parent),
        undefined,
        {
          parent: this.parent,
        },
      );
    }
    logGroup = logGroup ?? this.obtainDefaultLogGroup();
    const value = pulumi
      .all([
        logGroup.name,
        logGroup.region,
        driver.streamPrefix ?? this.name,
        driver.datetimeFormat,
        driver.multilinePattern,
        driver.mode,
        driver.maxBufferSizeBytes,
      ])
      .apply(
        ([
          logGroupName,
          awsRegion,
          streamPrefix,
          datetimeFormat,
          multilinePattern,
          mode,
          maxBufferSize,
        ]): ecs.TaskDefinitionLogConfigurationArgs => ({
          logDriver: 'awslogs',
          options: removeEmpty({
            'awslogs-group': logGroupName,
            'awslogs-region': awsRegion,
            'awslogs-stream-prefix': streamPrefix,
            'awslogs-datetime-format': datetimeFormat,
            'awslogs-multiline-pattern': multilinePattern,
            mode,
            'max-buffer-size': maxBufferSize !== undefined ? `${maxBufferSize}b` : undefined,
          }),
        }),
      );

    return {
      value,
      executionRoleStatements: [
        this.executionRoleStatement({
          Effect: 'Allow',
          Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
          Resource: pulumi.interpolate`${logGroup.arn}:*`,
        }),
      ],
    };
  }

  /**
   * Converts higher-level container options to the AWS Native task-definition input shape.
   *
   * @param containerName The name of the container
   * @param options Parameters for configuring the container definition.
   * @param credentialSpecs The rendered credential specifications.
   * @param environmentFiles The rendered environment files.
   * @param secrets The rendered secrets.
   * @param logConfiguration The rendered log configuration.
   * @param environment The rendered direct environment values.
   * @returns The container definition.
   */
  private toContainerDefinition(
    containerName: string,
    options: Omit<
      TaskContainerDefinitionOptions,
      'credentialSpec' | 'environmentFiles' | 'environment' | 'logging'
    >,
    credentialSpecs?: pulumi.Output<string>[],
    environmentFiles?: pulumi.Output<ecs.TaskDefinitionEnvironmentFileArgs>[],
    secrets?: pulumi.Output<ecs.TaskDefinitionSecretArgs[]>,
    logConfiguration?: pulumi.Output<ecs.TaskDefinitionLogConfigurationArgs>,
    environment?: pulumi.Output<ecs.TaskDefinitionKeyValuePairArgs[]>,
  ): ecs.TaskDefinitionContainerDefinitionArgs {
    return {
      credentialSpecs,
      logConfiguration,
      secrets,
      environmentFiles,
      command: options.command,
      cpu: options.cpuUnits,
      privileged: options.privileged,
      resourceRequirements:
        options.gpuCount !== undefined
          ? [{ type: 'GPU', value: `${options.gpuCount}` }]
          : undefined,
      memory: options.memoryMiB,
      memoryReservation: options.memoryReservationMiB,
      portMappings: renderPortMappings(options.portMappings),
      essential: options.essential ?? true,
      // TODO: this requires more design
      // restartPolicy: options.restartPolicy,
      entryPoint: options.entryPoint,
      // TODO: this requires more design
      // mountPoints: options.mountPoints,
      volumesFrom: options.volumesFrom,
      linuxParameters: options.linuxParameters,
      startTimeout: options.startTimeoutSeconds,
      stopTimeout: options.stopTimeoutSeconds,
      versionConsistency: options.versionConsistencyEnabled === false ? 'disabled' : 'enabled',
      user: options.user,
      workingDirectory: options.workingDirectory,
      readonlyRootFilesystem: options.readonlyRootFilesystem,
      interactive: options.interactive,
      pseudoTerminal: options.pseudoTerminal,
      dockerLabels: options.dockerLabels,
      ulimits: options.ulimits,
      healthCheck: options.healthCheck
        ? {
            command: options.healthCheck.command,
            interval: options.healthCheck.intervalSeconds,
            retries: options.healthCheck.retries,
            startPeriod: options.healthCheck.startPeriodSeconds,
            timeout: options.healthCheck.timeoutSeconds,
          }
        : undefined,
      systemControls: options.systemControls,
      // TODO: this requires more design
      // firelensConfiguration: options.firelensConfiguration,
      image: options.image,
      name: containerName,
      dependsOn: options.dependsOn,
      environment,
    };
  }
}
/**
 * Checks the destination of the task and its supporting AWS Classic resources.
 *
 * @param destination The account and region selected by each provider.
 * @param destination.awsAccount The AWS Classic account.
 * @param destination.awsRegion The effective task region.
 * @param destination.nativeAccount The AWS Native account.
 * @param destination.nativeRegion The AWS Native region.
 */
export function validateTaskProviders(destination: {
  awsAccount: string;
  awsRegion: string;
  nativeAccount: string;
  nativeRegion: string;
}): void {
  const { awsAccount, awsRegion, nativeAccount, nativeRegion } = destination;
  if (awsAccount !== nativeAccount || awsRegion !== nativeRegion) {
    throw new pulumi.InputPropertyError({
      propertyPath: 'region',
      reason: `Task definitions require matching AWS and AWS Native accounts and regions. AWS uses account ${awsAccount} in ${awsRegion}, but AWS Native uses account ${nativeAccount} in ${nativeRegion}. Configure the aws-native provider to match the task's AWS account and effective region, including any region input.`,
    });
  }
}

/**
 * Converts high-level Fargate port mappings to the ECS API shape.
 *
 * @param mappings The port mappings to render.
 * @returns The rendered port mappings, or undefined when none are configured.
 */
export function renderPortMappings(
  mappings?: AwsvpcPortMapping[],
): ecs.TaskDefinitionPortMappingArgs[] | undefined {
  return mappings?.map((mapping): ecs.TaskDefinitionPortMappingArgs => {
    return {
      ...mapping,
      containerPortRange: mapping.containerPortRange
        ? `${mapping.containerPortRange.start}-${mapping.containerPortRange.end}`
        : undefined,
    };
  });
}

/**
 * Removes properties whose values are undefined.
 *
 * @param x The object to clean.
 * @returns The object without undefined properties.
 */
export function removeEmpty<T>(x: { [key: string]: T | undefined | string }): {
  [key: string]: string;
} {
  for (const key of Object.keys(x)) {
    if (x[key] === undefined) {
      delete x[key];
    }
  }
  return x as any;
}

/**
 * Get an SSM Parameter Import ID from an ARN
 *
 * @param arn The SSM Parameter ARN
 * @param currentRegion The inherited provider region used for import IDs
 * @param parent The parent component
 * @returns The name of the parameter which can be used as the import id
 */
function parameterNameFromArn(
  arn: pulumi.Input<string>,
  currentRegion: pulumi.Output<string>,
  parent: pulumi.ComponentResource,
): pulumi.Output<string> {
  const arnParts = Arn.split(arn, ArnFormat.SLASH_RESOURCE_NAME, parent);
  return pulumi.all([arnParts, currentRegion]).apply(([parts, region]) => {
    if (!parts.resourceName) {
      throw new Error('Could not extract parameter name from arn');
    }
    // Hierarchical SSM parameter import IDs use a leading slash
    const name = parts.resourceName.includes('/') ? `/${parts.resourceName}` : parts.resourceName;
    if (parts.region && parts.region !== region) {
      return `${name}@${parts.region}`;
    }
    return name;
  });
}

/**
 * Get an IAM Role Import ID from an ARN
 *
 * @param arn The IAM Role ARN
 * @param parent The parent component
 * @returns The name of the role which can be used as the import id
 */
function roleNameFromArn(
  arn: pulumi.Input<string>,
  parent: pulumi.ComponentResource,
): pulumi.Output<string> {
  return Arn.split(arn, ArnFormat.SLASH_RESOURCE_NAME, parent).apply((parts) => {
    if (!parts.resourceName) {
      throw new Error('Could not extract role name from arn');
    }
    // The role resourceName part of the arn will also include the path, e.g. `service-role/my-role`
    // but the import expects just the final `name` part.
    const roleNameParts = parts.resourceName.split('/');
    return roleNameParts[roleNameParts.length - 1]!;
  });
}

/**
 * Get a CloudWatch Logs LogGroup Import ID from an ARN
 *
 * @param arn The LogGroup ARN
 * @param currentRegion The inherited provider region used for import IDs
 * @param parent The parent component
 * @returns The name of the log group which can be used as the import id
 */
function logGroupNameFromArn(
  arn: pulumi.Input<string>,
  currentRegion: pulumi.Output<string>,
  parent: pulumi.ComponentResource,
): pulumi.Output<string> {
  const arnParts = Arn.split(arn, ArnFormat.SLASH_RESOURCE_NAME, parent);
  return pulumi.all([arnParts, currentRegion]).apply(([parts, region]) => {
    if (!parts.resourceName) {
      throw new Error('Could not extract log group name from ARN');
    }
    const name = parts.resourceName.endsWith(':*')
      ? parts.resourceName.slice(0, -2)
      : parts.resourceName;
    if (!name || name.includes(':')) {
      throw new Error('Expected the ARN to contain a valid log-group name');
    }
    if (parts.region && parts.region !== region) {
      return `${name}@${parts.region}`;
    }
    return name;
  });
}
