[![Build Status](https://travis-ci.com/pulumi/pulumi-aws-infra.svg?token=eHg7Zp5zdDDJfTjY8ejq&branch=master)](https://travis-ci.com/pulumi/pulumi-aws-infra)

# Pulumi AWS Infrastructure Components

Pulumi's framework for Amazon Web Services (AWS) infrastructure.

This package is meant for use with the Pulumi CLI.  Please visit [pulumi.io](https://pulumi.io) for
installation instructions.

The AWS Infrastructure package offers two primary abstractions:

* `Network` provides a way to create a new network in your account that follows the [AWS Best Practices](
  https://aws.amazon.com/answers/networking/aws-single-vpc-design/) for doing so.  This includes creating a Virtual
  Private Cloud (VPC) with public and private subnets, if you so choose, and multi-availability zone configuration.

* `Cluster` offers a simple way of creating an Elastic Container Service (ECS) cluster for running containers.

## Installing

This package is available in JavaScript/TypeScript for use with Node.js.  Install it using either `npm`:

    $ npm install @pulumi/aws-infra

or `yarn`:

    $ yarn add @pulumi/aws-infra

## Reference

For detailed reference documentation, please visit [the API docs](
https://pulumi.io/reference/pkg/nodejs/@pulumi/aws-infra/index.html).
