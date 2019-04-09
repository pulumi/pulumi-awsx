## 0.18.1 (Unreleased)

- TypeScript typings for awsx.apigateway.API have been updated to be more accurate.
- Application LoadBalancers/Listeners/TargetGroups will now create a default SecurityGroup for their
  LoadBalancer if none is provided.
- Added easier convenience methods overloads on an awsx.ec2.SecurityGroup to make ingress/egress
  rules.
- Add TypeScript documentation on API Gateway's Integration Route and Raw Data Route

## 0.18.0 (Release March 29, 2019)

### Important

- Moves to the new 0.18.0 version of `@pulumi/aws`.  Version 0.18.0 of `pulumi-aws` is now based on
  v2.2.0 of the AWS Terraform Provider, which has a variety of breaking changes from the previous
  version. See documentation in `@pulumi/aws` repo for more details.

- Add support for request parameter validation to API Gateway as well as documentation

## 0.17.3 (Released March 25, 2019)

- awsx.ec2.Subnets created for a VPC will have a unique `name: VpcName-SubnetType-Index` entry
  provided for them in their tags.  This can help distinguish things when there are many subnets
  created in a vpc.
- NatGateways created as part of creating private subnets in an awsx.ec2.VPC will now be parented
  by the VPC.
- Fixes issue where computation of Fargate Memory/CPU requirements was not being done properly.
- Fixes issue where VPC might fail to create because tags could not be set on its EIPs.

## 0.17.1 (Released March 21, 2019)

- Fixes issue where creating an ApplicationListener would fail with an error of:
    "description" cannot be longer than 255 characters

## 0.17.0 (Released March 5, 2019)

### Important

Updating to v0.17.0 version of `@pulumi/pulumi`.  This is an update that will not play nicely
in side-by-side applications that pull in prior versions of this package.

See https://github.com/pulumi/pulumi/commit/7f5e089f043a70c02f7e03600d6404ff0e27cc9d for more details.

As such, we are rev'ing the minor version of the package from 0.16 to 0.17.  Recent version of `pulumi` will now detect, and warn, if different versions of `@pulumi/pulumi` are loaded into the same application.  If you encounter this warning, it is recommended you move to versions of the `@pulumi/...` packages that are compatible.  i.e. keep everything on 0.16.x until you are ready to move everything to 0.17.x.

## 0.16.5 (Released February 22nd, 2019)

- Supply easy mechanisms to add Internet and NAT gateways to a VPC.
- Change awsx.elasticloadbalancingv2.Listener.endpoint from a method to a property.
- Change awsx.apigateway.ProxyRoute.target to be a richer type to allow extensibility.
- Allow awsx.elasticloadbalancingv2.NetworkListener to be used as ProxyRoute.target to simply
  incoming APIGateway routes to a NetworkListener endpoint.
- Add support for arbitrary APIGateway integration routes (i.e. to any supported aws service).
  Note: this comes with a small breaking change where the names of some apigateway types have
  changed from ProxyXXX to IntegrationXXX.
- Require at least version 0.16.14 of @pulumi/pulumi, in order to support the `deleteBeforeReplace`
  option and improve handling of delete-before-replace.

## 0.16.4 (Release February 5th, 2019)

- Renamed 'aws-infra' package to 'awsx'.
- Moved `aws.apigateway.x.Api` from `@pulumi/aws` into this package under the name `awsx.apigateway.Api`.

## 0.16.3 (Release January 25th, 2019)

- Experimental abstractions have been promoted to supported abstractions.  see new modules for:
  - autoscaling
  - ec2
  - ecs
  - elasticloadbalancingv2

## 0.16.2 (Released December 5th, 2018)

### Improvements

- Add some experimental abstractions for Services and Tasks in the `experimental` module.

## 0.16.1 (Released November 13th, 2018)

### Improvements

- Fix an issue where passing a cluster to another component would fail in some cases.
