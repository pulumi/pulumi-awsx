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
import { LogGroup, LogGroupReference } from '../../cloudwatch/logGroup';

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
   * Default - Automatically generated name.
   */
  readonly family?: string;

  /**
   * The name of the IAM task execution role that grants the ECS agent permission to call AWS APIs
   * on your behalf.
   *
   * The role will be used to retrieve container images from ECR and create CloudWatch log groups.
   *
   * Default - An execution role will be automatically created if you use ECR images in your task
   * definition.
   */
  readonly executionRole?: aws.iam.Role;

  /**
   * The name of the IAM role that grants containers in the task permission to call AWS APIs on your
   * behalf.
   *
   * Default - A task role is automatically created for you.
   */
  readonly taskRole?: aws.iam.Role;
}

interface FargateTaskDefinitionV2Data {
  taskDefinitionArn: pulumi.Output<string>;
  executionRole: aws.iam.Role;
  taskRole: aws.iam.Role;
  logGroup?: aws.cloudwatch.LogGroup;
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
   * Default - 256
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
   * Default - 512
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

export class FargateTaskDefinitionV2 extends pulumi.ComponentResource<FargateTaskDefinitionV2Data> {
  public readonly taskRole!: aws.iam.Role;
  public readonly executionRole!: aws.iam.Role;
  public readonly taskDefinitionArn!: pulumi.Output<string>;
  private readonly name!: string;
  private readonly region?: string;
  private _logGroup?: LogGroupReference;
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
      : { name, args, opts };
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

    // see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-iam-roles.html
    this.executionRole =
      args.executionRole ??
      new aws.iam.Role(
        `${name}-exec-role`,
        {
          assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
            aws.iam.Principals.EcsTasksPrincipal,
          ),
        },
        { parent: this },
      );

