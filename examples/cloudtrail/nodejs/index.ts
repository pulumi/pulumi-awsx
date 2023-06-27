import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import assert = require("assert");

// No S3 bucket configuration given, so the default AES encryption is used.
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-encryption-faq.html
const defaultTrail = new awsx.cloudtrail.Trail("tkappler-trail", {
    enableLogging: true,
})

// Same as above but explicit.
const aesEncryptedBucketTrail = new awsx.cloudtrail.Trail("tkappler-aes-bucket-trail", {
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

const kmsEncryptedBucketTrail = new awsx.cloudtrail.Trail("tkappler-kms-bucket-trail", {
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

pulumi.all([defaultTrail.bucket, aesEncryptedBucketTrail.bucket, kmsEncryptedBucketTrail.bucket])
    .apply(([defaultBucket, aesBucket, kmsBucket]) => {
        var defaultBucketAlg = defaultBucket?.serverSideEncryptionConfiguration
            .rule.applyServerSideEncryptionByDefault.sseAlgorithm
        var aesBucketAlg = aesBucket?.serverSideEncryptionConfiguration
            .rule.applyServerSideEncryptionByDefault.sseAlgorithm
        var kmsBucketAlg = kmsBucket?.serverSideEncryptionConfiguration
            .rule.applyServerSideEncryptionByDefault.sseAlgorithm

        pulumi.all([defaultBucketAlg, aesBucketAlg, kmsBucketAlg]).apply(([defaultAlg, aesAlg, kmsAlg]) => {
            assert.strictEqual(defaultAlg, "AES256")
            assert.strictEqual(aesAlg, "AES256")
            assert.strictEqual(kmsAlg, "aws:kms")
        })
    })
