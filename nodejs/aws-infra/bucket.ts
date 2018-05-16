// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import { lambda, s3, serverless } from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as utils from "./utils";

export interface BucketSubscriptionArgs {
    /**
     * An optional permission to provide for the subscription.  If not provided a default permission
     * will be created.
     */
    permission?: aws.lambda.Permission;

    /**
     * Events to subscribe to. For example: "s3:ObjectCreated:*".  Cannot be empty.
     */
    events: string[];

    /**
     * An optional prefix or suffix to filter down notifications.  See
     * aws.s3.BucketNotification.lambdaFunctions for more details.
     */
    filterPrefix?: string;
    filterSuffix?: string;
}

export type BucketPutArgs = utils.Omit<BucketSubscriptionArgs, "events">;
export type BucketDeleteArgs = utils.Omit<BucketSubscriptionArgs, "events">;

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
export type BucketSubscriptionHandler =
    (event: S3BucketNotificationEvent, context: aws.lambda.Context, callback: (error: any, result: any) => void) => void;

export function onPut(name: string, bucket: s3.Bucket, func: lambda.Function, args: BucketPutArgs, opts?: pulumi.ResourceOptions): BucketSubscription;
export function onPut(name: string, bucket: s3.Bucket, handler: BucketSubscriptionHandler, args: BucketPutArgs & lambda.CallbackFunctionArgs, opts?: pulumi.ResourceOptions): BucketSubscription;
export function onPut(
    name: string, bucket: s3.Bucket, funcOrHandler: lambda.Function | BucketSubscriptionHandler,
    args: BucketPutArgs & lambda.CallbackFunctionArgs, opts?: pulumi.ResourceOptions): BucketSubscription {

    const argsCopy = {
        ...args,
        events: ["s3:ObjectCreated:*"],
    };

    return subscribe(name + "-put", bucket, <lambda.Function>funcOrHandler, argsCopy, opts);
}

export function onDelete(name: string, bucket: s3.Bucket, func: lambda.Function, args: BucketDeleteArgs, opts?: pulumi.ResourceOptions): BucketSubscription;
export function onDelete(name: string, bucket: s3.Bucket, handler: BucketSubscriptionHandler, args: BucketDeleteArgs & lambda.CallbackFunctionArgs, opts?: pulumi.ResourceOptions): BucketSubscription;
export function onDelete(
    name: string, bucket: s3.Bucket, funcOrHandler: lambda.Function | BucketSubscriptionHandler,
    args: BucketDeleteArgs & lambda.CallbackFunctionArgs, opts?: pulumi.ResourceOptions): BucketSubscription {

    const argsCopy = {
        ...args,
        events: ["s3:ObjectRemoved:*"],
    };

    return subscribe(name + "-delete", bucket, <lambda.Function>funcOrHandler, argsCopy, opts);
}

/**
 * Creates a new subscription to the given bucket using the lambda provided, along with
 * optional options to control the behavior of the subscription.
 */
export function subscribe(name: string, bucket: s3.Bucket, func: lambda.Function, args: BucketSubscriptionArgs, opts?: pulumi.ResourceOptions): BucketSubscription;
export function subscribe(name: string, bucket: s3.Bucket, handler: BucketSubscriptionHandler, args: BucketSubscriptionArgs & lambda.CallbackFunctionArgs, opts?: pulumi.ResourceOptions): BucketSubscription;
export function subscribe(
    name: string, bucket: s3.Bucket, funcOrHandler: lambda.Function | BucketSubscriptionHandler,
    args: BucketSubscriptionArgs & lambda.CallbackFunctionArgs, opts?: pulumi.ResourceOptions): BucketSubscription {

    let func: lambda.Function;
    if (funcOrHandler instanceof lambda.Function) {
        func = funcOrHandler;
    } else {
        func = aws.lambda.createFunction(name + "-subscription", funcOrHandler, args, opts);
    }

    return new BucketSubscription(name, bucket, func, args, opts);
}

interface Subscription {
    events: string[];
    filterPrefix?: string;
    filterSuffix?: string;
    lambdaFunctionArn: pulumi.Output<string>;
    permission: aws.lambda.Permission;
}

let bucketSubscriptions = new Map<s3.Bucket, Subscription[]>();

export class BucketSubscription extends pulumi.ComponentResource {
    public readonly permission: lambda.Permission;

    public constructor(
        name: string, bucket: s3.Bucket, func: lambda.Function,
        args: BucketSubscriptionArgs, opts?: pulumi.ResourceOptions) {

        super("aws-infra:bucket:BucketSubscription", name, { bucket: bucket, function: func }, opts);

        let permission = args.permission;
        if (!permission) {
            permission = new aws.lambda.Permission(name, {
                function: func,
                action: "lambda:InvokeFunction",
                principal: "s3.amazonaws.com",
                sourceArn: bucket.id.apply(bucketName => `arn:aws:s3:::${bucketName}`),
            }, { parent: this });
        }

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
        const _ = new aws.s3.BucketNotification(name, {
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
