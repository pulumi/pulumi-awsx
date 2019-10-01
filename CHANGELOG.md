CHANGELOG
=========

## HEAD (Unreleased)

* Added options to customize the Deployent, RestApi or Stage produced by an awsx.apigateway.API.

## 0.18.11 (2019-09-19)

* Allow passing `ignoreChanges` into `Subnet`s created as part of an `awsx.ec2.Vpc`.

* Updated `@pulumi/awsx` to use the latest versions of `@pulumi/pulumi` and `@pulumi/aws`.

## 0.18.10 (2019-08-21)

* Updated `@pulumi/awsx` to use the latest version of `@pulumi/docker`.

## 0.18.9 (2019-08-06)

* Updated `@pulumi/awsx` to use the latest versions of `@pulumi/pulumi` and `@pulumi/aws`.

## 0.18.8 (2019-07-29)

* ecs.TaskDefinition now accepts explicit `null` value for `.logGroup`, `.taskRole` and
  `.executionRole` to explicitly opt out using or creating any default resources for them.
* The `elasticloadbalancingv2` module has been renamed to align with its `@pulumi/aws` equivalent.
  The existing module is still available, but will be deprecated and removed in the future.
  'Aliases' have been used to ensure that moving to the new modules will not result in any changes
  to existing resources.

## 0.18.7 (2019-07-11)

* LoadBalancers and TargetGroups will no longer create resources with 'hashed' names.  They will
  instead use the name provided (like nearly all other resources do).  To prevent impact on existing
  stacks, aliases have been provided to ensure proper tracking of the resources.
* awsx.autoscaling.AutoScalingLaunchConfiguration can be passed an explicit imageId instead of
  only using and ecs-specific image name.
