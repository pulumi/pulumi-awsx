import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import type { input } from '@pulumi/aws/types';
import type { EnvironmentFile, Secret, SecretsManagerSecret } from '../base/containerDefinition';
import type {
  FargateAwsLogsLogDriver,
  FargateContainerDefinitionOptions,
  FargatePortMapping,
} from './containerDefinition';
import {
  ContainerDefinitionArgs,
  LogConfigurationLogDriver,
  type ContainerDefinitionEnvironmentFile,
  type ContainerDefinitionSecret,
  type LogConfiguration,
  type PortMapping,
  PortMappingAppProtocol,
  PortMappingProtocol,
} from '../containerDefinitionArgs';
import { CredentialSpec } from '../credentialSpec';
import { resolveFargateTaskMemoryAndCpu } from './memoryAndCpu';
import { ComponentIdentity } from '../../componentIdentity';
import { ContainerDefinition } from '../containerDefinition';
import { Arn, ArnFormat } from '../arn';

export interface CommonTaskdefinitionOptions {
  /**
   * Region where this resource will be
   * [managed](https://docs.aws.amazon.com/general/latest/gr/rande.html#regional-endpoints).
   *
   * Default - Region set in the provider configuration.
   */
  readonly region?: string;
  /**
   * The name of a family that this task definition is registered to. A family groups multiple
   * versions of a task definition.
   *
   * Default - The Pulumi resource name of this component
   */
  readonly family?: string;

  /**
   * The ARN of the IAM task execution role that will be used by the ECS Task.
   *
   * The execution role grants access required by the configured containers, such as pulling images
   * from Amazon ECR, writing logs to CloudWatch, retrieving secrets and credential specifications,
   * etc.
   *
   * The component will automatically attach IAM policies granting access based on the container
   * definitions.
   *
   * Default - An execution role will be automatically created for you
   */
  readonly executionRoleArn?: pulumi.Input<string>;

  /**
   * The ARN of the IAM role that grants containers in the task permission to call AWS APIs on your
   * behalf.
   *
   * Default - A task role is automatically created for you.
   */
  readonly taskRoleArn?: pulumi.Input<string>;
}

/**
 * The CPU architecture of the task. This must match the platform your docker image is built for
 */
export enum CpuArchitecture {
  X86_64 = 'X86_64',
  ARM64 = 'ARM64',
}

/**
 * The operating system family for the task
 */
export enum OperatingSystemFamily {
  LINUX = 'LINUX',
  WINDOWS_SERVER_2025_FULL = 'WINDOWS_SERVER_2025_FULL',
  WINDOWS_SERVER_2025_CORE = 'WINDOWS_SERVER_2025_CORE',
  WINDOWS_SERVER_2022_FULL = 'WINDOWS_SERVER_2022_FULL',
  WINDOWS_SERVER_2022_CORE = 'WINDOWS_SERVER_2022_CORE',
  WINDOWS_SERVER_2019_FULL = 'WINDOWS_SERVER_2019_FULL',
  WINDOWS_SERVER_2019_CORE = 'WINDOWS_SERVER_2019_CORE',
}

export interface RuntimePlatform {
  /**
   * The CpuArchitecture for Fargate Runtime Platform.
   *
   * Default - AWS default of X86_64.
   */
  readonly cpuArchitecture?: CpuArchitecture;

  /**
   * The operating system for Fargate Runtime Platform.
   *
   * @default - AWS default of LINUX.
   */
  readonly operatingSystemFamily?: OperatingSystemFamily;
}

