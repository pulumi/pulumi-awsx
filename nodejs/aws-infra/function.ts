// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";

/**
 * A synchronous or asynchronous function that can be converted into an AWS lambda.  Async callbacks
 * are only supported with an AWS lambda runtime of 8.10 or higher.  On those runtimes a Promise can
 * be returned, 'callback' parameter can be ignored, and AWS will appropriately handle things. For
 * AWS lambda pre-8.10, a synchronous function must be provided.  The synchronous function should
 * return nothing, and should instead invoke 'callback' when complete.
 */
export type Callback<E, R> = (event: E, context: aws.serverless.Context, callback: (error: any, result: R) => void) => Promise<void> | void;

/**
 * Handler represents the appropriate type for functions that can take either an AWS lambda function
 * instance, or a JS function object that will then be used to create the AWS lambda function.
 */
export type Handler<E, R> = Callback<E, R> | aws.lambda.Function;
