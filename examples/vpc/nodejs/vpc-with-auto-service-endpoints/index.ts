import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import type { GetItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { SendMessageCommandOutput } from "@aws-sdk/client-sqs";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

const region = aws.config.region || "us-west-2";

const myVpc = new awsx.ec2.Vpc("awsx-with-auto-service-endpoints", {
  natGateways: { strategy: "None" },
  numberOfAvailabilityZones: 2,
  subnetStrategy: "Auto",
  subnetSpecs: [{ type: "Isolated" }],
  vpcEndpointStrategy: "Auto",
  vpcEndpointSpecs: [
    {
      serviceName: `com.amazonaws.${region}.dynamodb`,
    },
    {
      serviceName: `com.amazonaws.${region}.sqs`,
      vpcEndpointType: "Interface",
    },
  ],
});

const table = new aws.dynamodb.Table("endpoint-proof", {
  billingMode: "PAY_PER_REQUEST",
  hashKey: "pk",
  attributes: [{ name: "pk", type: "S" }],
});

const queue = new aws.sqs.Queue("endpoint-proof");

const lambdaSecurityGroup = new aws.ec2.SecurityGroup("endpoint-proof-lambda", {
  vpcId: myVpc.vpcId,
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
});

const lambdaRole = new aws.iam.Role("endpoint-proof-lambda", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
});

const vpcAccessPolicy = new aws.iam.RolePolicyAttachment("endpoint-proof-vpc-access", {
  role: lambdaRole.name,
  policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
});

const dataAccessPolicy = new aws.iam.RolePolicy("endpoint-proof-data-access", {
  role: lambdaRole.id,
  policy: pulumi.all([table.arn, queue.arn]).apply(([tableArn, queueArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["dynamodb:PutItem", "dynamodb:GetItem"],
          Resource: tableArn,
        },
        {
          Effect: "Allow",
          Action: "sqs:SendMessage",
          Resource: queueArn,
        },
      ],
    }),
  ),
});

const endpointProof = new aws.lambda.CallbackFunction(
  "endpoint-proof",
  {
    role: lambdaRole,
    runtime: "nodejs20.x",
    timeout: 30,
    vpcConfig: {
      subnetIds: myVpc.isolatedSubnetIds,
      securityGroupIds: [lambdaSecurityGroup.id],
    },
    environment: {
      variables: {
        TABLE_NAME: table.name,
        QUEUE_URL: queue.url,
      },
    },
    callback: async () => {
      const tableName = process.env.TABLE_NAME;
      const queueUrl = process.env.QUEUE_URL;
      if (!tableName || !queueUrl) {
        throw new Error("Missing endpoint proof environment variables");
      }

      const dynamodb = new DynamoDBClient({});
      const sqs = new SQSClient({});
      const key = `endpoint-proof-${Date.now()}`;

      await dynamodb.send(
        new PutItemCommand({
          TableName: tableName,
          Item: {
            pk: { S: key },
            value: { S: "ok" },
          },
        }),
      );
      const item = (await dynamodb.send(
        new GetItemCommand({
          TableName: tableName,
          Key: {
            pk: { S: key },
          },
        }),
      )) as GetItemCommandOutput;
      const sqsResult = (await sqs.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: "endpoint-proof",
        }),
      )) as SendMessageCommandOutput;

      return {
        dynamodb: item.Item?.value?.S,
        sqsMessageId: sqsResult.MessageId,
      };
    },
  },
  { dependsOn: [vpcAccessPolicy, dataAccessPolicy] },
);

const invocation = new aws.lambda.Invocation(
  "invoke",
  {
    functionName: endpointProof.name,
    input: "{}",
    lifecycleScope: "CRUD",
  },
  { dependsOn: [endpointProof] },
);

export const invocationResult = invocation.result;
export const vpcId = myVpc.vpcId;
export const isolatedSubnetIds = myVpc.isolatedSubnetIds;
export const vpcEndpointIds = myVpc.vpcEndpoints.apply((endpoints) =>
  endpoints.map((endpoint) => endpoint.id),
);
export const lambdaName = endpointProof.name;