export interface FargateTaskDefinitionV2Args extends CommonTaskdefinitionOptions {
  /**
   * The number of cpu units used by the task. For tasks using the Fargate launch type, this field
   * is required and you must use one of the following values, which determines your range of valid
   * values for the memory parameter:
   *
   * 256 (.25 vCPU) - Available memory values: 512 (0.5 GB), 1024 (1 GB), 2048 (2 GB)
   *
   * 512 (.5 vCPU) - Available memory values: 1024 (1 GB), 2048 (2 GB), 3072 (3 GB), 4096 (4 GB)
   *
   * 1024 (1 vCPU) - Available memory values: 2048 (2 GB), 3072 (3 GB), 4096 (4 GB), 5120 (5 GB),
   * 6144 (6 GB), 7168 (7 GB), 8192 (8 GB)
   *
   * 2048 (2 vCPU) - Available memory values: Between 4096 (4 GB) and 16384 (16 GB) in increments of
   * 1024 (1 GB)
   *
   * 4096 (4 vCPU) - Available memory values: Between 8192 (8 GB) and 30720 (30 GB) in increments of
   * 1024 (1 GB)
   *
   * 8192 (8 vCPU) - Available memory values: Between 16384 (16 GB) and 61440 (60 GB) in increments
   * of 4096 (4 GB)
   *
   * 16384 (16 vCPU) - Available memory values: Between 32768 (32 GB) and 122880 (120 GB) in
   * increments of 8192 (8 GB)
   *
   * 32768 (32 vCPU) - Available memory values: 61440 (60 GB), 122880 (120 GB), 249856 (244 GB)
   *
   * The 256 and 512 CPU values support Linux tasks only. The 8192, 16384, and 32768 CPU values
   * require Linux platform version 1.4.0 or later. The other CPU values support Linux and Windows
   * tasks.
   *
   * For Windows tasks, the task-level CPU value is not enforced at runtime. It is still required to
   * select the task size.
   *
   * Default - A CPU value will be automatically selected based on the container-level CPU and
   * memory requirements
   */
  readonly cpu?: number;
  /**
   * The amount (in MiB) of memory used by the task. For tasks using the Fargate launch type, this
   * field is required and must be valid for the selected CPU value:
   *
   * 256 CPU units - 512 (0.5 GB), 1024 (1 GB), or 2048 (2 GB)
   *
   * 512 CPU units - Between 1024 (1 GB) and 4096 (4 GB) in increments of 1024 (1 GB)
   *
   * 1024 CPU units - Between 2048 (2 GB) and 8192 (8 GB) in increments of 1024 (1 GB)
   *
   * 2048 CPU units - Between 4096 (4 GB) and 16384 (16 GB) in increments of 1024 (1 GB)
   *
   * 4096 CPU units - Between 8192 (8 GB) and 30720 (30 GB) in increments of 1024 (1 GB)
   *
   * 8192 CPU units - Between 16384 (16 GB) and 61440 (60 GB) in increments of 4096 (4 GB)
   *
   * 16384 CPU units - Between 32768 (32 GB) and 122880 (120 GB) in increments of 8192 (8 GB)
   *
   * 32768 CPU units - 61440 (60 GB), 122880 (120 GB), or 249856 (244 GB)
   *
   * The 256 and 512 CPU values support Linux tasks only. The 8192, 16384, and 32768 CPU values
   * require Linux platform version 1.4.0 or later. The other CPU values support Linux and Windows
   * tasks.
   *
   * For Windows tasks, the task-level memory value is not enforced at runtime. It is still required
   * to select the task size.
   *
   * Default - A memory value will be automatically selected based on the container-level CPU and
   * memory requirements
   */
  readonly memory?: number;

  /**
   * The amount (in GiB) of ephemeral storage to be allocated to the task.
   *
   * Only supported in Fargate platform version 1.4.0 or later.
   *
   * Default - Undefined, in which case, the task will receive 20GiB ephemeral storage.
   */
  readonly ephemeralStorage?: number;

  /**
   * Containers in the task, keyed by container name.
   *
   * AWSX uses each map key as the corresponding ECS container name.
   */
  containers: Record<string, FargateContainerDefinitionOptions>;

  /**
   * The operating system that your task definitions are running on.
   *
   * Default - AWS default of X86_64 Linux
   */
  runtimePlatform?: RuntimePlatform;
}

type ResolvedPolicyStatement = pulumi.Unwrap<input.iam.PolicyStatement>;

interface Rendered<T> {
  value: pulumi.Output<T>;
  executionRoleStatements: pulumi.Output<ResolvedPolicyStatement | undefined>[];
}

export const fargateTaskDefinitionStandaloneIdentity: ComponentIdentity = {
  type: 'awsx-experimental:index:FargateTaskDefinitionV2',
  aliases: [{ type: 'awsx:experimental/ecs:FargateTaskDefinitionV2' }],
};

