// Copyright 2016-2018, Pulumi Corporation.
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

import * as acmpca from "./acmpca";
import * as apigateway from "./apigateway";
import * as autoscaling from "./autoscaling";
import * as cloudfront from "./cloudfront";
import * as cloudwatch from "./cloudwatch";
import * as codebuild from "./codebuild";
import * as cognito from "./cognito";
import * as dynamodb from "./dynamodb";
import * as ebs from "./ebs";
import * as ec2 from "./ec2";
import * as ecr from "./ecr";
import * as ecs from "./ecs";
import * as efs from "./efs";
import * as lambda from "./lambda";
import * as lb from "./lb";
import * as rds from "./rds";
import * as s3 from "./s3";
import * as sns from "./sns";
import * as sqs from "./sqs";

export {
    acmpca,
    apigateway,
    autoscaling,
    cloudfront,
    cloudwatch,
    codebuild,
    cognito,
    dynamodb,
    ec2,
    ebs,
    ecr,
    ecs,
    efs,
    lb as elasticloadbalancingv2,
    lambda,
    lb,
    rds,
    s3,
    sns,
    sqs,
};

// @pulumi/awsx is a deployment-only module.  If someone tries to capture it, and we fail for some
// reason we want to give a good message about what the problem likely is.  Note that capturing a
// deployment time module can be ok in some cases.  For example, using "awsx.apigateway.authorizerResponse"
// as a helper function is fine. However, in general, the majority of this API is not safe to use
// at 'run time' and will fail.
/** @internal */
export const deploymentOnlyModule = true;
