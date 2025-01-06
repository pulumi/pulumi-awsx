// Copyright 2016-2022, Pulumi Corporation.
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

export interface DockerCredentials {
    address: string;
    username: string;
    password: string;
}

export function getAuthToken(registryUrl: string, opts: pulumi.InvokeOutputOptions): pulumi.Output<DockerCredentials> {
    // add protocol to help parse the url
    if (!registryUrl?.startsWith("https://")) {
        registryUrl = "https://" + registryUrl;
    }
    if (!URL.canParse(registryUrl)) {
        throw new Error(`Cannot parse invalid registry URL: '${registryUrl}'`);
    }

    // the registry id is the AWS account id. It's the first part of the hostname
    const parsedUrl = new URL(registryUrl);
    const registryId = parsedUrl.hostname.split(".")[0];

    const ecrCredentials = aws.ecr.getCredentialsOutput(
        { registryId: registryId },
        opts,
    );

    return ecrCredentials.apply((creds) => {
        const decodedCredentials = Buffer.from(creds.authorizationToken, "base64").toString();
        const [username, password] = decodedCredentials.split(":");
        if (!password || !username) {
            throw new Error("Invalid credentials");
        }
        return {
            address: creds.proxyEndpoint,
            username: username,
            password: password,
        };
    });
}
