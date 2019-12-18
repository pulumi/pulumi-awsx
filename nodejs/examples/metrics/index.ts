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

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as fetch from "node-fetch";

const config = new pulumi.Config("aws");
const providerOpts = { provider: new aws.Provider("prov", { region: <aws.Region>config.require("envRegion") }) };

// Examples of different types of metrics and alarms that can be set.

const topic = new aws.sns.Topic("sites-to-process-topic", {}, providerOpts);
const subscription = topic.onEvent("for-each-url", async (event) => {
    const records = event.Records || [];
    for (const record of records) {
        const url = record.Sns.Message;

        console.log(`${url}: Processing`);

        // Fetch the contents at the URL
        console.log(`${url}: Getting`);
        try {
            const res = await fetch.default(url);
        } catch (err) {
            console.log(`${url}: Failed to GET`);
            return;
        }
    }
});

let alarmIndex = 0;

const funcMetric = awsx.lambda.metrics.duration({ function: subscription.func, unit: "Seconds" });
const funcAlarm = funcMetric.createAlarm("alarm" + alarmIndex++, { threshold: 120, evaluationPeriods: 2 }, providerOpts);

const topicMetric = awsx.sns.metrics.numberOfMessagesPublished({ topic });
const topicAlarm = topicMetric.createAlarm("alarm" + alarmIndex++, { threshold: 1000, evaluationPeriods: 2 }, providerOpts);

const queue = new aws.sqs.Queue("terraform_queue", {
    delaySeconds: 90,
    maxMessageSize: 2048,
    messageRetentionSeconds: 86400,
    receiveWaitTimeSeconds: 10,
    tags: {
        Environment: "production",
    },
}, providerOpts);

const queueMetric = awsx.sqs.metrics.sentMessageSize({ queue });
const queueAlarm = queueMetric.createAlarm("alarm" + alarmIndex++, { threshold: 120, evaluationPeriods: 2 }, providerOpts);

const restApi = new aws.apigateway.RestApi("MyDemoAPI", {
    description: "This is my API for demonstration purposes",
}, providerOpts);

const restApiMetric = awsx.apigateway.metrics.error5XX({ restApi });
const restApiAlarm = restApiMetric.createAlarm("alarm" + alarmIndex++, { threshold: 50, evaluationPeriods: 2 }, providerOpts);

const table = new aws.dynamodb.Table("testtable", {
    attributes: [{
        name: "id",
        type: "S",
    }],
    hashKey: "id",
    readCapacity: 5,
    writeCapacity: 5,
    streamEnabled: true,
    streamViewType: "NEW_AND_OLD_IMAGES",
}, providerOpts);

const tableMetric = awsx.dynamodb.metrics.throttledRequests({ table });
const tableAlarm = tableMetric.createAlarm("alarm" + alarmIndex++, { threshold: 120, evaluationPeriods: 2 }, providerOpts);

const bucket = new aws.s3.Bucket("b", {
    acl: "private",
    tags: {
        Environment: "Dev",
        Name: "My bucket",
    },
}, providerOpts);

const bucketMetric = awsx.s3.metrics.firstByteLatency({ bucket, unit: "Seconds" });
const bucketAlarm = bucketMetric.createAlarm("alarm" + alarmIndex++, { threshold: 30 , evaluationPeriods: 2 }, providerOpts);

const ubuntu = pulumi.output(aws.getAmi({
    filters: [
        { name: "name", values: ["ubuntu/images/hvm-ssd/ubuntu-trusty-14.04-amd64-server-*"] },
        { name: "virtualization-type", values: ["hvm"] },
    ],
    mostRecent: true,
    owners: ["099720109477"], // Canonical
}, providerOpts));
const instance = new aws.ec2.Instance("web", {
    ami: ubuntu.apply(ubuntu => ubuntu.id),
    instanceType: "m5.large",
    tags: {
        Name: "HelloWorld",
    },
}, { ...providerOpts, async: true });

const instanceMetric = awsx.ec2.metrics.cpuUtilization({ instance });
const instanceAlarm = instanceMetric.createAlarm("alarm" + alarmIndex++, { threshold: 120, evaluationPeriods: 2 }, providerOpts);

const cluster = new aws.ecs.Cluster("foo", {}, providerOpts);
const clusterMetric = awsx.ecs.metrics.cpuUtilization({ cluster, unit: "Percent" });
const clusterAlarm = clusterMetric.createAlarm("alarm" + alarmIndex++, { threshold: 50, evaluationPeriods: 2 }, providerOpts);

const userPool = new aws.cognito.UserPool("pool", {}, providerOpts);
const userPoolMetric = awsx.cognito.metrics.compromisedCredentialsRisk({ userPool });
const userPoolAlarm = userPoolMetric.createAlarm("alarm" + alarmIndex++, { threshold: 120, evaluationPeriods: 2 }, providerOpts);

const eventRule = new aws.cloudwatch.EventRule("console", {
    description: "Capture each AWS Console Sign In",
    eventPattern: `{
  "detail-type": [
    "AWS Console Sign In via CloudTrail"
  ]
}
`,
}, providerOpts);
const eventRuleMetric = awsx.cloudwatch.metrics.events.deadLetterInvocations({ eventRule });
const eventRuleAlarm = eventRuleMetric.createAlarm("alarm" + alarmIndex++, { threshold: 120, evaluationPeriods: 2 }, providerOpts);

const logGroup = new aws.cloudwatch.LogGroup("yada", {
    tags: {
        Application: "serviceA",
        Environment: "production",
    },
}, providerOpts);
const logGroupMetric = awsx.cloudwatch.metrics.logs.incomingBytes({ logGroup, unit: "Megabytes" });
const logGroupAlarm = logGroupMetric.createAlarm("alarm" + alarmIndex++, { threshold: 512, evaluationPeriods: 2 }, providerOpts);
