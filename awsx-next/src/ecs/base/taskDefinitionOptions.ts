import type * as pulumi from '@pulumi/pulumi';

export interface CommonTaskDefinitionOptions {
  /**
   * Region where this task and its supporting resources will be managed.
   *
   * The AWS Native provider must use this region and the same account as the AWS provider. This
   * input does not override the AWS Native provider configuration.
   *
   * Default - Region set in the AWS provider configuration.
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
   * definitions. Policies for AWSX-managed environment secrets are retained when a variable is
   * removed, preserving access for older task definitions using this role.
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
