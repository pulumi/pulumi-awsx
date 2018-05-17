// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";

/**
 * Shape of callbacks used for synchronous AWS lambda functions.  If a Node 6.x runtime is chosen
 * for the AWS lambda, these are the only callback shapes allowed.
 */
export type SyncCallback<E, R> = (event: E, context: aws.serverless.Context, callback: (error: any, result: R) => void) => void;

/**
 * Shape of callbacks used for asynchronous AWS lambda functions.  These are supported on AWS lambda
 * if a node runtime of 8.10 (the default runtime) or higher is used.
 */
export type AsyncCallback<E, R> = (event: E, context?: aws.serverless.Context) => Promise<void>;

/**
 * A synchronous or asynchronous callback.
 */
export type Callback<E, R> = SyncCallback<E, R> | AsyncCallback<E, R>;

/**
 * Handler represents the appropriate type for functions that can take either an AWS lambda function
 * instance, or a JS function object that will then be used to create the AWS lambda function.
 */
export type Handler<E, R> = aws.lambda.Function | Callback<E, R>;
