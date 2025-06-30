// Copyright 2016-2025, Pulumi Corporation.
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

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * Arguments for fetching ECR registry credentials.
 */
export interface CredentialArgs {
  /**
   * The URL of the ECR registry to get credentials for.
   * Can be provided with or without the https:// protocol prefix.
   */
  repositoryUrl: string;

  /**
   * Optional registry ID (AWS account ID) to get credentials for.
   * If not provided, will be parsed from the registry URL.
   */
  registryId?: string;
}

/**
 * Docker registry credentials for authenticating with an ECR registry.
 */
export interface DockerCredentials {
  /**
   * The address of the ECR registry.
   */
  address: string;

  /**
   * The username to authenticate with. For ECR this is typically "AWS".
   */
  username: string;

  /**
   * The password to authenticate with. For ECR this is a temporary token.
   */
  password: string;
}

/**
 * Fetches Docker registry credentials for authenticating with an ECR registry.
 *
 * @param args Arguments for fetching ECR registry credentials
 * @param opts InvokeOutputOptions to use for the credential lookup
 * @returns Docker registry credentials including address, username and password
 */
export function getDockerCredentials(
  args: CredentialArgs,
  opts: pulumi.InvokeOutputOptions,
): pulumi.Output<DockerCredentials> {
  let registryId: string;
  if (args.registryId) {
    registryId = args.registryId;
  } else {
    // add protocol to help parse the url
    const repositoryUrl = args.repositoryUrl?.startsWith("https://")
      ? args.repositoryUrl
      : "https://" + args.repositoryUrl;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(repositoryUrl);
    } catch (e) {
      throw new pulumi.InputPropertyError({
        reason: `Repository URL is not a valid URL.`,
        propertyPath: "repositoryUrl",
      });
    }

    const hostnameParts = parsedUrl.hostname.split(".");
    if (hostnameParts.length < 1) {
      throw new pulumi.InputPropertyError({
        reason: `Could not parse registry ID from Repository URL. It should be in the format of <account-id>.dkr.ecr.<region>.amazonaws.com`,
        propertyPath: "repositoryUrl",
      });
    }

    // the registry id is the AWS account id. It's the first part of the hostname
    registryId = hostnameParts[0];
  }

  const ecrCredentials = aws.ecr.getAuthorizationTokenOutput({ registryId: registryId }, opts);

  return ecrCredentials.apply((creds: any) => {
    return {
      address: creds.proxyEndpoint as string,
      username: creds.userName as string,
      password: creds.password as string,
    };
  });
}