    this.taskRole =
      args.taskRole ??
      new aws.iam.Role(
        `${name}-task-role`,
        {
          assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
            aws.iam.Principals.EcsTasksPrincipal,
          ),
        },
        { parent: this },
      );

    const executionRoleStatements: pulumi.Output<ResolvedPolicyStatement | undefined>[] = [];
    const containerDefinitionsApi: ContainerDefinitionArgs[] = containerEntries.map(
      ([containerName, container]) => {
        const credentialSpecs = container.credentialSpecs?.map((spec, i) =>
          this.renderCredentialSpec(spec, `containers.${containerName}.credentialSpecs[${i}]`),
        );
        const environmentFiles = container.environmentFiles?.map((file, i) =>
          this.renderEnvironmentFile(`containers.${containerName}.environmentFiles[${i}]`, file),
        );
        const secrets = this.renderSecrets(
          `containers.${containerName}.secrets`,
          container.secrets,
        );
        const logs = this.renderCloudWatchLogDriver(
          `containers.${containerName}.logging.cloudwatch`,
          container.logging?.cloudwatch,
        );

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
        return c.definition;
      },
    );

    const rolePolicy =
      executionRoleStatements.length > 0
        ? new aws.iam.RolePolicy(
            `${name}-execRole-container-policy`,
            {
              role: this.executionRole.name,
              policy: this.renderContainerExecRolePolicy(executionRoleStatements),
            },
            { parent: this },
          )
        : undefined;

    const taskDef = new aws.ecs.TaskDefinition(
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
    this.taskDefinitionArn = taskDef.arn;

    this.registerOutputs({
      executionRole: this.executionRole,
      taskRole: this.taskRole,
      taskDefinitionArn: this.taskDefinitionArn,
      logGroup: this._logGroup,
    });
  }

  /**
   * Gets the log group created for the default CloudWatch Logs driver.
   *
   * @returns The log group, if the task uses the default log driver.
   */
  public get logGroup(): LogGroupReference | undefined {
    return this._logGroup;
  }

  /**
   * Gets or creates the default CloudWatch log group.
   *
   * @returns The default log group.
   */
  private obtainDefaultLogGroup(): LogGroupReference {
    if (!this._logGroup) {
      this._logGroup = new LogGroup(
        `${this.name}-logGroup`,
        {
          // region: this.region,
        },
        { parent: this },
      );
    }

    return this._logGroup;
  }

  /**
   * Renders execution-role statements as an IAM policy document.
   *
   * @param statements The statements to include in the policy.
   * @returns The JSON policy document.
   */
  private renderContainerExecRolePolicy(
    statements: pulumi.Output<ResolvedPolicyStatement | undefined>[],
  ): pulumi.Output<string> {
    const document = pulumi.all(statements).apply((resolvedStatements) => ({
      Version: '2012-10-17',
      Statement: resolvedStatements.filter(
        (statement): statement is ResolvedPolicyStatement => statement !== undefined,
      ),
    }));
    return pulumi.jsonStringify(document);
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
   * @param propertyPath The input property path used in validation errors.
   * @returns The rendered value and its execution-role statements.
   */
  private renderCredentialSpec(spec: CredentialSpec, propertyPath: string): Rendered<string> {
    if (spec.s3Bucket && spec.ssmParameter) {
      throw new pulumi.InputPropertyError({
        propertyPath,
        reason: 'Only one of s3Bucket or ssmParameter can be defined',
      });
    }

    if (!spec.s3Bucket && !spec.ssmParameter) {
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
      const objectArn = pulumi.interpolate`${spec.s3Bucket.bucket.arn}/${spec.s3Bucket.key}`;
      return {
        value: pulumi.interpolate`${prefix}:${objectArn}`,
        executionRoleStatements: [
          this.executionRoleStatement({
            Effect: 'Allow',
            Action: 's3:GetBucketLocation',
            Resource: spec.s3Bucket.bucket.arn,
          }),
          this.executionRoleStatement({
            Effect: 'Allow',
            Action: 's3:GetObject',
            Resource: objectArn,
          }),
        ],
      };
    }

    const parameter = spec.ssmParameter!;
    return {
      value: pulumi.interpolate`${prefix}:${parameter.arn}`,
      executionRoleStatements: [
        this.executionRoleStatement({
          Effect: 'Allow',
          Action: 'ssm:GetParameter',
          Resource: parameter.arn,
        }),
        this.renderKmsDecryptStatement(parameter.keyId, parameter.region),
      ],
    };
  }

  /**
   * Renders the secrets configured for a container.
   *
   * @param propertyPath The input property path used in validation errors.
   * @param secrets The secrets to render.
   * @returns The rendered secrets, or undefined when none are configured.
   */
  private renderSecrets(
    propertyPath: string,
    secrets?: Record<string, Secret>,
  ): Rendered<ContainerDefinitionSecret>[] | undefined {
    if (!secrets) {
      return;
    }
    const renderedSecrets: Rendered<ContainerDefinitionSecret>[] = [];
    for (const [name, secret] of Object.entries(secrets)) {
      if (secret.secretsManager && secret.ssmParameter) {
        throw new pulumi.InputPropertyError({
          propertyPath: `${propertyPath}.${name}`,
          reason: 'Only one secret source can be set',
        });
      }

      if (!secret.secretsManager && !secret.ssmParameter) {
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
        renderedSecrets.push(this.renderSecretsManagerSecret(name, secret.secretsManager));
      }
      if (secret.ssmParameter) {
        renderedSecrets.push(this.renderSsmSecret(name, secret.ssmParameter));
      }
    }
    return renderedSecrets;
  }

  /**
   * Renders an AWS Secrets Manager secret reference.
   *
   * @param name The environment variable name.
   * @param source The Secrets Manager source configuration.
   * @returns The rendered secret and its execution-role statements.
   */
  private renderSecretsManagerSecret(
    name: string,
    source: SecretsManagerSecret,
  ): Rendered<ContainerDefinitionSecret> {
    const value = pulumi
      .all([source.secret.arn, source.jsonKey, source.versionStage, source.versionId])
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
          Resource: source.secret.arn,
        }),
        this.renderKmsDecryptStatement(source.secret.kmsKeyId, source.secret.region),
      ],
    };
  }

  /**
   * Renders an AWS Systems Manager Parameter Store secret reference.
   *
   * @param name The environment variable name.
   * @param parameter The Parameter Store parameter.
   * @returns The rendered secret and its execution-role statements.
   */
  private renderSsmSecret(
    name: string,
    parameter: aws.ssm.Parameter,
  ): Rendered<ContainerDefinitionSecret> {
    return {
      value: parameter.arn.apply((arn) => ({ name, valueFrom: arn })),
      executionRoleStatements: [
        this.executionRoleStatement({
          Effect: 'Allow',
          Action: 'ssm:GetParameters',
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
    const objectArn = pulumi.interpolate`${file.bucket.arn}/${key}`;
    return {
      value: objectArn.apply((value): ContainerDefinitionEnvironmentFile => ({
        value,
        type: 's3',
      })),
      executionRoleStatements: [
        this.executionRoleStatement({
          Effect: 'Allow',
          Action: 's3:GetBucketLocation',
          Resource: file.bucket.arn,
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
   * @param propertyPath The input property path used in validation errors.
   * @param driver The log driver options.
   * @returns The log configuration, or undefined when logging is not configured.
   */
  private renderCloudWatchLogDriver(
    propertyPath: string,
    driver?: FargateAwsLogsLogDriver,
  ): Rendered<LogConfiguration> | undefined {
    if (!driver) {
      return;
    }
    if (driver.datetimeFormat && driver.multilinePattern) {
      throw new pulumi.InputPropertyError({
        propertyPath,
        reason: 'Only one of datetimeFormat and multilinePattern can be provided',
      });
    }
    const logGroup = driver.logGroup ?? this.obtainDefaultLogGroup();
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
      containerName,
      {
        credentialSpecs,
        logConfiguration,
        secrets,
        environmentFiles,
        command: options.command,
        cpu: options.cpu,
        memory: options.memory,
        memoryReservation: options.memoryReservation,
        portMappings: renderPortMappings(options.portMappings),
        essential: options.essential ?? true,
        // TODO: this requires more design
        // restartPolicy: options.restartPolicy,
        entryPoint: options.entryPoint,
        // TODO: this requires more design
        // mountPoints: options.mountPoints,
        volumesFrom: options.volumesFrom,
        linuxParameters: options.linuxParameters,
        startTimeout: options.startTimeout,
        stopTimeout: options.stopTimeout,
        versionConsistency: options.versionConsistency,
        user: options.user,
        workingDirectory: options.workingDirectory,
        readonlyRootFilesystem: options.readonlyRootFilesystem,
        interactive: options.interactive,
        pseudoTerminal: options.pseudoTerminal,
        dockerLabels: options.dockerLabels,
        ulimits: options.ulimits,
        healthCheck: options.healthCheck,
        systemControls: options.systemControls,
        // TODO: this requires more design
        // firelensConfiguration: options.firelensConfiguration,
        image: options.image,
        name: containerName,
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
