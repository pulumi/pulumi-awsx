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
 * Domainless Active Directory authentication for a Linux container on Fargate.
 *
 * Specify exactly one of `key` or `config`. Fargate supports domainless gMSA with a CredSpec stored
 * in S3; SSM-backed CredSpecs and domain-joined hosts are not supported.
 *
 * The component grants its execution role access to the object, the credentials secret referenced
 * by the CredSpec, and their customer-managed KMS keys. It does not modify bucket or key policies.
 *
 * See [Fargate gMSA
 * setup](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-linux-gmsa.html).
 */
export interface FargateCredentialSpec {
  /**
   * ARN of the general-purpose S3 bucket containing the CredSpec.
   *
   * The bucket remains user-managed. If its encryption configuration is created in the same update,
   * ensure the component depends on that configuration.
   */
  readonly bucketArn: pulumi.Input<string>;

  /**
   * Key of an existing CredSpec object. The component reads the JSON to discover its credentials
   * secret and reads the object's actual KMS key, which can differ from the bucket default.
   *
   * The object remains user-managed. Ensure it exists before the component's lookup, using
   * `dependsOn` when necessary. Changes to its contents are discovered on the next update.
   *
   * Default - Create an object from `config`.
   */
  readonly key?: pulumi.Input<string>;

  /**
   * Configuration used to generate a domainless CredSpec JSON object in the supplied bucket.
   *
   * The object uses the bucket's default encryption settings and a Pulumi auto-named key. Changing
   * the configuration replaces the object with a new key and registers a new task definition
   * revision. Removing this configuration deletes the component-managed object, not the bucket or
   * secret.
   *
   * Default - Read the existing object identified by `key`.
   */
  readonly config?: FargateCredentialSpecConfig;
}

/**
 * Active Directory and gMSA metadata used to generate a Fargate credential specification.
 *
 * Obtain the domain SID and GUID from Active Directory and create the gMSA account before using
 * this configuration. Network connectivity and DNS resolution to Active Directory remain the user's
 * responsibility.
 */
export interface FargateCredentialSpecConfig {
  /**
   * Security identifier (SID) of the Active Directory domain.
   */
  readonly domainSid: pulumi.Input<string>;

  /**
   * GUID of the Active Directory domain.
   */
  readonly domainGuid: pulumi.Input<string>;

  /**
   * DNS name of the Active Directory domain, for example `example.com`.
   */
  readonly domainName: pulumi.Input<string>;

  /**
   * DNS name of the Active Directory forest root.
   *
   * Default - `domainName`.
   */
  readonly dnsTreeName?: pulumi.Input<string>;

  /**
   * NetBIOS name of the Active Directory domain, for example `EXAMPLE`.
   */
  readonly netBiosName: pulumi.Input<string>;

  /**
   * Name of the gMSA account, for example `WebApp01`.
   */
  readonly gmsaAccountName: pulumi.Input<string>;

  /**
   * ARN of the Secrets Manager secret containing `username`, `password`, and `domainName` for an
   * Active Directory user allowed to retrieve the gMSA password. The secret remains user-managed;
   * only its metadata is read to discover the encryption key.
   */
  readonly credentialsSecretArn: pulumi.Input<string>;
}

/**
 * Render domainless CredSpec metadata in Microsoft's JSON format.
 *
 * @param config The domain and gMSA configuration.
 * @param propertyPath The input path for validation errors.
 * @returns The JSON document, without any secret values.
 */
export function renderCredentialSpecConfig(
  config: FargateCredentialSpecConfig,
  propertyPath: string,
): pulumi.Output<string> {
  return pulumi.output(config).apply((resolved) => {
    for (const field of [
      'domainSid',
      'domainGuid',
      'domainName',
      'netBiosName',
      'gmsaAccountName',
      'credentialsSecretArn',
    ] as const) {
      if (typeof resolved[field] !== 'string' || !resolved[field].trim()) {
        throw new pulumi.InputPropertyError({
          propertyPath: `${propertyPath}.${field}`,
          reason: `${field} must be a non-empty string`,
        });
      }
    }
    return JSON.stringify({
      CmsPlugins: ['ActiveDirectory'],
      DomainJoinConfig: {
        Sid: resolved.domainSid,
        MachineAccountName: resolved.gmsaAccountName,
        Guid: resolved.domainGuid,
        DnsTreeName: resolved.dnsTreeName ?? resolved.domainName,
        DnsName: resolved.domainName,
        NetBiosName: resolved.netBiosName,
      },
      ActiveDirectoryConfig: {
        GroupManagedServiceAccounts: [
          { Name: resolved.gmsaAccountName, Scope: resolved.domainName },
        ],
        HostAccountConfig: {
          PortableCcgVersion: '1',
          // AWS documents that Linux ignores it so just using an example placeholder
          // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/linux-gmsa.html
          PluginGUID: '{859E1386-BDB4-49E8-85C7-3070B13920E1}',
          PluginInput: { CredentialArn: resolved.credentialsSecretArn },
        },
      },
    });
  });
}

/**
 * Extract the domainless credentials secret from an existing Fargate CredSpec.
 *
 * @param body The JSON document read from S3.
 * @param propertyPath The existing-key input path for validation errors.
 * @returns The credentials secret ARN.
 */
export function credentialsSecretArnFromSpec(body: string, propertyPath: string): string {
  let spec;
  try {
    spec = JSON.parse(body);
  } catch {
    throw new pulumi.InputPropertyError({
      propertyPath,
      reason: 'The S3 credential specification must contain valid JSON',
    });
  }
  const arn = spec?.ActiveDirectoryConfig?.HostAccountConfig?.PluginInput?.CredentialArn;
  if (typeof arn !== 'string' || !arn.trim()) {
    throw new pulumi.InputPropertyError({
      propertyPath,
      reason:
        'The Fargate credential specification must reference a Secrets Manager secret at ActiveDirectoryConfig.HostAccountConfig.PluginInput.CredentialArn',
    });
  }
  return arn;
}
