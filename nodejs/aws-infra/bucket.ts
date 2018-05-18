// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import { lambda, s3, serverless } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { Handler } from "./function";
import * as utils from "./utils";

/**
 * Arguments to help customize a notification subscription for a bucket.
 */
export interface SimpleBucketSubscriptionArgs {
    /**
     * An optional prefix or suffix to filter down notifications.  See
     * aws.s3.BucketNotification.lambdaFunctions for more details.
     */
    filterPrefix?: string;
    filterSuffix?: string;
}

export interface BucketSubscriptionArgs extends SimpleBucketSubscriptionArgs {
    /**
     * Events to subscribe to. For example: "s3:ObjectCreated:*".  Cannot be empty.
     */
    events: string[];
}

/**
 * Arguments to specifically control a subscription to 'put' notifications on a bucket.
 * Specifically, 'events' should not be provided as they will be assumed to be "s3:ObjectCreated:*".
 * If different events are desired, the 'subscribe' function should be used instead.
 */
export type BucketPutArgs = SimpleBucketSubscriptionArgs;

/**
 * Arguments to specifically control a subscription to 'delete' notifications on a bucket.
 * Specifically, 'events' should not be provided as they will be assumed to be "s3:ObjectRemoved:*".
 * If different events are desired, the 'subscribe' function should be used instead.
 */
export type BucketDeleteArgs = SimpleBucketSubscriptionArgs;

// See https://docs.aws.amazon.com/AmazonS3/latest/dev/notification-content-structure.html.
export interface S3BucketNotificationEvent {
    Records?: S3BucketNotificationEventRecord[];
}

export interface S3BucketNotificationEventRecord {
    eventVersion: string;
    eventSource: string;
    awsRegion: string;
    eventTime: string;
    eventName: string;
    userIdentity: {
        principalId: string;
    };
    requestParameters: {
        sourceIPAddress: string;
    };
    responseElements: {
        "x-amz-request-id": string;
        "x-amz-id-2": string;
    };
    s3: {
        s3SchemaVersion: string;
        configurationId: string;
        bucket: {
            name: string;
            ownerIdentity: {
                principalId: string;
            },
            arn: string;
        };
        object: {
            key: string;
            size: number;
            eTag: string;
            versionId?: string;
            sequencer: string;
        };
    };
}


// tslint:disable:max-line-length
export type BucketSubscriptionHandler = Handler<S3BucketNotificationEvent, void>;

export function onPut(
    name: string, bucket: s3.Bucket, handler: BucketSubscriptionHandler,
    args?: BucketPutArgs, opts?: pulumi.ResourceOptions): BucketSubscription {

    args = args || {};

    const argsCopy = {
        ...args,
        events: ["s3:ObjectCreated:*"],
    };

    return subscribe(name + "-put", bucket, handler, argsCopy, opts);
}

export function onDelete(
    name: string, bucket: s3.Bucket, handler: BucketSubscriptionHandler,
    args?: BucketDeleteArgs, opts?: pulumi.ResourceOptions): BucketSubscription {

    args = args || {};

    const argsCopy = {
        ...args,
        events: ["s3:ObjectRemoved:*"],
    };

    return subscribe(name + "-delete", bucket, handler, argsCopy, opts);
}

const defaultComputePolicies = [
    aws.iam.AWSLambdaFullAccess,                 // Provides wide access to "serverless" services (Dynamo, S3, etc.)
    aws.iam.AmazonEC2ContainerServiceFullAccess, // Required for lambda compute to be able to run Tasks
];

/**
 * Creates a new subscription to the given bucket using the lambda provided, along with optional
 * options to control the behavior of the subscription.  This function should be used when full
 * control over the subscription is wanted, and other helpers (like onPut/onDelete) are not
 * sufficient.
 */
export function subscribe(
    name: string, bucket: s3.Bucket, handler: BucketSubscriptionHandler,
    args: BucketSubscriptionArgs, opts?: pulumi.ResourceOptions): BucketSubscription {

    let func: lambda.Function;
    if (handler instanceof lambda.Function) {
        func = handler;
    } else {
        const funcOpts: aws.serverless.FunctionOptions = {
            policies: defaultComputePolicies,
        };
        const serverlessFunction = new aws.serverless.Function(
            name + "-subscription",
            funcOpts,
            handler, opts);

        func = serverlessFunction.lambda;
    }

    return new BucketSubscription(name, bucket, func, args, opts);
}

interface Subscription {
    name: string;
    events: string[];
    filterPrefix?: string;
    filterSuffix?: string;
    lambdaFunctionArn: pulumi.Output<string>;
    permission: aws.lambda.Permission;
}

let bucketSubscriptions = new Map<s3.Bucket, Subscription[]>();

/**
 * A component corresponding to a single underlying aws.s3.BucketNotification created for a bucket.
 * Note: due to the AWS requirement that all notifications for a bucket be defined at once, the
 * actual aws.s3.BucketNotification instances will only be created once the pulumi program runs to
 * completion and all subscriptions have been heard about.
 */
export class BucketSubscription extends pulumi.ComponentResource {
    public readonly permission: lambda.Permission;

    public constructor(
        name: string, bucket: s3.Bucket, func: lambda.Function,
        args: BucketSubscriptionArgs, opts?: pulumi.ResourceOptions) {

        super("aws-infra:bucket:BucketSubscription", name, { bucket: bucket, function: func }, opts);

        const permission = new aws.lambda.Permission(name, {
            function: func,
            action: "lambda:InvokeFunction",
            principal: "s3.amazonaws.com",
            sourceArn: bucket.id.apply(bucketName => `arn:aws:s3:::${bucketName}`),
        }, { parent: this });

        this.permission = permission;

        // We must create only a single BucketNotification per Bucket per AWS API limitations.  See
        // https://github.com/terraform-providers/terraform-provider-aws/issues/1715.  So we push
        // the subscription information here, and then actually create the BucketNotification if
        // needed on process `beforeExit`.
        let subscriptions = bucketSubscriptions.get(bucket);
        if (!subscriptions) {
            subscriptions = [];
            bucketSubscriptions.set(bucket, subscriptions);
        }

        subscriptions.push({
            name: name,
            events: args.events,
            filterPrefix: args.filterPrefix,
            filterSuffix: args.filterSuffix,
            lambdaFunctionArn: func.arn,
            permission: permission,
        });
    }
}

process.on("beforeExit", () => {
    const copy = bucketSubscriptions;

    // Since we are generating more work on the event loop, we will casue `beforeExit` to be invoked again.
    // Make sure to clear out eh pending subscrpitions array so that we don't try to apply them again.

    bucketSubscriptions = new Map();

    for (const [bucket, subscriptions] of copy) {
        const permissions = subscriptions.map(s => s.permission);
        const _ = new aws.s3.BucketNotification(subscriptions[0].name, {
            bucket: bucket.id,
            lambdaFunctions: subscriptions.map(subscription => ({
                events: subscription.events,
                filterPrefix: subscription.filterPrefix,
                filterSuffix: subscription.filterSuffix,
                lambdaFunctionArn: subscription.lambdaFunctionArn,
            })),
        }, { parent: bucket, dependsOn: permissions });
    }
});
