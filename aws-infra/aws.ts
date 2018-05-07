// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

// TODO[pulumi/pulumi-aws#40]: Move these to pulumi-aws.

import * as aws from "@pulumi/aws";

// Copmute the availability zones only once, and store the resulting promise.
let azs: Promise<aws.GetAvailabilityZonesResult> | undefined;

// Export as a function instead of a variable so clients can pass one AZ as a promise to a resource.
export async function getAwsAz(index: number) {
    if (!azs) {
        azs = aws.getAvailabilityZones();
    }
    return (await azs).names[index];
}
