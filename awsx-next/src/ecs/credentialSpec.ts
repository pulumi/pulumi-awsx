// Copyright 2016-2026, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as pulumi from '@pulumi/pulumi';

/**
 * The Active Directory authentication mode for an ECS credential specification.
 */
export enum CredentialSpecAuthenticationMode {
  /**
   * Use a container instance joined to the Active Directory domain to retrieve gMSA credentials.
   *
   * For more information, see [gMSA
   * prerequisites](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/windows-gmsa.html#windows-gmsa-prerequisites).
   */
  DOMAIN_JOINED = 'DomainJoined',
  /**
   * Use credentials referenced by the credential specification without joining the container
   * instance to the domain.
   *
   * For more information, see [domainless gMSA
   * setup](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/windows-gmsa.html#windows-gmsa-domainless)
   * and [gMSAs for Linux
   * containers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/linux-gmsa.html).
   */
  DOMAINLESS = 'Domainless',
}

/**
 * An S3 object that contains an ECS credential specification.
 */
export interface S3BucketCredentialSpec {
  /**
   * The ARN of a bucket that contains the credential specification file.
   */
  readonly bucketArn: pulumi.Input<string>;

  /**
   * The key of the credential specification file.
   */
  readonly key: pulumi.Input<string>;
}

/**
 * A credential specification source for Active Directory authentication.
 *
 * Exactly one of `s3Bucket` or `ssmParameterArn` must be specified. AWSX resolves the selected
 * resource to the ECS credential specification string.
 */
export interface CredentialSpec {
  /**
   * The Active Directory authentication mode.
   */
  readonly authenticationMode: CredentialSpecAuthenticationMode;

  /**
   * An S3 object that contains the credential specification file.
   */
  readonly s3Bucket?: S3BucketCredentialSpec;

  /**
   * The ARN of an SSM parameter that contains the credential specification file.
   */
  readonly ssmParameterArn?: pulumi.Input<string>;
}
