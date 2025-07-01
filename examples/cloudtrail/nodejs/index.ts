import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import assert = require("assert");

// No S3 bucket configuration given, so the default AES encryption is used.
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-encryption-faq.html
const defaultTrail = new awsx.cloudtrail.Trail("example-trail", {
    enableLogging: true,
})

// Same as above but explicit.
const aesEncryptedBucketTrail = new awsx.cloudtrail.Trail("example-aes-bucket-trail", {
    enableLogging: true,
    s3Bucket: {
        args: {
            serverSideEncryptionConfiguration: {
                rule: {
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: "AES256",
                    }
                }
            }
        }
    }
})

const kmsEncryptedBucketTrail = new awsx.cloudtrail.Trail("example-kms-bucket-trail", {
    enableLogging: true,
    s3Bucket: {
        args: {
            serverSideEncryptionConfiguration: {
                rule: {
                    applyServerSideEncryptionByDefault: {
                        sseAlgorithm: "aws:kms",
                    }
                }
            }
        }
    }
})

defaultTrail.bucket.apply((b: any) => b!
    .serverSideEncryptionConfiguration.rule.applyServerSideEncryptionByDefault.sseAlgorithm)
    .apply((alg: string) => assert.strictEqual(alg, "AES256"));

aesEncryptedBucketTrail.bucket.apply((b: any) => b!
    .serverSideEncryptionConfiguration.rule.applyServerSideEncryptionByDefault.sseAlgorithm)
    .apply((alg: string) => assert.strictEqual(alg, "AES256"));

kmsEncryptedBucketTrail.bucket.apply((b: any) => b!
    .serverSideEncryptionConfiguration.rule.applyServerSideEncryptionByDefault.sseAlgorithm)
    .apply((kmsAlg: string) => assert.strictEqual(kmsAlg, "aws:kms"));