export const fargateTaskDefinitionAwsxIdentity: ComponentIdentity = {
  type: 'awsx:experimental/ecs:FargateTaskDefinitionV2',
  aliases: [{ type: 'awsx-experimental:index:FargateTaskDefinitionV2' }],
};

export class FargateTaskDefinitionV2 extends pulumi.ComponentResource {
  /**
   * The Task Role of the task
   */
  public readonly taskRole!: aws.iam.Role;

  /**
   * The Execution Role of the task
   */
  public readonly executionRole!: aws.iam.Role;

  /**
   * The task definition resource
   */
  public readonly taskDefinition!: aws.ecs.TaskDefinition;

  /**
   * The shared CloudWatch Logs log group created by the component for containers that enable
   * CloudWatch logging without specifying `logGroupArn`. This output is undefined when the
   * component does not create a default log group
   */
  public logGroup?: aws.cloudwatch.LogGroup;

  public readonly name!: string;

  public readonly region?: string;
  constructor(
    name: string,
    args: FargateTaskDefinitionV2Args,
    opts: pulumi.ComponentResourceOptions = {},
    /**
     * @internal
     */
    identity: ComponentIdentity = fargateTaskDefinitionAwsxIdentity,
  ) {
    const inputs = opts.urn
      ? {
          taskRole: undefined,
          executionRole: undefined,
          taskDefinitionArn: undefined,
          logGroup: undefined,
        }
      : args;
    super(
      identity.type,
      name,
      inputs,
      pulumi.mergeOptions(opts, {
        aliases: identity.aliases,
      }),
    );
    if (opts.urn) {
      return;
    }
    this.region = args.region;

    this.name = name;
    const containerEntries = Object.entries(args.containers);
    if (containerEntries.length === 0) {
      throw new pulumi.InputPropertyError({
        reason: 'At least one container must be provided',
        propertyPath: 'containers',
      });
    }

    if (
      args.ephemeralStorage !== undefined &&
      (!Number.isInteger(args.ephemeralStorage) ||
        args.ephemeralStorage < 21 ||
        args.ephemeralStorage > 200)
    ) {
      throw new pulumi.InputPropertyError({
        propertyPath: 'ephemeralStorage',
        reason: 'ephemeralStorage must be an integer between 21 and 200',
      });
    }

    const { cpu, memory } = resolveFargateTaskMemoryAndCpu(
      containerEntries.map(([, container]) => container),
      args.cpu,
      args.memory,
    );

    const family = args.family ?? name;
    if (args.executionRoleArn) {
      this.executionRole = aws.iam.Role.get(
        `${this.name}-execRole`,
        roleNameFromArn(args.executionRoleArn, this),
        undefined,
        {
          parent: this,
        },
      );
    } else {
      this.executionRole = new aws.iam.Role(
        `${name}-execRole`,
        {
          assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
            aws.iam.Principals.EcsTasksPrincipal,
          ),
        },
        { parent: this },
      );
    }

