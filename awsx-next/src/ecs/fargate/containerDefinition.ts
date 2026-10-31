import type { ContainerDefinitionOptions } from '../base/containerDefinition';
import type { FargateCredentialSpec } from '../credentialSpec';

/**
 * Container configuration for Fargate tasks.
 */
export interface FargateContainerDefinitionOptions extends ContainerDefinitionOptions {
  /**
   * Domainless Active Directory authentication using an S3 credential specification.
   *
   * Supported only for Linux containers on Fargate platform version 1.4.0 or later.
   *
   * Default - No Active Directory authentication.
   */
  readonly credentialSpec?: FargateCredentialSpec;
}
