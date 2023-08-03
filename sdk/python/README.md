[![Actions Status](https://github.com/pulumi/pulumi-awsx/workflows/master/badge.svg)](https://github.com/pulumi/pulumi-awsx/actions)
[![Slack](http://www.pulumi.com/images/docs/badges/slack.svg)](https://slack.pulumi.com)
[![NPM version](https://badge.fury.io/js/%40pulumi%2Fawsx.svg)](https://www.npmjs.com/package/@pulumi/awsx)
[![Python version](https://badge.fury.io/py/pulumi-awsx.svg)](https://pypi.org/project/pulumi-awsx)
[![NuGet version](https://badge.fury.io/nu/pulumi.awsx.svg)](https://badge.fury.io/nu/pulumi.awsx)
[![PkgGoDev](https://pkg.go.dev/badge/github.com/pulumi/pulumi-awsx/sdk/go)](https://pkg.go.dev/github.com/pulumi/pulumi-awsx/sdk/go)
[![License](https://img.shields.io/npm/l/%40pulumi%2Fawsx.svg)](https://github.com/pulumi/pulumi-awsx/blob/master/LICENSE)

## Pulumi AWS Infrastructure Components

Pulumi's framework for Amazon Web Services (AWS) infrastructure.

To use this package, [install the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/). For a streamlined Pulumi walkthrough, including language runtime installation and AWS configuration, see the [Crosswalk for AWS documentation](https://www.pulumi.com/docs/guides/crosswalk/aws/).

The AWS Infrastructure package is intended to provide [component](https://www.pulumi.com/docs/intro/concepts/resources/components/) wrappers around many core AWS 'raw' resources to make them easier and more convenient to use.  In general, the `@pulumi/awsx` package mirrors the module structure of `@pulumi/aws` (i.e. `@pulumi/awsx/ecs` or `@pulumi/awsx/ec2`).  These [components](https://www.pulumi.com/docs/intro/concepts/resources/components/) are designed to take care of much of the redundancy and boilerplate necessary when using the raw AWS resources, while still striving to expose all underlying functionality if needed.

The AWS Infrastructure package undergoes constant improvements and additions.  While we will strive to maintain backward compatability here, we will occasionally make breaks here as appropriate if it helps improve the overall quality of this package.

The AWS Infrastructure package exposes many high level abstractions.  Including:

* [`ec2`](https://github.com/pulumi/pulumi-awsx/blob/master/awsx/ec2).  A module that makes it easier to work with your AWS network, subnets, and security groups.  By default, the resources in the package follow the [AWS Best Practices](
  https://aws.amazon.com/answers/networking/aws-single-vpc-design/), but can be configured as desired in whatever ways you want.  Most commonly, this package is used to acquire the default Vpc for a region (using `awsx.ec2.DefaultNetwork`).  However, it can also be used to easily create or augment an existing Vpc.

* [`ecs`](https://github.com/pulumi/pulumi-awsx/blob/master/awsx/ecs).  A module that makes it easy to create and configure clusters, tasks and services for running containers. Convenience resources are created to make the common tasks of creating EC2 or Fargate services and tasks much simpler.

* [`lb`](https://github.com/pulumi/pulumi-awsx/tree/master/awsx/lb).  A module for simply setting up [Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/). This module provides convenient ways to set up either `Network` or `Application` load balancers, along with the appropriate ELB Target Groups and Listeners in order to have a high availability, automatically-scaled service.  These ELB components also work well with the other awsx components.  For example, an `lb.defaultTarget` can be passed in directly as the `portMapping` target of an `ecs.FargateService`.

<div>
    <a href="https://www.pulumi.com/docs/guides/crosswalk/aws/" title="Get Started">
       <img src="https://www.pulumi.com/images/get-started.svg?" width="120">
    </a>
</div>

## Installing

This package is available in many languages in the standard packaging formats.

### Node.js (Java/TypeScript)

To use from JavaScript or TypeScript in Node.js, install using either `npm`:

```bash
npm install @pulumi/awsx
```

or `yarn`:

```bash
yarn add @pulumi/awsx
```

### Python

To use from Python, install using `pip`:

```bash
pip install pulumi-awsx
```

### Go

To use from Go, use `go get` to grab the latest version of the library

```bash
go get github.com/pulumi/pulumi-awsx/sdk
```

### .NET

To use from .NET, install using `dotnet add package`:

```bash
dotnet add package Pulumi.Awsx
```

## Configuration

The configuration options available for this provider mirror those of the [Pulumi AWS Classic Provider](https://github.com/pulumi/pulumi-aws#configuration)

## Migration from 0.x to 1.0

Before version 1, this package only supported components in TypeScript. All the existing components from the 0.x releases are now available in the `classic` namespace. The `classic` namespace will remain until the next major version release but will only receive updates for critical security fixes.

1. Change references from `@pulumi/awsx` to `@pulumi/awsx/classic` to maintain existing behaviour.
2. Refactor to replace the classic components with the new top-level components.

**Note:** The new top-level components (outside the `classic` namespace) may require additional code changes and resource re-creation.

### Notable changes

- Removed ECS Cluster as this did not add any functionality over the [AWS Classic ECS Cluster resource](https://www.pulumi.com/registry/packages/aws/api-docs/ecs/cluster/).
- Removed `Vpc.fromExistingIds()` as this was originally added because other components depended on the concrete VPC component class. The new components in v1 no longer have hard dependencies on other resources, so instead the subnets from the existing VPC can be passed into other components directly.

## References

* [Tutorial](https://www.pulumi.com/blog/crosswalk-for-aws-1-0/)
* [API Reference Documentation](https://www.pulumi.com/registry/packages/awsx/api-docs/)
* [Examples](./examples)
* [Crosswalk for AWS Guide](https://www.pulumi.com/docs/guides/crosswalk/aws/)