    if (args.taskRoleArn) {
      this.taskRole = aws.iam.Role.get(
        `${this.name}-taskRole`,
        roleNameFromArn(args.taskRoleArn, this),
        undefined,
        {
          parent: this,
        },
      );
    } else {
      this.taskRole = new aws.iam.Role(
        `${name}-taskRole`,
        {
          assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
            aws.iam.Principals.EcsTasksPrincipal,
          ),
        },
        { parent: this },
      );
    }

    const executionRoleStatements: pulumi.Output<ResolvedPolicyStatement | undefined>[] = [];
    const ecrRepositories: pulumi.Output<string | undefined>[] = [];
    const containerDefinitionsApi: pulumi.Output<ContainerDefinitionArgs>[] = containerEntries.map(
      ([containerName, container]) => {
        const ecrRepo = this.renderEcrPullStatementResource(container.image);
        ecrRepositories.push(ecrRepo);
        const credentialSpecs = container.credentialSpecs?.map((spec, i) =>
          this.renderCredentialSpec(spec, containerName, i),
        );
        const environmentFiles = container.environmentFiles?.map((file, i) =>
          this.renderEnvironmentFile(`containers.${containerName}.environmentFiles[${i}]`, file),
        );
        const secrets = this.renderSecrets(containerName, container.secrets);
        const logs = this.renderCloudWatchLogDriver(containerName, container.logging?.cloudwatch);

        executionRoleStatements.push(
          ...(credentialSpecs?.flatMap((rendered) => rendered.executionRoleStatements) ?? []),
          ...(environmentFiles?.flatMap((rendered) => rendered.executionRoleStatements) ?? []),
          ...(secrets?.flatMap((rendered) => rendered.executionRoleStatements) ?? []),
          ...(logs?.executionRoleStatements ?? []),
        );

        const c = this.toContainerDefinition(
          containerName,
          container,
          credentialSpecs?.map((rendered) => rendered.value),
          environmentFiles?.map((rendered) => rendered.value),
          secrets?.map((rendered) => rendered.value),
          logs?.value,
        );
        return pulumi.output(c.definition);
      },
    );

    const rolePolicy = new aws.iam.RolePolicy(
      `${name}-execRole-container-policy`,
      {
        role: this.executionRole.name,
        policy: this.renderContainerExecRolePolicy(executionRoleStatements, ecrRepositories),
      },
      { parent: this },
    );

    this.taskDefinition = new aws.ecs.TaskDefinition(
      `${name}-taskdef`,
      {
        containerDefinitions: pulumi.jsonStringify(containerDefinitionsApi),
        family,
        cpu: `${cpu}`,
        memory: `${memory}`,
        requiresCompatibilities: ['FARGATE'],
        region: args.region,
        executionRoleArn: this.executionRole.arn,
        taskRoleArn: this.taskRole.arn,
        networkMode: 'awsvpc',
        runtimePlatform: args.runtimePlatform,
        ephemeralStorage:
          args.ephemeralStorage !== undefined
            ? {
                sizeInGib: args.ephemeralStorage,
              }
            : undefined,
      },
      {
        parent: this,
        dependsOn: rolePolicy ? [rolePolicy] : [],
      },
    );

    this.registerOutputs({
      executionRole: this.executionRole,
      taskRole: this.taskRole,
      taskDefinition: this.taskDefinition,
      logGroup: this.logGroup,
      name: this.name,
      region: this.region,
    });
  }

  /**
   * Gets or creates the default CloudWatch log group.
   *
   * @returns The default log group.
   */
  private obtainDefaultLogGroup(): aws.cloudwatch.LogGroup {
    if (!this.logGroup) {
      this.logGroup = new aws.cloudwatch.LogGroup(
        `${this.name}-logGroup`,
        {
          region: this.region,
        },
        { parent: this },
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
        /^(?<account>\d{12})\.dkr\.ecr\.(?<region>[a-z0-9-]+)\.(?<domain>amazonaws\.com(?:\.cn)?)\/(?<repo>[a-zA-Z0-9_\-/]+)(?::(?<tag>[a-zA-Z0-9_.-]+)|@(?<digest>sha256:[a-fA-F0-9]{64}))?$/.exec(
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
   * Converts a credential specification input to the value expected by ECS.
   *
   * @param spec The credential specification to render.
   * @param containerName The name of the container this spec is associated with
   * @param idx The array index of this specific spec (each container can have multiple)
   * @returns The rendered value and its execution-role statements.
   */
  private renderCredentialSpec(
    spec: CredentialSpec,
    containerName: string,
    idx: number,
  ): Rendered<string> {
    const propertyPath = `containers.${containerName}.credentialSpecs[${idx}]`;
    if (spec.s3Bucket && spec.ssmParameterArn) {
      throw new pulumi.InputPropertyError({
        propertyPath,
        reason: 'Only one of s3Bucket or ssmParameter can be defined',
      });
    }

    if (!spec.s3Bucket && !spec.ssmParameterArn) {
      throw new pulumi.InputPropertyError({
        propertyPath,
        reason: 'One of s3Bucket or ssmParameter must be provided',
      });
    }

    let prefix: string;
    switch (spec.authenticationMode) {
      case 'DomainJoined':
        prefix = 'credentialspec';
        break;
      case 'Domainless':
        prefix = 'credentialspecdomainless';
        break;
      default:
        throw new pulumi.InputPropertyError({
          propertyPath: `${propertyPath}.authenticationMode`,
          reason: `Unsupported credential spec authentication mode: ${spec.authenticationMode}`,
        });
    }

    if (spec.s3Bucket) {
      const objectArn = pulumi.interpolate`${spec.s3Bucket.bucketArn}/${spec.s3Bucket.key}`;
      return {
        value: pulumi.interpolate`${prefix}:${objectArn}`,
        executionRoleStatements: [
          this.executionRoleStatement({
            Effect: 'Allow',
            Action: ['s3:GetBucketLocation', 's3:ListBucket'],
            Resource: spec.s3Bucket.bucketArn,
          }),
          this.executionRoleStatement({
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:GetObjectVersion'],
            Resource: objectArn,
          }),
        ],
      };
    }

    const parameter = aws.ssm.Parameter.get(
      `${this.name}-${containerName}-credentialSpec-${idx}-param`,
      parameterNameFromArn(spec.ssmParameterArn!, this),
      undefined,
      { parent: this },
    );
    return {
      value: pulumi.interpolate`${prefix}:${parameter.arn}`,
      executionRoleStatements: [
        this.executionRoleStatement({
          Effect: 'Allow',
          Action: ['ssm:GetParameter', 'ssm:GetParameters'],
          Resource: parameter.arn,
        }),
        this.renderKmsDecryptStatement(parameter.keyId, parameter.region),
      ],
    };
  }

  /**
   * Renders the secrets configured for a container.
   *
   * @param containerName The name of the container the secrets are associated with
   * @param secrets The secrets to render.
   * @returns The rendered secrets, or undefined when none are configured.
   */
  private renderSecrets(
    containerName: string,
    secrets?: Record<string, Secret>,
  ): Rendered<ContainerDefinitionSecret>[] | undefined {
    if (!secrets) {
      return;
    }
    const propertyPath = `containers.${containerName}.secrets`;
    const renderedSecrets: Rendered<ContainerDefinitionSecret>[] = [];
    for (const [name, secret] of Object.entries(secrets)) {
      if (secret.secretsManager && secret.ssmParameterArn) {
        throw new pulumi.InputPropertyError({
          propertyPath: `${propertyPath}.${name}`,
          reason: 'Only one secret source can be set',
        });
      }

      if (!secret.secretsManager && !secret.ssmParameterArn) {
        throw new pulumi.InputPropertyError({
          propertyPath: `${propertyPath}.${name}`,
          reason: 'A secret source is required',
        });
      }

      if (secret.secretsManager?.versionId && secret.secretsManager?.versionStage) {
        throw new pulumi.InputPropertyError({
          propertyPath: `${propertyPath}.${name}.secretsManager`,
          reason: 'versionStage and versionId cannot be used together',
        });
      }
      if (secret.secretsManager) {
        renderedSecrets.push(
          this.renderSecretsManagerSecret(containerName, name, secret.secretsManager),
        );
      }
      if (secret.ssmParameterArn) {
        renderedSecrets.push(this.renderSsmSecret(containerName, name, secret.ssmParameterArn));
      }
    }
    return renderedSecrets;
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
  ): Rendered<ContainerDefinitionSecret> {
    const propertyPath = `containers.${containerName}.secrets.${name}.secretsManager.secretArn`;
    const secretRegion = Arn.split(source.secretArn, ArnFormat.COLON_RESOURCE_NAME, this).apply(
      (parts) => {
        if (!parts.region) {
          throw new pulumi.InputPropertyError({
            propertyPath,
            reason: 'The Secrets Manager ARN must contain a region',
          });
        }
        return parts.region;
      },
    );
    const secret = aws.secretsmanager.Secret.get(
      `${this.name}-${containerName}-${name}-secret`,
      source.secretArn,
      { region: secretRegion },
      { parent: this },
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
  ): Rendered<ContainerDefinitionSecret> {
    const parameter = aws.ssm.Parameter.get(
      `${this.name}-${containerName}-secret-${name}-param`,
      parameterNameFromArn(parameterArn, this),
      undefined,
      { parent: this },
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
            { parent: this },
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
  ): Rendered<ContainerDefinitionEnvironmentFile> {
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
      value: objectArn.apply((value): ContainerDefinitionEnvironmentFile => ({
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
    driver?: FargateAwsLogsLogDriver,
  ): Rendered<LogConfiguration> | undefined {
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
        `${this.name}-${containerName}-logGroup`,
        logGroupNameFromArn(driver.logGroupArn, this),
        undefined,
        {
          parent: this,
        },
      );
    }
    logGroup = logGroup ?? this.obtainDefaultLogGroup();
    const value = pulumi
      .all([
        logGroup.name,
        logGroup.region,
        driver.streamPrefix,
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
        ]): LogConfiguration => ({
          logDriver: LogConfigurationLogDriver.AWSLOGS,
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
   * Converts higher-level container options to the Amazon ECS API shape.
   *
   * @param containerName The name of the container
   * @param options Parameters for configuring the container definition.
   * @param credentialSpecs The rendered credential specifications.
   * @param environmentFiles The rendered environment files.
   * @param secrets The rendered secrets.
   * @param logConfiguration The rendered log configuration.
   * @returns The container definition.
   */
  private toContainerDefinition(
    containerName: string,
    options: Omit<
      FargateContainerDefinitionOptions,
      'credentialSpecs' | 'environmentFiles' | 'secrets' | 'logging'
    >,
    credentialSpecs?: pulumi.Output<string>[],
    environmentFiles?: pulumi.Output<ContainerDefinitionEnvironmentFile>[],
    secrets?: pulumi.Output<ContainerDefinitionSecret>[],
    logConfiguration?: pulumi.Output<LogConfiguration>,
  ): ContainerDefinition {
    return new ContainerDefinition(
      `${this.name}-${containerName}`,
      {
        credentialSpecs,
        logConfiguration,
        secrets,
        environmentFiles,
        command: options.command,
        cpu: options.cpu,
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
        versionConsistency: options.versionConsistency,
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
        environment: options.environment
          ? Object.entries(options.environment).map(([name, value]) => ({ name, value }))
          : undefined,
      },
      { parent: this },
    );
  }
}
/**
 * Converts high-level Fargate port mappings to the ECS API shape.
 *
 * @param mappings The port mappings to render.
 * @returns The rendered port mappings, or undefined when none are configured.
 */
export function renderPortMappings(mappings?: FargatePortMapping[]): PortMapping[] | undefined {
  return mappings?.map((mapping): PortMapping => {
    return {
      ...mapping,
      containerPortRange: mapping.containerPortRange
        ? `${mapping.containerPortRange.start}-${mapping.containerPortRange.end}`
        : undefined,
      appProtocol:
        mapping.appProtocol === undefined
          ? undefined
          : mapping.appProtocol === 'http'
            ? PortMappingAppProtocol.HTTP
            : mapping.appProtocol === 'http2'
              ? PortMappingAppProtocol.HTTP2
              : PortMappingAppProtocol.GRPC,
      protocol:
        mapping.protocol === undefined
          ? undefined
          : mapping.protocol === 'tcp'
            ? PortMappingProtocol.TCP
            : PortMappingProtocol.UDP,
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
 * @param parent The parent component
 * @returns The name of the parameter which can be used as the import id
 */
function parameterNameFromArn(
  arn: pulumi.Input<string>,
  parent: pulumi.ComponentResource,
): pulumi.Output<string> {
  const currentRegion = aws.getRegionOutput(undefined, { parent }).region;
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
    return parts.resourceName.split('/').at(-1)!;
  });
}

/**
 * Get a CloudWatch Logs LogGroup Import ID from an ARN
 *
 * @param arn The LogGroup ARN
 * @param parent The parent component
 * @returns The name of the log group which can be used as the import id
 */
function logGroupNameFromArn(
  arn: pulumi.Input<string>,
  parent: pulumi.ComponentResource,
): pulumi.Output<string> {
  const currentRegion = aws.getRegionOutput(undefined, { parent }).region;
  const arnParts = Arn.split(arn, ArnFormat.SLASH_RESOURCE_NAME, parent);
  return pulumi.all([arnParts, currentRegion]).apply(([parts, region]) => {
    if (!parts.resourceName) {
      throw new Error(`Could not extract role name from arn ${arn}`);
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