* Specific cidr-blocks and availability zone locations can be provided for awsx.ec2.Vpc subnets.
* FargateService will respect `subnets` explicitly passed in (fixes
  [#360](https://github.com/pulumi/pulumi-awsx/issues/360)).

### Provider fixes + Reparenting

- Many awsx components were both not parented properly and also did not correctly pass 'provider'
  information along.  For programs not explicitly passing a 'provider' along, this normally was not
  an issue.  However, programs that did want to use an explicit 'provider' (for example, to set a
  particular region for a resource), would commonly run into issues.  We tried to broadly fix these
  issues, while doing so in a way that should hopefully **not** have any impact on any existing
  stacks. Specifically, the 'aliases' feature was used so that while we may have reparented some
  resources, pulumi will know that that is just a representation change, and shouldn't cause any
  actual resources to be created/deleted.  If you see otherwise, please let us know.

  The specific resources/apis affected are:

  1. Lambda authorizers will now be parented by the `awsx.apigateway.Api` they are created for.
  2. `awsx.apigateway.Api` static routes will properly work when using a different provider
     (previously it wouldn't place the static route in the corresponding region for the provider).
  3. `awsx.apigateway.Api` UsagePlans/UsagePlanKeys now properly pass along a provider.

  4. `awsx.autoscaling.AutoScalingGroup` now properly passes along a provider.
  5. The `LaunchConfiguration` for an `AutoScalingGroup` will now be parented by the `AutoScalingGroup`

  6. `awsx.cloudwatch.Dashboard` now properly passes along a provider.

  7. The underlying `aws.ec2.Vpc` is now parented to the `awsx.ec2.Vpc` that created it.
  8. `awsx.ec2.Vpc.getDefault` has changed behavior.  It now takes in options that allow a provider
     to be passed in.  This provider is used to determine which region to lookup the default Vpc in.
     Note: when this function is called multiple times it will return the same Vpc instance if for
     the same region.
  9. `awsx.ec2.Vpc.getDefault` will now return Vpcs with the name `default-<actual vpc id>`.  An
     existing default vpc with the name `default-vpc` will be aliased to this new name.
  10. Subnets created by `awsx.ec2.Vpc` will be parented to the Vpc now.
  11. The InternetGateway and NatGateways created by `Vpc.fromExistingIds` will now be parented to
      the Vpc.

  12. `awsx.ecr.LifeCyclePolicy` is now parented by the `aws.ecr.Repository` it is created for.

  13. `awsx.ecs.Service/TaskDefinition` now respect providers.

  14. `awsx.elasticloadbalancingv2.ApplicationListener/ApplicationTargetGroup/NetworkListener/NetworkTargetGroup`
      will now all be parented by their respective `LoadBalancer` by default if a parent is not
      specified.
  15. The type name of an `awsx.elasticloadbalancingv2.ListenerRule` has been fixed.

## 0.18.6 (2019-06-19)

### Improvements

- awsx.ecs.Cluster can be created from an existing aws.ecs.Cluster's id.
- Add OPTIONS as a valid method and add ability to set custom gateway responses for
  [awsx.apigateway.API].
- Load balancing targets can now be simply added to an ALB, NLB, Listener or TargetGroup using the
  new `.attachTarget` methods on the respective classes.

### Compatibility issues

- An `awsx.ec2.Vpc` with `assignGeneratedIpv6CidrBlock: true` will now set
  `assignIpv6AddressOnCreation: true` by default for child subnets.  This can be overridden by
  setting that value explicitly to `false` with the subnet's args.

- `awsx.Cluster` and `awsx.Network` are now deprecated and will no longer receive future changes.
  Code that uses these types should migrate to `awsx.ecs.Cluster` and `awsx.ec2.Vpc` respectively.

## 0.18.5 (2019-06-12)

- VPCs can now be made which scale to use all availability zones in a region if desired.  Use
  `new awsx.ec2.Vpc("name", { numberOfAvailabilityZones: "all" })` to get this behavior.  If
  `numberOfAvailabilityZones` is not provided, the current behavior of defaulting to 2 availability
  zones remains.
- Externally available application listeners will now open their security group to both ingress and
  egress for their specified port.
- Tweaked API.getFunction to allow [route] and [method] parameters to be optional.  Also changed
  function to throw if passed arguments that don't map to an actual function.
- awsx.cloudwatch.Dashboard now exports a `url` property that gives you an immediate link to the
  Dashboard.

## 0.18.4 (2019-05-14)

- ApiGateway now provides control over the backing s3.Bucket created for `StaticRoute`s.  This is
  useful for SinglePageApp scenarios that want to control relevant Bucket values like
  `errorDocument` or `indexDocument`.
- A new `ecr` module has been created, simplifying creation of `ecr.Repository`s and
  `ecr.LifecyclePolicy`s.

## 0.18.3 (2019-04-24)

- Add support for Authorizers, API Keys and Request Validation to Integration Routes in API Gateway

## 0.18.2 (2019-04-22)

- Adds a new set of APIs for defining and CloudWatch metrics and creating alarms from them. See
  [awsx.cloudwatch.Metric] for more details, and see [awsx.lambda.metrics.duration] as an example of
  a newly exposed easy-to-use metric.
- Dashboards can easily be created from the above [awsx.cloudwatch.Metric] objects using the new
  [awsx.cloudwatch.Dashboard] helper.  See
  [here](index.ts-https://github.com/pulumi/pulumi-awsx/blob/master/nodejs/awsx/examples-dashboards)
  for an example.
- [awsx.autoscaling.AutoScalingGroup]s can now easily have a scheduling action provided by using the
  new [AutoScalingGroup.createSchedule] instance method.
- [awsx.autoscaling.AutoScalingGroup]s can now easily scale based on an [aws.cloudwatch.Metric] or
  based on some preexisting well-known metrics.  See the new [AutoScalingGroup.scaleToTrackXXX]
  instance methods. Amazon EC2 Auto Scaling creates and manages the CloudWatch alarms that trigger
  the scaling policy and calculates the scaling adjustment based on the metric and the target value.
  The scaling policy adds or removes capacity as required to keep the metric at, or close to, the
  specified target value.
- [Step-Scaling-Policies](application-auto-scaling-step-scaling-policies.html-https://docs.aws.amazon.com/autoscaling/application-userguide)
  can easily be added for [awsx.autoscaling.AutoScalingGroup]s.  All you need to do is provide an
  appropriate metric and simple information about where your scale-out and scale-in steps should
  begin and the [AutoScalingGroup] will create the appropriate policies and
  [cloudwatch.MetricAlarm]s to trigger those policies.  See the new [AutoScalingGroup.scaleInSteps] instance method.

## 0.18.1 (2019-04-14)

- TypeScript typings for awsx.apigateway.API have been updated to be more accurate.
- Application LoadBalancers/Listeners/TargetGroups will now create a default SecurityGroup for their
  LoadBalancer if none is provided.
- Added easier convenience methods overloads on an awsx.ec2.SecurityGroup to make ingress/egress
  rules.
- Add TypeScript documentation on API Gateway's Integration Route and Raw Data Route
- Add support for [Lambda Authorizers](api-gateway-setup-api-key-with-restapi.html-https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html) and [Cognito Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html) and [API Keys](https://docs.aws.amazon.com/apigateway/latest-developerguide) for API Gateway in TypeScripts

## 0.18.0 (2019-03-29)

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

## 0.17.1 (2019-03-21)

- Fixes issue where creating an ApplicationListener would fail with an error of:
    "description" cannot be longer than 255 characters

## 0.17.0 (2019-03-05)

### Important

Updating to v0.17.0 version of `@pulumi/pulumi`.  This is an update that will not play nicely
in side-by-side applications that pull in prior versions of this package.

See https://github.com/pulumi/pulumi/commit/7f5e089f043a70c02f7e03600d6404ff0e27cc9d for more details.

As such, we are rev'ing the minor version of the package from 0.16 to 0.17.  Recent version of `pulumi` will now detect, and warn, if different versions of `@pulumi/pulumi` are loaded into the same application.  If you encounter this warning, it is recommended you move to versions of the `@pulumi/...` packages that are compatible.  i.e. keep everything on 0.16.x until you are ready to move everything to 0.17.x.

## 0.16.5 (2019-02-22)

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

## 0.16.4 (2019-02-05)

- Renamed 'aws-infra' package to 'awsx'.
- Moved `aws.apigateway.x.Api` from `@pulumi/aws` into this package under the name `awsx.apigateway.Api`.

## 0.16.3 (2019-01-25)

- Experimental abstractions have been promoted to supported abstractions.  see new modules for:
  - autoscaling
  - ec2
  - ecs
  - elasticloadbalancingv2

## 0.16.2 (2018-12-05)

### Improvements

- Add some experimental abstractions for Services and Tasks in the `experimental` module.

## 0.16.1 (2018-11-13)

### Improvements

- Fix an issue where passing a cluster to another component would fail in some cases.
